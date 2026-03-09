# docker-playlist-manager

A web-based PWA for managing M3U8 playlists from a music library, optimized to run as a read-only container.

## Features

- 📱 Progressive Web App (PWA) with offline support
- 🎵 Browse and manage M3U8 playlists
- 🔒 Runs as read-only container with minimal permissions
- 🎯 Lightweight and fast (Flask + Gunicorn + Alpine)
- 🛡️ Security hardened (no root, no capabilities, SELinux-compatible)

## Quick Start

### Using Docker Compose

1. Copy the example configuration:
```bash
cp docker-compose.example.yml docker-compose.yml
```

2. Update the paths if needed:
```yaml
volumes:
  - /path/to/playlists:/playlists    # Where M3U8 files are stored
  - /path/to/music:/music:ro          # Music library (read-only)
```

3. Start the container:
```bash
docker-compose up -d
```

4. Access the app at http://localhost:8080

### Environment Variables

- `PLAYLIST_DIR` (default: `/playlists`) - Directory for M3U8 playlist files
- `MUSIC_DIR` (default: `/music`) - Path to music library directory
- `PYTHONUNBUFFERED` (default: `1`) - Enable unbuffered Python output

## Read-Only Container Setup

The container runs with `read_only: true` for security. This requires:

1. **Writable volumes** for data that needs to persist:
   - `/playlists` - For saving playlist changes

2. **Read-only volumes** for static content:
   - `/music` - Music library (mounted with `:ro` flag)

3. **Temporary filesystems** (tmpfs) for runtime files:
   - `/tmp` - Temporary files
   - `/var/run` - Runtime files
   - `/var/tmp` - Additional temporary storage

The example `docker-compose.example.yml` includes all necessary mounts configured correctly.

## Development

### Install dependencies:
```bash
pip install -r requirements.txt
```

### Run locally:
```bash
export PLAYLIST_DIR=/path/to/playlists
export MUSIC_DIR=/path/to/music
python app.py
```

### Run with mock data:
```bash
python scripts/generate_mock_data.py
PLAYLIST_DIR=./playlists MUSIC_DIR=./music python app.py
```

## Security Features

- Runs as unprivileged user (UID 1234, GID 5678)
- All capabilities dropped with `cap_drop: ALL`
- `no-new-privileges` security option enabled
- Read-only root filesystem
- Minimal Alpine base image
- No hardcoded credentials

## API Endpoints

- `GET /` - Web interface
- `GET /editor` - Playlist editor
- `GET /api/playlists` - List all playlists
- `GET /api/playlist/<name>` - Get playlist tracks
- `POST /api/playlist` - Save/create playlist
- `DELETE /api/playlist/<name>` - Delete playlist
- `GET /api/music` - Browse music directory
- `GET /api/dir_recursive` - Get all files recursively

## File Format

Playlists are stored as M3U8 files with track paths relative to the music directory.

Example `Playlist_1.m3u8`:
```
#EXTM3U
Artist 1/Album 1/01 - Track.mp3
Artist 1/Album 1/02 - Track.mp3
```

## License

MIT