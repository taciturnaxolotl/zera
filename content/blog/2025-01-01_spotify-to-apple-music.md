+++
title = "Exodus of Spotify Songs to the land of Apple Music"
date = 2025-01-01
slug = "spotify-to-apple-music"
description = "Homegrown solution rather than paying for it ^-^"

[taxonomies]
tags = ["apple", "music"]

[extra]
has_toc = true
+++

Today my family decided to get an Apple One subscription and use Apple Music instead of spotify. It makes sense from a cost standpoint (spotify is $20 a month vs $37.95 and `2TB` of storage plus all apple subscriptions) but I have about 3 years of history on spotify (1267 at time of writing) so manually transferring the songs isn't an option. I did some research but all I found was over priced apps and annoying python scripts.

<!-- more -->

{{ img(id="https://cloud-r47l8h2er-hack-club-bot.vercel.app/0img_3821.jpg" alt="screenshot of the apple music app saying welcome to apple music" caption="the proper horror this should/does instill 💀") }}

## Shortcut Time

I haven't played around with apple shortcuts near enough but I know that they can be quite powerful (case in point [eieio.games](https://eieio.games/blog/doom-in-the-ios-photos-app/)). I looked to see whether spotify had a shortcut to get songs out first but didn't find anything (come on spotify!) but then when I checked Apple Music it expectedly had quite a few options. One of the options is add to playlist which when I tested it initially with the share sheet as input could take a spotify url. That got me thinking; why can't I just import a file of urls on new lines? Turns out that's exactly what you can do. If you start with a file as the input and then bring it to a split text block then you can route that directly to the add songs block! Whats even better is that you don't even need some fancy looping system, you can simply dump thousands of songs into it and it takes care of it super easily.  

{{ img(id="https://cloud-pbd6jl8ws-hack-club-bot.vercel.app/0img_3824.png" alt="screenshot of the shortcut" caption="if you want to try it yourself you could build the shortcut from scratch or you can use the link below") }}

Now the second part of the puzzle was exporting the liked playlist. I really didn't want to mess with the slack api and registering an oauth app but then I remembered that you can simple just hit control + a to select songs in the desktop app 🤦 and turns out if you copy it then it literally just chucks it all into your clipboard as spotify links on newlines. A quick `vi test.txt` and sending the file to myself over slack latter I could simply select the song file and use the share sheet to import it. It took a solid 35 seconds to import but gave a nice progress bar up top!

### Adendum

- [the apple shortcut] for your copy pasta pleasure
