// CSS Naked Day - April 9th
// Celebrates semantic HTML by removing CSS for one day
// https://css-naked-day.org/

(() => {
	const now = new Date();

	// CSS Naked Day lasts for 50 hours across all timezones
	// From 10:00 April 8 UTC to 12:00 April 10 UTC
	// This ensures it's April 9 somewhere in the world for the entire duration
	const startTime = new Date(Date.UTC(now.getUTCFullYear(), 3, 8, 10, 0, 0)); // April 8, 10:00 UTC
	const endTime = new Date(Date.UTC(now.getUTCFullYear(), 3, 10, 12, 0, 0)); // April 10, 12:00 UTC

	const isCSSNakedDay = now >= startTime && now < endTime;

	// Check if it's CSS Naked Day
	if (isCSSNakedDay) {
		// Remove all stylesheets immediately (prevents flash of styled content)
		const stylesheets = document.querySelectorAll('link[rel="stylesheet"]');
		stylesheets.forEach((sheet) => {
			sheet.remove();
		});

		// Remove any inline styles
		const inlineStyles = document.querySelectorAll("style");
		inlineStyles.forEach((style) => {
			style.remove();
		});

		// Add a simple message at the top of the page once DOM is ready
		if (document.body) {
			insertMessage();
		} else {
			document.addEventListener("DOMContentLoaded", insertMessage);
		}

		function insertMessage() {
			const body = document.body;

			const hr1 = document.createElement("hr");
			const aside = document.createElement("aside");
			aside.innerHTML =
				'<h2>the website is broke!!! freak out!!!!!</h2> <p>just kidding lol. today is <a href="https://css-naked-day.org/">css naked day</a> know to the rest of the world as april 9th! this was created as a fun way to promote web standards and remind ourselves of the earlier days of the web! everything should be still functional on my site but in case not you can find my email somewhere on here and let me know :)</p><p><sub>* technicallllly there is still a wee bit of css to make sure stuff isn\'t completely out of control but everything else gets stripped so i say it counts</sub></p>';
			const hr2 = document.createElement("hr");

			body.insertBefore(hr1, body.firstChild);
			body.insertBefore(aside, body.firstChild.nextSibling);
			body.insertBefore(hr2, aside.nextSibling);

			// Add basic constraints to prevent overflow
			const style = document.createElement("style");
			style.textContent =
				"img, video, iframe { max-width: 100%; height: auto; } pre { max-width: 100%; overflow: auto; } .emoji-inline { display: inline; height: 1.2em; width: 1.2em; vertical-align: text-bottom; }";
			document.head.appendChild(style);
		}
	}
})();
