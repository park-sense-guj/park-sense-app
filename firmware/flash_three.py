#!/usr/bin/env python3
"""Flash unique ParkSense slot firmware to each connected ESP32."""
import subprocess
import time
from pathlib import Path

ROOT = Path("/Users/sulaiman/Documents/ParkSense/firmware/ParkSenseNode")
FQBN = "esp32:esp32:esp32:UploadSpeed=115200"
BOARDS = [
    ("/dev/cu.usbserial-0001", "slot-a-01"),
    ("/dev/cu.usbserial-7", "slot-a-02"),
    ("/dev/cu.usbserial-8", "slot-a-03"),
]


def run(cmd):
    print("+", " ".join(cmd), flush=True)
    subprocess.check_call(cmd)


def main():
    slot_h = ROOT / "slot_config.h"
    for port, slot in BOARDS:
        if not Path(port).exists():
            raise SystemExit(f"missing {port}")
        slot_h.write_text(f'#pragma once\n#define PARKSENSE_SLOT_ID "{slot}"\n')
        print(f"\n===== {slot} -> {port} =====", flush=True)
        run(["arduino-cli", "compile", "--fqbn", FQBN, str(ROOT)])
        run(["arduino-cli", "upload", "-p", port, "--fqbn", FQBN, str(ROOT)])
        time.sleep(0.8)
    print("\nAll three flashed.")


if __name__ == "__main__":
    main()
