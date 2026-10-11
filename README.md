# Playlist Manager

[![Build](https://img.shields.io/github/actions/workflow/status/scottfridwin/docker-playlist-manager/build.yml?branch=main&label=build)](https://github.com/scottfridwin/docker-playlist-manager/actions/workflows/build.yml)
[![Release](https://img.shields.io/github/v/release/scottfridwin/docker-playlist-manager)](https://github.com/scottfridwin/docker-playlist-manager/releases/latest)
[![Image](https://img.shields.io/badge/image-ghcr.io-blue?logo=docker)](https://github.com/scottfridwin/docker-playlist-manager/pkgs/container/playlist-manager)
[![License](https://img.shields.io/github/license/scottfridwin/docker-playlist-manager)](LICENSE)

A small web app for creating and editing M3U8 playlists from a music library on disk. Playlists are plain `.m3u8`
files, so any player that reads the folder (Jellyfin, Plex, Navidrome, ...) picks them up.

> [!NOTE]
> **AI disclosure:** This project is built and maintained with substantial help from AI coding assistants (GitHub
> Copilot). AI is used to write and modify the code, tests, documentation and CI configuration, and to manage the
> repository. Dependency updates are merged and released automatically, without human review, when the automated
> tests pass. Review the code and test it in your own environment before relying on it.

## Features

- Browse the music library by folder and add single tracks or whole folders
- Create, rename, reorder (drag and drop), validate and delete playlists; bulk delete
- Download a playlist's tracks as a ZIP file
- Search and sort playlists by name or date
- Installable as a Progressive Web App
- **Secure by default** — runs as a non-root user, works with a read-only filesystem and no Linux capabilities, mounts
  the music library read-only, and refuses any path outside the music and playlist folders
- **Health check** — Docker marks the container unhealthy if the web server stops answering
- **Multi-architecture image** for `amd64` and `arm64`, with an SBOM and signed build provenance

The app has no login of its own. Put it behind an authenticating reverse proxy (for example Authentik or Authelia)
if anyone else can reach it.

## Quick start

```yaml
services:
  playlist-manager:
    image: ghcr.io/scottfridwin/playlist-manager:1
    container_name: playlist-manager
    user: "1000:1000" # owner of the playlist folder
    read_only: true
    tmpfs:
      - /tmp
    cap_drop:
      - ALL
    security_opt:
      - no-new-privileges:true
    ports:
      - "8080:8080"
    environment:
      UMASK: "0002"
    volumes:
      - /path/to/music/Playlists:/playlists
      - /path/to/music:/music:ro
    restart: unless-stopped
```

Start it with `docker compose up -d` and open <http://localhost:8080>. The same file is in
[docker-compose.example.yml](docker-compose.example.yml).

Keep the playlist folder **directly inside** the music folder, as above: playlist entries are written as
`../<path in music folder>`, so players resolve them relative to the playlist file.

## Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `MUSIC_DIR` | `/music` | Music library (read-only is enough) |
| `PLAYLIST_DIR` | `/playlists` | Where `.m3u8` files are read and written |
| `AUDIO_EXTENSIONS` | `mp3,flac,wav,aac,m4a,ogg,wma,aiff` | File types shown in the browser |
| `UMASK` | inherited | Octal umask for new playlist files, for example `0002` for group-writable |

The image runs as UID/GID `1000` unless you set `user:`. That user needs write access to the playlist folder.

## Playlist format

```text
#EXTM3U
../Artist/Album/01 - Track.flac
../Artist/Album/02 - Track.flac
```

Folder names ending in a MusicBrainz ID, such as `Artist (1d3c...)`, are shown without the ID.

## API

| Method and path | Description |
| --- | --- |
| `GET /api/playlists?search=&sort=name\|date&page=1` | List playlists (50 per page) |
| `DELETE /api/playlists` | Delete several playlists: `{"names": ["A", "B"]}` |
| `GET /api/playlist/<name>` | Tracks of a playlist |
| `PUT /api/playlist/<name>` | Create or replace a playlist: `{"tracks": [...], "newName": "optional rename"}` |
| `DELETE /api/playlist/<name>` | Delete a playlist |
| `GET /api/playlist/<name>/validate` | Report tracks that no longer exist |
| `GET /api/playlist/<name>/download` | ZIP of the playlist's tracks |
| `GET /api/music?path=<folder>` | Folders and audio files in a music folder |
| `GET /api/dir_recursive?path=<folder>` | Every audio file below a music folder |
| `GET /health` | Health check |

Invalid names, paths or request bodies return HTTP 400.

## Security

See [SECURITY.md](SECURITY.md) for reporting vulnerabilities and verifying images.

## Further reading

- [Development](docs/development.md)

## License

[MIT](LICENSE)
