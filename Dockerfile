FROM python:3.14-alpine@sha256:f6a589d43c42b9e7f7dc67a12d37132491f362859a5d750607710cc56da3bc72 AS runtime

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

COPY requirements.txt .
# pip is not needed at runtime and vendors its own (scanner-flagged) libraries
RUN pip install --no-cache-dir -r requirements.txt \
    && python -m pip uninstall --yes pip

COPY app.py config.py wsgi.py ./
COPY static/ static/
COPY templates/ templates/

# Runs as an unprivileged user by default; deployments can override it with `user:`
RUN addgroup -S -g 1000 playlists && adduser -S -D -H -u 1000 -G playlists playlists
USER 1000:1000

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8080/health', timeout=4)"]

CMD ["waitress-serve", "--port=8080", "wsgi:app"]

# Test stage: CI builds this target on every platform before publishing
FROM runtime AS test
COPY tests/ tests/
RUN python -m unittest discover -s tests -v

FROM runtime
