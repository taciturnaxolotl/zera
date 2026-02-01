+++
title = "Install TrueNAS Core on Proxmox"
date = 2023-07-10
slug = "install-truenas-core-proxmox"
description = "How to install TrueNas Core on proxmox with drive passthrough"

[taxonomies]
tags = ["tutorial", "archival"]
+++

I have been using Proxmox for a while now but I've also wanted to make use of some large HDDs that have been lying around. I really didn't want to get another machine just for TrueNAS so I decided to install it on Proxmox. This is how I did it.

<!-- more -->

![screenshot of the vault vm in proxmox](https://l4.dunkirk.sh/i/t-S80BbH3_js.webp){caption="my active vault storing 1.8TB of old projects"}

## Introduction

> [!NOTE]
> I have since found out that running TrueNAS in a VM passing through the drives may not be a very good solution as it essentially just creates a large virtual disk that is the size of the drive you are passing through. Because of this I will not be using this setup in my homelab and will instead create a large ZFS pool on Proxmox. However if you are fine with those downsides, then have fun and enjoy the tutorial.

To install [TrueNAS Core](https://www.truenas.com/download-truenas-core/#) on [Proxmox](https://www.proxmox.com/en/proxmox-ve) you need three things:

1.  A copy of [Proxmox](https://www.proxmox.com/en/proxmox-ve) — A complete, open-source server management platform for enterprise virtualization.
2.  A [TrueNAS CORE](https://www.truenas.com/download-truenas-core/#) ISO — World’s #1 NAS Operating System
3.  HDDs — You can use whatever you want, but I will be using three Barracuda ES 750GB drives

## Install TrueNAS Core

Sign-in to Proxmox and upload your ISO to the local storage or, download the file directly from the link using the built-in ISO fetcher.

![download iso tool in proxmox](https://l4.dunkirk.sh/i/-erDtuONgTjb.webp)

Next to create the VM, the only thing that needs to be changed from the defaults is the memory, which I set to `8192 MB` (8 GB).

![create a vm modal in proxmox](https://l4.dunkirk.sh/i/xXwvumZox22j.webp)

Now finish creating the VM and click on the VM after it is created. Go to options and enable start at boot.

![start at boot checkbox](https://l4.dunkirk.sh/i/dWrsydIm5wfF.webp)

Next, we need to pass through the physical drives to the VM. Open a terminal on the Proxmox server (use the built-in terminal or ssh in) and run the following command. Only run the part after the #.

> root@thespia:~# lsblk -o +MODEL,SERIAL
```bash
NAME                           MAJ:MIN RM   SIZE RO TYPE MOUNTPOINT MODEL                   SERIAL
sda                              8:0    0 698.6G  0 disk            ST3750330NS             9QK2GT8R
sdb                              8:16   0 698.6G  0 disk            ST3750640NS             3QD0AYE0
sdc                              8:32   0 698.6G  0 disk            ST3750640NS             3QD0BQ5G
sdd                              8:48   1 111.8G  0 disk            Hitachi_HTS543212L9SA02 090130FBEB00LGGJ35RF
├─sdd1                           8:49   1  1007K  0 part
├─sdd2                           8:50   1   512M  0 part /boot/efi
└─sdd3                           8:51   1 111.3G  0 part
    ├─pve-swap                   253:0    0     8G  0 lvm  [SWAP]
    ├─pve-root                   253:1    0  37.8G  0 lvm  /
    ├─pve-data_tmeta             253:2    0     1G  0 lvm
    │ └─pve-data-tpool           253:4    0  49.6G  0 lvm
    │   ├─pve-data               253:5    0  49.6G  1 lvm
    │   ├─pve-vm--100--cloudinit 253:6    0     4M  0 lvm
    │   └─pve-vm--101--cloudinit 253:7    0     4M  0 lvm
    └─pve-data_tdata             253:3    0  49.6G  0 lvm
    └─pve-data-tpool           253:4    0  49.6G  0 lvm
        ├─pve-data               253:5    0  49.6G  1 lvm
        ├─pve-vm--100--cloudinit 253:6    0     4M  0 lvm
        └─pve-vm--101--cloudinit 253:7    0     4M  0 lvm
sde                              8:64   0 465.8G  0 disk            WDC_WD5000AAKS-65YGA0   WD-WCAS83511331
├─sde1                           8:65   0 465.8G  0 part
└─sde9                           8:73   0     8M  0 part
zd0                            230:0    0    32G  0 disk
├─zd0p1                        230:1    0   100M  0 part
├─zd0p2                        230:2    0    16M  0 part
├─zd0p3                        230:3    0  31.4G  0 part
└─zd0p4                        230:4    0   522M  0 part
zd16                           230:16   0    80G  0 disk
├─zd16p1                       230:17   0     1M  0 part
└─zd16p2                       230:18   0    80G  0 part
zd32                           230:32   0     4M  0 disk
zd48                           230:48   0    80G  0 disk
├─zd48p1                       230:49   0     1M  0 part
└─zd48p2                       230:50   0    80G  0 part
zd64                           230:64   0     1M  0 disk
zd80                           230:80   0    32G  0 disk
```

In my server `sda, sdb, and sdc` are my drives. I can tell because they have no partitions and are `698.6G`. Next, based on the serial numbers of the disks, find the `dev/disk/by-id` of the drive.

> root@thespia:~# ls /dev/disk/by-id/
```bash
ata-Hitachi_HTS543212L9SA02_090130FBEB00LGGJ35RF
ata-Hitachi_HTS543212L9SA02_090130FBEB00LGGJ35RF-part1
ata-Hitachi_HTS543212L9SA02_090130FBEB00LGGJ35RF-part2
ata-Hitachi_HTS543212L9SA02_090130FBEB00LGGJ35RF-part3
ata-ST3750330NS_9QK2GT8R
ata-ST3750640NS_3QD0AYE0
ata-ST3750640NS_3QD0BQ5G
ata-WDC_WD5000AAKS-65YGA0_WD-WCAS83511331
ata-WDC_WD5000AAKS-65YGA0_WD-WCAS83511331-part1
ata-WDC_WD5000AAKS-65YGA0_WD-WCAS83511331-part9
dm-name-pve-root
dm-name-pve-swap
dm-name-pve-vm--100--cloudinit
dm-name-pve-vm--101--cloudinit
dm-uuid-LVM-i2jw2DEc8aJxdhf3mg7sAcAbc57lfeNL967xBhsO2KsTDqSJ5KB9pGqef5HjQJHk
dm-uuid-LVM-i2jw2DEc8aJxdhf3mg7sAcAbc57lfeNLQ6hkWGll1H38yFz0ty3RmmJPSRSbj1sa
dm-uuid-LVM-i2jw2DEc8aJxdhf3mg7sAcAbc57lfeNLrSofGgZtL41un6baoCpRHunOrbJeMTeO
dm-uuid-LVM-i2jw2DEc8aJxdhf3mg7sAcAbc57lfeNLWPjyk8d4ik2D6KIcp2zaugdFsHB4TNOM
lvm-pv-uuid-pRECVX-zqKA-evrD-PNof-sTYg-zNrD-WUelFe
usb-Generic-_Multi-Card_20120926571200000-0:0
wwn-0x5000c50015a53388
wwn-0x5000cca562c751e4
wwn-0x5000cca562c751e4-part1
wwn-0x5000cca562c751e4-part2
wwn-0x5000cca562c751e4-part3
wwn-0x50014ee2ab77b23f
wwn-0x50014ee2ab77b23f-part1
wwn-0x50014ee2ab77b23f-part9
```

In my case, the ID of the drives I want are `ata-ST3750330NS_9QK2GT8`, `ata-ST3750640NS_3QD0AYE0`, and `ata-ST3750640NS_3QD0BQ5G`.

Now find your VM_ID, mine is 102.

![vm list in proxmox](https://l4.dunkirk.sh/i/kDlPW3DcBeJM.webp)

Run the following command, replacing the VM_ID and DISK_ID with yours.

> root@thespia:~# qm set VM_ID -scsi1 /dev/disk/by-id/DISK_ID
```bash
root@thespia:~# qm set 102 -scsi1 /dev/disk/by-id/ata-ST3750330NS_9QK2GT8R
update VM 102: -scsi1 /dev/disk/by-id/ata-ST3750330NS_9QK2GT8R
root@thespia:~# qm set 102 -scsi2 /dev/disk/by-id/ata-ST3750640NS_3QD0AYE0
update VM 102: -scsi2 /dev/disk/by-id/ata-ST3750640NS_3QD0AYE0
root@thespia:~# qm set 102 -scsi3 /dev/disk/by-id/ata-ST3750640NS_3QD0BQ5G
update VM 102: -scsi3 /dev/disk/by-id/ata-ST3750640NS_3QD0BQ5G
```

Here is how it appears in Proxmox:

![hardware page of the vm in proxmox](https://l4.dunkirk.sh/i/1fUVr0Jk7wBg.webp)

If everything went well, then you can start your VM now. After it finishes booting up, you will get the screen below. Make sure Install/Upgrade is selected and hit enter.

![truenas startup screen](https://l4.dunkirk.sh/i/kGuQCi-UJ-XU.webp)

You will then get this screen, use space to select the first drive and hit enter.

![destination media screen](https://l4.dunkirk.sh/i/Z4v0J-gL1Jn9.webp)

Hit enter one last time and enter your password.

![confirm erase page](https://l4.dunkirk.sh/i/7Dok7mhDl-44.webp)
![repeat password page](https://l4.dunkirk.sh/i/iV97jX_E_lSM.webp)

Select BIOS, as this is the default mode for Proxmox VMs.

![boot via bios or via uefi screen](https://l4.dunkirk.sh/i/TJJEYiblQh5c.webp)

After about five to ten minutes, the installation process will finish and the VM will ask you to remove installation media and reboot.

![installation succeded message](https://l4.dunkirk.sh/i/9SAGd4cObCee.webp)
![hardware screen in proxmox](https://l4.dunkirk.sh/i/cub6hDGGZuMB.webp)

Select the installation media and remove it with the top button, go back to the console and hit enter, which will take you back to the main menu. On the main menu, select reboot with the arrow keys and hit enter.

![power options screen in truenas](https://l4.dunkirk.sh/i/5VpCwlveDO8d.webp)

Once the machine restarts, it will display an IP address in the console.

![ip address displayed in proxmox console](https://l4.dunkirk.sh/i/QZcl0rYVg8Hu.webp)

Upon connecting to the IP address, you will get this screen. Use the root username and the password, previously configured, to login.

![truenas web ui signin page](https://l4.dunkirk.sh/i/SUBmMtGZhoNK.webp)

Once logged in, I updated the system using the button on the home screen.

![check for updates button in the truenas web ui](https://l4.dunkirk.sh/i/4sumumhGS0h0.webp)

I chose not to save the configuration file when prompted, proceeded to install the updates, and rebooted.

I hope you enjoyed the tutorial! My inspiration to make this came from watching [“How to run TrueNAS on Proxmox?”](https://www.youtube.com/watch?v=M3pKprTdNqQ) by [Christian Lempa](https://www.youtube.com/@christianlempa). I encourage you to watch his video if you want a video guide to installing TrueNAS on Proxmox.

* Written on `2023-07-10` and republished to this blog (with minor edits) on `2024-10-31`
