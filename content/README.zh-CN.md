# 专辑内容

[English](README.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md)

`content/albums/` 里的专辑 JSON 会被网站直接读取。建议每张专辑一个文件，并让文件名和专辑 `id` 保持一致。

```json
{
  "id": "ghostly-field-club",
  "story": [
    {
      "track": 1,
      "title": { "zh": "中文标题", "ja": "日本語タイトル" },
      "text": { "zh": "中文正文", "ja": "日本語本文" }
    }
  ]
}
```

`track` 用来把故事段落和内置曲目列表、网易云播放源对应起来。
