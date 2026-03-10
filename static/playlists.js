/* ===========================
   playlists.js
=========================== */

function initIndex() {
    const search = document.getElementById("search");
    search.addEventListener("input", () => loadPlaylists());

    // Initial load
    loadPlaylists();
}

function createPlaylist() {
    window.location.href = "/editor";
}

async function loadPlaylists(page = 1) {
    const search = document.getElementById("search").value.trim();
    const list = document.getElementById("list");
    list.innerHTML = ""; // Clear old content

    // Skeleton loader while fetching
    const skeletonGrid = document.createElement("div");
    skeletonGrid.className = "playlist-grid";
    for (let i = 0; i < 6; i++) {
        const skeletonRow = document.createElement("div");
        skeletonRow.className = "playlist-row skeleton";
        skeletonRow.innerHTML = `
            <div style="display:flex;align-items:center;gap:8px;">
                <div style="flex:1;">
                    <span class="playlist-name placeholder"></span>
                    <span class="playlist-meta placeholder"></span>
                </div>
            </div>
            <div class="playlist-actions">
                <span class="placeholder"></span>
                <span class="placeholder"></span>
            </div>
        `;
        skeletonGrid.appendChild(skeletonRow);
    }
    list.appendChild(skeletonGrid);

    try {
        const r = await fetch(`/api/playlists?page=${page}&sort=name&search=${encodeURIComponent(search)}`);
        const data = await r.json();

        list.innerHTML = ""; // Remove skeleton

        if (!data.items || data.items.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <p><span class="material-icons">folder_open</span> No playlists</p>
                </div>
            `;
            return;
        }

        // Create grid container
        const grid = document.createElement("div");
        grid.className = "playlist-grid";

        data.items.forEach(p => {
            const row = document.createElement("div");
            row.className = "playlist-row";

            const date = new Date(p.mtime * 1000).toLocaleDateString();

            row.innerHTML = `
                <div style="display:flex;align-items:center;gap:8px;">
                    <div style="flex:1;">
                        <span class="playlist-name">${p.name}</span>
                        <span class="playlist-meta">Modified: ${date}</span>
                    </div>
                </div>
                <div class="playlist-actions">
                    <button onclick="editPlaylist('${p.name}')">
                        <span class="material-icons">edit</span> Edit
                    </button>
                    <button class="danger" onclick="deletePlaylist('${p.name}')">
                        <span class="material-icons">delete</span> Delete
                    </button>
                </div>
            `;

            grid.appendChild(row);
        });

        list.appendChild(grid);

    } catch (err) {
        console.error("Error loading playlists:", err);
        list.innerHTML = `<div class="empty-state"><p>Error loading playlists</p></div>`;
    }
}

function editPlaylist(name) {
    window.location.href = `/editor?name=${encodeURIComponent(name)}`;
}

async function deletePlaylist(name) {
    if (!confirm(`Delete playlist "${name}"?`)) return;

    try {
        await fetch(`/api/playlist/${encodeURIComponent(name)}`, { method: "DELETE" });
        loadPlaylists(); // Reload playlists after deletion
    } catch (err) {
        console.error("Failed to delete playlist:", err);
        alert("Failed to delete playlist. See console for details.");
    }
}