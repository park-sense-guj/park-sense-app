/*
  ParkSense IoT node (ESP32)

  Reads an IR obstacle sensor and PATCHes occupancy to Firebase RTDB.
  Never PUT the whole slot object — that would wipe lat/lng/slotNumber.

  Setup:
  1. Copy secrets.h.example → secrets.h and fill Wi-Fi + Firebase values.
  2. In the admin app, reset to the 3 live bays (A-01, A-02, A-03).
  3. Flash this sketch, then open Serial Monitor at 115200.
*/

#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <time.h>

#include "secrets.h"
#include "slot_config.h"

#ifndef PARKSENSE_SLOT_ID
#define PARKSENSE_SLOT_ID "slot-a-01"
#endif

const char* DATABASE_URL = "https://parksense-5b900-default-rtdb.firebaseio.com";
const char* SLOT_ID = PARKSENSE_SLOT_ID;

// IR OUT can be on GPIO 18 or 19 (INPUT_PULLUP: unused pin stays HIGH).
const int SENSOR_PIN_A = 18;
const int SENSOR_PIN_B = 19;

const unsigned long PUBLISH_MS = 2000;
const unsigned long HEARTBEAT_MS = 15000;

String lastStatus = "";
unsigned long lastPublishAt = 0;
String idToken = "";

bool secretsReady() {
  return String(PARKSENSE_WIFI_SSID) != "YOUR_WIFI_SSID" &&
         String(PARKSENSE_WIFI_SSID).length() > 0 &&
         String(PARKSENSE_WIFI_PASSWORD).length() > 0;
}

String authQuery() {
  String token = idToken.length() ? idToken : String(PARKSENSE_FIREBASE_AUTH);
  if (!token.length()) {
    return "";
  }
  return String("?auth=") + token;
}

String wallClockMs() {
  time_t now = time(nullptr);
  if (now < 1700000000) {
    return "";
  }
  char buf[24];
  snprintf(buf, sizeof(buf), "%llu", (unsigned long long)now * 1000ULL);
  return String(buf);
}

void connectWifi() {
  if (!secretsReady()) {
    Serial.println("Fill firmware/ParkSenseNode/secrets.h with Wi-Fi SSID/password, then reflash.");
    return;
  }

  if (WiFi.status() == WL_CONNECTED) {
    return;
  }

  Serial.printf("Wi-Fi: connecting to %s  MAC %s\n", PARKSENSE_WIFI_SSID, WiFi.macAddress().c_str());
  WiFi.persistent(false);
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(WIFI_PS_NONE);
  WiFi.setAutoReconnect(true);
  WiFi.disconnect();
  delay(200);
  WiFi.begin(PARKSENSE_WIFI_SSID, PARKSENSE_WIFI_PASSWORD);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 45000) {
    delay(400);
    Serial.print('.');
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("Wi-Fi OK  IP ");
    Serial.print(WiFi.localIP());
    Serial.print("  RSSI ");
    Serial.println(WiFi.RSSI());
    configTime(0, 0, "pool.ntp.org", "time.google.com");
  } else {
    Serial.println("Wi-Fi failed. Keep Personal Hotspot open, enable Maximize Compatibility, then reset this board.");
  }
}

String jsonStringField(const String& body, const char* key) {
  String quotedKey = String("\"") + key + "\"";
  int keyPos = body.indexOf(quotedKey);
  if (keyPos < 0) {
    return "";
  }
  int colon = body.indexOf(':', keyPos + quotedKey.length());
  if (colon < 0) {
    return "";
  }
  int start = body.indexOf('"', colon + 1);
  if (start < 0) {
    return "";
  }
  int end = body.indexOf('"', start + 1);
  if (end < 0) {
    return "";
  }
  return body.substring(start + 1, end);
}

