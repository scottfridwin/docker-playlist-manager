/* ===========================
   BROWSER NAVIGATION
=========================== */

async function loadBrowser(path) {
    if (!path) path = "";

    currentBrowsePath = path;
    localStorage.setItem("browsePath", currentBrowsePath);

    renderBreadcrumbs();

    const listEl = document.getElementById("browser-list");
    listEl.innerHTML = "";

    const r = await fetch(`/api/music?path=${encodeURIComponent(currentBrowsePath)}`);
    const data = await r.json();

    data.items.forEach(item => {
        const row = document.createElement("div");
        row.className = "browser-row";
        row.dataset.name = item.name;

        if (item.is_dir) {
            // Folder row: icon, name, "Add All" button, selected count
            row.innerHTML = `
                <div class="browser-row-left">
                    <span class="material-icons">folder</span>
                    <span class="browser-row-name"></span>
                </div>
                <div class="browser-row-right">
                    <span class="dir-selected"></span>
                    <button class="small browser-add-dir browser-button">Add All</button>
                </div>
            `;

            row.querySelector(".browser-row-left").onclick = () => browserEnter(item.name);
            row.querySelector(".browser-add-dir").addEventListener("click", () => browserAddDir(item.name));

        } else {
            // Track row: checkbox, icon, name
            const fullFile = currentBrowsePath ? `${currentBrowsePath}/${item.name}` : item.name;

            row.innerHTML = `
                <label class="browser-row-left">
                    <input type="checkbox">
                    <span class="material-icons">music_note</span>
                    <span class="browser-row-name"></span>
                </label>
            `;

            const checkbox = row.querySelector("input");
            checkbox.checked = checkedItems.includes(fullFile);
            checkbox.addEventListener("change", () => browserCheckFile(item.name, checkbox));
        }

        // Names come from the filesystem: always insert them as text
        row.querySelector(".browser-row-name").textContent = item.display || item.name;

        listEl.appendChild(row);
    });
}

function browserEnter(name) {
    const next = currentBrowsePath
        ? `${currentBrowsePath}/${name}`
        : name
    loadBrowser(next)
}

function renderBreadcrumbs() {
    const pathEl = document.getElementById("browser-path")
    pathEl.innerHTML = ""
    const root = document.createElement("button")
    root.innerHTML = '<span class="material-icons">home</span>'
    root.classList.add("breadcrumb-button", "browser-button")
    root.onclick = () => loadBrowser("")
    pathEl.appendChild(root)
    if (!currentBrowsePath) return
    const parts = currentBrowsePath.split("/")
    parts.forEach((p, i) => {
        const btn = document.createElement("button")
        btn.classList.add("breadcrumb-button", "browser-button")
        btn.textContent = stripGuid(p)
        btn.onclick = () => {
            const newPath = parts.slice(0, i + 1).join("/")
            loadBrowser(newPath)
        }
        pathEl.appendChild(btn)
    })
}

function browserGoHome() {
    loadBrowser("")
}