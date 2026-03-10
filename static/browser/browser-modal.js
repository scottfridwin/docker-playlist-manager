/* ===========================
   BROWSER MODAL
=========================== */

function openBrowser() {
    const modal = document.createElement("div")
    modal.id = "browser-modal"
    modal.onclick = e => {
        if (e.target === modal) closeBrowser()
    }
    modal.innerHTML = `
    <div class="browser">
        <div class="browser-header">
            <button onclick="browserGoHome()">
                <span class="material-icons">home</span>
            </button>
            <div id="browser-path" class="browser-breadcrumbs"></div>
        </div>
        <div id="browser-list" class="browser-list"></div>
        <div class="browser-footer">
            <span id="browser-selected-count">0 selected</span>
            <button onclick="browserAdd()">
                <span class="material-icons">playlist_add</span>
                Add Selected
            </button>
            <button onclick="closeBrowser()">
                <span class="material-icons">close</span>
                Close
            </button>
        </div>
    </div>
    `
    document.body.appendChild(modal)
    loadBrowser(currentBrowsePath || "")
    updateSelectedCount()
}

function closeBrowser() {
    const modal = document.getElementById("browser-modal")
    if (modal) modal.remove()
    checkedItems = []

}