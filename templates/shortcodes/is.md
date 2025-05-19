<div class="bubble">
  <span><a href="https://bsky.app/@doing.dunkirk.sh">Kieran is</a> <i id="status-text">"doing smthing interesting"</i></span>
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
        }
      })
      .catch((error) => {
        console.error("Error fetching status update:", error);
      });
  });
</script>
