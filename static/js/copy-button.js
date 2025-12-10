// Based on https://www.roboleary.net/2022/01/13/copy-code-to-clipboard-blog.html

function initCopyButtons() {
  const blocks = document.querySelectorAll("pre[class^='language-']");
  
  for (const block of blocks) {
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
    const copyCodeText = "Copy code";
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
      await copyCode(block, header, button);
    });
  }

  async function copyCode(block, header, button) {
    const code = block.querySelector("code");
    const text = code.innerText;

    // Only try to copy if clipboard API is available
    if (navigator.clipboard) {
      try {
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
      } catch (err) {
        console.error("Failed to copy:", err);
      }
    }
  }
}

// Since the script has defer attribute, the DOM is already loaded when this runs
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCopyButtons);
} else {
  initCopyButtons();
}
