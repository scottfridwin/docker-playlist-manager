import os
import random
from pathlib import Path

# Base directories
music_dir = Path("music")
playlist_dir = Path("playlists")

# Configurable sizes
NUM_ARTISTS = 20
ALBUMS_PER_ARTIST = (1, 5)
SONGS_PER_ALBUM = (5, 12)
NUM_PLAYLISTS = 10
TRACKS_PER_PLAYLIST = (5, 20)

# Seed for reproducibility
random.seed(42)

# Helper generators


def random_name(prefix, index):
    return f"{prefix} {index}"


def random_song_name():
    words = ["Love", "Dream", "Night", "Fire", "Sky", "Heart",
             "Time", "Life", "Light", "Rain", "Moon", "Star"]
    return " ".join(random.choices(words, k=random.randint(1, 3)))


# Step 1: create music library
music_dir.mkdir(exist_ok=True)
all_tracks = []

print("Generating music library...")

for i in range(1, NUM_ARTISTS+1):
    artist = random_name("Artist", i)
    num_albums = random.randint(*ALBUMS_PER_ARTIST)
    for j in range(1, num_albums+1):
        album = random_name("Album", j)
        album_dir = music_dir / artist / album
        album_dir.mkdir(parents=True, exist_ok=True)
        num_songs = random.randint(*SONGS_PER_ALBUM)
        for k in range(1, num_songs+1):
            song = f"{k:02d} - {random_song_name()}.mp3"
            path = album_dir / song
            path.touch()
            # Store relative path for playlists
            rel_path = f"{artist}/{album}/{song}"
            all_tracks.append(rel_path)

print(f"Generated {len(all_tracks)} tracks.")

# Step 2: create playlists
playlist_dir.mkdir(exist_ok=True)

print("Generating playlists...")

for i in range(1, NUM_PLAYLISTS+1):
    playlist_name = f"Playlist_{i}.m3u"
    num_tracks = random.randint(*TRACKS_PER_PLAYLIST)
    selected_tracks = random.sample(
        all_tracks, min(num_tracks, len(all_tracks)))

    path = playlist_dir / playlist_name
    with open(path, "w") as f:
        f.write("#EXTM3U\n")
        for t in selected_tracks:
            f.write(f"{t}\n")

print(f"Generated {NUM_PLAYLISTS} playlists.")

# Step 3: Add edge cases
# Duplicate songs in a playlist
dup_playlist = playlist_dir / "duplicates.m3u"
with open(dup_playlist, "w") as f:
    f.write("#EXTM3U\n")
    for _ in range(5):
        f.write(f"{random.choice(all_tracks)}\n")

# Empty playlist
(playlist_dir / "empty.m3u").touch()

print("Mock music library with realistic edge cases created!")
