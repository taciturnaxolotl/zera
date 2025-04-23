// Taken from Vale's 404 Guesser
// https://vale.rocks/assets/scripts/404-guesser.js
// which was based on Gwern's 404 Error Page URL Suggester
// https://gwern.net/static/js/404-guesser.js

class URLSuggester {
  constructor() {
    this.maxDistance = 8;
    this.urls = [];
  }

  async initialize() {
    try {
      const sitemapText = await this.fetchSitemap();
      if (sitemapText) {
        this.urls = this.parseUrls(sitemapText);
        const currentPath = window.location.pathname;
        if (!currentPath.endsWith("/404")) {
          const suggestions = this.findSimilarUrls(currentPath);
          this.injectSuggestions(currentPath, suggestions);
        }
      }
    } catch (error) {
      console.error("Error initializing URL suggester:", error);
    }
  }

  async fetchSitemap() {
    try {
      const response = await fetch("/sitemap.xml");
      return await response.text();
    } catch (error) {
      console.error("Error fetching sitemap:", error);
      return null;
    }
  }

  parseUrls(sitemapText) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(sitemapText, "text/xml");
    const urlNodes = xmlDoc.getElementsByTagName("url");
    return Array.from(urlNodes).map(
      (node) =>
        new URL(node.getElementsByTagName("loc")[0].textContent).pathname,
    );
  }

  boundedLevenshteinDistance(a, b, maxDistance) {
    if (Math.abs(a.length - b.length) > maxDistance) return maxDistance + 1;
    const matrix = Array(b.length + 1)
      .fill(null)
      .map((_, i) => [i]);
    for (let j = 1; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
      let minDistance = maxDistance + 1;
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1,
          );
        }
        minDistance = Math.min(minDistance, matrix[i][j]);
      }
      if (minDistance > maxDistance) {
        return maxDistance + 1;
      }
    }
    return matrix[b.length][a.length];
  }

  findSimilarUrls(targetUrl) {
    const targetPath = new URL(targetUrl, location.origin).pathname;

    if (targetPath.startsWith("/posts/")) {
      const exactMatch = this.urls.find((url) => url === targetPath);
      if (exactMatch) {
        return [location.origin + exactMatch];
      }
    }

    const potentialMatches = this.urls.filter(
      (url) =>
        Math.abs(url.length - targetPath.length) <= this.maxDistance &&
        !url.endsWith("/404.html"),
    );

    const similarUrls = potentialMatches
      .map((url) => ({
        url,
        distance: this.boundedLevenshteinDistance(
          url,
          targetPath,
          this.maxDistance,
        ),
      }))
      .filter((item) => item.distance <= this.maxDistance)
      .sort((a, b) => a.distance - b.distance);

    const seenUrls = new Set();
    const uniqueSimilarUrls = similarUrls
      .filter((item) => {
        if (seenUrls.has(item.url)) return false;
        seenUrls.add(item.url);
        return true;
      })
      .slice(0, 10);

    return uniqueSimilarUrls.map((item) => location.origin + item.url);
  }

  injectSuggestions(currentPath, suggestions) {
    const app = document.querySelector("#suggestions");
    if (!app) return;

    if (suggestions.length > 0) {
      const p = document.createElement("p");

      p.innerHTML = "I did however find some URLs that might be relevant?";
      app.appendChild(p);

      for (const url of suggestions) {
        const a = document.createElement("a");
        const cleanUrl = url.replace(/\.html$/, "");
        a.href = cleanUrl;
        a.textContent = cleanUrl;
        app.appendChild(a);
      }

      const endText = document.createElement("p");
      app.appendChild(endText);
    } else {
      const p = document.createElement("p");
      p.innerHTML = `Couldn't find any URLs similar to <code>${currentPath}</code>. I guess it's time to find something new`;
      app.appendChild(p);
    }

    app.className = "url-suggestions";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new URLSuggester().initialize();
});
