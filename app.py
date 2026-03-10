import os
import pathlib
import logging
import re
from flask import Flask, jsonify, request, render_template, abort
import config

# Configure logging
logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# apply umask if configured before any files are created
if config.UMASK is not None:
    os.umask(config.UMASK)

app = Flask(__name__)


def strip_guid(name):
    """Remove trailing GUID from folder names.

    Originally we stripped hyphen-prefixed UUIDs, but directories are actually
    formatted like "Artist Name (12345678-1234-5678-9012-345678901234)".
    This function removes the parenthesized UUID at the end while leaving
    the artist name intact.
    """
    # strip parenthesized UUID at end, optionally preceded by space
    return re.sub(r"\s*\([a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}\)$", "", name, flags=re.IGNORECASE)


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
            if not t.startswith("../"):
                t = "../" + t
            f.write(f"{t}\n")


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/editor")
def editor():
    return render_template("editor.html")


@app.route("/health")
def health():
    """Health check endpoint for monitoring"""
    return jsonify({"status": "healthy", "version": "1.0.0"})


@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Not found", "status_code": 404}), 404


@app.errorhandler(500)
def internal_error(error):
    logger.error(f"Internal server error: {error}")
    return jsonify({"error": "Internal server error", "status_code": 500}), 500


@app.route("/api/playlists")
def playlists():

    sort = request.args.get("sort", "name")
    page = int(request.args.get("page", 1))
    search = request.args.get("search", "").strip().lower()

    files = []

    for f in pathlib.Path(config.PLAYLIST_ROOT).glob("*.m3u8"):
        stat = f.stat()
        files.append({
            "name": f.stem,
            "mtime": stat.st_mtime
        })

    # Filter by search term
    if search:
        files = [f for f in files if search in f["name"].lower()]

    if sort == "date":
        files.sort(key=lambda x: x["mtime"], reverse=True)
    else:
        files.sort(key=lambda x: x["name"].lower())

    start = (page - 1) * config.PAGE_SIZE
    end = start + config.PAGE_SIZE

    return jsonify({
        "items": files[start:end],
        "total": len(files),
        "page": page,
        "search": search
    })


@app.route("/api/playlists", methods=["DELETE"])
def bulk_delete_playlists():
    """Delete multiple playlists at once"""
    data = request.json
    names = data.get("names", [])

    if not names or not isinstance(names, list):
        return jsonify({"error": "Invalid request: 'names' must be a non-empty list"}), 400

    deleted = []
    errors = []

    for name in names:
        try:
            path = playlist_path(name)
            if os.path.exists(path):
                os.remove(path)
                deleted.append(name)
            else:
                errors.append(f"Playlist '{name}' not found")
        except (OSError, IOError) as e:
            errors.append(f"Failed to delete '{name}': {str(e)}")

    return jsonify({
        "deleted": deleted,
        "errors": errors,
        "total_deleted": len(deleted),
        "total_errors": len(errors)
    })


@app.route("/api/playlist/<name>/validate")
def validate_playlist(name):
    """Validate that all tracks in a playlist exist"""
    path = playlist_path(name)

    tracks = read_playlist(path)
    if not tracks:
        return jsonify({"valid": False, "missing": [], "total": 0, "error": "Playlist not found or empty"})

    missing = []
    for track in tracks:
        # Convert relative path to absolute path
        if track.startswith("../"):
            track_path = os.path.join(
                config.MUSIC_ROOT, track[3:])  # Remove "../"
        else:
            track_path = os.path.join(config.MUSIC_ROOT, track)

        if not os.path.exists(track_path):
            missing.append(track)

    return jsonify({
        "valid": len(missing) == 0,
        "total_tracks": len(tracks),
        "missing_tracks": len(missing),
        # strip ../
        "missing": [t[3:] if t.startswith("../") else t for t in missing]
    })


@app.route("/api/playlist/<name>", methods=["GET"])
def get_playlist(name):
    path = playlist_path(name)
    tracks = read_playlist(path)

    # Remove leading "../" for frontend
    tracks = [t[3:] if t.startswith("../") else t for t in tracks]

    return jsonify({"name": name, "tracks": tracks})


@app.route("/api/playlist", methods=["POST"])
def save_playlist():

    data = request.json

    name = data["name"].strip()

    tracks = data["tracks"]

    path = playlist_path(name)

    try:
        write_playlist(path, tracks)
        return jsonify({"status": "ok"})
    except (OSError, IOError) as e:
        return jsonify({"error": f"Failed to save playlist: {str(e)}"}), 500


@app.route("/api/playlist/<name>", methods=["DELETE"])
def delete_playlist(name):

    path = playlist_path(name)

    try:
        if os.path.exists(path):
            os.remove(path)
        return jsonify({"status": "deleted"})
    except (OSError, IOError) as e:
        return jsonify({"error": f"Failed to delete playlist: {str(e)}"}), 500


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
                # Filter out non-audio files (only for files, not directories)
                if not entry.is_dir():
                    ext = entry.name.rsplit(
                        '.', 1)[-1].lower() if '.' in entry.name else ''
                    if ext not in config.AUDIO_EXTENSIONS:
                        continue

                entries.append({
                    "name": entry.name,            # real filesystem name
                    "display": strip_guid(entry.name),  # clean UI name
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

    if not target.startswith(config.MUSIC_ROOT):
        return jsonify({"error": "invalid path"}), 400

    tracks = []

    for root, dirs, files in os.walk(target):

        # ensure deterministic ordering
        dirs.sort(key=lambda x: x.lower())
        files.sort(key=lambda x: x.lower())

        for f in files:

            ext = f.rsplit(".", 1)[-1].lower() if "." in f else ""
            if ext not in config.AUDIO_EXTENSIONS:
                continue

            full = os.path.join(root, f)

            # Make path relative to MUSIC_ROOT and normalize slashes
            rel_music = os.path.relpath(
                full, config.MUSIC_ROOT).replace("\\", "/")

            tracks.append(rel_music)

    return jsonify(tracks)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
