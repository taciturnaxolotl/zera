+++
title = "Monaspace VS-Code install"
date = 2023-11-10
slug = "monaspace-vs-code-install"
description = "How to install the Github Next team's Monaspace font in VSCode"

[taxonomies]
tags = ["tutorial", "archival"]
+++

To install the Monaspace font on macOS (or windows or linux) with VS Code and enable multifont syntax highlighting with the [CSS JS Loader extension](https://marketplace.visualstudio.com/items?itemName=be5invis.vscode-custom-css), you can follow these steps:

<!-- more -->

{{ img(id="https://assets.vrite.io/64974cb888e8beebeb2c925b/KuOAwCEm9ypWEemv60Qs7.png" alt="monaspace font in action" caption="This font is so pretty and has so many features its amazing. It's main downside is to work it takes to set it up.") }}


## 1. Download and install the Monaspace font:

First visit [https://github.com/githubnext/monaspace/releases/latest](https://github.com/githubnext/monaspace/releases/latest) and download the zip.
Next to install the Monaspace font:
- On macOS, drag the font files into font book.
- For windows, drag into the font window in settings.
- For Linux, clone the repo and run: `cd util; ./install_linux.sh`

## 2. Configure VS Code

Install the [Custom CSS and JS Loader](https://marketplace.visualstudio.com/items?itemName=be5invis.vscode-custom-css) plugin.
Set the font to one of the following options: `Monaspace Neon Var`, `Monaspace Argon Var`, `Monaspace Xeon Var`, `Monaspace Radon Var`, or `Monaspace Krypton Var`.

- You will find this option under _Editor: Font Family_ in the user preferences

{{ img(id="https://assets.vrite.io/64974cb888e8beebeb2c925b/v0cMm5jcwHEgrvtBv4Syx.png" alt="the available varients of the font") }}


Next enable font ligatures in the settings.json with following snippet:

> settings.json
```json
"editor.fontLigatures": "'ss01', 'ss02', 'ss03', 'ss04', 'ss05', 'ss06', 'ss07', 'ss08', calt', 'dlig'",
```
Now enable the custom CSS file within the `settings.json`, modifying the file path for Windows / MacOS / Linux if needed:

> still settings.json
```json
"vscode_custom_css.imports": [
    "file:///Users/{{user}}/.vscode/style.css", // for mac (remove if not mac)
    "file://C://Users/{{user}}/vscode/style.css" // for windows (remove if not windows)
    "file:///home/{{user}}/.vscode/style.css" // for linux (remove if not windows)
],
```

## 3. Create custom CSS file at the path you specified above.

Depending on your VS Code version, the class names might be different, so you may need to use the developer tools to find the correct one.
The styles that worked for me on `VS Code version: 1.84.2 (Universal) commit: 1a5daa3a0231a0fbba4f14db7ec463cf99d7768e` are here:

> style.css
```css
/* Comment Class */
.mtk3 {
    font-family: "Monaspace Radon Var";
    font-weight: 500;
}

/* Copilot Classes */
.ghost-text-decoration {
    font-family: "Monaspace Krypton Var";
    font-weight: 200;
}

.ghost-text-decoration-preview {
    font-family: "Monaspace Krypton Var";
    font-weight: 200;
}
```

*Thanks to **[@fspoettel](https://github.com/fspoettel)** on GitHub for this trick to get the copilot classes when in dev mode*

> "You can inspect transient DOM elements by halting the app with a `debugger` after a delay with a debugger call inside a `setTimeout`."
>
> <cite>[@fspoettel](https://github.com/fspoettel)</cite>

You can copy the following snippet to do just that!

> console
```ts
setTimeout(() => {
    debugger;
}, 10000);
```

Before you are finished make sure you have run the `Enable Custom CSS and JS` command from the command bar.

## Closing Remarks

That should be it! Hopefully you will have a beautiful custom font VS Code install.

If you are looking for a good theme, I can highly recommend the [Catppuccin](https://marketplace.visualstudio.com/items?itemName=Catppuccin.catppuccin-vsc) theme, as that is what I use myself. Be sure to check out [Monaspace’s website](https://monaspace.githubnext.com/) as it is a work of art. Happy Coding! 👩‍💻

* *Updated 2024-08-22: changed mtk4 to mtk3 on the feedback of [mutammim](https://github.com/mutammim)*
* *Updated 2024-10-31: changed around the formatting of the post and moved to [dunkirk.sh](https://dunkirk.sh)*
