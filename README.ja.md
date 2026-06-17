<p align="center">
  <img src="./favicon.svg" alt="秘封倶楽部アイコン" width="88" height="88" />
</p>

<h1 align="center">秘封倶楽部｜宇宙観測記録</h1>

<p align="center">
  <a href="README.md">English</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.ja.md">日本語</a>
</p>

<p align="center">九枚の秘封音楽 CD のためのファンメイド読書室です。</p>

<p align="center">
  <a href="https://cloud-oc.github.io/Secret-Sealing-Club/">サイトを開く</a>
</p>

## 概要

このサイトは、ブックレットストーリー付きの秘封音楽 CD 九作品をまとめています。アルバムを選び、NetEase Cloud Music の曲を再生すると、対応する物語の断片が横に灯ります。本文は中国語と日本語で切り替えられます。

## アルバム

```text
蓮台野夜行
夢違科学世紀
卯酉東海道
大空魔術
鳥船遺跡
伊弉諾物質
燕石博物誌
旧約酒場
七夕坂夢幻能
```

## コンテンツ

本文 JSON は `content/albums/` にあります。曲目情報と NetEase の曲 ID は `src/data.js` にあります。

```json
{
  "track": 1,
  "title": { "zh": "中文标题", "ja": "日本語タイトル" },
  "text": { "zh": "中文正文", "ja": "日本語本文" }
}
```

## ローカルプレビュー

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

`http://127.0.0.1:4173` を開きます。

## デプロイ

`main` に push すると、GitHub Pages Actions から自動公開されます。
