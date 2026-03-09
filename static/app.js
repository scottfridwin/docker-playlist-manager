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
    loadPlaylists()
}

function createPlaylist() {
    window.location.href = "/editor"
}

async function loadPlaylists(page = 1) {

    const r = await fetch(`/api/playlists?page=${page}&sort=name`)
    const data = await r.json()

    const list = document.getElementById("list")
    list.innerHTML = ""

    if (data.items.length === 0) {
        list.innerHTML = '<div class="empty-state"><p>📭 No playlists yet</p><p style="font-size: 14px;">Create your first playlist to get started!</p></div>'
        return
    }

    data.items.forEach(p => {
        const row = document.createElement("div")
        row.className = "playlist-row"

        const date = new Date(p.mtime * 1000).toLocaleDateString()

        row.innerHTML = `
      <span class="playlist-name">${p.name}</span>
      <span class="playlist-meta">Modified: ${date}</span>
      <div class="playlist-actions">
        <button onclick="editPlaylist('${p.name}')">Edit</button>
        <button class="danger" onclick="deletePlaylist('${p.name}')">Delete</button>
      </div>
    `

        list.appendChild(row)
    })

    // Pagination
    const pager = document.getElementById("pager")
    pager.innerHTML = ""
    const totalPages = Math.ceil(data.total / 50)

    if (totalPages > 1) {
        for (let i = 1; i <= totalPages; i++) {
            const btn = document.createElement("button")
            btn.textContent = i
            if (i === page) btn.className = "active"
            btn.onclick = () => loadPlaylists(i)
            pager.appendChild(btn)
        }
    }

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
    const btn = event.target

    if (!name) {
        alert("Please enter a playlist name")
        return
    }

    btn.disabled = true
    btn.textContent = "💾 Saving..."

    try {
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
            const error = await response.json()
            alert("Error saving playlist: " + (error.error || "Unknown error"))
            btn.disabled = false
            btn.textContent = "💾 Save"
            return
        }

        window.location.href = "/"
    } catch (err) {
        alert("Error: " + err.message)
        btn.disabled = false
        btn.textContent = "💾 Save"
    }

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
        ul.innerHTML = '<div style="padding: 32px 16px; text-align: center; color: var(--text-secondary);">No tracks yet. Click "Add Tracks" to get started.</div>'
        return
    }

    currentTracks.forEach((t, i) => {

        const li = document.createElement("li")
        li.className = "track-item"
        li.draggable = true

        li.innerHTML = `
      <span class="track" title="${t}">${t}</span>
      <button class="track-remove" onclick="removeTrack(${i})">✕</button>
    `

        li.addEventListener("dragstart", e => {
            e.dataTransfer.effectAllowed = "move"
            e.dataTransfer.setData("index", i)
            e.target.style.opacity = "0.5"
        })

        li.addEventListener("dragend", e => {
            e.target.style.opacity = "1"
        })

        li.addEventListener("dragover", e => {
            e.preventDefault()
            e.dataTransfer.dropEffect = "move"
            li.style.borderTop = "2px solid var(--primary)"
        })

        li.addEventListener("dragleave", e => {
            li.style.borderTop = "none"
        })

        li.addEventListener("drop", e => {
            e.preventDefault()
            li.style.borderTop = "none"

            const from = parseInt(e.dataTransfer.getData("index"))
            const to = i

            if (from !== to) {
                const item = currentTracks.splice(from, 1)[0]
                currentTracks.splice(to, 0, item)
                renderTracks()
            }
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
    modal.onclick = (e) => {
        if (e.target === modal) closeBrowser()
    }

    modal.innerHTML = `
    <div class="browser">

      <div class="browser-header">
        <button onclick="browserUp()">⬆️ Up</button>
        <span id="browser-path">Loading...</span>
      </div>

      <div id="browser-list" class="browser-list"></div>

      <div class="browser-footer">
        <button onclick="browserAdd()">✓ Add Selected</button>
        <button class="secondary" onclick="closeBrowser()">✕ Close</button>
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

            const fullPath = currentBrowsePath ? `${currentBrowsePath}/${item.name}` : item.name
            const isChecked = checkedItems.includes(fullPath)

            row.innerHTML = `
        <label>
          <input type="checkbox" onchange="browserCheckFile('${item.name}',this)" ${isChecked ? 'checked' : ''}>
          🎵 ${item.name}
        </label>
      `

            // Make entire row clickable (except for buttons)
            row.addEventListener('click', (e) => {
                // Don't trigger if clicking on buttons or the checkbox itself
                if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') {
                    return
                }

                const checkbox = row.querySelector('input[type="checkbox"]')
                if (checkbox) {
                    checkbox.checked = !checkbox.checked
                    browserCheckFile(item.name, checkbox)
                }
            })

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