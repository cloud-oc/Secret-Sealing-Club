# Secret Sealing Club

An immersive static reading site for the Secret Sealing Club music albums and booklet stories.

## Content Notes

The site ships with structured album and track data, bilingual UI, and placeholder story excerpts.
Edit the JSON files in `local-content/story/` to add local story text without editing the app source.

Audio files are expected under `assets/audio/<album-id>/<track-number>.mp3`.

For private local use, you can also import untracked content:

```sh
node scripts/import-local-content.mjs
```

Put story override JSON files in `local-content/story/` and audio files in `local-content/audio/<album-id>/`.
The importer generates `content/content.json` and copies audio into `assets/audio/`.
Those generated/private content files are ignored by git.

## Local Preview

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Then open `http://127.0.0.1:4173`.

## GitHub Pages

This repository includes `.github/workflows/pages.yml`, so pushes to `main` deploy automatically with GitHub Actions.

In the repository settings, set Pages to use **GitHub Actions** as the source.
