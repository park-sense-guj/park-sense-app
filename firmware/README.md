# ParkSense IoT node

The phone app never talks to the ESP32. The board **PATCHes** the same Firebase paths the app already listens to:

```
/parkingSlots/{slotId}        { "status": "Available" | "Occupied" }
/sensors/{sensorId}           { slotId, sensorType, sensorStatus: "Active", lastUpdated }
```

Do **not** PUT the whole slot object — that wipes coordinates and slot labels.

## Hardware

- ESP32-WROOM (this project’s board is on `/dev/cu.usbserial-0001`, CP2102)
- IR obstacle sensor **OUT → GPIO 18** (LOW = occupied)
- USB power

## Flash (Arduino IDE)

1. Copy `ParkSenseNode/secrets.h.example` to `ParkSenseNode/secrets.h`.
2. Fill Wi-Fi SSID/password. Leave `PARKSENSE_FIREBASE_AUTH` empty if using anonymous Auth, and paste the Firebase **web API key**.
3. In Firebase Console: enable **Authentication → Anonymous**, and publish `database.rules.json`.
4. Seed the demo lot in the admin app so `slot-a-01` exists.
5. Board: **ESP32 Dev Module**, Port: **cu.usbserial-0001**, Serial 115200.
6. Upload. Wave a hand in front of the IR sensor — pin **A-01** should flip on the map.

## Flash (CLI)

```bash
arduino-cli compile --fqbn esp32:esp32:esp32 firmware/ParkSenseNode
arduino-cli upload -p /dev/cu.usbserial-0001 --fqbn esp32:esp32:esp32 firmware/ParkSenseNode
```

Do not commit `secrets.h`, Wi-Fi passwords, or database secrets.
