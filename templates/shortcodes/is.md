<div class="bubble" style="visibility: hidden; opacity: 0;">
  <span><a href="https://bsky.app/@doing.dunkirk.sh" id="verb-link">Kieran is</a> <i id="status-text"></i> - <span id="time-ago"></span></span>
</div>

<script>
  document.addEventListener("DOMContentLoaded", () => {
    // Initialize RelativeTimeFormat with user's locale
    const rtf = new Intl.RelativeTimeFormat(navigator.language, {
      numeric: "auto",
      style: "long"
    });
    
    fetch(
      "https://bsky.social/xrpc/com.atproto.repo.listRecords?repo=dunkirk.sh&collection=a.status.update",
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.json();
      })
      .then((statusData) => {
        if (statusData.records && statusData.records.length > 0) {
          // Calculate time difference
          if (statusData.records[0].value.createdAt) {
            const createdDate = new Date(statusData.records[0].value.createdAt);
            const now = new Date();
            const diffInMs = now - createdDate;
            const diffInMins = Math.floor(diffInMs / (1000 * 60));
            const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
            const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

            // Ignore if older than 12 hours
            if (diffInHours > 12) {
              return;
            }

            const latestStatus = `"${statusData.records[0].value.text}"`;
            document.getElementById("status-text").textContent = latestStatus;
            
            // Format time contextually using Intl.RelativeTimeFormat
            let timeAgoText;
            const createdHour = createdDate.getHours();
            const isToday = diffInHours < 24 && now.getDate() === createdDate.getDate();
            const isYesterday = diffInHours >= 24 && diffInHours < 48 && 
                               (now.getDate() - createdDate.getDate() === 1 ||
                                (now.getDate() === 1 && new Date(now.getFullYear(), now.getMonth(), 0).getDate() === createdDate.getDate()));
            
            if (diffInMins < 1) {
              timeAgoText = rtf.format(0, "minute"); // "now" in the user's language
            } else if (diffInMins < 5) {
              timeAgoText = rtf.format(-1, "minute"); // "1 minute ago" in the user's language
            } else if (diffInMins < 60) {
              timeAgoText = rtf.format(-diffInMins, "minute");
            } else if (diffInHours < 3) {
              timeAgoText = rtf.format(-diffInHours, "hour");
            } else if (isToday) {
              // Time of day context, but still localized
              if (createdHour < 12) {
                timeAgoText = "this morning";
              } else if (createdHour < 17) {
                timeAgoText = "this afternoon";
              } else {
                timeAgoText = "this evening";
              }
            } else if (isYesterday) {
              timeAgoText = rtf.format(-1, "day"); // "yesterday" in the user's language
            } else if (diffInDays < 7) {
              timeAgoText = rtf.format(-diffInDays, "day");
            } else {
              // For older posts, use a date formatter
              const dateFormatter = new Intl.DateTimeFormat(navigator.language, {
                month: 'short', 
                day: 'numeric'
              });
              timeAgoText = `on ${dateFormatter.format(createdDate)}`;
            }

            document.getElementById("time-ago").textContent = timeAgoText;

            // Change "is" to "was" based on recency
            const verbLink = document.getElementById("verb-link");
            if (diffInMins > 30) {
              verbLink.textContent = "Kieran was";
            }

            // Show and animate the bubble since we have a valid status
            const bubble = document.querySelector(".bubble");
            bubble.style.visibility = "visible";
            bubble.classList.add("animate-in");
            
            // For reduced motion preferences, ensure the bubble is always visible
            if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
              bubble.style.transform = "none"; // Ensure no transform is applied
              bubble.style.opacity = "1"; // Ensure content is visible
            }
          }
        }
      })
      .catch((error) => {
        console.error("Error fetching status update:", error);
      });
  });
</script>
