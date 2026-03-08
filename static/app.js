async function loadPlaylists(page = 1) {

    let sort = document.getElementById("sort").value

    let r = await fetch(`/api/playlists?page=${page}&sort=${sort}`)
    let data = await r.json()

    let list = document.getElementById("list")

    list.innerHTML = ""

    for (let p of data.items) {

        let div = document.createElement("div")

        div.innerHTML = `<a href="/editor?name=${p.name}">${p.name}</a>`

        list.appendChild(div)

    }

}