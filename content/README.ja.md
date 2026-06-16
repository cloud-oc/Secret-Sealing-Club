# アルバム内容

[English](README.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md)

`content/albums/` のアルバム JSON はサイトから直接読み込まれます。アルバムごとに 1 つのファイルを置き、ファイル名はアルバム `id` と合わせることを推奨します。

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

`track` は物語セクションを、内蔵された曲目リストと NetEase Cloud Music の再生元に対応させるために使います。
