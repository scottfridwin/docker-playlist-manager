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
                    <span class="browser-row-name">${item.display || item.name}</span>
                </div>
                <div class="browser-row-right">
                    <span class="dir-selected"></span> <!-- <-- keep it inside -->
                    <button class="small" onclick="browserAddDir('${item.name}')">Add All</button>
                </div>
            `;

            row.querySelector(".browser-row-left").onclick = () => browserEnter(item.name);

        } else {
            // Track row: checkbox, icon, name
            const fullFile = currentBrowsePath ? `${currentBrowsePath}/${item.name}` : item.name;
            const checked = checkedItems.includes(fullFile);

            row.innerHTML = `
                <label class="browser-row-left">
                    <input type="checkbox" ${checked ? "checked" : ""} onchange="browserCheckFile('${item.name}', this)">
                    <span class="material-icons">music_note</span>
                    <span class="browser-row-name">${item.display || item.name}</span>
                </label>
            `;
        }

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
    root.onclick = () => loadBrowser("")
    pathEl.appendChild(root)
    if (!currentBrowsePath) return
    const parts = currentBrowsePath.split("/")
    parts.forEach((p, i) => {
        const btn = document.createElement("button")
        btn.textContent = p
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