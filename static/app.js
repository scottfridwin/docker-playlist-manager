/* ===========================
   app.js
=========================== */

let currentBrowsePath = localStorage.getItem("browsePath");

if (!currentBrowsePath || currentBrowsePath === "undefined") {
    currentBrowsePath = "";
    localStorage.setItem("browsePath", currentBrowsePath);
}

/* ===========================
   HELPERS
=========================== */

function qs(name, url = window.location.search) {
    const params = new URLSearchParams(url);
    return params.get(name);
}

function stripGuid(name) {
    return name.replace(/\s*\([a-f0-9-]+\)/gi, '');
}

function toast(msg) {
    const t = document.createElement("div");
    t.className = "toast";
    t.textContent = msg;

    document.body.appendChild(t);

    setTimeout(() => {
        t.classList.add("toast-hide");
        setTimeout(() => t.remove(), 300);
    }, 2000);
}
