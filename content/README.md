# Album Content

[English](README.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md)

Album JSON files in `content/albums/` are loaded directly by the site. Keep one file per album and make the file name match the album `id`.

```json
{
  "id": "ghostly-field-club",
  "tracks": [
    { "track": 1, "audio": "assets/audio/ghostly-field-club/01.mp3" }
  ],
  "story": [
    {
      "track": 1,
      "title": { "zh": "Chinese title", "ja": "日本語タイトル" },
      "text": { "zh": "Chinese story text", "ja": "Japanese story text" }
    }
  ]
}
```

The `track` value links a song, an audio file, and a story section.
