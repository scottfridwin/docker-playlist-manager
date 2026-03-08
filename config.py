import os

PLAYLIST_DIR = os.environ.get("PLAYLIST_DIR", "/playlists")
MUSIC_DIR = os.environ.get("MUSIC_DIR", "/music")

PLAYLIST_ROOT = os.path.abspath(PLAYLIST_DIR)
MUSIC_ROOT = os.path.abspath(MUSIC_DIR)
PLAYLIST_MUSIC_DIR = os.path.join(MUSIC_ROOT, "Playlists")

PAGE_SIZE = 50