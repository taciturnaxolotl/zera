+++
title = "Hilton Decompilation"
date = 2024-10-23
slug = "hilton-decompilation"
description = "Decompiling the Hilton Honors app to try and reverse engineer the digital keycard feature further"
draft = true

[taxonomies]
tags = ["reverse engineering", "hilton"]
+++

Ello! I'm back again! I'll be staying at a Hotel again in two days so I decided to try to decompile the app ahead of time so I can test stuff while I'm there. I decided to target the android app first because it seemed easier to decompile (i've partly decompiled an apk before about 3 and half years ago to embed a payload in it and I don't remember it being horrible) and I knew getting the apk itself would be far easier than from the Apple App Store.

<!-- more -->

{{ img(id="https://cloud-glc3mgu9t-hack-club-bot.vercel.app/0image.png" alt="screenshot of the nix packages entry" caption="prepackaged for nix; always a good sign") }}

I was able to download the apk from the [apkcombo.com](https://apkcombo.com/downloader/#package=com.hilton.android.hhonors) website by simply inputing the play store URL so we were off to a good start. Apktool was already in [nix packages](https://search.nixos.org/packages?channel=unstable&from=0&size=50&sort=relevance&type=packages&query=apktool) so we didn't have to do anything fancy there. One `pkgs.unstable.apktool` and a `sudo nixos-rebuild switch` latter and we were ready to go. Then I waited another 2 days lol. Finally in the hotel room (again crunched on time; why do I never seem to learn?) I was able to decompile the apk and start looking around.

{{ img(id="https://cloud-qh7hbvivt-hack-club-bot.vercel.app/0image.png" alt="screenshot of the successful decompilation process" caption="all nicely decompiled") }}

I started uploading the decompiled app to github ([taciturnaxolotl/hilton-honors](https://github.com/taciturnaxolotl/hilton-honors)) which was incredibly slow and then started poking around the app. The first thing I noticed was quite a few files with firebase in the name as well as several play store properties files. All of them seemed to follow the same pattern of having a `version`, `client`, and then file specific client key.

```text
$ ls unknown/firebase*

unknown/firebase-annotations.properties    unknown/firebase-encoders.properties
unknown/firebase-appindexing.properties    unknown/firebase-encoders-proto.properties
unknown/firebase-auth-interop.properties   unknown/firebase-iid-interop.properties
unknown/firebase-datatransport.properties  unknown/firebase-measurement-connector.properties
unknown/firebase-encoders-json.properties
```

</br>

> firebase-auth-interop.properties
```
version=20.0.0
client=firebase-auth-interop
firebase-auth-interop_client=20.0.0
```



As I did last article I will be taking any questions / comments about this article via email and then posting them here to my site! If you have a question or comment, feel free to email me at [me@dunkirk.sh](mailto://me@dunkirk.sh).
