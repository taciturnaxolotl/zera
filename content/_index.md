+++
+++

<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; margin: 2rem;">
    <img src="/pfps/redacted.png" alt="A pixelated, low-resolution image of a person wearing a black square mask over their face with two white circular eyes, dressed in dark clothing, set against a chaotic, mosaic-like background of orange, blue, brown, and black pixels." width="512" height="512" class="u-photo"/>
    {{ is() }}
</div>

# About me

Erlo! My name is Kieran Klukas i'm {{ age(length=0) }} years old and love cyber, anything with micro-controllers, obscure languages, nix :nix:, and yummy food :)

> flake.nix

```nix
{
  description = "a short bit about me";

  outputs = { self, ... }:
  let
    kieran = rec {
      name = "Kieran Klukas";
      pronouns = "he/him";
      aliases = [ "taciturnaxolotl" "krn" ];
      location = "Westerville, Ohio, USA";
      hobbies = [ "frc" "ctfs" "random side projects"];
    };
  in
  {
    inherit kieran;
  };
}
```

this site has page hits (<code id="visits">0</code> and counting) via [abacus](https://jasoncameron.dev/abacus/) but they are completely anonymous and just http requests so no sketchy analytics here!

# Want to talk to me?

I'm open to projects or just random questions! Feel free to reach out with any of the following or anything on [/verify](/verify)

- Email: [kieran@dunkirk.sh](mailto:kieran@dunkirk.sh)
- Hackclub Slack: [@krn](https://hackclub.slack.com/team/U062UG485EE) (only if you are a highschooler or younger; [join here](https://hackclub.com/slack/))
- If you just want to know when I make a new post then you can subscribe to the [:rss:](rss.xml) feed
