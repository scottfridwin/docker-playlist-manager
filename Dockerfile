FROM python:3.14-alpine@sha256:01ddf82b43479870a7ea87037b7d68472bef12cc244941843c26bb75bf9a9b04 AS runtime

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
