import os

PLAYLIST_DIR = os.environ.get("PLAYLIST_DIR", "/playlists")
MUSIC_DIR = os.environ.get("MUSIC_DIR", "/music")

PLAYLIST_ROOT = os.path.abspath(PLAYLIST_DIR)
MUSIC_ROOT = os.path.abspath(MUSIC_DIR)
PLAYLIST_MUSIC_DIR = os.path.join(MUSIC_ROOT, "Playlists")

# Audio file extensions to show in browser (comma-separated)
AUDIO_EXTENSIONS = set(ext.strip().lower() for ext in os.environ.get(
    "AUDIO_EXTENSIONS", "mp3,flac,wav,aac,m4a,ogg,wma,aiff").split(","))

PAGE_SIZE = 50

# Optional umask for newly-created playlist files.  Should be specified
# as an octal string (e.g. "022" for 0o022).  A value of None means we
# don't change the umask and use whatever the process inherited.
UMASK = os.environ.get("UMASK")
if UMASK is not None:
    try:
        UMASK = int(UMASK, 8)
    except ValueError:
        raise ValueError(f"Invalid UMASK value: {UMASK}")
