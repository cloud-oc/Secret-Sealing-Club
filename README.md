# Secret Sealing Club

An immersive static reading site for the Secret Sealing Club music albums and booklet stories.

## Content Notes

The site ships with structured album and track data, bilingual UI, and placeholder story excerpts.
Edit the JSON files in `content/albums/` to add story text without editing the app source.

Audio files are expected under `assets/audio/<album-id>/<track-number>.mp3`.

Each album JSON is loaded directly by the browser from `content/albums/<album-id>.json`.
Audio files are ignored by git by default; remove the audio ignore rules if you intentionally want to deploy them.

## Local Preview

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Then open `http://127.0.0.1:4173`.

## GitHub Pages

This repository includes `.github/workflows/pages.yml`, so pushes to `main` deploy automatically with GitHub Actions.

In the repository settings, set Pages to use **GitHub Actions** as the source.
