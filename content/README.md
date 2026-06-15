# Content Overrides

Create `content/content.json` from `content.example.json` when you are ready to add full text or custom audio paths.

This repository intentionally does not include copyrighted booklet text or music files. Put only content that you have permission to use here.

## Format

```json
{
  "albums": [
    {
      "id": "ghostly-field-club",
      "tracks": [
        { "track": 1, "audio": "assets/audio/ghostly-field-club/01.mp3" }
      ],
      "story": [
        {
          "track": 1,
          "title": { "zh": "中文标题", "ja": "日本語タイトル" },
          "text": { "zh": "中文正文", "ja": "日本語本文" }
        }
      ]
    }
  ]
}
```

`id` must match the album IDs in `src/data.js`.

Audio files should be placed under `assets/audio/<album-id>/`.
