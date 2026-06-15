# Secret Sealing Club

An immersive static reading site for the Secret Sealing Club music albums and booklet stories.

## Content Notes

The site ships with structured album and track data, bilingual UI, and placeholder story excerpts.
Replace the placeholders in `src/data.js` with text and audio you have permission to use.

Audio files are expected under `assets/audio/<album-id>/<track-number>.mp3`.

## Local Preview

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Then open `http://127.0.0.1:4173`.

## GitHub Pages

Because this is a plain static site, set Pages to deploy from the `main` branch and the repository root.
