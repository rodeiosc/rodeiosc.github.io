# Estação Meteorológica PU5BHV - versão HTML para GitHub Pages

Esta pasta contém uma versão estática do site, pronta para publicar em:

https://rodeiosc.github.io/

## O que foi convertido

O GitHub Pages não executa PHP nem consulta SQLite. Por isso, o site foi refeito com:

- `index.html`: painel principal da estação.
- `camera.html`: foto atual e timelapse.
- `dados.html`: tabela de extremos diários usando CSV ou JSON.
- `about.html`: página sobre equipamentos e operação.
- `face.html`: página de compartilhamento.
- `assets/css/style.css`: aparência do site.
- `assets/js/app.js`: leitura do `data/clima.json`, cards e gráficos.
- `assets/js/dados.js`: leitura do CSV mensal ou fallback pelo JSON.
- `data/clima.json`: dados atuais da estação.
- `media/`: pasta para `latest.jpg`, `ontem.jpg` e `latest_timelapse.mp4`.
- `scripts/publicar_github_raspberry.sh`: script para enviar pelo Raspberry.

## Como publicar pelo Raspberry

1. Envie esta pasta para o Raspberry, por exemplo em:

```bash
/home/pi/site_html_rodeiosc
```

2. Configure seu Git no Raspberry, se ainda não configurou:

```bash
git config --global user.name "Seu Nome"
git config --global user.email "seu-email@example.com"
```

3. Entre na pasta do site e execute:

```bash
cd /home/pi/site_html_rodeiosc
./scripts/publicar_github_raspberry.sh
```

Se a pasta estiver em outro local:

```bash
SITE_SOURCE_DIR=/caminho/da/pasta ./scripts/publicar_github_raspberry.sh
```

## Arquivos que o Raspberry pode atualizar antes do envio

- `data/clima.json`
- `data/ambientweather_mes.csv`
- `data/ambientweather_historico.csv`
- `media/latest.jpg`
- `media/ontem.jpg`
- `media/latest_timelapse.mp4`

Depois de cada atualização, rode o script novamente para fazer `git add`, `commit` e `push`.

## Observação importante

As páginas antigas `.php` funcionavam no servidor local porque o Raspberry/Apache processava PHP. No GitHub Pages, use apenas `.html`, `.css`, `.js`, `.json`, imagens e vídeos.
