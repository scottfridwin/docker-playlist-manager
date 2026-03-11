import os
import random
import uuid
from pathlib import Path

# Base directories
music_dir = Path("music")
playlist_dir = music_dir / "Playlists"

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
    words = [
        "Love", "Dream", "Night", "Fire", "Sky", "Heart",
        "Time", "Life", "Light", "Rain", "Moon", "Star"
    ]
    return " ".join(random.choices(words, k=random.randint(1, 3)))


def random_year():
    return random.randint(1970, 2024)


# Step 1: create music library
music_dir.mkdir(exist_ok=True)
all_tracks = []

print("Generating music library...")

for i in range(1, NUM_ARTISTS + 1):
    artist_name = random_name("Artist", i)
    artist_guid = uuid.uuid4()
    artist_folder = f"{artist_name} ({artist_guid})"

    num_albums = random.randint(*ALBUMS_PER_ARTIST)

    for j in range(1, num_albums + 1):
        album_name = random_name("Album", j)
        album_year = random_year()
        album_guid = uuid.uuid4()

        album_folder = f"{album_name} ({album_year}) ({album_guid})"
        album_dir = music_dir / artist_folder / album_folder
        album_dir.mkdir(parents=True, exist_ok=True)

        num_songs = random.randint(*SONGS_PER_ALBUM)

        for k in range(1, num_songs + 1):
            song = f"{k:02d} - {random_song_name()}.flac"
            path = album_dir / song
            path.touch()

            rel_path = f"../{artist_folder}/{album_folder}/{song}"
            all_tracks.append(rel_path)

print(f"Generated {len(all_tracks)} tracks.")

# Step 2: create playlists
playlist_dir.mkdir(exist_ok=True)

print("Generating playlists...")

for i in range(1, NUM_PLAYLISTS + 1):
    playlist_name = f"Playlist_{i}.m3u8"
    num_tracks = random.randint(*TRACKS_PER_PLAYLIST)
    selected_tracks = random.sample(
        all_tracks, min(num_tracks, len(all_tracks))
    )

    path = playlist_dir / playlist_name
    with open(path, "w", encoding="utf-8") as f:
        f.write("#EXTM3U\n")
        for t in selected_tracks:
            f.write(f"{t}\n")

print(f"Generated {NUM_PLAYLISTS} playlists.")

# Step 3: Edge cases

# Duplicate songs in playlist
dup_playlist = playlist_dir / "duplicates.m3u8"
with open(dup_playlist, "w", encoding="utf-8") as f:
    f.write("#EXTM3U\n")
    for _ in range(5):
        f.write(f"{random.choice(all_tracks)}\n")

# Empty playlist
(playlist_dir / "empty.m3u8").touch()

# Playlist name with special characters
special_playlist = playlist_dir / "special_\'!@#$%^&*().m3u8"
with open(special_playlist, "w", encoding="utf-8") as f:
    f.write("#EXTM3U\n")
    for _ in range(5):
        f.write(f"{random.choice(all_tracks)}\n")

print("Mock music library with realistic edge cases created!")
