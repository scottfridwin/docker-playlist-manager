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

    const title = name ? `Editing Playlist: ${name}` : "New Playlist";

    container.innerHTML = `
        <div class="editor-header">
            <h2>${title}</h2>
            <div style="margin-left:auto; display:flex; gap:8px;">
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
            <span class="track">${stripGuid(track)}</span>
            <button class="track-remove" onclick="removeTrack(${i})">
                <span class="material-icons">close</span>
            </button>
        `;

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
    if (!currentPlaylist) {
        currentPlaylist = prompt("Enter new playlist name:");
        if (!currentPlaylist) return;
    }

    try {
        await fetch(`/api/playlist/${encodeURIComponent(currentPlaylist)}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tracks: currentTracks })
        });

        toast(`Playlist "${currentPlaylist}" saved!`);
    } catch (err) {
        console.error("Failed to save playlist:", err);
        toast("Failed to save playlist");
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

/* ===========================
   SPA Helper
=========================== */
function showPage(id) {
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    const page = document.getElementById(id);
    if (page) page.classList.add("active");
}