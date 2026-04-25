+++
title = "Reverse engineering the FRC systemcore image"
date = 2026-04-25
slug = "frc-systemcore-image"
description = "looks quite interesting 👀"

[taxonomies]
tags = ["frc", "reverse engineering"] 
+++

FIRST announced the systemcore several months ago now and the beta software started rolling out recently and becoming way more polished so with the release of the [new driver station](https://github.com/wpilibsuite/FirstDriverStation-Public) I decided it was time to dig into the firmware image and see what I could find!

<!-- more -->

![the systemcore in all its glory](https://l4.dunkirk.sh/i/mGIuJH5L1I-o.webp){caption="they really did a great job of making it look nice and polished"}

The systemcore is based on an Raspberry Pi Compute Module 5 and as a result the image is just a zipped .img file that extracts to 10 GB in size (the size of the emmc) but considering that the original zip file is only 1.8 GB there is likely quite a bit of empty / wasted space. It is interesting that they didn't choose to go the auto expanding route but I'm guessing they did this for ease of use.

| Partition | Type         | Start LBA  | Sectors    | Size  | Description                   |
| --------- | ------------ | ---------- | ---------- | ----- | ----------------------------- |
| P0        | FAT32 (0x0C) | 1          | 131,072    | 64MB  | Boot partition                |
| P1        | Linux (0x83) | 131,073    | 10,485,760 | 5GB   | Root filesystem A             |
| P2        | Linux (0x83) | 10,616,833 | 10,485,760 | 5GB   | Root filesystem B (fallback)  |
| P3        | Linux (0x83) | 21,102,593 | 524,288    | 256MB | Data partition (empty/sparse) |

There is an A and B partition which is used by the `limelight_updatemanager` to atomically update the system preventing broken updates from bricking the system which is quite nice. This is done at the kernel level with the `tryboot_a_b` flag.

The system is based on the 6.6.64-rt47-v8-16k (PREEMPT_RT real-time) kernel and appears to be entirely custom built using [buildroot](https://buildroot.org/) and does not contain any standard package managers aside from the custom ui one that is supposed to allow for install of Elastic and other tools in the future.

The CM5 carrier board has 5 can FD buses running on MCP2518FD controllers all running on 40Mhz oscillators via SPI. There was a comment in the device tree config `# BETA SYSTEMCORE: CAN2 on SPI3 (MOSI=6, MISO=5, CLK=7, CS=27, INT=9)` so I'm not sure if this is the final layout of the offical release this fall. All of the controllers are configured to run at 1Mbps CAN FD with txqueuelen=1000.

| CAN Bus  | SPI Port | CS Pin     | INT Pin | Overlay                       |
| -------- | -------- | ---------- | ------- | ----------------------------- |
| `can_s0` | SPI2     | CS0=GPIO0  | GPIO22  | `sc-mcp2518-can0-spi2`        |
| `can_s1` | SPI2     | CS1=GPIO24 | GPIO26  | `sc-mcp2518-can1-spi2`        |
| `can_s2` | SPI3     | CS0=GPIO27 | GPIO9   | `sc-mcp2518-can2-spi3` (BETA) |
| `can_s3` | SPI1     | CS0=GPIO25 | GPIO17  | `sc-mcp2518-can3-spi1-beta`   |
| `can_s4` | SPI1     | CS1=GPIO18 | GPIO8   | `sc-mcp2518-can4-spi1-beta`   |

There are two different usb network interfaces with the ECM one for linux/macOS and the RNDIS for windows both exposed via usb gadget mode. Interestingly the can buses also show up here.

| Interface         | Purpose                 | IP Range                |
| ----------------- | ----------------------- | ----------------------- |
| `usb0`            | ECM USB network to DS   | 172.27.0-15.x (DHCP)    |
| `usb1`            | RNDIS USB network to DS | 172.26.0-15.x (DHCP)    |
| `wlan0`           | WiFi access point       | 172.30.0.1/24 (hostapd) |
| `eth0`            | Ethernet                | DHCP client             |
| `can_s0`-`can_s4` | CAN FD buses            | N/A                     |

### Services

Now for the interesting part. There are 18 systemd services on the image and I tried to rougly split them up by type.

#### MrcCommDaemon

The `MrcCommDaemon` (4.5MB, stripped aarch64) is kind of the main program. This is the DS communication daemon - it runs the NT4 server on port 5812, handles the UDP control packet protocol, publishes robot state, and subscribes to DS commands. It's the equivalent of the NI FRC NetworkTables server on a roboRIO, except it also speaks the DS control protocol directly.

The most interesting discovery here is the **topic namespace split**. On the DS side, everything is published under `/Dscomm/` (e.g. `/Dscomm/Control/Enabled`, `/Dscomm/Status/BatteryVoltage`). But on the robot side, MrcCommDaemon publishes the same logical data under `/Netcomm/` (e.g. `/Netcomm/Control/Enabled`, `/Netcomm/Status/BatteryVoltage`). The daemon acts as a bridge between the two - translating between DS UDP packets and NT4 topics with the appropriate prefix. This was discovered due to some rev work that will :tw_hand_with_index_and_middle_fingers_crossed: hopefully get published soon.

It also reads CTRE device status from a custom kernel module at `/sys/kernel/can_heartbeat/controldata` and system telemetry from `/sys/cpu`, `/sys/battery`, `/sys/ram`, and `/sys/storage`.

#### CAN Bus Stack

Five services manage the CAN FD buses:

| Service                    | Binary                  | Description                                                                |
| -------------------------- | ----------------------- | -------------------------------------------------------------------------- |
| `limelight_canbusprocess`  | shell script            | Configures can_s0–s4 at 1Mbps, loads `can_heartbeat` and `i2c-dev` modules |
| `limelight_canbusloadmon`  | `canbusloadmon` (22KB)  | Monitors per-bus load and publishes to NT4                                 |
| `limelight_canbussniffer`  | `canbussniffer` (142KB) | WebSocket server on port 5800 streaming live CAN frames                    |
| `limelight_canbuswatchdog` | `canbuswatchdog` (26KB) | Monitors all 5 interfaces, writes faults to `/sys/faults/`                 |
| `can_heartbeat`            | kernel module           | Bridges CAN heartbeat data to sysfs for MrcCommDaemon                      |

The CAN bus setup script is also interesting it sleeps 4 seconds for some reason, then brings up all five interfaces:

```bash
sleep 4 && \
  ip link set can_s0 type can bitrate 1000000 && \
  ip link set can_s0 txqueuelen 1000 && ip link set can_s0 up && \
  # ... repeated for can_s1 through can_s4 ...
  modprobe can_heartbeat && modprobe i2c-dev
```

The sniffer on port 5800 is going to be really fun to play with you can connect from a browser and watch CAN traffic in real time. The `can_heartbeat` kernel module is custom out-of-tree and bridges CAN data to sysfs for MrcCommDaemon to read.

#### Networking

The networking is surprisingly complex but does make sense. USB gadget mode provides two virtual network interfaces to the DS simultaneously - ECM for macOS/Linux and RNDIS for Windows - over the same USB connection. Each has its own DHCP range subnetted by team number (16 subnets of 11 addresses each). The WiFi AP runs a separate `dnsmasq` instance with DNS completely disabled (`port=0`).

| Service                      | Description                                                   |
| ---------------------------- | ------------------------------------------------------------- |
| `limelight_gadget`           | Configures USB composite device (ECM + RNDIS) via configfs    |
| `limelight_dnsmasq`          | DHCP server on usb0 + usb1 (172.27.x / 172.26.x)              |
| `limelight_dnsmasqwifi`      | DHCP server on wlan0 (172.30.0.x, no DNS)                     |
| `limelight_accesspoint`      | `hostapd` - 5GHz 802.11ac AP, SSID `SYSTEMCORE`, WPA2-PSK     |
| `limelight_irqconf`          | Pins eth0 IRQ to CPU core 2 for deterministic latency         |
| `limelight_networkresponder` | Network discovery responder (V1 single-IP, V2 all-interfaces) |

The `irqconf.sh` script is interesting as it finds eth0's interrupt and sets `smp_affinity` to core 2 which should help with deterministic network processing.

The WiFi AP config is also interesting. It uses 5GHz 802.11ac with automatic channel selection, but only on non-DFS channels (36, 40, 44, 48, 149, 153, 157, 161, 165) - skipping the UNII-2 bands that require radar detection. Max 10 clients. This looks like its probably meant for pit use?

#### Hardware Daemons

These four services bridge physical hardware to NT4:

| Service                        | Binary                            | Description                                                            |
| ------------------------------ | --------------------------------- | ---------------------------------------------------------------------- |
| `limelight_iodaemon`           | `iodaemon` (62KB)                 | USB bridge to LED/status board via libusb, runs at RT FIFO priority 39 |
| `expansionhubdaemon.service`   | `ExpansionHubDaemon` (4.1MB)      | REV Expansion Hub driver over USB-serial (RHSP protocol)               |
| `powerdistribution.service`    | `PowerDistributionDaemon` (3.9MB) | PDH/PDP monitoring, publishes `/pd/` NT4 topics                        |
| `limelight_picoflasherprocess` | `picoflasherprocess`              | Auto-flashes any Pico that enters bootloader mode via USB mass storage |

The IODaemon is fairly interesting - it's a small libusb-based binary that sends LED updates, CAN status, GPIO state, IP address, and team number to the external pico for the display. It reads the robot enabled state from `/sys/kernel/can_heartbeat/enabledro` and runs at the highest real-time priority of any service. This is what drives the physical status LEDs on the SystemCore case.

The ExpansionHubDaemon speaks the RHSP (REV Hardware Server Protocol) over USB-serial and publishes NT4 topics under `/rhsp/` for motor control, encoder reading, servo control, and PID. It's the built-in REV Expansion Hub support.

#### System Management

| Service                        | Binary                       | Port | Description                                      |
| ------------------------------ | ---------------------------- | ---- | ------------------------------------------------ |
| `limelight_hwmon`              | `hwmon` (535KB)              | -    | REST API for CPU, RAM, disk, kernel, sensors     |
| `limelight_diagnosticsprocess` | `diagnosticsprocess` (411KB) | 4800 | Web config panel (team number, WiFi, networking) |
| `limelight_packagemanager`     | `packagemanager` (198KB)     | 4803 | IPK package manager for deploying user code      |
| `limelight_updatemanager`      | `updatemanager` (158KB)      | 4804 | A/B partition OTA updates                        |

The diagnostics process is the web configuration API. It handles:

- `GET/POST /api/team` - set team number (written to `/sys/team`)
- `GET/POST /api/wifi` - configure SSID, password, WPA (rewrites `hostapd.conf`, restarts the AP)
- `GET/POST /api/network` - configure eth0 networking (rewrites `dhcpcd.conf`)
- `GET /api/health` - health check
- `GET /api/oshash` - OS version hash (curious whether this will get used to validate the systemcore image on the FMS?)

The update manager handles the A/B partition scheme. It receives a partition image, DD-extracts it to the inactive rootfs partition, then mounts the boot partition read-write and updates `autoboot.txt`. The reboot uses the Pi's `tryboot` mechanism - `sudo reboot "0 tryboot"` - which boots into the new partition once, and only commits it as the default after validation. If it fails, you just power cycle and it falls back. Classic A/B update pattern, well executed.

The package manager uses `opkg` under the hood and reads `X-Port`, `X-Launch-Command`, and `X-Auto-Start` from IPK control files. This is what creates the `/home/systemcore/robotCommand` script that `robot.service` executes - it's generated from the installed package metadata, not baked into the image.

#### RadioDaemon

Despite the name, `RadioDaemon` (4.1MB) doesn't manage any radio hardware. It's an NT4 client using WPIlib's `wpinet` that connects back to the DS and reads `/sys/team` for the team number. It has `StartDSClient` methods and WebSocket support, but contains zero WiFi/radio configuration strings. My best guess is that it monitors the FRC field radio's link quality (connected via eth0 on the competition field) and publishes that data to the DS over NT4. The actual WiFi AP is handled entirely by `hostapd` and `dnsmasq` directly.

#### Robot Code Runner

```ini
[Service]
Type=simple
User=systemcore
LimitRTPRIO=50
ExecStartPre=/bin/bash -c '\
  timeout=15; echo "waiting for can interfaces"; \
  while [[ $timeout > 0 ]]; do \
    good=true; \
    for can in can_s0 can_s1 can_s2 can_s3 can_s4; do \
      if ! ip link show $can up 2>/dev/null | grep -q "state UP"; then \
        good=false; fi; done; \
    if [[ $good = true ]]; then exit 0; fi; \
    sleep 1; timeout=$((timeout-1)); done'
ExecStart=/bin/bash /home/systemcore/robotCommand
Restart=always
RestartSec=3
```

The `robot.service` runs as the `systemcore` user (UID 105) with real-time priority 50. It waits up to 15 seconds for all five CAN interfaces to come up before starting user code. The `robotCommand` script itself isn't in the image - it's created at runtime by the package manager when user code is deployed. The `ConditionPathExists=/home/systemcore/robotCommand` directive means the service won't even attempt to start until code has been deployed, which is a nice touch.

### Odds and Ends

The image ships with a VS Code server on port 4900 and a `ttyd` web terminal on port 4901. On the discovery side, the SystemCore advertises itself via mDNS as both `_SystemCore._tcp` and the legacy NI services (`_ni._tcp`, `_ni-rt._tcp`). It also uses the roboRIO hostname pattern `roboRIO-{team}-FRC` alongside `SystemCore-{team}-FIRST`. This dual-personality approach means existing DS software that's looking for roboRIO services will still find it, which is an interesting backward compatibility move.

One other oddity is the `xone-*` kernel modules - Xbox controller drivers for the wireless dongle, gamepad, chatpad, and headset. In normal FRC the flow is controllers -> DS -> robot, so having Xbox drivers on the robot side seems pointless. These are out-of-tree modules that someone deliberately added to the Buildroot config, but my guess is they're leftover from Limelight's general-purpose image config rather than something the SystemCore actually uses. Still, it raises the question of whether they're planning some kind of direct-attach mode for FTC maybe?.

Finally, the hostname is just `robot` and `/etc/os-release` identifies as `limelightos_systemcore_beta` with a git-hash version string. The whole userspace is owned by UID 105 / GID 113 (`systemcore`).

I will update this post if I find more interesting things over the next few months and I have some interesting ideas in the pipeline for testing with this :eyes:
