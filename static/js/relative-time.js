const rtf = new Intl.RelativeTimeFormat(navigator.language, {
  numeric: "auto",
  style: "long"
});

function formatRelativeTime(date) {
  const now = new Date();
  const diffInMs = now - date;
  const diffInMins = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMins < 1) {
    return rtf.format(0, "minute");
  } else if (diffInMins < 5) {
    return rtf.format(-1, "minute");
  } else if (diffInMins < 60) {
    return rtf.format(-diffInMins, "minute");
  } else if (diffInHours < 3) {
    return rtf.format(-diffInHours, "hour");
  } else if (diffInHours < 24 && now.getDate() === date.getDate()) {
    const hour = date.getHours();
    if (hour < 12) return "this morning";
    if (hour < 17) return "this afternoon";
    return "this evening";
  } else if (diffInDays < 2) {
    return rtf.format(-1, "day");
  } else if (diffInDays < 7) {
    return rtf.format(-diffInDays, "day");
  } else {
    const dateFormatter = new Intl.DateTimeFormat(navigator.language, {
      month: 'short',
      day: 'numeric'
    });
    return `on ${dateFormatter.format(date)}`;
  }
}

function updateTimeElements() {
  document.querySelectorAll("time[datetime]").forEach(el => {
    const datetime = el.getAttribute("datetime");
    if (!datetime) return;

    const date = new Date(datetime);
    if (isNaN(date.getTime())) return;

    const maxAge = el.dataset.maxAge;
    if (maxAge) {
      const diffInMs = Date.now() - date.getTime();
      const maxAgeMs = parseInt(maxAge, 10) * 1000;
      if (diffInMs > maxAgeMs) {
        el.style.display = "none";
        return;
      }
    }

    el.textContent = formatRelativeTime(date);
    el.style.display = "";
  });
}

const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.type === "attributes" && mutation.attributeName === "datetime") {
      updateTimeElements();
      return;
    }
  }
});
observer.observe(document.documentElement, {
  subtree: true,
  attributes: true,
  attributeFilter: ["datetime"]
});

document.addEventListener("DOMContentLoaded", updateTimeElements);
setInterval(updateTimeElements, 60000);
