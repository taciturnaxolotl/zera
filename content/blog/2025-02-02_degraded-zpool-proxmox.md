+++
title = "Fixing a degraded zpool on proxmox"
date = 2025-01-31
slug = "degraded-zpool-proxmox"
description = "replacing a failed drive in a proxmox zpool"

[taxonomies]
tags = ["homelab", "tutorial"]

[extra]
has_toc = true
+++

I decided to finally fix the network issues with my proxmox server (old static ip and used vlans which I hadn't setup with the new switch and router) as I had some time today but after fixing that fairly easily I discovered that my main `2.23 TB` zpool had a drive failure. Thankfully I had managed to stuff 3 disks into the case before so loosing one meant no data loss (thankfully 😬; all my projects from the last 5 years as well as my entire video archive is on this pool). I still have 3 more disks of the same type so I can swap in a new one 2 more times after this.

{{ img(id="https://cloud-n6m4bt2xl-hack-club-bot.vercel.app/2image.png" alt="the zpool reporting a downed disk" caption="That really scared the pants off me when I first saw it 😂") }}

## Actually fixing it 

First I had to find the affected disk physically in my case. Because I was stupid I didn't bother to label them but thankfully the serial numbers of the drives are stuck to them with a sticker so that wasn't terrible.

{{ img(id="https://cloud-pi335w1l0-hack-club-bot.vercel.app/0image_from_ios.jpg" alt="chick-fil-a macaroni and cheese with 2 nuggets and some ketchup" caption="(By this point I had spent 30 minutes moaning so I went to lunch)") }}

Now we can run `lsblk -o +MODEL,SERIAL` to find the serial number of our new drive.

> root@thespia:~# lsblk -o +MODEL,SERIAL
```bash
NAME                      MAJ:MIN RM   SIZE RO TYPE MOUNTPOINTS MODEL                   SERIAL
sda                         8:0    0 698.6G  0 disk             ST3750640NS             3QD0BG0J
├─sda1                      8:1    0 698.6G  0 part
└─sda9                      8:9    0     8M  0 part
sdb                         8:16   0 698.6G  0 disk             ST3750640NS             3QD0BN6V
sdc                         8:32   0 698.6G  0 disk             ST3750640NS             3QD0BQ5G
├─sdc1                      8:33   0 698.6G  0 part
└─sdc9                      8:41   0     8M  0 part
sdd                         8:48   1 111.8G  0 disk             Hitachi HTS543212L9SA02 090130FBEB00LGGJ35RF
├─sdd1                      8:49   1  1007K  0 part
├─sdd2                      8:50   1   512M  0 part /boot/efi
└─sdd3                      8:51   1 111.3G  0 part
  ├─pve-swap              253:0    0     8G  0 lvm  [SWAP]
  ├─pve-root              253:1    0  37.8G  0 lvm  /
  ├─pve-data_tmeta        253:2    0     1G  0 lvm
  │ └─pve-data-tpool      253:4    0  49.6G  0 lvm
  │   ├─pve-data          253:5    0  49.6G  1 lvm
  │   ├─pve-vm--100--cloudinit
  │   │                   253:6    0     4M  0 lvm
  │   ├─pve-vm--101--cloudinit
  │   │                   253:7    0     4M  0 lvm
  │   ├─pve-vm--103--disk--0
  │   │                   253:8    0     4M  0 lvm
  │   └─pve-vm--103--disk--1
  │                       253:9    0    32G  0 lvm
  └─pve-data_tdata        253:3    0  49.6G  0 lvm
    └─pve-data-tpool      253:4    0  49.6G  0 lvm
      ├─pve-data          253:5    0  49.6G  1 lvm
      ├─pve-vm--100--cloudinit
      │                   253:6    0     4M  0 lvm
      ├─pve-vm--101--cloudinit
      │                   253:7    0     4M  0 lvm
      ├─pve-vm--103--disk--0
      │                   253:8    0     4M  0 lvm
      └─pve-vm--103--disk--1
                          253:9    0    32G  0 lvm
sde                         8:64   0 465.8G  0 disk             WDC WD5000AAKS-65YGA0   WD-WCAS83511331
├─sde1                      8:65   0 465.8G  0 part
└─sde9                      8:73   0     8M  0 part
sdf                         8:80   1     0B  0 disk             Multi-Card              20120926571200000
zd0                       230:0    0    32G  0 disk
├─zd0p1                   230:1    0   100M  0 part
├─zd0p2                   230:2    0    16M  0 part
├─zd0p3                   230:3    0  31.4G  0 part
└─zd0p4                   230:4    0   522M  0 part
zd16                      230:16   0    80G  0 disk
├─zd16p1                  230:17   0     1M  0 part
└─zd16p2                  230:18   0    80G  0 part
zd32                      230:32   0     4M  0 disk
zd48                      230:48   0    80G  0 disk
├─zd48p1                  230:49   0     1M  0 part
└─zd48p2                  230:50   0    80G  0 part
zd64                      230:64   0    32G  0 disk
├─zd64p1                  230:65   0   512K  0 part
└─zd64p2                  230:66   0    32G  0 part
zd80                      230:80   0     1M  0 disk
```

Our two current drives are `3QD0BG0J` and `3QD0BQ5G` as we can see in proxmox but we can also see that they have partitions and `sdb/3QD0BN6V` does not so thats our target drive. Now we can find the disk by id with `ls /dev/disk/by-id | grep 3QD0BN6V` which gives us:

> ls /dev/disk/by-id | grep 3QD0BN6V
```bash
ata-ST3750640NS_3QD0BN6V
```

{{ img(id="https://cloud-d0bjeue06-hack-club-bot.vercel.app/0image_from_ios.jpg" alt="chick-fil-a macaroni and cheese with 2 nuggets and some ketchup" caption="My case situation is a bit of a mess and I'm using old 7200rpm server drives for pretty much everything; the dream is a 3 drive 2 TB each m.2 nvme ssd setup, maybe someday 🤷") }}

We are going to go with the first id so no we move on to the zfs part. Running `zpool status vault-of-the-eldunari` we can get the status of the pool:

> zpool status vault-of-the-eldunari
```bash
  pool: vault-of-the-eldunari
 state: DEGRADED
status: One or more devices could not be used because the label is missing or
        invalid.  Sufficient replicas exist for the pool to continue
        functioning in a degraded state.
action: Replace the device using 'zpool replace'.
   see: https://openzfs.github.io/openzfs-docs/msg/ZFS-8000-4J
  scan: resilvered 8.33G in 00:48:26 with 0 errors on Thu Nov 14 18:38:03 2024
config:

        NAME                          STATE     READ WRITE CKSUM
        vault-of-the-eldunari         DEGRADED     0     0     0
          raidz1-0                    DEGRADED     0     0     0
            9201394420428878514       UNAVAIL      0     0     0  was /dev/disk/by-id/ata-ST3750640NS_3QD0BM29-part1
            ata-ST3750640NS_3QD0BQ5G  ONLINE       0     0     0
            ata-ST3750640NS_3QD0BG0J  ONLINE       0     0     0

errors: No known data errors
```

We can add our new disk with `zpool replace vault-of-the-eldunari 9201394420428878514 ata-ST3750640NS_3QD0BN6V` but first we wipe the disk from proxmox under the disks tab on our proxmox node to make sure its all clean before we restore the pool after we do that we also initalize a new gpt table. Now we are ready to replace the disk. Running this command can take quite a while and it doesn't output anything so sit tight. After waiting a few minutes proxmox reported that resilvering would take 1:49 minutes and it was 5% done already! I hope this helped at least one other person but I'm mainly writing this to remind myself how to do this when it inevitably happens again :)

{{ img(id="https://cloud-n6m4bt2xl-hack-club-bot.vercel.app/0image.png" alt="the zpool reporting a downed disk" caption="It's slow but faster then I expected for HDDs") }}
