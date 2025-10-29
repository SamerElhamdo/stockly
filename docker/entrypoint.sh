#!/usr/bin/env sh
set -e

# Wait for DB if defined
if [ -n "$WAIT_FOR_HOST" ] && [ -n "$WAIT_FOR_PORT" ]; then
  echo "⏳ Waiting for $WAIT_FOR_HOST:$WAIT_FOR_PORT ..."
  until nc -z "$WAIT_FOR_HOST" "$WAIT_FOR_PORT"; do
    sleep 1
  done
  echo "✅ Database is ready"
fi

echo "🚀 Running migrations..."
python manage.py migrate --noinput

echo "📦 Collecting static files..."
mkdir -p /app/staticfiles
python manage.py collectstatic --noinput

echo "👤 Creating superuser (if script exists)..."
python create_superuser.py || true

echo "⚙️ Starting Gunicorn server..."
exec gunicorn stockly_proj.wsgi:application \
  --bind 0.0.0.0:8000 \
  --workers ${GUNICORN_WORKERS:-3} \
  --timeout ${GUNICORN_TIMEOUT:-120}
