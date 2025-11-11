document.addEventListener("DOMContentLoaded", () => {
	const content = document.querySelector("main");
	if (!content) return;

	const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT, {
		acceptNode: (node) => {
			// Skip code blocks, pre tags, and script/style tags
			let parent = node.parentElement;
			while (parent) {
				const tag = parent.tagName.toLowerCase();
				if (
					tag === "code" ||
					tag === "pre" ||
					tag === "script" ||
					tag === "style"
				) {
					return NodeFilter.FILTER_REJECT;
				}
				parent = parent.parentElement;
			}
			return NodeFilter.FILTER_ACCEPT;
		},
	});

	const nodesToReplace = [];
	while (walker.nextNode()) {
		const node = walker.currentNode;
		if (/:[\w-]+:/.test(node.textContent)) {
			nodesToReplace.push(node);
		}
	}

	nodesToReplace.forEach((node) => {
		const frag = document.createDocumentFragment();
		const parts = node.textContent.split(/(:[\w-]+:)/);

		parts.forEach((part) => {
			if (/^:[\w-]+:$/.test(part)) {
				const name = part.slice(1, -1);

				const span = document.createElement("span");
				span.className = "emoji-inline--wrapper";

				const img = document.createElement("img");
				img.src = `https://cachet.dunkirk.sh/emojis/${name}/r`;
				img.alt = part;
				img.className = "emoji-inline";
				img.loading = "lazy";
				img.setAttribute("aria-label", `${name} emoji`);

				// Fallback: if image fails to load, show original text
				img.onerror = () => {
					span.replaceWith(document.createTextNode(part));
				};

				span.appendChild(img);
				frag.appendChild(span);
			} else if (part) {
				frag.appendChild(document.createTextNode(part));
			}
		});

		node.replaceWith(frag);
	});
});
