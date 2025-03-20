// Based on https://www.roboleary.net/2022/01/13/copy-code-to-clipboard-blog.html
document.addEventListener("DOMContentLoaded", () => {
  const blocks = document.querySelectorAll("pre[class^='language-']");

  for (const block of blocks) {
    if (navigator.clipboard) {
      // Code block header title
      const title = document.createElement("span");
      title.style.color = "var(--accent-text)";
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
      container.classList.add("pre-container", "crt", "scanlines");
      container.appendChild(header);

      const code = block.querySelector("code");
      const cursor = document.createElement("span");
      cursor.classList.add("cursor");
      cursor.setAttribute("style", "display: inline;");
      cursor.innerHTML = "█";
      const lastline = code.lastChild;
      const spans = lastline.getElementsByTagName("span");
      const lastspan = spans[spans.length - 1];
      if (lastspan) {
        lastspan.appendChild(cursor);
      } else {
        lastline.appendChild(cursor);
      }

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
