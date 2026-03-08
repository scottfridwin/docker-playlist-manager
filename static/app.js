let currentTracks = []
let checkedItems = []
let currentBrowsePath = localStorage.getItem("browsePath") || ""

function qs(name) {
    const params = new URLSearchParams(window.location.search)
    return params.get(name)
}

document.addEventListener("DOMContentLoaded", () => {

    if (document.getElementById("list")) {
        initIndex()
    }

    if (document.getElementById("tracks")) {
        initEditor()
    }

})

/* ===========================
   INDEX PAGE
=========================== */

function initIndex() {

    const sort = document.getElementById("sort")

    sort.addEventListener("change", () => loadPlaylists())

    loadPlaylists()

}

function createPlaylist() {
    window.location.href = "/editor"
}

async function loadPlaylists(page = 1) {

    const sort = document.getElementById("sort").value

    const r = await fetch(`/api/playlists?page=${page}&sort=${sort}`)
    const data = await r.json()

    const list = document.getElementById("list")
    list.innerHTML = ""

    data.items.forEach(p => {

        const row = document.createElement("div")

        row.className = "playlist-row"

        row.innerHTML = `
      <span class="playlist-name">${p.name}</span>
      <button onclick="editPlaylist('${p.name}')">Edit</button>
      <button onclick="deletePlaylist('${p.name}')">Delete</button>
    `

        list.appendChild(row)

    })

}

function editPlaylist(name) {
    window.location.href = `/editor?name=${encodeURIComponent(name)}`
}

async function deletePlaylist(name) {

    if (!confirm(`Delete playlist "${name}"?`)) return

    await fetch(`/api/playlist/${encodeURIComponent(name)}`, {
        method: "DELETE"
    })

    loadPlaylists()

}

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
        alert("Playlist name required")
        return
    }

    await fetch("/api/playlist", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name: name,
            tracks: currentTracks
        })
    })

    window.location.href = "/"

}

/* ===========================
   TRACK LIST
=========================== */

function renderTracks() {

    const ul = document.getElementById("tracks")
    ul.innerHTML = ""

    currentTracks.forEach((t, i) => {

        const li = document.createElement("li")

        li.draggable = true

        li.innerHTML = `
      <span class="track">${t}</span>
      <button onclick="removeTrack(${i})">✕</button>
    `

        li.addEventListener("dragstart", e => {
            e.dataTransfer.setData("index", i)
        })

        li.addEventListener("dragover", e => {
            e.preventDefault()
        })

        li.addEventListener("drop", e => {
            e.preventDefault()

            const from = e.dataTransfer.getData("index")
            const to = i

            const item = currentTracks.splice(from, 1)[0]
            currentTracks.splice(to, 0, item)

            renderTracks()
        })

        ul.appendChild(li)

    })

}

function removeTrack(i) {
    currentTracks.splice(i, 1)
    renderTracks()
}

/* ===========================
   MUSIC BROWSER
=========================== */

function openBrowser() {

    const modal = document.createElement("div")
    modal.id = "browser-modal"

    modal.innerHTML = `
    <div class="browser">

      <div class="browser-header">
        <button onclick="browserUp()">Up</button>
        <span id="browser-path"></span>
      </div>

      <div id="browser-list"></div>

      <div class="browser-footer">
        <button onclick="browserAdd()">Add Selected</button>
        <button onclick="closeBrowser()">Cancel</button>
      </div>

    </div>
  `

    document.body.appendChild(modal)

    loadBrowser(currentBrowsePath)

}

function closeBrowser() {
    document.getElementById("browser-modal").remove()
    checkedItems = []
}

async function loadBrowser(path) {

    const r = await fetch(`/api/music?path=${encodeURIComponent(path)}`)
    const data = await r.json()

    currentBrowsePath = data.path

    localStorage.setItem("browsePath", currentBrowsePath)

    document.getElementById("browser-path").innerText = currentBrowsePath || "/"

    const list = document.getElementById("browser-list")
    list.innerHTML = ""

    data.items.forEach(item => {

        const row = document.createElement("div")

        row.className = "browser-row"

        if (item.is_dir) {

            row.innerHTML = `
        📁 ${item.name}
        <button onclick="browserEnter('${item.name}')">Open</button>
        <button onclick="browserCheckDir('${item.name}')">Add All</button>
      `

        } else {

            row.innerHTML = `
        <label>
          <input type="checkbox" onchange="browserCheckFile('${item.name}',this)">
          ${item.name}
        </label>
      `

        }

        list.appendChild(row)

    })

}

function browserEnter(name) {

    const next = currentBrowsePath ? `${currentBrowsePath}/${name}` : name

    loadBrowser(next)

}

function browserUp() {

    if (!currentBrowsePath) {
        return
    }

    const parts = currentBrowsePath.split("/")
    parts.pop()

    const next = parts.join("/")

    loadBrowser(next)

}

function browserCheckFile(name, cb) {

    const full = currentBrowsePath ? `${currentBrowsePath}/${name}` : name

    if (cb.checked) {
        checkedItems.push(full)
    } else {
        checkedItems = checkedItems.filter(x => x !== full)
    }

}

async function browserCheckDir(name) {

    const full = currentBrowsePath ? `${currentBrowsePath}/${name}` : name

    const r = await fetch(`/api/dir_recursive?path=${encodeURIComponent(full)}`)
    const files = await r.json()

    files.forEach(f => checkedItems.push(f))

}

function browserAdd() {

    checkedItems.forEach(p => {

        if (!p.startsWith("../")) {
            p = "../" + p
        }

        currentTracks.push(p)

    })

    closeBrowser()

    renderTracks()

}