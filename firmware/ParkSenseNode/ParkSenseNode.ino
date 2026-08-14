/*
  ParkSense IoT node
  Reads an IR/ultrasonic sensor and writes slot status to Firebase Realtime Database.

  Fill in WIFI_SSID, WIFI_PASSWORD, and FIREBASE_AUTH before flashing.
  Never commit those values.
*/

#include <Arduino.h>

#if defined(ESP32)
#include <WiFi.h>
#include <HTTPClient.h>
#else
#include <ESP8266HTTPClient.h>
#include <ESP8266WiFi.h>
#endif

const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Database root without trailing slash
const char* DATABASE_URL = "https://parksense-5b900-default-rtdb.firebaseio.com";
const char* FIREBASE_AUTH = "YOUR_DATABASE_SECRET_OR_ID_TOKEN";

const char* SLOT_ID = "slot-a-01";
const char* SENSOR_ID = "sensor-slot-a-01";

// D5 on NodeMCU / GPIO 18 on many ESP32 boards
const int SENSOR_PIN = 18;
const unsigned long PUBLISH_MS = 2000;

String lastStatus = "";

void connectWifi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(400);
  }
}

bool writePath(const String& path, const String& jsonBody) {
  if (WiFi.status() != WL_CONNECTED) {
    connectWifi();
  }

  String url = String(DATABASE_URL) + path + ".json?auth=" + FIREBASE_AUTH;
  HTTPClient http;
#if defined(ESP32)
  http.begin(url);
#else
  WiFiClientSecure client;
  client.setInsecure();
  http.begin(client, url);
#endif
  http.addHeader("Content-Type", "application/json");
  int code = http.PUT(jsonBody);
  http.end();
  return code >= 200 && code < 300;
}

void publish(const char* status) {
  unsigned long now = millis();
  String slotBody = String("{\"status\":\"") + status + "\"}";
  String sensorBody =
      String("{\"slotId\":\"") + SLOT_ID +
      "\",\"sensorType\":\"IR\",\"sensorStatus\":\"Active\",\"lastUpdated\":" +
      String(now) + "}";

  writePath(String("/parkingSlots/") + SLOT_ID, slotBody);
  writePath(String("/sensors/") + SENSOR_ID, sensorBody);
}

void setup() {
  pinMode(SENSOR_PIN, INPUT);
  connectWifi();
}

void loop() {
  // Many IR modules go LOW when an object is detected.
  bool occupied = digitalRead(SENSOR_PIN) == LOW;
  const char* status = occupied ? "Occupied" : "Available";

  if (lastStatus != status) {
    lastStatus = status;
    publish(status);
  }

  delay(PUBLISH_MS);
}
