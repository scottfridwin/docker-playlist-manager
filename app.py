import io
import logging
import os
import pathlib
import re
import tempfile
import zipfile

from flask import Flask, jsonify, render_template, request, send_file

import config

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
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
    if not isinstance(name, str):
        raise ValueError("Invalid playlist name")
    name = name.strip()

    # Replace invalid characters
    safe = re.sub(r"[^\w\s\-]", "", name)

    # Collapse whitespace
    safe = re.sub(r"\s+", " ", safe)

    safe = safe.strip()

    if not safe:
        raise ValueError("Invalid playlist name")

    return os.path.join(config.PLAYLIST_ROOT, safe + ".m3u8")


def is_within(root, path):
    """True if path, with symlinks resolved, is root or inside it."""
    root = os.path.realpath(root)
    path = os.path.realpath(path)
    return os.path.commonpath([root, path]) == root


def music_path(rel):
    """Absolute path of a MUSIC_ROOT-relative path, or None if it escapes MUSIC_ROOT."""
    path = os.path.join(config.MUSIC_ROOT, rel)
    return path if is_within(config.MUSIC_ROOT, path) else None


def track_path(track):
    """Absolute path of a playlist entry (stored relative to the playlist folder as ../<track>)."""
    return music_path(track[3:] if track.startswith("../") else track)


def read_playlist(path):
    tracks = []
    if not os.path.exists(path):
        return tracks

    with open(path, encoding="utf-8") as f:
        lines = f.read().splitlines()

    for line in lines[1:]:
        if line.strip():
            tracks.append(line)

    return tracks


def write_playlist(path, tracks):
    directory = os.path.dirname(path)

    # get current umask
    umask = os.umask(0)
    os.umask(umask)
    mode = 0o666 & (~umask)

    # create a temporary file with correct permissions
    fd, temp_name = tempfile.mkstemp(dir=directory)
    os.fchmod(fd, mode)  # apply umask immediately

    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write("#EXTM3U\n")
            for t in tracks:
                if not t.startswith("../"):
                    t = "../" + t
                f.write(f"{t}\n")

        # atomic replace
        os.replace(temp_name, path)

    finally:
        # fallback: ensure temp file is removed if something fails
        if os.path.exists(temp_name):
            os.remove(temp_name)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/health")
def health():
    """Health check endpoint for monitoring"""
    return jsonify({"status": "healthy"})


@app.errorhandler(ValueError)
def bad_request(error):
    return jsonify({"error": str(error), "status_code": 400}), 400


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
    try:
        page = max(1, int(request.args.get("page", 1)))
    except ValueError:
        raise ValueError("Invalid page number") from None
    search = request.args.get("search", "").strip().lower()

    files = []

    for f in pathlib.Path(config.PLAYLIST_ROOT).glob("*.m3u8"):
        stat = f.stat()
        files.append({"name": f.stem, "mtime": stat.st_mtime})

    # Filter by search term
    if search:
        files = [f for f in files if search in f["name"].lower()]

    if sort == "date":
        files.sort(key=lambda x: x["mtime"], reverse=True)
    else:
        files.sort(key=lambda x: x["name"].lower())

    start = (page - 1) * config.PAGE_SIZE
    end = start + config.PAGE_SIZE

    return jsonify({"items": files[start:end], "total": len(files), "page": page, "search": search})


@app.route("/api/playlists", methods=["DELETE"])
def bulk_delete_playlists():
    """Delete multiple playlists at once"""
    data = request.get_json(silent=True) or {}
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
        except ValueError:
            errors.append(f"Invalid playlist name '{name}'")
        except OSError as e:
            errors.append(f"Failed to delete '{name}': {str(e)}")

    return jsonify({"deleted": deleted, "errors": errors, "total_deleted": len(deleted), "total_errors": len(errors)})


@app.route("/api/playlist/<name>/validate")
def validate_playlist(name):
    """Validate that all tracks in a playlist exist"""
    path = playlist_path(name)

    tracks = read_playlist(path)
    if not tracks:
        return jsonify({"valid": False, "missing": [], "total": 0, "error": "Playlist not found or empty"})

    missing = []
    for track in tracks:
        path = track_path(track)
        if path is None or not os.path.exists(path):
            missing.append(track)

    return jsonify(
        {
            "valid": len(missing) == 0,
            "total_tracks": len(tracks),
            "missing_tracks": len(missing),
            # strip ../
            "missing": [t[3:] if t.startswith("../") else t for t in missing],
        }
    )


