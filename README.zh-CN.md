<p align="center">
  <img src="./favicon.svg" alt="秘封俱乐部图标" width="88" height="88" />
</p>

<h1 align="center">秘封俱乐部｜夜行读本</h1>

<p align="center">
  <a href="README.md">English</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.ja.md">日本語</a>
</p>

<p align="center">九张秘封音乐 CD 的同人阅读室。</p>

<p align="center">
  <a href="https://cloud-oc.github.io/Secret-Sealing-Club/">进入网站</a>
</p>

## 关于

这里收着九张带 Booklet 故事的秘封音乐 CD。选一张专辑，播放一首曲子，对应的故事段落会在旁边亮起。正文支持中文与日文切换，播放使用网易云音乐曲目链接。

## 专辑

```text
莲台野夜行
梦违科学世纪
卯酉东海道
大空魔术
鸟船遗迹
伊奘诺物质
燕石博物志
旧约酒馆
七夕坂梦幻能
```

## 内容

专辑正文在 `content/albums/`。曲目信息和网易云单曲 ID 在 `src/data.js`。

```json
{
  "track": 1,
  "title": { "zh": "中文标题", "ja": "日本語タイトル" },
  "text": { "zh": "中文正文", "ja": "日本語本文" }
}
```

## 本地预览

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

打开 `http://127.0.0.1:4173`。

## 部署

推送到 `main` 后，GitHub Pages Actions 会自动发布网站。
