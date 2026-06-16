# Secret Sealing Club

[English](README.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md)

An unofficial fan-made reading room for the Secret Sealing Club.

This site is built for the strange little hour between music and text: open an album, play a track, and read the booklet story beside it. Each album has its own page, each track can point to a matching story section, and the reader can switch between Chinese and Japanese while staying in the same quiet archive.

## What This Is

- A static fan site for ZUN's Music Collection and the Secret Sealing Club stories
- Album pages for the nine booklet-story CDs
- A fixed player using NetEase Cloud Music track links
- Track-to-story highlighting while reading
- Chinese and Japanese reading modes
- A GitHub Pages friendly site with no backend

## Albums

The site currently has content files for:

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

## Adding Stories

Album story files live in:

```text
content/albums/
```

Edit the matching album JSON and fill `text.zh` and `text.ja`. The `track` number links the story section to the built-in album track list and NetEase Cloud Music playback source.

```json
{
  "track": 1,
  "title": { "zh": "Chinese title", "ja": "日本語タイトル" },
  "text": { "zh": "Chinese story text", "ja": "Japanese story text" }
}
```

Track metadata and NetEase song IDs live in `src/data.js`. You usually do not need to edit them unless a NetEase link changes.

## Local Preview

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Then open:

```text
http://127.0.0.1:4173
```

## GitHub Pages

This repository includes a GitHub Actions workflow for Pages. After pushing to `main`, make sure the repository uses:

```text
Settings -> Pages -> Build and deployment -> Source -> GitHub Actions
```

## Note

This is a fan project for reading and preservation-like browsing. Add only text you have permission to use.
