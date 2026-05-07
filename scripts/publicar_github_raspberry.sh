#!/usr/bin/env bash
set -euo pipefail

# Publica a versão HTML estática no GitHub Pages: https://rodeiosc.github.io/
# Execute no Raspberry depois de configurar o git e ter permissão de push no repositório.

REPO_URL="https://github.com/rodeiosc/rodeiosc.github.io.git"
REPO_DIR="$HOME/rodeiosc.github.io"
SITE_SOURCE_DIR="${SITE_SOURCE_DIR:-$HOME/site_html_rodeiosc}"
WEB_DIR="${WEB_DIR:-/var/www/html}"

if ! command -v git >/dev/null 2>&1; then
  echo "Git não encontrado. Instalando..."
  sudo apt update
  sudo apt install -y git
fi

if [ ! -d "$REPO_DIR/.git" ]; then
  echo "Clonando repositório em $REPO_DIR..."
  git clone "$REPO_URL" "$REPO_DIR"
fi

if [ ! -d "$SITE_SOURCE_DIR" ]; then
  echo "Pasta do site não encontrada: $SITE_SOURCE_DIR"
  echo "Copie o conteúdo do pacote HTML para essa pasta ou execute assim:"
  echo "SITE_SOURCE_DIR=/caminho/da/pasta ./scripts/publicar_github_raspberry.sh"
  exit 1
fi

echo "Copiando site HTML para o repositório..."
rsync -av --delete \
  --exclude='.git' \
  "$SITE_SOURCE_DIR/" "$REPO_DIR/"

mkdir -p "$REPO_DIR/data" "$REPO_DIR/media"

# Copia dados gerados pelo Raspberry, se existirem.
if [ -f "$WEB_DIR/clima.json" ]; then
  cp "$WEB_DIR/clima.json" "$REPO_DIR/data/clima.json"
elif [ -f "$WEB_DIR/data/clima.json" ]; then
  cp "$WEB_DIR/data/clima.json" "$REPO_DIR/data/clima.json"
elif [ -f "$WEB_DIR/media/ambientweather/clima.json" ]; then
  cp "$WEB_DIR/media/ambientweather/clima.json" "$REPO_DIR/data/clima.json"
fi

if [ -f "$WEB_DIR/media/ambientweather/ambientweather_mes.csv" ]; then
  cp "$WEB_DIR/media/ambientweather/ambientweather_mes.csv" "$REPO_DIR/data/ambientweather_mes.csv"
fi

if [ -f "$WEB_DIR/media/ambientweather/ambientweather_historico.csv" ]; then
  cp "$WEB_DIR/media/ambientweather/ambientweather_historico.csv" "$REPO_DIR/data/ambientweather_historico.csv"
fi

# Copia imagens e vídeos, se existirem.
for file in latest.jpg ontem.jpg latest_timelapse.mp4; do
  if [ -f "$WEB_DIR/media/$file" ]; then
    cp "$WEB_DIR/media/$file" "$REPO_DIR/media/$file"
  fi
done

cd "$REPO_DIR"

git add .
if git diff --cached --quiet; then
  echo "Nada novo para publicar."
  exit 0
fi

git commit -m "Atualiza site meteorológico HTML"
git push origin main

echo "Publicado em: https://rodeiosc.github.io/"
