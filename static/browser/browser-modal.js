/* ===========================
   BROWSER MODAL
=========================== */

function openBrowser() {
    const modal = document.createElement("div")
    modal.id = "browser-modal"
    modal.onclick = e => {
        if (e.target === modal) closeBrowser()
    }
    modal.tabIndex = -1
    modal.focus()
    modal.innerHTML = `
    <div class="browser">
        <div class="browser-header">
            <div id="browser-path" class="browser-breadcrumbs"></div>
        </div>
        <div id="browser-list" class="browser-list"></div>
        <div class="browser-footer">
            <span id="browser-selected-count">0 selected</span>

            <div class="browser-actions">
                <button onclick="browserAdd()" class="primary">
                    <span class="material-icons">playlist_add</span>
                    Add Selected
                </button>

                <button onclick="closeBrowser()">
                    <span class="material-icons">close</span>
                    Close
                </button>
            </div>
        </div>
    </div>
    `
    document.body.style.overflow = "hidden"
    document.body.appendChild(modal)
    loadBrowser(currentBrowsePath || "")
    updateSelectedCount()
}

function browserEscHandler(e) {
    if (e.key === "Escape") closeBrowser()
}

function closeBrowser() {
    if (checkedItems.length > 0) {
        if (!confirm("Discard selected items?")) return
    }

    const modal = document.getElementById("browser-modal")
    if (modal) modal.remove()

    document.removeEventListener("keydown", browserEscHandler)
    document.body.style.overflow = ""

    checkedItems = []
}

function updateSelectedCount() {
    const count = checkedItems.length
    document.getElementById("browser-selected-count").textContent =
        `${count} selected`

    const addBtn = document.querySelector(".browser-actions button")
    addBtn.disabled = count === 0
}