#!/bin/sh
set -eu
mc alias set pfram http://minio:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" >/dev/null
mc mb --ignore-existing "pfram/$MINIO_BUCKET" >/dev/null
mc anonymous set none "pfram/$MINIO_BUCKET" >/dev/null
echo "Bucket private siap."
