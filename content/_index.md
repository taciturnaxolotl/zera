+++
+++

<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; margin: 2rem;">
    <img src="/pfps/cyber-games.webp" alt="A photo of kieran with a dark navy shirt with an ip address and yellow cyber stinger looking at a laptop screen" width="512" height="512" class="u-photo"/>
    {{ is() }}
</div>

# About me

Erlo! My name is Kieran Klukas i'm {{ age(length=0) }} years old and love cyber, hardware, nix :nix:, and food :)

> flake.nix

```nix
{
  description = ":waves:";

  outputs = { self, ... }:
  let
    kieran = rec {
      name = "Kieran Klukas";
      aliases = [ "taciturnaxolotl" "krn" ];
      location = "AS11776/24";
      hobbies = [ "robotics" "ctfs" "bunny trails" "nix"];
    };
  in
  {
    inherit kieran;
  };
}
```

this site has anonymous page hits (<code id="visits">0</code> and counting) via [abacus](https://jasoncameron.dev/abacus/)

# Methods of contact

I love talking to people so if you are curious about something or just want to say hi feel free to reach out over email or anything on [/verify](/verify)

- Email: [kieran@dunkirk.sh](mailto:kieran@dunkirk.sh)
- RSS/Atom: [:rss:](rss.xml) or [:atom-feeds:](atom.xml)
