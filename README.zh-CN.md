# 秘封俱乐部

[English](README.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md)

一个非官方的秘封俱乐部同人阅读室。

这个网站想做的是音乐与文字之间的那段奇妙时间：打开一张专辑，播放一首曲子，在旁边读对应的 Booklet 故事。每张专辑都有自己的页面，每首曲子都可以对应一个故事段落，读者可以在中文和日文之间切换，像翻阅一份安静的秘封档案。

## 这里是什么

- 面向 ZUN's Music Collection 与秘封俱乐部故事的静态同人站
- 收录 9 张带 Booklet 故事的秘封音乐 CD 页面
- 固定播放器，支持曲目与故事段落联动高亮
- 中文 / 日文阅读模式
- 不需要后端，适合 GitHub Pages 部署

## 专辑范围

当前已经准备了这些专辑的内容文件：

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

## 添加故事和音频

专辑正文文件在：

```text
content/albums/
```

音频路径按这个结构引用：

```text
assets/audio/<album-id>/01.mp3
```

编辑对应专辑 JSON，填写 `text.zh` 和 `text.ja`。`track` 会把曲目、音频和故事段落连在一起。

```json
{
  "track": 1,
  "title": { "zh": "中文标题", "ja": "日本語タイトル" },
  "text": { "zh": "中文正文", "ja": "日本語本文" }
}
```

音频文件默认会被 `.gitignore` 忽略。如果你希望 GitHub Pages 线上站点也能播放音频，需要先移除 `.gitignore` 里对应的音频忽略规则，再提交。

## 本地预览

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

然后打开：

```text
http://127.0.0.1:4173
```

## GitHub Pages

仓库里已经有 GitHub Pages 自动部署 workflow。推送到 `main` 后，请确认仓库设置为：

```text
Settings -> Pages -> Build and deployment -> Source -> GitHub Actions
```

## 说明

这是一个用于阅读和整理体验的同人项目。请只添加你有权使用的文本和音频内容。
