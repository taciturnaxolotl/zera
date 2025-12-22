+++
title = "Homelab tour"
date = 2025-12-18
slug = "homelab-tour"
description = "what lives in my homelab in 2025"

[taxonomies]
tags = ["homelab"] 
+++

Well this is a post I somehow have procrastinated on. I originally got the idea to write this up for the [LUP holiday homelab special](https://linuxunplugged.com/646) but before I knew it the submission due date was upon me and I hadn't started so here goes a speedrun tour of my lab.

<!-- more -->

![me with my trusty server](https://l4.dunkirk.sh/i/6PXIFV4xl2Ye.webp){caption="This is my server ember, say hi!"}

I have a few main machines. In order of when I first got them they are:

1. broylt (~2021 main pc / gpu machine :windows:)
2. thespia (~2022 first homelab workstation; runs a vm named vault which houses my storage :proxmox:)
3. ember (~2024 first "real" server; dell poweredge r210 :ubuntu:)
4. nest (early 2024 shared tilde server @ Hackclub :nix:)
5. moonlark (late 2024 framework 13; was my main laptop but the mainboard fried itself and I haven't fixed it yet :nix:)
6. tacyon / pihole (summer 2025 rpi 5 home manager cyber pi / pihole :raspberry_pi:)
7. atalanta (late 2025 macbook air m4 16gb main computing device and what I'm typing this on rn :mac:)
8. terebithia (late 2025 oracle cloud free tier arm vm with 24gb ram and 150 gb of storage :nix:)
9. prattle (late 2025 oracle cloud amd vm that has since died but it used to be my monitoring node :nix:)

As many of my machines as I can are running :nix: in some flavor. `moonlark` and `terebithia` are the only ones running nixos at the moment but I'm planning on switching `ember` over soon as well as maybe resurrecting `prattle` as well. All my other machines minus thespia and broylt are running my [dots](https://tangled.org/dunkirk.sh/dots) via home manager.

### Ember

![neofetch on ember](https://l4.dunkirk.sh/i/6z4tVvS9eGt2.webp)

This used to run all of my services up till a month ago when I setup my oracle cloud instance and switched all of my main hosted services over. It currently runs my jellyfin / arr stack and any random workloads I want to throw somewhere without setting up a nix config for it. It in the very near future is probably going to become a quick deploy server in lieu of railway and similar services. The plan is to have a simple cli that will just throw everything on the server from a local repo and just run it with a domain.

For jellyfin the best way I have found to interact with it is via `Ruddar` on my phone and `Infuse` on either my phone or apple tv. It works insanely well for streaming stuff and I'm very tempted to buy a life time sub but I just don't use my media library enough for it to be justified.

### Terebithia

![neofetch on terebithia](https://l4.dunkirk.sh/i/5qwQ7HP0nm4e.webp)

This has really been a rock solid machine for me. I have it setup with my nix config and it auto deploys with `deploy-rs` from github actions over tailscale. It is running my [tangled.org](https://tangled.org/@dunkirk.sh) knot so it hosts all of my git repos and I have a fancy little automation that sets up git hooks in the repos as they are created to auto mirror to github. It is also running [cachet](https://cachet.dunkirk.sh) which is a slack profile picture and emoji proxy (thats where all the emojis in this blog are pulled from) that I built to work at extremely high scale. It was running on `ember` for a while but I swapped it over to here to be a bit more reliable since so many people in Hackclub rely on it now. I'm also running a few slack bots and [battleship-arena](https://battle.dunkirk.sh) again through their own nix services.

![bore screenshot](https://l4.dunkirk.sh/i/TTbQriehUJDb.webp){caption="bore in all it's glory"}

My most exciting services hosted on here though are [bore](https://bore.dunkirk.sh) and [indiko](https://indiko.dunkirk.sh/docs). Bore is a little wrapper I made around [frp](https://github.com/fatedier/frp) which allows me to easily deploy and view my tunnels. It is essentially an ngrok replacement and super slick to use. I made a custom cli for it with `gum` and nix which you can find along with setup instructions on the [tangled repo](https://tangled.org/dunkirk.sh/dots/tree/main/modules/nixos/services/bore).

!![oauth screenshot](https://l4.dunkirk.sh/i/K-GWKS8Lh-CQ.webp)[users managment](https://l4.dunkirk.sh/i/N8I51AOs-va7.webp){caption="the indiko admin ui and oauth consent screen"}

My newest project is [Indiko](https://tangled.org/dunkirk.sh/indiko/). It is a selfhosted IndieAuth / OAuth 2.0 compatible auth server somewhat like Authelia or Authentik but mine! I can defined custom clients and then use it to authorize with my own apps. I'm planning to add support to bore for using indiko as an authentication middleware on protected tunnels probably tomorrow. I'm currently using this to authenticate my shortlinks service [hop](https://hop.dunkirk.sh) ([repo](https://tangled.org/dunkirk.sh/hop)) which allows me to add new viewers and admins on the fly!

There is still a ton of head room on this server so I'm looking forward to adding quite a bit more here.

#### The nix services stack

Right now I have a pretty sweet stack for how I deploy my apps with nix. I have a caddy setup that is connected to my cloudflare account for auto generating certifications via dns attestation and then because it's nix I can just add a new caddy block and it adds it onto my config file.

The way it works is I have service modules in `modules/nixos/services/` that follow a pretty consistent pattern.
Each one has options for the domain, port, and secrets file. When you enable a service it creates a system user, sets up passwordless sudo for restarting the systemd service (needed for non interactive CI/CD), and then runs the app with whatever command is needed. The cool part is in the preStart where it git clones the repo if it doesn't exist and then optionally pulls on restart so I can just push to github and restart the service to deploy. Most of the time though I set up a workflow with tailscale to ssh in and pull down the new content and then restart. I have finally started using proper acls and tags so I feel very proud of myself.

Each service automatically configures its own caddy virtualHost with cloudflare dns challenge for TLS. So when I add a
new service I just do:

```nix
{
    atelier.services.cachet = {
        enable = true;
        domain = "cachet.dunkirk.sh";
        secretsFile = config.age.secrets.cachet.path;
    };
}
```

And boom - it clones the repo, installs dependencies, starts the systemd service, and sets up caddy with automatic
HTTPS. All the secrets are managed with agenix so they're encrypted with my ssh key and decrypted at boot. The
cloudflare API token gets injected into caddy's environment so the DNS challenge just works.

For more complex services like indiko I can add rate limiting in the caddy config -- I have different rate
limits for `/auth/_`, `/api/_`, and general routes all configured in the service module itself. It's all declarative
so the entire stack (caddy, TLS, DNS, users, app deployment) is just nix config that can be auto deployed via deploy-rs from
github actions over tailscale.

### Thespia

!![the harddrives falling out of the case](https://l4.dunkirk.sh/i/PRp924X_rorV.webp)[harddrives in the front](https://l4.dunkirk.sh/i/tBkhMjYzfH-K.webp){caption="I have been blessed with ~5tb of HDD storage but I currently have no place to put it so this is only about 1.5 TB and it is truely attrocious"}

This is the most jank part of the whole lab. It is one of my oldest dedicated machines and it is kind of showing it's age. I really don't do much with it anymore but the harddrives are still somehow kicking. I inherited a large cardboard box of drives from my great uncle (I also got ember from him) and they all have about 10-15% of life left but are in 500 GB and 750 GB sizes which is a wee bit annoying. I'm most likely going to get a beelink or something else that is small and power efficent and just shove a ridiculous amount of m.2 SSDs in there.

This used to my my pride and joy and I paired it with an old laptop (laptops make shockingly good budget servers btw; they have essentially a built in ups after all and are quite power efficent at times) which was named `thalia`. Between those two I made a multi-node proxmox cluster and it was amazing.

### Broylt

This is my first PC built from back when I was 13. I got some of the parts for my birthday and saved up to buy the rest and it was glorious when I first built it. Honestly it hasn't changed a ton since back then. I swapped out the power supply as the original one kept failing and I had to RMA it. I also finally swapped the GPU to a 2070 Super a year or two ago which has been amazing. It is still rocking the original SSD, Asus B550M Plus Wifi motherboard, and the ryzen 5 3600 CPU and honestly I have very little complaints expect for the fact it is windows and that it keeps randomly crashing if I do anything too intense with the GPU. Honestly the issue is probably just that it needs a bigger PSU and as for windows thats really the only reason I still keep it around as you really still do need a windows box for running odd jobs and perhaps most importantly the occasional valorant session.

### Atalanta

This is my macbook which I got this fall after my framework died. It definitly is a wee bit more reliable than my hacky hyprland config but I do still miss my framework. I will probably end up reviving it soon with a new mainboard and it will become my dual boot nixos / windows competition laptop for both FRC (robotics) and various cyber competitions.

![shell config](https://vhs.charm.sh/vhs-1KyplPxIt9f1kNmruDVPVS.gif)

As far as special stuff on this machine there isn't a ton to tell. I'm doing some fancy configuration with nix darwin to make the default screenshot action copy to clipboard and I'm completely removing all pinned items from the doc but I really could be doing more (thanks to [Nick Welsh](https://github.com/nickwelsh/nix-darwin-config) for helping me realize this was possible last config confessions on LUP). I do have my custom shell config which I have been refining for the better part of a year and a half now. It was originally inspired by the [Dreams of Code](https://www.youtube.com/@dreamsofcode) youtube channel zen shell config and then it has become heavily adapted over time. I really like how minimal and clean it feels. If I'm in a git repo it will adapt to display commit status and push / pull status and if I'm over ssh or in a zmx session it also adapts.

[Zmx](https://zmx.sh/) is another one of the fancy things I have started using. It is terminal sessions like tmux but without the bloat. It is a super small program but it does pretty much exactly what I want. I have my servers set up so that I can ssh into them with `ssh t.*` and it will use that session. It is super slick for long running processes.

### Network stack

!![router and switch](https://l4.dunkirk.sh/i/JC13Aar6VPg2.webp)[the access point](https://l4.dunkirk.sh/i/PYMlcqfBHHnD.webp)[rpi](https://l4.dunkirk.sh/i/gygT3oV7R8LH.webp){caption="it is fairly basic but it does work"}

Everything is based on tplink stuff which I rather hate. Their access points are fine but the router and switch are despicable to work with. Their app is even worse if that is even possible. I really love my old setup of using an old workstation to run pfSense with two NICs. It was clean and reliable and the ui was okay to work with. I had to switch it over for my parents so that ostensibly it would be simpler and easier for them to use which as time has proven was very much not true. If money was no object I would love to get a founders edition [Gateway](https://mono.si/) router. You can really tell that it has had heart and soul poured into it and it looks soooooo good as a result.

As far as routing and port forwarding go I generally try to avoid it as much as humanly possible because of the atrocity of the router ui and as a result I have no ports open at the moment. I used cloudflare tunnels for practically everything at this point though now that I have my own VPS I might start using caddy to tunnel stuff back over tailscale for me instead.

### Nest

![my static site on nest](https://l4.dunkirk.sh/i/bO5ra0U14_Vh.webp){caption="rendered from my github readme and served by caddy on nest"}

This is where I used to host most of my throwaway services and slackbots. I still do host a fair amount here but it has got increasingly slower as the user count just keeps going up. It definetly isn't the fault of the admins though. I'm friends with almost all of them and they have done a wonderful job trying to keep it online while it tries to explode itself constantly. It has quite litterally been upgraded at least 4 times now with more and more compute and storage and we keep running out.

Fully nixos server so there is that :)
