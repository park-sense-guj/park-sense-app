# ParkSense IoT node

The mobile app never talks to Arduino. The ESP32 writes the **same Firebase paths** the app already listens to:

```
/parkingSlots/{slotId}/status = "Available" | "Occupied"
/sensors/{sensorId}/lastUpdated = <unix ms>
/sensors/{sensorId}/sensorStatus = "Active" | "Faulty"
```

Until hardware is attached, the admin **Slots** tab simulates those writes.

## Hardware (later)

- NodeMCU ESP8266 or ESP32
- IR obstacle sensor or HC-SR04 ultrasonic
- USB power / 5V

## Setup

1. Open `ParkSenseNode/ParkSenseNode.ino` in Arduino IDE.
2. Install board support (ESP32 or ESP8266) and the `ArduinoJson` library.
3. Fill in Wi-Fi SSID/password and a Firebase Realtime Database secret or Auth token.
4. Set `SLOT_ID` to a key that already exists, e.g. `slot-a-01`.
5. Flash the board. Wave a hand in front of the sensor and watch the map pin change.

Do not commit Wi-Fi passwords or database secrets.