bool ensureAuth() {
  if (String(PARKSENSE_FIREBASE_AUTH).length() > 0) {
    idToken = "";
    return true;
  }
  if (idToken.length() > 0) {
    return true;
  }
  if (String(PARKSENSE_FIREBASE_API_KEY).length() == 0) {
    Serial.println("No FIREBASE_AUTH or FIREBASE_API_KEY in secrets.h");
    return false;
  }

  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;
  String url =
      String("https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=") +
      PARKSENSE_FIREBASE_API_KEY;
  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");
  int code = http.POST("{\"returnSecureToken\":true}");
  String body = http.getString();
  http.end();

  idToken = jsonStringField(body, "idToken");
  if (code >= 200 && code < 300 && idToken.length() > 0) {
    Serial.println("Firebase anonymous auth OK");
    return true;
  }

  Serial.printf("Firebase auth failed HTTP %d token=%u chars\n", code, idToken.length());
  if (code != 200) {
    Serial.println(body.substring(0, 240));
  }
  Serial.println("Enable Anonymous auth in Firebase, or put a database secret in PARKSENSE_FIREBASE_AUTH.");
  return false;
}

int patchPath(const String& path, const String& jsonBody) {
  if (WiFi.status() != WL_CONNECTED) {
    connectWifi();
  }
  if (WiFi.status() != WL_CONNECTED || !ensureAuth()) {
    return -1;
  }

  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;
  String url = String(DATABASE_URL) + path + ".json" + authQuery();
  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");
  int code = http.sendRequest("PATCH", jsonBody);
  String response = http.getString();
  http.end();

  if (code < 200 || code >= 300) {
    Serial.printf("PATCH %s HTTP %d\n", path.c_str(), code);
    Serial.println(response);
  }
  return code;
}

bool publish(const char* status) {
  String sensorId = String("sensor-") + SLOT_ID;
  String slotBody = String("{\"status\":\"") + status + "\"}";
  String clock = wallClockMs();

  int slotCode = patchPath(String("/parkingSlots/") + SLOT_ID, slotBody);
  int sensorCode = -1;
  if (clock.length() == 0) {
    Serial.println("Waiting for NTP — occupancy sent, heartbeat skipped");
    configTime(0, 0, "pool.ntp.org", "time.google.com");
  } else {
    String sensorBody =
        String("{\"slotId\":\"") + SLOT_ID +
        "\",\"sensorType\":\"IR\",\"sensorStatus\":\"Active\",\"lastUpdated\":" +
        clock + "}";
    sensorCode = patchPath(String("/sensors/") + sensorId, sensorBody);
  }

  bool ok = slotCode >= 200 && slotCode < 300 && (sensorCode < 0 || (sensorCode >= 200 && sensorCode < 300));
  Serial.printf(
      "Published %s %s  gpio18=%d gpio19=%d  slot=%d  sensor=%d\n",
      SLOT_ID,
      status,
      digitalRead(SENSOR_PIN_A),
      digitalRead(SENSOR_PIN_B),
      slotCode,
      sensorCode);
  lastPublishAt = millis();
  return ok;
}

void setup() {
  Serial.begin(115200);
  delay(400);
  Serial.println();
  Serial.println("ParkSense node boot");
  Serial.printf("Slot %s  IR OUT on GPIO %d or %d\n", SLOT_ID, SENSOR_PIN_A, SENSOR_PIN_B);
  pinMode(SENSOR_PIN_A, INPUT_PULLUP);
  pinMode(SENSOR_PIN_B, INPUT_PULLUP);
  connectWifi();
}

bool bayOccupied() {
  // Module OUT is LOW when the detection LED is on.
  return digitalRead(SENSOR_PIN_A) == LOW || digitalRead(SENSOR_PIN_B) == LOW;
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    delay(2000);
    connectWifi();
    return;
  }

  const char* status = bayOccupied() ? "Occupied" : "Available";

  bool changed = lastStatus != status;
  bool heartbeat = lastPublishAt == 0 || millis() - lastPublishAt >= HEARTBEAT_MS;
  if (changed || heartbeat) {
    lastStatus = status;
    publish(status);
  }

  delay(PUBLISH_MS);
}
