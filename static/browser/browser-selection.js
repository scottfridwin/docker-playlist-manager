/* ===========================
   BROWSER SELECTION
=========================== */

function browserCheckFile(name, el) {
    const full = currentBrowsePath
        ? `${currentBrowsePath}/${name}`
        : name
    if (el.checked) {
        if (!checkedItems.includes(full)) {
            checkedItems.push(full)
        }
    } else {
        checkedItems = checkedItems.filter(x => x !== full)
    }
    updateSelectedCount()
}

function updateDirSelectedCounts() {
    document.querySelectorAll(".browser-row").forEach(row => {
        const name = row.dataset.name;
        const fullPath = currentBrowsePath ? `${currentBrowsePath}/${name}` : name;

        // Count how many checkedItems are in this folder
        const count = checkedItems.filter(t => t.startsWith(fullPath + "/")).length;

        const el = row.querySelector(".dir-selected");
        if (el) {
            el.textContent = count > 0 ? `${count} tracks selected` : "";
        }
    });
}

function browserAdd() {
    let added = 0
    checkedItems.forEach(track => {
        if (!currentTracks.includes(track)) {
            currentTracks.push(track)
            added++
        }
    })
    if (added > 0) {
        toast(`${added} track${added > 1 ? "s" : ""} added`)
    }
    closeBrowser()
    renderTracks()
}

// Add all files in a directory to the selection
async function browserAddDir(dirName) {
    const dirPath = currentBrowsePath ? `${currentBrowsePath}/${dirName}` : dirName;

    try {
        const r = await fetch(`/api/music?path=${encodeURIComponent(dirPath)}`);
        const data = await r.json();

        let addedCount = 0;

        // Add only files (not subdirectories)
        data.items.forEach(item => {
            if (!item.is_dir) {
                const fullFile = `${dirPath}/${item.name}`;
                if (!checkedItems.includes(fullFile)) {
                    checkedItems.push(fullFile);
                    addedCount++;
                }
            }
        });

        // Update checkboxes in the current list, if visible
        const listEl = document.getElementById("browser-list");
        if (listEl) {
            listEl.querySelectorAll(".browser-row").forEach(row => {
                const rowName = row.dataset.name;
                if (rowName === dirName) {
                    // Show selected count inside folder row
                    row.querySelector(".dir-selected")?.remove();
                    if (addedCount > 0) {
                        const span = document.createElement("span");
                        span.className = "dir-selected";
                        span.textContent = `${addedCount} track${addedCount > 1 ? "s" : ""} selected`;
                        row.appendChild(span);
                    }
                }
            });
        }

        updateSelectedCount();

    } catch (err) {
        console.error("Failed to add directory:", err);
        toast("Failed to add directory");
    }
}