@app.route("/api/playlist/<name>", methods=["GET"])
def get_playlist(name):
    path = playlist_path(name)
    tracks = read_playlist(path)

    # Remove leading "../" for frontend
    tracks = [t[3:] if t.startswith("../") else t for t in tracks]

    return jsonify({"name": name, "tracks": tracks})


@app.route("/api/playlist/<name>", methods=["PUT"])
def save_playlist(name):

    data = request.get_json(silent=True) or {}
    tracks = data.get("tracks", [])
    new_name = data.get("newName") or ""
    if not isinstance(new_name, str):
        raise ValueError("Invalid playlist name")
    new_name = new_name.strip()

    if not isinstance(tracks, list) or not all(isinstance(t, str) for t in tracks):
        raise ValueError("'tracks' must be a list of strings")
    for t in tracks:
        if "\n" in t or "\r" in t or track_path(t) is None:
            raise ValueError(f"Invalid track path: {t!r}")

    # Use newName if provided, otherwise use the URL name parameter
    final_name = new_name if new_name else name

    if not final_name.strip():
        return jsonify({"error": "Playlist name required"}), 400

    old_path = playlist_path(name)
    new_path = playlist_path(final_name)

    try:
        created = not os.path.exists(new_path)
        write_playlist(new_path, tracks)

        # Renamed: remove the old file only after the new one is safely written
        if old_path != new_path and os.path.exists(old_path):
            os.remove(old_path)

        return jsonify({"status": "created" if created else "updated", "name": final_name, "tracks": len(tracks)})

    except OSError as e:
        return jsonify({"error": f"Failed to save playlist: {str(e)}"}), 500


@app.route("/api/playlist/<name>", methods=["DELETE"])
def delete_playlist(name):

    path = playlist_path(name)

    try:
        if os.path.exists(path):
            os.remove(path)
        return jsonify({"status": "deleted"})
    except OSError as e:
        return jsonify({"error": f"Failed to delete playlist: {str(e)}"}), 500


@app.route("/api/playlist/<name>/download", methods=["GET"])
def download_playlist(name):
    """Download all tracks from a playlist as a ZIP file"""
    path = playlist_path(name)
    tracks = read_playlist(path)

    if not tracks:
        return jsonify({"error": "Playlist not found or empty"}), 404

    # Create ZIP file in memory
    zip_buffer = io.BytesIO()

    try:
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
            for track in tracks:
                path = track_path(track)
                if path is None:
                    logger.warning(f"Skipping track outside MUSIC_ROOT: {track}")
                    continue

                if os.path.isfile(path):
                    # Preserve the directory structure inside the archive
                    zip_file.write(path, os.path.relpath(path, config.MUSIC_ROOT))
                else:
                    logger.warning(f"Track file not found: {path}")

        zip_buffer.seek(0)
        return send_file(zip_buffer, mimetype="application/zip", as_attachment=True, download_name=f"{name}.zip")

    except Exception as e:  # noqa: BLE001 - report any archive failure to the client
        logger.error(f"Failed to create zip file: {str(e)}")
        return jsonify({"error": f"Failed to download playlist: {str(e)}"}), 500


@app.route("/api/music")
def browse_music():

    rel = request.args.get("path", "")

    target = music_path(rel)

    if target is None:
        return jsonify({"error": "invalid path"}), 400

    entries = []

    try:
        with os.scandir(target) as it:
            for entry in it:
                # Filter out non-audio files (only for files, not directories)
                if not entry.is_dir():
                    ext = entry.name.rsplit(".", 1)[-1].lower() if "." in entry.name else ""
                    if ext not in config.AUDIO_EXTENSIONS:
                        continue

                entries.append(
                    {
                        "name": entry.name,  # real filesystem name
                        "display": strip_guid(entry.name),  # clean UI name
                        "is_dir": entry.is_dir(),
                    }
                )
    except PermissionError:
        return jsonify({"error": "permission denied"}), 403
    except FileNotFoundError, NotADirectoryError:
        return jsonify({"error": "not found"}), 404

    entries.sort(key=lambda x: (not x["is_dir"], x["name"].lower()))

    return jsonify({"path": rel, "items": entries})


@app.route("/api/dir_recursive")
def dir_recursive():

    rel = request.args.get("path", "")
    target = music_path(rel)

    if target is None:
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
            rel_music = os.path.relpath(full, config.MUSIC_ROOT).replace("\\", "/")

            tracks.append(rel_music)

    return jsonify(tracks)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)  # noqa: S104 - development server only; the image uses waitress
