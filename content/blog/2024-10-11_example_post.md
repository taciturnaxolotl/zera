+++
title = "Test Post"
date = 2024-10-11
slug = "test-post"
description = "Testing out styling and features."

[taxonomies]
tags = ["meta"]

[extra]
has_toc = true
+++

This post is for me to just test out all the features and styling of the blog, and to
make sure that if I change the CSS or anything I don't break any of it! This is also a
sort of light style guide for blog posts in general.

<!-- more -->

## Section Headers

Sections headers (prefixed with `##` in markdown) are the main content separators for posts, and
can be [linked to](#section-headers) directly. To link to them, the header's text needs to be
*kebab-cased*, so the above would be `#section-headers`.

### But what about sub-headers?

I usually use `###` sub-headers to ask the question I think the reader is (or should be) asking at
this point in the article. For example, if I just posted some code with an obvious error, I might
follow that up with `### Wait, won't that crash?` or something similar. Using this approach lets
me write posts in a conversational way, and helps me continually frame myself in the mind of the
reader.

### Table of Contents

Section and sub-headers can be used to generate a table of contents at the start of the page. To
enable this feature for a post, add the following to the page's frontmatter:

> toml
```toml
[extra]
has_toc = true
```

I don't like content that is nested more than 2 layers deep, so only `##` and `###` should be used
to divide things up.

## Embedding Code

This is prominently a coding blog, so code will show up a lot. First off, a monospaced text block is
denoted by wrapping the text in triple back-tick characters <code>&#x0060;&#x0060;&#x0060;</code>.

```
┌──────────────────────────┐
│ This text is monospaced. │
│ This                     │
│      text                │
│           is             │
│              monospaced. │
└──────────────────────────┘
```

### Syntax Highlighting

If you want syntax coloring, you put the name of the programming language immediately after the ticks.
So writing this:

~~~
```rust
fn main() {
    println!("Hello, world!");
}
```
~~~

Will produce this:

```rust
fn main() {
    println!("Hello, world!");
}
```

### Code Block Title

Sometimes it can help to give a header to a code block to signal what it represents. To do this, you put
a single-line block quote immediately before the code block. So by prepending the following code with
`> src/main.rs`, I can produce this:

> src/main.rs
```rust
fn main() {
    println!("This code is in main.rs!");
}
```

This can be useful to explicitly state the programming language or format being used:

> TOML
```toml
title = "Test Post"
slug = "test-post"
description = "Testing out styling and features."

[taxonomies]
tags = ["meta"]
```

### Inline Code

As seen above, sometimes code items are mentioned in regular paragraphs, but you want to
draw attention to them. To do this, you can wrap it in &#x0060; back-tick quotes. For
example, if I wanted to mention Rust's `Vec<T>` type.

```md
`Vec<T>`
```

You can wrap a link around a code tag if you want to link to the docs, for example I could
link to the [`Option<T>::take_if`](https://doc.rust-lang.org/std/option/enum.Option.html#method.take_if)
method directly.

```md
[`Option<T>::take_if`](https://doc.rust-lang.org/std/option/enum.Option.html#method.take_if)
```

## Block Quotes

I can display a quote by prepending multiple lines of text with `>` like so, which will
wrap it in a `blockquote` tag:

> "This text will appear italicized in a quote box!"

### Reader Questions

When displaying reader questions, I start the block quote with a bolded name, like so:

> **SonicFan420x69 asks:**
>
> &ldquo;What is your opinion of the inimitable video game character, Sonic the Hedgehog? Please
> answer soon as it is a matter of life or death.&rdquo;

### Cited Quotations

For when I want to have a citation, I can use the html `<cite>` tag after the quote text and it
will prepend it with a nice `—` em dash.

> "I don't know half of you half as well as I should like, and I like less than half of you half
> as well as you deserve."
>
> <cite>Bilbo Baggins</cite>

## Icons &amp; Images

They were shown in the previous section, but icons (provided by [Remix Icon](https://remixicon.com/)),
can be used anywhere by inserting an `<i>` tag with the icon's class. These are useful for adding
some detail and decorating to the pages, and is another way to break up text.

## Embedding Media

Images and videos are a great way to break up content and prevent text fatigue.

### Images

Images can be embedded using the usual markdown syntax:

```md
![alt text](/path/to/image.png)
```

![NOISE1 screenshot](https://img.itch.zone/aW1hZ2UvNTU2NDU0LzI5MTYzNzgucG5n/original/6GRlJM.png)

When there are multiple paragraphs of text in a row (usually 3-4), and nothing else to break
them up, images can be interspersed to help prevent text-wall fatique.

You can also add captions to images:

<figure>
    <img src="https://img.itch.zone/aW1hZ2UvNTU2NDU0LzI5MTYzNzkucG5n/original/8LIdCb.png" alt="NOISE1 screenshot">
    <figcaption>
        NOISE1 is a dark sci-fi hacker-typing stealth game.
    </figcaption>
</figure>

But there is no way to do this in markdown so you have to use the `<figure>` tag like so:

```html
<figure>
    <img src="/path/to/image.png" alt="Alt text goes here.">
    <figcaption>Caption text goes here.</figcaption>
</figure>
```

### Videos

To embed a video, you use the `youtube` shortcode e.g.

> post.md
```md
{{/* youtube(id="kiWvNwuBbEE") */}}
```

You can also add the `autoplay=true` flag to make the video autoplay.

{{ youtube(id="NodwjZF7uZw") }}

The shortcode is processed into an iframe which looks like this:

> post.html
```html
{{ youtube(id="kiWvNwuBbEE") }}
```

## Miscellaneous

You can also create `<hr>` horizontal rule tags using `---` in markdown, like so:

---

But these should be used sparingly, if at all.
