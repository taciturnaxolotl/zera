// static/js/nativeads.js

function hideAdNote() {
    document.getElementById("ad-note").id = 'ad-note-hidden';
    document.getElementById("ad-note-content-wrapper").innerHTML = "";
    document.cookie = "notice-shown=true;path=/";
}

if (!document.cookie.includes("notice-shown")) {
    document.getElementById("ad-note-hidden").id = 'ad-note';
    document.getElementById("ad-note-content-wrapper").innerHTML = "No adblocker detected. " + 
    "Consider using an extension like <a href=https://github.com/uBlockOrigin/uBOL-home/blob/main/README.md>uBlock Origin</a> to save time and bandwidth." +
    " <u onclick=hideAdNote()>Click here to close.</u>";
}
