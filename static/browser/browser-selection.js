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
    checkedItems = []
    closeBrowser()
    renderTracks()
}

// Add all files in a directory to the selection
async function browserAddDir(dirName) {
    try {
        const dirPath = currentBrowsePath ? `${currentBrowsePath}/${dirName}` : dirName;

        // Disable buttons
        const buttons = document.querySelectorAll(".browser-button")
        buttons.forEach(btn => {
            btn.disabled = true
        })

        let addedCount = 0;

        async function walk(path) {
            const r = await fetch(`/api/music?path=${encodeURIComponent(path)}`);
            const data = await r.json();

            for (const item of data.items) {
                const full = `${path}/${item.name}`;

                if (item.is_dir) {
                    await walk(full); // recurse into subdirectory
                } else {
                    if (!checkedItems.includes(full)) {
                        checkedItems.push(full);
                        addedCount++;
                    }
                }
            }
        }

        await walk(dirPath);

        // Update UI indicator for this directory
        const listEl = document.getElementById("browser-list");
        if (listEl) {
            listEl.querySelectorAll(".browser-row").forEach(row => {
                const rowName = row.dataset.name;
                if (rowName === dirName) {
                    const span = row.querySelector(".dir-selected");
                    if (span && addedCount > 0) {
                        span.textContent =
                            `${addedCount} track${addedCount > 1 ? "s" : ""} selected`;
                    }
                }
            });
        }

        updateSelectedCount();
    } catch (err) {
        console.error("Failed to add directory:", err);
        toast("Failed to add directory");
    }
    finally {
        // Re-enable buttons
        const buttons = document.querySelectorAll(".browser-button")
        buttons.forEach(btn => {
            btn.disabled = false
        })

        const addBtn = document.getElementById("browser-add-selected")
        addBtn.disabled = checkedItems.length === 0
    }
}