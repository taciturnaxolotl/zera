+++
title = "Blade SSD removal MBP 2017"
date = 2024-08-03
slug = "ssd-removal-mbp-2017"
description = "Removal of the SSD of the MacBook Pro 2017 (functions keys)"

[taxonomies]
tags = ["tutorial", "teardown", "archival"]

[extra]
has_toc = true
+++

Hi! I've had a MacBook Pro 2017 for about a year now, and I got it used; it's been great so far until one day after updating it just refused to turn on I'm not entirely sure why this happened, but I replaced the battery and that didn't solve the issue so yeah ^_^  

<!-- more -->

{{ img(id="https://cloud-owp7vmln1-hack-club-bot.vercel.app/0img_1846_1_.jpg" alt="MacBook proprietary blade SSD" caption="it really was a rather sleek design; shame that apple got rid of it in favor of soldered on storage") }}

I eventually decided to just try and remove the SSD from the MacBook and see if there was a way to recover any files from it (spoiler: there kinda is, but it's annoying) but I couldn't find any guide online and iFixit had nothing. So I decided to just try and yolo it and see if I could figure it out on my own, and surprisingly I actually managed to do it! Turns out,  the process isn't that hard! I'll take you through the steps I took so that if you want to do this, it's much less of a hassle.

## Guide

1. the first thing you need to do is to remove the screws from the back of your MacBook. This will use a P5 Pentalobe driver, which I believe you can buy from iFixit as well as several other companies on Amazon.
{{ img(id="https://cloud-nw5fqpqfw-hack-club-bot.vercel.app/1img_1838.jpg", alt="Removing the screws") }}

1. next you need to crack open the shell of the MacBook by prying under the front (on the side where the MacBook opens). It's pretty helpful to have a suction cup or something to lift it up a bit so you can get your prying tool underneath (I used a flat plastic prying tool I got from the battery repair kit for this MacBook, but a guitar pick or credit card would probably also work)
{{ img(id="https://cloud-nw5fqpqfw-hack-club-bot.vercel.app/2img_1839.jpg", alt="using a suction cup to lift the back shell") }}

1. now once you've got the back slightly opened up just run around the edge of the shell prying up on it until the front and two sides are free then just pull forward at a slight (15ish degree?) angle, and it should slide right out.
{{ img(id="https://cloud-nw5fqpqfw-hack-club-bot.vercel.app/3img_1840.jpg", alt="the opened MacBook") }}

1. once it's open, locate the silver metal block looking thing; this is your SSD
{{ img(id="https://cloud-nw5fqpqfw-hack-club-bot.vercel.app/4img_1841.jpg", alt="the SSD") }}

1. now using a T5 Torx driver (why couldn't you just use one type of screws apple 😭; be more like framework) you need to unscrew the two screws on either side of the front of the SSD
{{ img(id="https://cloud-nw5fqpqfw-hack-club-bot.vercel.app/7img_1844.jpg", alt="the screws") }}

1. now comes the slightly scary part (for me at least) you need to lift the black tape that's covering the top of the SSD (don't worry the SSD will be fine)
{{ img(id="https://cloud-nw5fqpqfw-hack-club-bot.vercel.app/8img_1845.jpg", alt="the removed tape on the SSD") }}

1. now just slightly pull on the SSD (again at a slight angle) and it should pop right out!
{{ img(id="https://cloud-nw5fqpqfw-hack-club-bot.vercel.app/9img_1846.jpg", alt="the SSD out of the MacBook") }}

## Postlog and notes

I hope this helped if you are trying to do this your self! Now for recovering the data the two options I've found are a) buy a secondary MacBook of the exact same generation and model and swap your SSD in or b) pay some data recovery company a lot of money to probably do the same thing for you; neither option is super appealing to me, so I'll keep searching for alternatives and I will be sure to update this article if I do find any. As of today though (August 3rd 2024) I haven't been able to get a hold of another MacBook or adaptor to connect this to my computer but if you do find one definitely leave a comment on the hacker news post linked below!

* Posted on HackerNews on `2024-08-03` [hn://item/41147359](https://news.ycombinator.com/item?id=41147359)
* Republished to this blog on `2024-10-31` with minor edits
