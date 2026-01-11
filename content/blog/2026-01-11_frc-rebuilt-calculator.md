+++
title = "FRC REBUILT Points Calculator"
date = 2026-01-11
slug = "frc-rebuilt-calculator"
description = "Interactive calculator for the 2026 FRC game REBUILT"

[taxonomies]
tags = ["frc", "robotics", "calculator"]

[extra]
has_toc = false
+++

I was manually doing bps calculations yesterday at kickoff and figured there must be a better way so here you go :)

<!-- more -->

### Match Timeline

A match lasts **2 minutes and 40 seconds** (160 seconds total):

| Period | Duration | Hub Status |
|--------|----------|------------|
| **Autonomous** | 20s | Both Hubs Active |
| **Transition Shift** | 10s | Both Hubs Active |
| **Shift 1** | 25s | One Active / One Inactive |
| **Shift 2** | 25s | One Active / One Inactive |
| **Shift 3** | 25s | One Active / One Inactive |
| **Shift 4** | 25s | One Active / One Inactive |
| **End Game** | 30s | Both Hubs Active |

Winning autonomous affects your Hub status so if your alliance scores the most Fuel in AUTO, your Hub is **Inactive** for Shifts 1 & 3, and **Active** for Shifts 2 & 4.

### Ranking points

For Regional/District events:
- **Energized RP:** Score **100 Fuel** (1 RP)
- **Supercharged RP:** Score **360 Fuel** (1 RP)
- **Traversal RP:** Earn **50 Tower points** (1 RP)

### BPS calculator

Use this calculator to determine the balls per second (BPS) your robot needs to achieve ranking point thresholds. Adjust parameters based on your robot's capabilities and strategy.

The max bps is only used in the simulation of the match while the results section is doing back propagation to figure out the necessary BPS needed to hit that ranking point no matter how high that is. If one of the results says "N/A" that means that your reload time is too high and eats up enough shooting time its no longer possible to hit that ranking point threshold.

{{ frcRebuilt() }}

Hopefully this can help your team! May your BPS be ever optimal.
