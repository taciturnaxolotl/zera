<div class="bubble">
  <span><a href="https://bsky.app/@doing.dunkirk.sh" id="verb-link">Kieran is</a> <i id="status-text">"doing smthing interesting"</i> - <span id="time-ago"></span></span>
</div>

<script>
  document.addEventListener("DOMContentLoaded", () => {
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
          const latestStatus = `"${statusData.records[0].value.text}"`;
          document.getElementById("status-text").textContent = latestStatus;

          // Calculate and display time ago
          if (statusData.records[0].value.createdAt) {
            const createdDate = new Date(statusData.records[0].value.createdAt);
            const now = new Date();
            const diffInMs = now - createdDate;
            const diffInMins = Math.floor(diffInMs / (1000 * 60));
            const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
            const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

            let timeAgoText;
            if (diffInMins < 1) {
              timeAgoText = "just now";
            } else if (diffInMins < 30) {
              timeAgoText = `in the last ${diffInMins} minute${diffInMins === 1 ? '' : 's'}`;
            } else if (diffInMins < 60) {
              timeAgoText = `${diffInMins} minute${diffInMins === 1 ? '' : 's'} ago`;
            } else if (diffInHours < 24) {
              timeAgoText = `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
            } else {
              timeAgoText = `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
            }

            document.getElementById("time-ago").textContent = timeAgoText;

            // Change "is" to "was" if more than 30 minutes old
            const verbLink = document.getElementById("verb-link");
            if (diffInMins > 30) {
              verbLink.textContent = "Kieran was";
            }
          }
        }
      })
      .catch((error) => {
        console.error("Error fetching status update:", error);
      });
  });
</script>
