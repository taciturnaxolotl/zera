+++
title = "Adding a copy code button"
date = 2025-03-14
slug = "adding-a-copy-button"
description = "continuing the chain :)"

[taxonomies]
tags = ["accessibility"]
+++

It took me a little over a month but I finally continued the chain of adding copy code buttons to your code blocks. It started with Salma Alam-Naylor’s [post](https://whitep4nth3r.com/blog/how-to-build-a-copy-code-snippet-button/) which I saw on Hacker News but then [David Bushell](https://dbushell.com/2025/02/14/copy-code-button/) also posted on it and [Ragman](https://www.ragman.net/musings/copy_code/) made a bluesky post (sky? bloop? atproto bloop? honestly not sure what a more interesting name would be) and it's been saved in my mind since then that I should add it.

<!-- more -->

What finally pushed me over the edge was seeing the [Duckquill](https://duckquill.daudix.one) theme and its fancy code blocks. I cloned the theme (`git clone https://codeberg.org/daudix/duckquill.git`) and figured out that the actual copy code was some reasonably simple js in `static/copy-button.js`. I copied that file and messed with it a bit as well as the css (`sass/_pre-container.scss` and some icon stuff in `sass/_icon.scss`) to make it work with my theme and style. 

A quick hash for cache busting and import later it all worked!

> templates/head.html
```html
{% set jsHash = get_hash(path="js/copy-button.js", sha_type=256,
base64=true) %}
<script
  src="{{ get_url(path='js/copy-button.js?' ~ jsHash, trailing_slash=false) | safe }}"
  defer
></script>
```

The one thing I expanded on was the ability to specify a file name / comment for the code block. When js is disabled a markdown `>` blockquote on the line before the code block will create a header tab for the code block. I snipped the header tab idea from [chevyray.dev](https://chevyray.dev) and I grew to quite like it so I didn't want to abandon it over a copy button.

Here is my code should you want to use it:

> static/js/copy-button.js
```js
// Based on https://www.roboleary.net/2022/01/13/copy-code-to-clipboard-blog.html
document.addEventListener("DOMContentLoaded", () => {
  const blocks = document.querySelectorAll("pre[class^='language-']");

  for (const block of blocks) {
    if (navigator.clipboard) {
      // Code block header title
      const title = document.createElement("span");
      const lang = block.getAttribute("data-lang");
      const comment =
        block.previousElementSibling &&
        (block.previousElementSibling.tagName === "blockquote" ||
          block.previousElementSibling.nodeName === "BLOCKQUOTE")
          ? block.previousElementSibling
          : null;
      if (comment) block.previousElementSibling.remove();
      title.innerHTML =
        lang + (comment ? ` (${comment.textContent.trim()})` : "");

      // Copy button icon
      const icon = document.createElement("i");
      icon.classList.add("icon");

      // Copy button
      const button = document.createElement("button");
      const copyCodeText = "Copy code"; // Use hardcoded text instead of getElementById
      button.setAttribute("title", copyCodeText);
      button.appendChild(icon);

      // Code block header
      const header = document.createElement("div");
      header.classList.add("header");
      header.appendChild(title);
      header.appendChild(button);

      // Container that holds header and the code block itself
      const container = document.createElement("div");
      container.classList.add("pre-container");
      container.appendChild(header);

      // Move code block into the container
      block.parentNode.insertBefore(container, block);
      container.appendChild(block);

      button.addEventListener("click", async () => {
        await copyCode(block, header, button); // Pass the button here
      });
    }
  }

  async function copyCode(block, header, button) {
    const code = block.querySelector("code");
    const text = code.innerText;

    await navigator.clipboard.writeText(text);

    header.classList.add("active");
    button.setAttribute("disabled", true);

    header.addEventListener(
      "animationend",
      () => {
        header.classList.remove("active");
        button.removeAttribute("disabled");
      },
      { once: true },
    );
  }
});
```

and the css:

> sass/css/_copy-button.scss
```scss
i.icon {
    display: inline-block;
    mask-size: cover;
    background-color: currentColor;
    width: 1rem;
    height: 1rem;
    font-style: normal;
    font-variant: normal;
    line-height: 0;
    text-rendering: auto;
}

.pre-container {
    --icon-copy: url("data:image/svg+xml,%3Csvg viewBox='0 0 16 16' height='16' width='16' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 3c0-1.645 1.355-3 3-3h5c1.645 0 3 1.355 3 3 0 .55-.45 1-1 1s-1-.45-1-1c0-.57-.43-1-1-1H3c-.57 0-1 .43-1 1v5c0 .57.43 1 1 1 .55 0 1 .45 1 1s-.45 1-1 1c-1.645 0-3-1.355-3-3zm5 5c0-1.645 1.355-3 3-3h5c1.645 0 3 1.355 3 3v5c0 1.645-1.355 3-3 3H8c-1.645 0-3-1.355-3-3zm2 0v5c0 .57.43 1 1 1h5c.57 0 1-.43 1-1V8c0-.57-.43-1-1-1H8c-.57 0-1 .43-1 1m0 0'/%3E%3C/svg%3E");
    --icon-done: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Cpath d='M7.883 0q-.486.008-.965.074a7.98 7.98 0 0 0-4.602 2.293 8.01 8.01 0 0 0-1.23 9.664 8.015 8.015 0 0 0 9.02 3.684 8 8 0 0 0 5.89-7.75 1 1 0 1 0-2 .008 5.986 5.986 0 0 1-4.418 5.816 5.996 5.996 0 0 1-6.762-2.766 5.99 5.99 0 0 1 .922-7.25 5.99 5.99 0 0 1 7.239-.984 1 1 0 0 0 1.363-.371c.273-.48.11-1.09-.371-1.367A8 8 0 0 0 9.492.14 8 8 0 0 0 7.882 0m7.15 1.998-.1.002a1 1 0 0 0-.687.34L7.95 9.535 5.707 7.29A1 1 0 0 0 4 8a1 1 0 0 0 .293.707l3 3c.195.195.465.3.742.293.277-.012.535-.133.719-.344l7-8A1 1 0 0 0 16 2.934a1 1 0 0 0-.34-.688 1 1 0 0 0-.627-.248'/%3E%3C/svg%3E");

    margin: 1rem 0 1rem;
    border-radius: 0.75rem;

    .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-radius: 0.2em 0.2em 0 0;
        background-color: var(--accent);
        background-size: 200%;
        padding: 0.25rem;
        height: 2.5rem;

        span {
            margin-inline-start: 0.75rem;
            color: var(--purple-gray);
            font-weight: bold;
            line-height: 1;
        }

        button {
            appearance: none;
            transition: 200ms;
            cursor: pointer;
            border: none;
            border-radius: 0.4rem;
            background-color: transparent;
            padding: 0.5rem;
            color: var(--purple-gray);
            line-height: 0;

            &:hover {
                background-color: color-mix(
                    in oklab,
                    var(--accent) 80%,
                    var(--purple-gray)
                );
            }

            &:focus {
                background-color: color-mix(
                    in oklab,
                    var(--accent) 80%,
                    var(--purple-gray)
                );
            }

            &:active {
                transform: scale(0.9);
            }

            &:disabled {
                cursor: not-allowed;

                &:active {
                    transform: none;
                }
            }

            .icon {
                -webkit-mask-image: var(--icon-copy);
                mask-image: var(--icon-copy);
                transition: 200ms;

                :root[dir*="rtl"] & {
                    transform: scaleX(-1);
                }
            }
        }

        &.active {
            button {
                animation: active-copy 0.3s;

                color: var(--purple-gray);

                .icon {
                    -webkit-mask-image: var(--icon-done);
                    mask-image: var(--icon-done);
                }
            }

            @keyframes active-copy {
                50% {
                    transform: scale(0.9);
                }
                100% {
                    transform: none;
                }
            }
        }
    }

    pre {
        margin: 0;
        box-shadow: none;
        border-radius: 0 0 0.2em 0.2em;
    }
}
```
