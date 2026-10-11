/* ===========================
   editor.js
=========================== */

let currentPlaylist = null;
let currentTracks = []; // Tracks currently in the editor

function initEditor(name = null) {
    currentPlaylist = name;
    currentTracks = [];

    const container = document.getElementById("editor-container");
    if (!container) return;

    container.innerHTML = "";

    const nameInputValue = name || "";

    container.innerHTML = `
        <div class="editor-header">
            <div style="display:flex; align-items:center; gap:12px; flex:1;">
                <label for="playlist-name-input" style="font-weight:600;">Playlist Name:</label>
                <input 
                    type="text" 
                    id="playlist-name-input" 
                    value="${escapeHtml(nameInputValue)}"
                    placeholder="Enter playlist name"
                    style="flex:1; max-width:400px;"
                />
            </div>
            <div style="display:flex; gap:8px;">
                <button onclick="backToPlaylists()">
                    <span class="material-icons">arrow_back</span> Back
                </button>
                <button onclick="openBrowser()">Add Tracks</button>
                <button class="danger" onclick="savePlaylist()">Save</button>
            </div>
        </div>

        <div class="editor-main">
            <div id="track-list" class="track-list"></div>
        </div>
    `;

    if (name) loadPlaylistTracks(name);
}

// Load existing tracks from API
async function loadPlaylistTracks(name) {
    try {
        const r = await fetch(`/api/playlist/${encodeURIComponent(name)}`);
        const data = await r.json();

        currentTracks = data.tracks || [];
        renderTracks();
    } catch (err) {
        console.error("Failed to load tracks:", err);
        toast("Failed to load playlist tracks");
    }
}

// Render tracks in editor
function renderTracks() {
    const list = document.getElementById("track-list");
    if (!list) return;

    list.innerHTML = "";

    currentTracks.forEach((track, i) => {
        const div = document.createElement("div");
        div.className = "track-item";
        div.draggable = true;
        div.dataset.index = i;

        div.innerHTML = `
            <span class="track"></span>
            <button class="track-remove">
                <span class="material-icons">close</span>
            </button>
        `;
        div.querySelector(".track").textContent = stripGuid(track);
        div.querySelector(".track-remove").addEventListener("click", () => removeTrack(i));

        // Drag & drop events
        div.addEventListener("dragstart", dragStart);
        div.addEventListener("dragover", dragOver);
        div.addEventListener("drop", dropTrack);
        div.addEventListener("dragend", dragEnd);

        list.appendChild(div);
    });
}

// Track removal
function removeTrack(index) {
    currentTracks.splice(index, 1);
    renderTracks();
}

// Drag & Drop
let draggedIndex = null;

function dragStart(e) {
    draggedIndex = parseInt(e.currentTarget.dataset.index);
    e.dataTransfer.effectAllowed = "move";
}

function dragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
}

function dropTrack(e) {
    e.preventDefault();
    const targetIndex = parseInt(e.currentTarget.dataset.index);

    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const [moved] = currentTracks.splice(draggedIndex, 1);
    currentTracks.splice(targetIndex, 0, moved);

    renderTracks();
}

function dragEnd() {
    draggedIndex = null;
}

// Save playlist
async function savePlaylist() {
    const nameInput = document.getElementById("playlist-name-input");
    const newName = nameInput ? nameInput.value.trim() : null;

    if (!newName) {
        alert("Please enter a playlist name");
        return;
    }

    try {
        const payload = { 
            tracks: currentTracks,
            newName: newName
        };

        // Use the old name in the URL if renaming, otherwise use the new name
        const urlName = currentPlaylist || newName;

        const response = await fetch(`/api/playlist/${encodeURIComponent(urlName)}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.error || "Failed to save playlist");
            return;
        }

        // Update currentPlaylist to the new name for future saves
        currentPlaylist = data.name;
        nameInput.value = data.name;

        toast(`Playlist "${data.name}" saved!`);
    } catch (err) {
        console.error("Failed to save playlist:", err);
        alert("Failed to save playlist");
    }
}

// Back to playlists
function backToPlaylists() {
    showPage("page-playlists");
    loadPlaylists();
}

// Open browser modal
function openBrowser() {
    showPage("browser-modal");
    loadBrowser(""); // your existing browser code
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

/* ===========================
   SPA Helper
=========================== */
function showPage(id) {
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    const page = document.getElementById(id);
    if (page) page.classList.add("active");
}