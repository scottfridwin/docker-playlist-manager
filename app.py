import os
import pathlib
from flask import Flask, jsonify, request, render_template
import config

app = Flask(__name__)

def playlist_path(name):
    safe = "".join(c for c in name if c.isascii() and c not in "/\\")
    return os.path.join(config.PLAYLIST_ROOT, safe + ".m3u8")


def read_playlist(path):
    tracks = []
    if not os.path.exists(path):
        return tracks

    with open(path) as f:
        lines = f.read().splitlines()

    for line in lines[1:]:
        if line.strip():
            tracks.append(line)

    return tracks


def write_playlist(path, tracks):
    with open(path, "w") as f:
        f.write("#EXTM3U\n")
        for t in tracks:
            f.write(f"{t}\n")


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/editor")
def editor():
    return render_template("editor.html")


@app.route("/api/playlists")
def playlists():

    sort = request.args.get("sort", "name")
    page = int(request.args.get("page", 1))

    files = []

    for f in pathlib.Path(config.PLAYLIST_ROOT).glob("*.m3u8"):
        stat = f.stat()
        files.append({
            "name": f.stem,
            "mtime": stat.st_mtime
        })

    if sort == "date":
        files.sort(key=lambda x: x["mtime"], reverse=True)
    else:
        files.sort(key=lambda x: x["name"].lower())

    start = (page - 1) * config.PAGE_SIZE
    end = start + config.PAGE_SIZE

    return jsonify({
        "items": files[start:end],
        "total": len(files),
        "page": page
    })


@app.route("/api/playlist/<name>")
def get_playlist(name):

    path = playlist_path(name)

    tracks = read_playlist(path)

    return jsonify({
        "name": name,
        "tracks": tracks
    })


@app.route("/api/playlist", methods=["POST"])
def save_playlist():

    data = request.json

    name = data["name"].strip()

    tracks = data["tracks"]

    path = playlist_path(name)

    write_playlist(path, tracks)

    return jsonify({"status": "ok"})


@app.route("/api/playlist/<name>", methods=["DELETE"])
def delete_playlist(name):

    path = playlist_path(name)

    if os.path.exists(path):
        os.remove(path)

    return jsonify({"status": "deleted"})


@app.route("/api/music")
def browse_music():

    rel = request.args.get("path", "")

    target = os.path.abspath(os.path.join(config.MUSIC_ROOT, rel))

    if not target.startswith(config.MUSIC_ROOT):
        return jsonify({"error": "invalid path"}), 400

    entries = []

    try:
        with os.scandir(target) as it:
            for entry in it:
                entries.append({
                    "name": entry.name,
                    "is_dir": entry.is_dir()
                })
    except PermissionError:
        return jsonify({"error": "permission denied"}), 403

    entries.sort(key=lambda x: (not x["is_dir"], x["name"].lower()))

    return jsonify({
        "path": rel,
        "items": entries
    })


@app.route("/api/dir_recursive")
def dir_recursive():

    rel = request.args.get("path", "")

    target = os.path.abspath(os.path.join(config.MUSIC_ROOT, rel))

    tracks = []

    for root, dirs, files in os.walk(target):
        for f in files:

            full = os.path.join(root, f)

            rel_music = os.path.relpath(full, config.PLAYLIST_MUSIC_DIR)

            tracks.append("../" + rel_music)

    return jsonify(tracks)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)