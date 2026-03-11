/* ===========================
   playlists.js
=========================== */

function initIndex() {
    const search = document.getElementById("search");
    search.addEventListener("input", () => loadPlaylists());

    loadPlaylists();
}

function createPlaylist() {
    // Switch to editor SPA page
    showPage("page-editor");
    initEditor(); // Initialize editor with empty playlist
}

async function loadPlaylists(page = 1) {
    const search = document.getElementById("search").value.trim();
    const list = document.getElementById("list");
    list.innerHTML = ""; // Clear first

    try {
        const params = new URLSearchParams({
            page,
            sort: "name",
            search
        });

        const r = await fetch(`/api/playlists?${params}`);
        const data = await r.json();

        if (data.items.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <p><span class="material-icons">folder_open</span> No playlists</p>
                </div>
            `;
            return;
        }

        // Use list itself as the grid
        list.className = "playlist-grid";

        data.items.forEach(p => {
            const row = document.createElement("div");
            row.className = "playlist-row";

            const date = new Date(p.mtime * 1000).toLocaleDateString();

            row.innerHTML = `
                <div style="display:flex;align-items:center;gap:8px;">
                    <div style="flex:1;">
                        <span class="playlist-name"></span>
                        <span class="playlist-meta">Modified: ${date}</span>
                    </div>
                </div>
                <div class="playlist-actions">
                    <button class="edit-btn">
                        <span class="material-icons">edit</span> Edit
                    </button>
                    <button class="danger delete-btn">
                        <span class="material-icons">delete</span> Delete
                    </button>
                </div>
            `;

            // Safely insert name as text
            row.querySelector(".playlist-name").textContent = p.name;

            // Attach handlers safely
            row.querySelector(".edit-btn").addEventListener("click", () => {
                editPlaylist(p.name);
            });

            row.querySelector(".delete-btn").addEventListener("click", () => {
                deletePlaylist(p.name);
            });

            list.appendChild(row);
        });

    } catch (err) {
        console.error("Failed to load playlists:", err);
    }
}

function editPlaylist(name) {
    showPage("page-editor");
    initEditor(name);
}

async function deletePlaylist(name) {
    if (!confirm(`Delete playlist "${name}"?`)) return;

    await fetch(`/api/playlist/${encodeURIComponent(name)}`, { method: "DELETE" });
    loadPlaylists();
}

/* ===========================
   SPA Helper
=========================== */
function showPage(id) {
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    const page = document.getElementById(id);
    if (page) page.classList.add("active");
}