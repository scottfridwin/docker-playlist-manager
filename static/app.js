/* ===========================
   GLOBAL STATE
=========================== */

let currentTracks = []
let checkedItems = []

let currentBrowsePath = localStorage.getItem("browsePath")

if (!currentBrowsePath || currentBrowsePath === "undefined") {
    currentBrowsePath = ""
    localStorage.setItem("browsePath", currentBrowsePath)
}

/* ===========================
   HELPERS
=========================== */

function qs(name) {
    const params = new URLSearchParams(window.location.search)
    return params.get(name)
}

function stripGuid(name) {
    return name.replace(/\s*\([a-f0-9-]+\)/gi, '')
}

function toast(msg) {

    const t = document.createElement("div")
    t.className = "toast"
    t.textContent = msg

    document.body.appendChild(t)

    setTimeout(() => {
        t.classList.add("toast-hide")
        setTimeout(() => t.remove(), 300)
    }, 2000)
}

/* ===========================
   APP BOOTSTRAP
=========================== */

document.addEventListener("DOMContentLoaded", () => {

    if (document.getElementById("list")) {
        initIndex()
    }

    if (document.getElementById("tracks")) {
        initEditor()
    }

})