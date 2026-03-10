/* ===========================
   spa-router.js
=========================== */

function navigateTo(page, params = {}) {
    // Hide all pages
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));

    // Show target page
    const el = document.getElementById(`page-${page}`);
    el.classList.add("active");

    // Update URL
    const url = page === "editor" && params.name ? `/editor?name=${encodeURIComponent(params.name)}` : "/";
    history.pushState({ page, params }, "", url);

    // Load content if needed
    if (page === "editor") loadEditor(params.name);
}

window.addEventListener("popstate", e => {
    const state = e.state || { page: "playlists" };
    navigateTo(state.page, state.params);
});