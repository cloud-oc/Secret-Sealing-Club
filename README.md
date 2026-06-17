<p align="center">
  <img src="./favicon.svg" alt="Secret Sealing Club icon" width="88" height="88" />
</p>

<h1 align="center">Secret Sealing Club</h1>

<p align="center">
  <a href="README.md">English</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.ja.md">日本語</a>
</p>

<p align="center">A quiet fan reading room for the Secret Sealing Club albums.</p>

<p align="center">
  <a href="https://cloud-oc.github.io/Secret-Sealing-Club/">Open the site</a>
</p>

## About

This site gathers the nine ZUN's Music Collection CDs with Secret Sealing Club booklet stories. Choose an album, play a track through NetEase Cloud Music, and read the matching story section in Chinese or Japanese.

## Albums

```text
Ghostly Field Club
Changeability of Strange Dream
Retrospective 53 minutes
Magical Astronomy
Trojan Green Asteroid
Neo-traditionalism of Japan
Dr. Latency's Freak Report
Dateless Bar "Old Adam"
Taboo Japan Disentanglement
```

## Content

Story JSON files live in `content/albums/`. Track metadata and NetEase song IDs live in `src/data.js`.

```json
{
  "track": 1,
  "title": { "zh": "中文标题", "ja": "日本語タイトル" },
  "text": { "zh": "中文正文", "ja": "日本語本文" }
}
```

## Local Preview

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Open `http://127.0.0.1:4173`.

## Deploy

Pushing to `main` deploys the site through GitHub Pages Actions.
