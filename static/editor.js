/* ===========================
   EDITOR PAGE
=========================== */

async function initEditor() {

    const name = qs("name")

    if (name) {

        const r = await fetch(`/api/playlist/${encodeURIComponent(name)}`)
        const data = await r.json()

        document.getElementById("playlist-name").value = data.name
        currentTracks = data.tracks
    }

    renderTracks()

}

function cancel() {
    window.location.href = "/"
}

async function save() {

    const name = document.getElementById("playlist-name").value.trim()

    if (!name) {
        alert("Please enter a playlist name")
        return
    }

    const response = await fetch("/api/playlist", {

        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({
            name: name,
            tracks: currentTracks
        })

    })

    if (!response.ok) {
        alert("Error saving playlist")
        return
    }

    window.location.href = "/"

}

/* ===========================
   TRACK LIST
=========================== */

function renderTracks() {

    const ul = document.getElementById("tracks")
    const count = document.getElementById("track-count")

    ul.innerHTML = ""

    count.textContent = currentTracks.length

    if (currentTracks.length === 0) {

        ul.innerHTML = `<div style="padding:16px;">No tracks yet</div>`

        return
    }

    currentTracks.forEach((t, i) => {

        const li = document.createElement("li")
        li.className = "track-item"

        li.innerHTML = `
        <span class="track">${stripGuid(t)}</span>

        <button onclick="removeTrack(${i})">
            <span class="material-icons">close</span>
        </button>
        `

        ul.appendChild(li)

    })

}

function removeTrack(i) {

    currentTracks.splice(i, 1)

    renderTracks()

}