<div class="bubble" style="visibility: hidden; opacity: 0;">
  <span><span id="status-wrap"><a href="https://bsky.app/@doing.dunkirk.sh" id="verb-link">Kieran is</a> <i id="status-text"></i></span><span id="time-ago-wrap"><span class="time-dash"> - </span><relative-time id="time-ago" datetime="" threshold="P30D"></relative-time></span></span>
</div>

<script>
  async function resolveDidToPds(did) {
    if (did.startsWith("did:plc:")) {
      const res = await fetch(`https://plc.directory/${did}`);
      const doc = await res.json();
      return doc.service?.find(s => s.id === "#atproto_pds")?.serviceEndpoint;
    } else if (did.startsWith("did:web:")) {
      const domain = did.slice(8);
      const res = await fetch(`https://${domain}/.well-known/did.json`);
      const doc = await res.json();
      return doc.service?.find(s => s.id === "#atproto_pds")?.serviceEndpoint;
    }
    return null;
  }
  async function fetchAtUriListRecords(atUri) {
    const match = atUri.match(/^at:\/\/([^/]+)\/([^/]+)$/);
    if (!match) return null;
    const [, repo, collection] = match;
    const pds = await resolveDidToPds(repo);
    if (!pds) return null;
    const url = `${pds}/xrpc/com.atproto.repo.listRecords?repo=${encodeURIComponent(repo)}&collection=${encodeURIComponent(collection)}`;
    const res = await fetch(url);
    return res.ok ? res.json() : null;
  }
  function fetchStatus() {
    fetchAtUriListRecords("at://did:plc:krxbvxvis5skq7jj6eot23ul/a.status.update")
      .then((statusData) => {
        if (!statusData) return;
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
              bubble.style.display = "none";
              return;
            }
            const latestStatus = `"${statusData.records[0].value.text}"`;
            document.getElementById("status-text").textContent = latestStatus;
            const timeEl = document.getElementById("time-ago");
            timeEl.setAttribute("datetime", createdAt);
            const verbLink = document.getElementById("verb-link");
            if (diffInMins > 30) {
              verbLink.textContent = "Kieran was";
            } else {
              verbLink.textContent = "Kieran is";
            }
            bubble.style.display = "block";
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
  let resizeTimeout;
  function checkTimeWrap() {
    const wrap = document.getElementById("time-ago-wrap");
    const statusText = document.getElementById("status-text");
    if (wrap && statusText) {
      const wrapTop = wrap.getBoundingClientRect().top;
      const statusTop = statusText.getBoundingClientRect().top;
      wrap.classList.toggle("wrapped", wrapTop > statusTop);
    }
  }
  function debouncedCheckWrap() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(checkTimeWrap, 100);
  }
  document.addEventListener("DOMContentLoaded", fetchStatus);
  window.addEventListener("resize", debouncedCheckWrap);
  setInterval(fetchStatus, 3600000);
</script>
