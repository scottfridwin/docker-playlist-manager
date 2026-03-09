# Gunicorn configuration for read-only filesystem deployment
bind = "0.0.0.0:8080"
workers = 2
threads = 4
worker_tmp_dir = "/tmp"
worker_class = "gthread"
pidfile = "/tmp/gunicorn.pid"
accesslog = "-"
errorlog = "-"
capture_output = True
disable_redirect_access_to_syslog = True

# Disable control server to prevent "Read-only file system" errors
# when running in containers with strict read-only filesystem enforcement
disable_control_server = True
