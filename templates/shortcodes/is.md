<div class="bubble" style="visibility: hidden; opacity: 0;">
  <span><a href="https://bsky.app/@doing.dunkirk.sh" id="verb-link">Kieran is</a> <i id="status-text"></i><span id="time-ago-wrap"><span class="time-dash"> - </span><time id="time-ago" datetime="" data-max-age="43200"></time></span></span>
</div>

<script>
  function fetchStatus() {
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
        const bubble = document.querySelector(".bubble");
        if (statusData.records && statusData.records.length > 0) {
          if (statusData.records[0].value.createdAt) {
            const createdAt = statusData.records[0].value.createdAt;
            const createdDate = new Date(createdAt);
            const now = new Date();
            const diffInMs = now - createdDate;
            const diffInMins = Math.floor(diffInMs / (1000 * 60));
            const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
            if (diffInHours > 12) {
              bubble.style.visibility = "hidden";
              return;
            }
            const latestStatus = `"${statusData.records[0].value.text}"`;
            document.getElementById("status-text").textContent = latestStatus;
            const timeEl = document.getElementById("time-ago");
            timeEl.setAttribute("datetime", createdAt);
            timeEl.textContent = new Intl.DateTimeFormat(navigator.language, {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: 'numeric'
            }).format(createdDate);
            const verbLink = document.getElementById("verb-link");
            if (diffInMins > 30) {
              verbLink.textContent = "Kieran was";
            } else {
              verbLink.textContent = "Kieran is";
            }
            bubble.style.visibility = "visible";
            bubble.classList.add("animate-in");
            if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
              bubble.style.transform = "none";
              bubble.style.opacity = "1";
            }
            checkTimeWrap();
          }
        }
      })
      .catch((error) => {
        console.error("Error fetching status update:", error);
      });
  }
  function checkTimeWrap() {
    const wrap = document.getElementById("time-ago-wrap");
    const statusText = document.getElementById("status-text");
    if (wrap && statusText) {
      const wrapTop = wrap.getBoundingClientRect().top;
      const statusTop = statusText.getBoundingClientRect().top;
      wrap.classList.toggle("wrapped", wrapTop > statusTop);
    }
  }
  document.addEventListener("DOMContentLoaded", fetchStatus);
  window.addEventListener("resize", checkTimeWrap);
  setInterval(fetchStatus, 3600000);
</script>
