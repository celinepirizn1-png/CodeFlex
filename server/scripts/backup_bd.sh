#!/bin/bash
set -e

BACKUP_DIR="/var/backups/sgdm"
DB_NAME="sgdm"
DB_USER="root"
DB_PASSWORD=""
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/sgdm_$TIMESTAMP.sql"
LOG_FILE="$BACKUP_DIR/backup.log"

mkdir -p "$BACKUP_DIR"

if command -v mysqldump >/dev/null 2>&1; then
  mysqldump -u "$DB_USER" --password="$DB_PASSWORD" "$DB_NAME" > "$BACKUP_FILE"
  echo "[$(date)] Backup generado: $BACKUP_FILE" >> "$LOG_FILE"
else
  echo "[$(date)] mysqldump no está instalado" >> "$LOG_FILE"
  exit 1
fi

find "$BACKUP_DIR" -type f -name "sgdm_*.sql" -mtime +7 -delete
