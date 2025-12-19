+++
title = "Cleaning exif data with git pre-commit"
date = 2025-02-15T19:57:01
slug = "remove-exif-git-hook"
description = "took longer then it probably should have 😊"

[taxonomies]
tags = ["mildrant", "tutorial"]
+++

I saw this [post](https://jade.fyi/blog/pre-commit-exif-safety/) from [jade.fyi](https://jade.fyi) on using a git hook to clear exif data from your images before you commit them and realized I should probably implement that too lol. Interestingly jade also uses zola for her site but she used pre-commit hooks whereas I wanted to do something that used native git hooks.

<!-- more -->

I started with the naive method of just having a `.git/hooks/pre-commit` file that would run `exiftool` on the input but after realizing that hooks placed there wouldn't be synced to the repo decided that wasn't the best way. I moved to using a script that would symlink files from the `hooks` directory to `.git/hooks`. It worked moderately well but due to the fact that I used (yes I feel the shame admitting this [:uw_embarrassed:](https://cachet.dunkirk.sh/emojis/uw_embarrassed/r)) `#!/bin/bash` instead of `#!/usr/bin/env bash`. Not realizing my mistake and believing it to be related to the symlink I found [this stack overflow](https://stackoverflow.com/questions/4592838/symbolic-link-to-a-hook-in-git/#:~:text=While%20you%20can%20use%20symbolic%20links) answer which taught me that you can use `git config core.hooksPath hooks` to move the hooks directory to `./hooks` in the root of your repo! After doing that and it still not working (i feel very dense writing this lol) I finally realized that the shebang was wrong and then it worked!

![the commit hook finally working!](https://l4.dunkirk.sh/i/Q-zmdBNx9Bee.webp){caption="phew"}

Is there anything at all to learn from this? Well yes actually! You can use the script below and the `git config core.hooksPath hooks` setting to scrub your own images!

> hooks/pre-commit
```bash
#!/usr/bin/env bash

# Check if exiftool is installed
if ! command -v exiftool &> /dev/null; then
  echo "Error: exiftool is not installed.  Please install it." >&2
  exit 1
fi

while read -r file; do
  case "$file" in
    *.jpg|*.jpeg|*.png|*.gif|*.tiff|*.bmp)
      echo "Removing EXIF data from: $file" >&2
      exiftool -all= --icc_profile:all -tagsfromfile @ -orientation -overwrite_original "$file"
      if [ $? -ne 0 ]; then
        echo "Error: exiftool failed to process $file" >&2
        exit 1
      fi
      git add "$file"
      ;;
    *)
      ;;
  esac
done < <(git diff --cached --name-only --diff-filter=ACMR)

exit -0
```

> if you want to add something or comment on the post then I posted about it on bluesky: [https://bsky.app/profile/dunkirk.sh/post/3liaybkkas226](https://bsky.app/profile/dunkirk.sh/post/3liaybkkas226)
