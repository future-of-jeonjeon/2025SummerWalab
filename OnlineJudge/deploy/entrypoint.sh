#!/bin/sh
set -e

APP=/app
DATA=/data

mkdir -p $DATA/log $DATA/config $DATA/test_case $DATA/public/upload $DATA/public/avatar $DATA/public/website

if [ ! -f "$DATA/config/secret.key" ]; then
    cat /dev/urandom | head -1 | md5sum | head -c 32 > "$DATA/config/secret.key"
fi

if [ ! -f "$DATA/public/avatar/default.png" ]; then
    cp data/public/avatar/default.png $DATA/public/avatar
fi

if [ ! -f "$DATA/public/website/favicon.ico" ]; then
    cp data/public/website/favicon.ico $DATA/public/website
fi

if [ -z "$MAX_WORKER_NUM" ]; then
    CPU_CORE_NUM=$(grep -c ^processor /proc/cpuinfo)
    if [ "$CPU_CORE_NUM" -lt 2 ]; then
        MAX_WORKER_NUM=2
    else
        MAX_WORKER_NUM=$CPU_CORE_NUM
    fi
fi

export MAX_WORKER_NUM

cd $APP

attempt=0
until [ $attempt -ge 5 ]
do
    if python manage.py migrate --no-input && \
       python manage.py inituser --username=root --password=rootroot --action=create_super_admin && \
       echo "from options.options import SysOptions; SysOptions.judge_server_token='$JUDGE_SERVER_TOKEN'" | python manage.py shell && \
       echo "from conf.models import JudgeServer; JudgeServer.objects.update(task_number=0)" | python manage.py shell
    then
        break
    fi

    attempt=$((attempt + 1))
    echo "Failed to migrate, going to retry..."
    sleep 8
done

addgroup -g 903 spj
adduser -u 900 -S -G spj server

chown -R server:spj $DATA
find $DATA/test_case -type d -exec chmod 710 {} \;
find $DATA/test_case -type f -exec chmod 640 {} \;

python manage.py rundramatiq --processes "$MAX_WORKER_NUM" --threads 4 &
DRAMATIQ_PID=$!

term_handler() {
    kill -TERM "$DRAMATIQ_PID" 2>/dev/null || true
    kill -TERM "$GUNICORN_PID" 2>/dev/null || true
}

trap term_handler INT TERM

gunicorn oj.wsgi \
    --user server \
    --group spj \
    --bind 0.0.0.0:8000 \
    --workers "$MAX_WORKER_NUM" \
    --threads 4 \
    --max-requests 1000000 \
    --max-requests-jitter 10000 \
    --keep-alive 32 &
GUNICORN_PID=$!

wait "$GUNICORN_PID"
STATUS=$?

kill -TERM "$DRAMATIQ_PID" 2>/dev/null || true
wait "$DRAMATIQ_PID" 2>/dev/null || true

exit "$STATUS"
