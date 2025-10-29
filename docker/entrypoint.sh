#!/usr/bin/env sh
set -e

# Optional: Wait for DB if using external DB via DATABASE_URL
if [ -n "$WAIT_FOR_HOST" ] && [ -n "$WAIT_FOR_PORT" ]; then
  echo "Waiting for $WAIT_FOR_HOST:$WAIT_FOR_PORT ..."
  /bin/sh -c "until nc -z $WAIT_FOR_HOST $WAIT_FOR_PORT; do sleep 1; done"
fi

python manage.py collectstatic --noinput || true
python manage.py migrate --noinput

python create_superuser.py


exec gunicorn stockly_proj.wsgi:application \
  --bind 0.0.0.0:8000 \
  --workers ${GUNICORN_WORKERS:-3} \
  --timeout ${GUNICORN_TIMEOUT:-120}


