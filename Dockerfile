FROM python:3.12-alpine

ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8080

COPY gunicorn.conf.py /tmp/gunicorn.conf.py

CMD ["gunicorn","--config","/tmp/gunicorn.conf.py","wsgi:app"]