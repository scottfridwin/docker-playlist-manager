# Development

## Run the app locally

```bash
pip install -r requirements.txt
python scripts/generate_mock_data.py   # creates ./music with fake tracks and playlists
MUSIC_DIR=./music PLAYLIST_DIR=./music/Playlists python app.py
```

Open <http://localhost:8080>. The dev container installs everything and generates the mock data for you.

## Run the tests

The tests use a temporary music folder and Flask's test client, so no music library is needed:

```bash
python -m unittest discover -s tests -v
```

Lint and format with [ruff](https://docs.astral.sh/ruff/) (configured in `pyproject.toml`, including its security
rules):

```bash
pip install -r requirements-dev.txt
ruff check . && ruff format --check .
```

Or run the tests inside the image exactly as CI does:

```bash
docker buildx build --target test .
```

## Build the image

```bash
docker build -t playlist-manager:dev .
```

The image serves the app with [Waitress](https://docs.pylonsproject.org/projects/waitress/) on port 8080 and has no pip
at runtime. The `test` stage runs the unit tests on top of the runtime image. Multi-platform builds
(`linux/amd64,linux/arm64`) need a Buildx builder with the `docker-container` driver and QEMU.

## Code layout

| Path | Contents |
| --- | --- |
| `app.py` | Flask routes, path containment and playlist reading and writing |
| `config.py` | Settings from environment variables |
| `wsgi.py` | Entry point for Waitress |
| `templates/index.html` | The single page |
| `static/` | Front end scripts, styles, PWA manifest and service worker |
| `scripts/generate_mock_data.py` | Fake music library for development |
| `tests/` | Unit tests |

Every path that comes from a request or a playlist file goes through `music_path()` or `playlist_path()`, which keep
it inside the music or playlist folder (symlinks are resolved first). Names from the file system are always inserted
into the page as text, never as HTML.

If you change files under `static/`, bump `CACHE` in `static/sw.js` so installed copies of the app fetch them again.

## Continuous integration and releases

All changes reach `main` through a pull request; the **Lint** and **Test** checks (ruff, and unit tests on every
platform) must pass and merges are squashed.

- **Every build of `main`** is published as `ghcr.io/scottfridwin/playlist-manager:main` and `:sha-<commit>`, with an
  SBOM, BuildKit provenance and a GitHub build provenance attestation.
- **Vulnerability scanning** — Trivy scans each new `:main` image and the released `:latest` image weekly. Fixable HIGH
  and CRITICAL findings appear under **Security → Code scanning**; they do not block builds.
- **Dependencies** — the Python base image (pinned by digest), the Python packages and the GitHub Actions (pinned to
  commit SHAs) are updated by [Renovate](https://docs.renovatebot.com/). Updates wait 3 days after publication, then
  merge automatically once **Test** passes.
- **Releases** are created automatically when a merge to `main` changes `Dockerfile`, `requirements.txt`, the Python
  files, `static/` or `templates/`. The version comes from the commit subject: `feat:` bumps the minor version,
  `<type>!:` or a `BREAKING CHANGE` footer bumps the major version, anything else (including Renovate updates) bumps
  the patch version. A release tags the image that was just published as `X.Y.Z`, `X.Y`, `X` and `latest`. To release
  manually, run the **Build, Test & Publish** workflow with a `release_tag` such as `v1.2.0`.
- If an unattended run on `main` fails, an issue titled **CI failed on main** is opened.
