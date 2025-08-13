<h3 align="center">
    <img src="https://cloud-4mfbnf9u2-hack-club-bot.vercel.app/0img_3132.png" width="350" alt="site@zera"/>
    <img src="https://raw.githubusercontent.com/taciturnaxolotl/carriage/main/.github/images/transparent.png" height="30" width="0px"/>
</h3>

<p align="center">
    <i>My site v4 (i think)</i>
</p>

<p align="center">
	<img src="https://raw.githubusercontent.com/taciturnaxolotl/carriage/main/.github/images/line-break-thin.svg" />
</p>

![screenshot of the website](https://raw.githubusercontent.com/taciturnaxolotl/zera/refs/heads/main/.github/images/preview.webp)


<p align="center">
	<img src="https://raw.githubusercontent.com/taciturnaxolotl/carriage/main/.github/images/line-break-thin.svg" />
</p>

## Special Features

- The whole website can be statically rendered in `~93ms`
- Deployed via cloudflare pages with a total push to deploy time of `~20s`
- blazing fast privacy preserving view counter with [abacus](https://jasoncameron.dev/abacus/)
```html
<script>
    function cb(res) {
        const fmt = new Intl.NumberFormat('en', { notation: 'compact' });
        const elements = document.querySelectorAll("[id='visits']");
        elements.forEach(el => {
            el.innerText = fmt.format(res.value);
            el.title = res.value + " visits";
        });
    }
</script>
<script async src="https://abacus.jasoncameron.dev/hit/namespace/counter?callback=cb"></script>
```
- Automatic OG image via a custom script using puppeteer.  
![og image example](https://raw.githubusercontent.com/taciturnaxolotl/zera/refs/heads/main/static/blog/hilton-tomfoolery/og.png)

## Awesome projects that made this possible

Huge thanks to [Speyll/anemone](https://github.com/Speyll/anemone) for the template that helped me understand [Zola](https://www.getzola.org/)

This site's theme is based off of the awesome project [Speyll/suCSS/](https://github.com/) with my own flavoring on top and the code theme is based off of [uncomfyhalomacro/catppuccin-zola](https://github.com/uncomfyhalomacro/catppuccin-zola) modified to work with `data-theme` (and then removed again lol).

<p align="center">
	<img src="https://raw.githubusercontent.com/taciturnaxolotl/carriage/main/.github/images/line-break.svg" />
</p>

<p align="center">
	<code>&copy 2024-present <a href="https://github.com/taciturnaxolotl">Kieran Klukas</a></code>
</p>

<p align="center">
	<a href="https://github.com/taciturnaxolotl/zera/blob/main/LICENSE.md"><img src="https://img.shields.io/static/v1.svg?style=for-the-badge&label=Code License&message=AGPL 3.0&logoColor=d9e0ee&colorA=363a4f&colorB=b7bdf8"/></a>
  <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/"><img src="https://img.shields.io/static/v1.svg?style=for-the-badge&label=Content License&message=CC BY-NC-SA 4.0&logoColor=d9e0ee&colorA=363a4f&colorB=b7bdf8"/></a>
</p>
