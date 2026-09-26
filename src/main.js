import { createStorage, fetchAlbum, createAudioController } from "./resilience.mjs";
const storage = createStorage(() => localStorage);
import { setupAstralCursor } from "./cursor.js?v=20260926-v1";
import { albums as baseAlbums } from "./data.js?v=20260926-lunar-v1";

let albums = baseAlbums;
const contentStates = new Map();
const contentRequests = new Map();
let lastSavedAt = 0;
let playbackStatus = "paused";

const playbackStorageKey = "ssc-playback";
const savedPlayback = readPlaybackState();

const state = {
  lang: storage.get("ssc-language") === "ja" ? "ja" : "zh",
  albumId: savedPlayback.albumId || "",
  trackIndex: Number.isInteger(savedPlayback.trackIndex) ? savedPlayback.trackIndex : 0,
  homeAlbumIndex: 0,
  isPlaying: false,
  resumeTime: Number.isFinite(savedPlayback.currentTime) ? savedPlayback.currentTime : 0,
  wantsAutoplay: false,
  restoringPlayback: true,
};

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let motionPaused = storage.get("ssc-motion-paused") === "true";
const gate = document.querySelector("#archive-gate");
let gateClosing = false;
let gateReturnFocus = null;
let entranceTimer = 0;
let starAnimationFrame = 0;
let starCanvasWidth = 0;
let starCanvasHeight = 0;
let starCanvasPixelRatio = 0;

const app = document.querySelector("#app");
const audio = document.querySelector("#audio");
const player = {
  shell: document.querySelector("#player-shell"),
  index: document.querySelector("#player-index"),
  title: document.querySelector("#player-title"),
  album: document.querySelector("#player-album"),
  prev: document.querySelector("#prev-track"),
  next: document.querySelector("#next-track"),
  play: document.querySelector("#play-toggle"),
  art: document.querySelector("#player-art"),
  playlistToggle: document.querySelector("#playlist-toggle"),
  playlistPanel: document.querySelector("#playlist-panel"),
  seek: document.querySelector("#seek"),
  current: document.querySelector("#current-time"),
  duration: document.querySelector("#duration"),
};
const language = {
  toggle: document.querySelector("#lang-toggle"),
  current: document.querySelector("#language-current"),
  menu: document.querySelector("#language-menu"),
  options: document.querySelectorAll("[data-language]"),
};
const intro = {
  toggle: document.querySelector("#info-toggle"),
  panel: document.querySelector("#site-intro"),
  backdrop: document.querySelector("#intro-backdrop"),
  close: document.querySelector("#intro-close"),
  title: document.querySelector("#intro-title"),
  about: document.querySelector("#intro-about"),
  experience: document.querySelector("#intro-experience"),
  note: document.querySelector("#intro-note"),
  repo: document.querySelector("#intro-repo"),
  feedback: document.querySelector("#intro-feedback"),
};
const t = {
  zh: {
    gateAction: "点击进入",
    gateReplay: "重播开场动画",
    motionPause: "暂停动态效果",
    motionResume: "开启动态效果",

    headerMotto: "音乐与幻想，通往彼侧的边界。",
    renko: "宇佐见 莲子",
    merry: "玛艾露贝莉·赫恩",
    observerNote: "两位观测者，一个隐秘的世界。",
    lunarObservation: "月面观测",
    boundary: "梦境与现实的边界",
    recordUnit: "张唱片",
    creator: "上海爱丽丝幻乐团",
    musicCollection: "ZUN 音乐藏品",
    skipContent: "跳转到内容",

    siteTitle: "秘封俱乐部 | 太空观测记录",
    brand: "秘封俱乐部",
    brandSub: "太空观测记录",
    heroKicker: "欢迎来到秘封俱乐部",
    heroTitleA: "在科学世纪",
    heroTitleB: "听见秘封",
    start: "回到首页",
    tracks: "曲目",
    playlist: "曲目",
    closePlaylist: "收起曲目",
    trackUnit: "曲",
    albumCarousel: "秘封藏书",
    openAlbum: "打开读本",
    observeAlbum: "观测这张读本",
    source: "原典线索",
    switchAlbum: "切换专辑",
    prevAlbum: "上一张",
    nextAlbum: "下一张",
    netease: "网易云",
    languageToggle: "切换语言",
    infoToggle: "关于这个网站",
    introTitle: "太空观测记录",
    introAbout: "秘封俱乐部是《东方Project》及其衍生作品中登场的一个架空的秘密结社。这里收录着九张秘封俱乐部的音乐 CD 读本。",
    introExperience: "选一张专辑，曲目会带着对应的故事段落一起亮起，就像驶在太空的列车行窗外闪烁的星星。",
    introNote: "阅读进度、语言与播放位置会保存在你的浏览器里。再次打开时，可以从上次停下的地方继续观测。",
    introRepoPrefix: "该项目位于 ",
    introRepoLink: "GitHub",
    introRepoSuffix: " 上。喜欢就加个 Star 吧！欢迎贡献。",
    introFeedbackPrefix: "在这里发送你的使用反馈或报告 Bug。",
    closeIntro: "关闭简介",
    closeIntroButton: "关闭",
    gateEnter: "点击进入",
    emptyStory: "这一页还在社团抽屉里。填入正文后，它会随曲目一起亮起。",
    notFoundTitle: "未观测到这个坐标",
    notFoundBody: "回到藏书目，重新选择一份秘封记录。",
  },
  ja: {
    gateAction: "クリックして入る",
    gateReplay: "オープニングをもう一度",
    motionPause: "動きを一時停止",
    motionResume: "動きを再開",

    headerMotto: "音楽と幻想、その境界へ。",
    renko: "宇佐見 蓮子",
    merry: "マエリベリー・ハーン",
    observerNote: "二人の観測者、ひとつの隠された世界。",
    lunarObservation: "月面観測",
    boundary: "夢と現の境界",
    recordUnit: "枚のレコード",
    creator: "上海アリス幻樂団",
    musicCollection: "ZUNの音楽コレクション",
    skipContent: "本文へ移動",

    siteTitle: "秘封倶楽部 | 宇宙観測記録",
    brand: "秘封倶楽部",
    brandSub: "宇宙観測記録",
    heroKicker: "秘封倶楽部へようこそ",
    heroTitleA: "科学世紀で",
    heroTitleB: "秘封を聴く",
    start: "表紙へ戻る",
    tracks: "トラック",
    playlist: "曲目",
    closePlaylist: "曲目を閉じる",
    trackUnit: "曲",
    albumCarousel: "秘封蔵書",
    openAlbum: "読本を開く",
    observeAlbum: "この読本を観測",
    source: "原典の手掛かり",
    switchAlbum: "アルバム切替",
    prevAlbum: "前の一枚",
    nextAlbum: "次の一枚",
    netease: "网易云",
    languageToggle: "言語を切り替える",
    infoToggle: "このサイトについて",
    introTitle: "宇宙観測記録",
    introAbout: "秘封倶楽部は『東方Project』およびその派生作品に登場する架空の秘密結社です。ここには秘封倶楽部の九枚の音楽 CD 読本を収めています。",
    introExperience: "一枚を選ぶと、曲に寄り添う物語の断片が、宇宙を走る列車の窓の外でまたたく星のように灯ります。",
    introNote: "読書位置、言語、再生位置はブラウザに保存されます。次に開いたときも、前回止まった場所から観測を続けられます。",
    introRepoPrefix: "このプロジェクトは ",
    introRepoLink: "GitHub",
    introRepoSuffix: " にあります。気に入ったら Star をどうぞ。コントリビューションも歓迎します。",
    introFeedbackPrefix: "感想や不具合報告はこちらから送れます。",
    closeIntro: "説明を閉じる",
    closeIntroButton: "閉じる",
    gateEnter: "クリックして入る",
    emptyStory: "この頁はまだ部室の引き出しの中です。本文を入れると、曲と一緒に灯ります。",
    notFoundTitle: "この座標は観測できません",
    notFoundBody: "蔵書目録へ戻って、もう一度秘封記録を選んでください。",
  },
};

function tr(key) {
  return t[state.lang][key];
}

function readPlaybackState() {
  try {
    const saved = JSON.parse(storage.get(playbackStorageKey) || "{}");
    return saved && typeof saved === "object" ? saved : {};
  } catch {
    return {};
  }
}

function savePlaybackState() {
  if (!state.albumId) return;
  const pendingResumeTime = state.restoringPlayback && savedPlayback.albumId === state.albumId && state.resumeTime > 0 ? state.resumeTime : 0;
  const payload = {
    albumId: state.albumId,
    trackIndex: state.trackIndex,
    currentTime: pendingResumeTime || (Number.isFinite(audio.currentTime) ? audio.currentTime : state.resumeTime || 0),
    wasPlaying: false,
    updatedAt: Date.now(),
  };
  storage.set(playbackStorageKey, JSON.stringify(payload));
}

function icon(name) {
  return `<svg class="ui-icon" aria-hidden="true"><use href="#icon-${name}"></use></svg>`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function cssUrl(value) {
  return String(value).replace(/[\s()"']/g, encodeURIComponent);
}

function route() {
  const hash = location.hash.replace(/^#\/?/, "");
  const [kind, id] = hash.split("/");

  const render = () => {
    closePlaylist();
    if (kind !== "albums") window.scrollTo({ top: 0, behavior: "instant" });
    if (!kind) {
      renderHome();
      return;
    }

    if (kind === "albums") {
      renderHome();
      requestAnimationFrame(() => document.querySelector("#albums")?.scrollIntoView({ block: "start" }));
      return;
    }

    if (kind === "album" && id) {
      renderAlbum(id);
      return;
    }

    renderNotFound();
  };

  transitionRoute(render);
}

function transitionRoute(render) {
  if (motionIsReduced() || !document.startViewTransition) {
    render();
    return;
  }

  document.startViewTransition(render);
}

async function ensureAlbumContent(id) {
  if (contentStates.get(id) === "ready") return;
  if (contentRequests.has(id)) return contentRequests.get(id);
  contentStates.set(id, "loading");
  const request = fetchAlbum(id).then(override => {
    albums = mergeAlbums(albums, [override]);
    contentStates.set(id, "ready");
  }).catch(() => { contentStates.set(id, "error"); }).finally(() => {
    contentRequests.delete(id);
    const album = albums.find(item => item.id === id);
    if (location.hash === `#/album/${id}`) {
      const y = window.scrollY;
      renderAlbum(id);
      window.scrollTo({ top: y, behavior: "instant" });
    } else if (document.body.dataset.view === "home") {
      if (albums[state.homeAlbumIndex]?.id === id) updateHomeCarousel();
      if (state.albumId === id) { renderPlaylist(album); updatePlayer(album, state.trackIndex, false); }
    }
  });
  contentRequests.set(id, request);
  return request;
}

async function warmAlbumContent() {
  const queue = albums.map(album => album.id);
  await Promise.all([0, 1].map(async () => {
    while (queue.length) await ensureAlbumContent(queue.shift());
  }));
}

function applySavedPlaybackState() {
  if (!savedPlayback.albumId) return;
  const album = albums.find((item) => item.id === savedPlayback.albumId);
  if (!album) return;

  state.albumId = album.id;
  state.trackIndex = Math.min(Math.max(0, state.trackIndex), album.tracks.length - 1);
  state.homeAlbumIndex = Math.max(0, albums.findIndex((item) => item.id === album.id));
}

function mergeAlbums(sourceAlbums, overrideAlbums) {
  return sourceAlbums.map((album) => {
    const override = overrideAlbums.find((item) => item.id === album.id);
    if (!override) return album;

    return {
      ...album,
      ...pickDefined(override, ["source", "color", "catalog", "year", "cover"]),
      links: { ...(album.links || {}), ...(override.links || {}) },
      title: { ...album.title, ...(override.title || {}) },
      summary: { ...album.summary, ...(override.summary || {}) },
      tracks: mergeTracks(album.tracks, override.tracks || []),
      story: mergeStory(album.story, override.story || []),
    };
  });
}

function mergeTracks(sourceTracks, overrideTracks) {
  return sourceTracks.map((track, index) => {
    const override = overrideTracks[index] || overrideTracks.find((item) => item.track === index + 1);
    return override ? { ...track, ...pickDefined(override, ["title", "audio", "neteaseId", "netease"]) } : track;
  });
}

function mergeStory(sourceStory, overrideStory) {
  if (!overrideStory.length) return sourceStory;

  return overrideStory
    .slice()
    .sort((a, b) => a.track - b.track)
    .map((override, index) => {
      const section = sourceStory.find((item) => item.track === override.track) || sourceStory[index] || {};

      return {
        ...section,
        ...pickDefined(override, ["track"]),
        title: { ...(section.title || {}), ...(override.title || {}) },
        text: { ...(section.text || {}), ...(override.text || {}) },
      };
    });
}

function pickDefined(source, keys) {
  return keys.reduce((result, key) => {
    if (source[key] !== undefined) result[key] = source[key];
    return result;
  }, {});
}

function renderHome() {
  document.body.dataset.view = "home";
  document.title = tr("siteTitle");
  app.innerHTML = `
    <section class="observatory">
      <div class="hero-copy">
        <p class="observatory-label"><span></span> ${tr("brand")} <span class="label-year">2003 — 2024</span></p>
        <h1>${state.lang === "zh" ? "在科学世纪，<br>聆听<span>另一侧。</span>" : "科学世紀で、<br><span>向こう側</span>を聴く。"}</h1>
        <p class="hero-description">${state.lang === "zh" ? "越过常识的结界，循着旋律与星轨。<br>和莲子、梅莉一起，重访那些不可思议的夜晚。" : "常識の結界を越え、旋律と星の軌道を辿る。<br>蓮子とメリーと、不思議な夜をもう一度。"}</p>
        <div class="hero-actions"><a class="primary-link" href="#/album/${albums[state.homeAlbumIndex].id}" id="hero-open">${icon("play")} ${state.lang === "zh" ? "聆听与阅读" : "音楽と物語へ"}</a><a class="quiet-link" href="#albums">${state.lang === "zh" ? "浏览全部专辑" : "すべてのアルバム"}${icon("arrow-up-right")}</a></div>
        <div class="observer-signature"><span>${tr("renko")}</span><i>×</i><span>${tr("merry")}</span><small>${tr("observerNote")}</small></div>
      </div>
      <div class="lunar-stage">
        <div class="lunar-map" aria-hidden="true"><div class="lunar-orbit orbit-outer"></div><div class="lunar-orbit orbit-inner"></div><img class="moon" src="./assets/visuals/moon.svg" alt=""><span class="orbit-star star-one">${icon("sparkle")}</span><span class="orbit-star star-two">${icon("plus")}</span><span class="moon-coordinate">${tr("lunarObservation")}</span><span class="moon-vertical">${tr("boundary")}</span></div>
        <div class="featured-album" id="featured-album"></div>
        <div class="feature-controls"><button class="icon-button" type="button" data-feature-step="-1" aria-label="${tr("prevAlbum")}">${icon("chevron-left")}</button><span id="feature-count"></span><button class="icon-button" type="button" data-feature-step="1" aria-label="${tr("nextAlbum")}">${icon("chevron-right")}</button></div>
      </div>
    </section>
    <section class="collection" id="albums" aria-labelledby="collection-title">
      <div class="collection-heading"><div><span class="section-symbol" aria-hidden="true">${icon("sparkle")}</span><h2 id="collection-title">${state.lang === "zh" ? "秘封音乐藏品" : "秘封音楽コレクション"}</h2><span class="collection-total">${String(albums.length).padStart(2,"0")} ${tr("recordUnit")}</span></div><p>${state.lang === "zh" ? "每一张唱片，都是一次越界。" : "一枚の音楽から、境界の向こうへ。"}</p></div>
      <div class="record-shelf">${albums.map((album,index)=>`<button class="record" type="button" data-record="${index}" aria-pressed="false" aria-label="${tr("observeAlbum")}: ${escapeHtml(album.title[state.lang])}"><span class="record-art"><img src="${escapeHtml(album.cover)}" alt="" loading="lazy" decoding="async" width="300" height="300"><span class="record-number">${String(index+1).padStart(2,"0")}</span><span class="record-indicator" aria-hidden="true">${icon("arrow-up-right")}</span></span><span class="record-title">${escapeHtml(album.title[state.lang])}</span><span class="record-caption">${album.year}<span>${album.tracks.length} ${tr("trackUnit")}</span></span></button>`).join("")}</div>
      <footer class="collection-footer"><span>${tr("creator")} <i> / </i> ${tr("musicCollection")}</span><span>${state.lang === "zh" ? "非官方同人音乐阅读室" : "非公式ファン音楽読書室"} <span aria-hidden="true">${icon("sparkle")}</span></span></footer>
    </section>`;
  updateHomeCarousel();
  document.querySelectorAll("[data-record]").forEach(button => button.addEventListener("click", () => {
    state.homeAlbumIndex = Number(button.dataset.record);
    updateHomeCarousel();
    document.querySelector(".lunar-stage").scrollIntoView({ block: "center", behavior: prefersReducedMotion.matches ? "instant" : "smooth" });
  }));
  document.querySelectorAll("[data-feature-step]").forEach(button => button.addEventListener("click", () => {
    state.homeAlbumIndex = (state.homeAlbumIndex + Number(button.dataset.featureStep) + albums.length) % albums.length;
    updateHomeCarousel();
  }));
  const album = currentAlbum();
  renderPlaylist(album);
  updatePlayer(album, state.trackIndex, false);
  setPlaylistAvailability(true);
  updateLanguageButtons();
}

function updateHomeCarousel() {
  const feature = document.querySelector("#featured-album");
  if (!feature) return;
  const album = albums[state.homeAlbumIndex];
  feature.innerHTML = `<a class="featured-cover" href="#/album/${album.id}" aria-label="${tr("openAlbum")}: ${escapeHtml(album.title[state.lang])}"><span class="record-disc" aria-hidden="true"></span><img src="${escapeHtml(album.cover)}" alt="${escapeHtml(album.title[state.lang])}" width="300" height="300" decoding="async" fetchpriority="high"><span class="cover-corner" aria-hidden="true">${icon("arrow-up-right")}</span></a><div class="featured-caption"><span>${album.catalog} <i> / </i> ${album.year}</span><h2><a href="#/album/${album.id}">${escapeHtml(album.title[state.lang])}</a></h2><p>${escapeHtml(album.summary[state.lang])}</p></div>`;
  if (!motionIsReduced()) feature.animate([{ opacity: .45, transform: "translateY(7px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 320, easing: "cubic-bezier(.16,1,.3,1)" });
  document.querySelector("#feature-count").innerHTML = `<strong>${String(state.homeAlbumIndex+1).padStart(2,"0")}</strong><span> / ${String(albums.length).padStart(2,"0")}</span>`;
  document.querySelector("#hero-open").href = `#/album/${album.id}`;
  document.querySelectorAll("[data-record]").forEach(button => button.setAttribute("aria-pressed", String(Number(button.dataset.record) === state.homeAlbumIndex)));
}

function renderAlbum(id) {
  if (!contentStates.has(id) && albums.some(album => album.id === id)) void ensureAlbumContent(id);
  const album = albums.find((item) => item.id === id);
  if (!album) {
    renderNotFound();
    return;
  }

  const albumIndex = albums.findIndex((item) => item.id === album.id);
  const previousAlbum = albums[(albumIndex - 1 + albums.length) % albums.length];
  const nextAlbum = albums[(albumIndex + 1) % albums.length];
  document.body.dataset.view = "album";
  if (state.albumId !== album.id) state.trackIndex = 0;
  state.albumId = album.id;
  if (state.trackIndex >= album.tracks.length) state.trackIndex = 0;
  document.title = `${album.title[state.lang]} | ${tr("brand")}`;

  app.innerHTML = `
    <article class="album-page" style="--album-color: ${album.color}">
      <aside class="album-aside">
        <a class="back-link" href="#/">${icon("arrow-left")} ${state.lang === "zh" ? "返回音乐藏品" : "コレクションへ"}</a>
        <div class="album-aside-signal" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <div class="album-switcher" aria-label="${tr("switchAlbum")}">
          <a class="album-switch-button" href="#/album/${previousAlbum.id}" data-album-jump="${previousAlbum.id}" aria-label="${tr("prevAlbum")}: ${previousAlbum.title[state.lang]}">${icon("chevron-left")}</a>
          <a class="album-switch-button" href="#/album/${nextAlbum.id}" data-album-jump="${nextAlbum.id}" aria-label="${tr("nextAlbum")}: ${nextAlbum.title[state.lang]}">${icon("chevron-right")}</a>
        </div>
        <div class="album-cover ${album.cover ? "has-cover" : ""}" style="${album.cover ? `--album-cover: url(${cssUrl(album.cover)});` : ""}">
          <p class="kicker">${album.catalog}</p>
          <div class="cover-disc"><span></span></div>
        </div>
        <div class="album-info">
          <p class="album-edition">${album.catalog} · ${album.year} · ${album.tracks.length} ${tr("trackUnit")}</p>
          <h1>${album.title[state.lang]}</h1>
          <p>${album.summary[state.lang]}</p>
          <div class="album-links">
            <a class="album-icon-link source-link" href="${album.source}" target="_blank" rel="noreferrer" aria-label="${tr("source")}" title="${tr("source")}">
              ${icon("book")}
              <span class="visually-hidden">${tr("source")}</span>
            </a>
            <a class="album-icon-link netease-link" href="${album.links?.netease || neteaseSearchUrl(album)}" target="_blank" rel="noreferrer" aria-label="${tr("netease")}: ${album.title[state.lang]}" title="${tr("netease")}">
              ${icon("turntable")}
              <span class="visually-hidden">${tr("netease")}</span>
            </a>
          </div>
        </div>
      </aside>

      <section class="reader lyric-reader">
        <div class="reader-heading"><span>${state.lang === "zh" ? "专辑附带故事" : "アルバムの物語"}</span><span>${album.catalog}</span></div>
        <div class="story">
          ${contentStates.get(id) === "ready" ? album.story.map((section, index) => storySection(album, section, index)).join("") : `<div class="content-status" role="status">${icon(contentStates.get(id) === "error" ? "retry" : "loader")}<p>${state.lang === "zh" ? (contentStates.get(id) === "error" ? "故事暂时未能加载，音乐仍可操作。" : "正在打开这张唱片的故事…") : (contentStates.get(id) === "error" ? "物語を読み込めませんでした。音楽の操作は可能です。" : "物語を読み込み中…")}</p>${contentStates.get(id) === "error" ? `<button id="retry-content" class="quiet-link" type="button">${state.lang === "zh" ? "重新加载" : "再読み込み"}</button>` : ""}</div>`}
        </div>
        <div class="reader-navigation"><button class="quiet-link" type="button" data-story-step="-1">${icon("chevron-left")} ${state.lang === "zh" ? "上一篇" : "前の物語"}</button><button class="quiet-link reader-play" type="button" id="story-play">${icon("play")} ${state.lang === "zh" ? "播放本曲" : "この曲を再生"}</button><button class="quiet-link" type="button" data-story-step="1">${state.lang === "zh" ? "下一篇" : "次の物語"} ${icon("chevron-right")}</button></div>
      </section>
    </article>
  `;

  bindAlbum(album);
  setPlaylistAvailability(true);
  updatePlayer(album, state.trackIndex, false);
  updateLanguageButtons();
}

function localizedTrackTitle(album, track, index) {
  if (typeof track.title === "object") return track.title[state.lang] || track.title.ja || "";
  if (state.lang === "ja") return track.title;
  return album.story.find(section => section.track === index + 1)?.title?.zh || track.title;
}

function trackButton(album, track, index) {
  return `
    <button class="track-button ${index === state.trackIndex ? "is-active" : ""}" type="button" data-track="${index}" aria-current="${index === state.trackIndex ? "true" : "false"}">
      <span class="track-number">${String(index + 1).padStart(2, "0")}</span>
      <span class="track-title">${escapeHtml(localizedTrackTitle(album, track, index))}</span>
    </button>
  `;
}

function storyTextHtml(section) {
  const rawText = section.text[state.lang]?.replace(/\r\n?/g, "\n").replace(/^\n+|\n+$/g, "");
  if (!rawText) return `<p class="story-paragraph empty-copy">${escapeHtml(tr("emptyStory"))}</p>`;

  return rawText
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/^\n+|\n+$/g, ""))
    .filter((paragraph) => paragraph.trim())
    .map((paragraph) => {
      const lines = paragraph
        .split("\n")
        .map((line) => escapeHtml(line.trimEnd()))
        .join("<br />");
      return `<p class="story-paragraph">${lines}</p>`;
    })
    .join("");
}

function storySection(album, section, index) {
  const track = album.tracks[section.track - 1] || album.tracks[index];
  const title = section.title?.[state.lang] || track?.title || "";
  return `
    <section class="story-section lyric-section ${index === activeStoryIndex(album) ? "is-active" : ""}" id="story-${index}" data-story="${index}">
      <div class="story-track">${tr("tracks")} ${String(section.track).padStart(2, "0")}</div>
      <div class="story-card">
        <h2>${escapeHtml(title)}</h2>
        <div class="story-copy">${storyTextHtml(section)}</div>
      </div>
    </section>
  `;
}

function renderNotFound() {
  document.body.dataset.view = "empty";
  app.innerHTML = `
    <section class="empty-state">
      <p class="kicker">404</p>
      <h1>${tr("notFoundTitle")}</h1>
      <p>${tr("notFoundBody")} <a class="text-link" href="#/">${tr("start")}</a></p>
    </section>
  `;
  setPlaylistAvailability(Boolean(state.albumId));
}

function bindAlbum(album) {
  document.querySelector("#retry-content")?.addEventListener("click", () => { void ensureAlbumContent(album.id); renderAlbum(album.id); });
  document.querySelectorAll("[data-story-step]").forEach(button => { button.disabled = contentStates.get(album.id) !== "ready"; });
  renderPlaylist(album);
  document.querySelectorAll("[data-story-step]").forEach(button => button.addEventListener("click", () => {
    const current = activeStoryIndex(album);
    const next = (current + Number(button.dataset.storyStep) + album.story.length) % album.story.length;
    selectTrack(album, Math.max(0, album.story[next].track - 1), playback.wanted);
    document.querySelector(".reader").scrollIntoView({ block: "start", behavior: "instant" });
  }));
  document.querySelector("#story-play")?.addEventListener("click", playAudioFromGesture);
  document.querySelectorAll("[data-album-jump]").forEach((link) => {
    link.addEventListener("click", () => {
      state.trackIndex = 0;
      closePlaylist();
    });
  });
}

function activeStoryIndex(album) {
  const exact = album.story.findIndex(section => section.track === state.trackIndex + 1);
  if (exact >= 0) return exact;
  return Math.max(0, album.story.findLastIndex(section => section.track <= state.trackIndex + 1));
}

function selectTrack(album, index, autoplay) {
  state.resumeTime = 0;
  state.restoringPlayback = false;
  state.trackIndex = index;
  document.querySelectorAll(".track-button").forEach((button, buttonIndex) => {
    button.classList.toggle("is-active", buttonIndex === index);
    button.setAttribute("aria-current", String(buttonIndex === index));
  });
  document.querySelectorAll(".story-section").forEach((section, sectionIndex) => {
    section.classList.toggle("is-active", sectionIndex === activeStoryIndex(album));
  });
  updatePlayer(album, index, autoplay);
  closePlaylist();
}

function updatePlayer(album, index, autoplay) {
  const track = album.tracks[index] || album.tracks[0];
  if (!track) return;
  const source = trackAudioSource(track);
  const canRestoreTime = state.restoringPlayback && savedPlayback.albumId === album.id && album.id === state.albumId && index === state.trackIndex;
  const restoreTime = canRestoreTime ? state.resumeTime : 0;

  state.albumId = album.id;
  state.trackIndex = index;
  player.index.textContent = `${tr("tracks")} ${String(index + 1).padStart(2, "0")}`;
  player.title.textContent = localizedTrackTitle(album, track, index);
  syncPlayerTrackLink(track);
  player.album.textContent = album.title[state.lang];
  syncPlayerAlbumLink(album);

  if (audio.dataset.src !== source) {
    document.querySelector("#playback-message").hidden = true;
    playback.setSource(source, restoreTime);
    player.seek.value = 0;
    updateSeekProgress();
    player.current.textContent = "0:00";
    player.duration.textContent = "0:00";
  } else if (restoreTime > 0 && Math.abs(audio.currentTime - restoreTime) > 1) {
    audio.dataset.resumeTime = String(restoreTime);
  }

  if (autoplay) {
    playAudioFromGesture();
  }

  savePlaybackState();
}

function trackAudioSource(track) {
  if (track.neteaseId) return `https://music.163.com/song/media/outer/url?id=${track.neteaseId}.mp3`;
  return track.audio || "";
}

function syncPlayerTrackLink(track) {
  const link = track.netease || (track.neteaseId ? `https://music.163.com/#/song?id=${track.neteaseId}` : "");
  if (link) {
    player.title.href = link;
    player.title.removeAttribute("aria-disabled");
    player.title.tabIndex = 0;
    return;
  }

  player.title.href = "#";
  player.title.setAttribute("aria-disabled", "true");
  player.title.tabIndex = -1;
}

function syncPlayerAlbumLink(album) {
  if (!album) return;
  player.art.href = `#/album/${album.id}`;
  player.art.style.setProperty("--album-color", album.color);
  if (album.cover) player.art.style.setProperty("--album-cover", `url(${cssUrl(album.cover)})`);
  else player.art.style.removeProperty("--album-cover");
  player.art.classList.toggle("has-cover", Boolean(album.cover));
  player.art.setAttribute("aria-label", `${tr("openAlbum")}: ${album.title[state.lang]}`);
}

function setLanguage(lang) {
  state.lang = lang;
  storage.set("ssc-language", lang);
  syncShellText();
  route();
}

function updateLanguageButtons() {
  language.current.textContent = state.lang === "zh" ? "中文" : "日本語";
  language.toggle.setAttribute("aria-label", tr("languageToggle"));
  language.options.forEach((option) => {
    const isActive = option.dataset.language === state.lang;
    option.classList.toggle("is-active", isActive);
    option.setAttribute("aria-checked", String(isActive));
  });

  player.playlistPanel.querySelectorAll(".track-button").forEach((button, index) => {
    button.classList.toggle("is-active", index === state.trackIndex);
    button.setAttribute("aria-current", String(index === state.trackIndex));
  });
}

function neteaseSearchUrl(album) {
  return `https://music.163.com/#/search/m/?s=${encodeURIComponent(album.title.ja)}&type=10`;
}

function formatTime(value) {
  if (!Number.isFinite(value)) return "0:00";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function currentAlbum() {
  return albums.find((album) => album.id === state.albumId) || albums[0];
}

const playback = createAudioController(audio, {
  onState(status, wanted) {
    playbackStatus = status;
    state.isPlaying = status === "playing";
    state.wantsAutoplay = wanted;
    player.shell.dataset.playback = status;
    updatePlayButton();
    if (status === "playing" || status === "paused") savePlaybackState();
  },
  onError: showPlaybackError,
  onEnded() {
    selectTrack(currentAlbum(), (state.trackIndex + 1) % currentAlbum().tracks.length, true);
  },
});

function playAudioFromGesture() {
  document.querySelector("#playback-message").hidden = true;
  return playback.play();
}

function showPlaybackError(reason = "source") {
  const message = document.querySelector("#playback-message");
  const copy = state.lang === "zh" ? (reason === "timeout" ? "音源响应较慢，请重试或前往网易云收听。" : "此音源暂时无法播放，请重试或前往网易云收听。") : "音源を再生できません。再試行するか网易云でお聴きください。";
  message.innerHTML = `<span>${copy}</span><button class="quiet-link" type="button" id="retry-audio">${icon("retry")}${state.lang === "zh" ? "重试" : "再試行"}</button><a class="quiet-link" href="${escapeHtml(player.title.href)}" target="_blank" rel="noopener">${icon("external")}网易云</a>`;
  message.hidden = false;
  document.querySelector("#retry-audio").addEventListener("click", playAudioFromGesture);
}

player.play.addEventListener("click", () => {
  if (playback.wanted) playback.pause();
  else void playAudioFromGesture();
});

player.prev.addEventListener("click", () => {
  const album = currentAlbum();
  const index = (state.trackIndex - 1 + album.tracks.length) % album.tracks.length;
  selectTrack(album, index, playback.wanted);
});

player.next.addEventListener("click", () => {
  const album = currentAlbum();
  const index = (state.trackIndex + 1) % album.tracks.length;
  selectTrack(album, index, playback.wanted);
});

player.seek.addEventListener("input", () => {
  updateSeekProgress();
  if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
  audio.currentTime = (Number(player.seek.value) / 1000) * audio.duration;
});

audio.addEventListener("loadedmetadata", () => {
  const resumeTime = Number(audio.dataset.resumeTime || 0);
  if (resumeTime > 0 && Number.isFinite(audio.duration)) {
    audio.currentTime = Math.min(Math.max(0, resumeTime), Math.max(0, audio.duration - 0.8));
    audio.dataset.resumeTime = "";
    state.resumeTime = 0;
    state.restoringPlayback = false;
  }
  player.duration.textContent = formatTime(audio.duration);
  updateSeekProgress();
});

audio.addEventListener("timeupdate", () => {
  player.current.textContent = formatTime(audio.currentTime);
  if (audio.duration) {
    player.seek.value = Math.round((audio.currentTime / audio.duration) * 1000);
    updateSeekProgress();
  }
  if (Date.now() - lastSavedAt > 2000) { lastSavedAt = Date.now(); savePlaybackState(); }
});


player.playlistToggle.addEventListener("click", () => {
  if (player.playlistToggle.disabled) return;
  const isOpen = player.playlistPanel.hidden;
  player.playlistPanel.hidden = !isOpen;
  player.playlistToggle.classList.toggle("is-active", isOpen);
  player.playlistToggle.setAttribute("aria-label", isOpen ? tr("closePlaylist") : tr("playlist"));
  player.playlistToggle.setAttribute("aria-expanded", String(isOpen));
});

function closePlaylist() {
  player.playlistPanel.hidden = true;
  player.playlistToggle.classList.remove("is-active");
  player.playlistToggle.setAttribute("aria-label", tr("playlist"));
  player.playlistToggle.setAttribute("aria-expanded", "false");
}

function setPlaylistAvailability(isAvailable) {
  player.playlistToggle.disabled = !isAvailable;
  if (!isAvailable) closePlaylist();
}

function renderPlaylist(album) {
  player.playlistPanel.innerHTML = `
    <div class="playlist-panel-header">
      <strong>${album.title[state.lang]}</strong>
      <span>${album.tracks.length}${tr("trackUnit")}</span>
    </div>
    <div class="track-list" aria-label="${tr("tracks")}">
      ${album.tracks.map((track, index) => trackButton(album, track, index)).join("")}
    </div>
  `;
  player.playlistToggle.setAttribute("aria-label", tr("playlist"));
  player.playlistToggle.disabled = false;

  player.playlistPanel.querySelectorAll("[data-track]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.track);
      const isOnAlbumPage = location.hash === `#/album/${album.id}`;
      if (!isOnAlbumPage) {
        state.trackIndex = index;
        updatePlayer(album, index, true);
        closePlaylist();
        location.hash = `#/album/${album.id}`;
        return;
      }
      selectTrack(album, index, true);
    });
  });
}

function updatePlayButton() {
  const pending = playbackStatus === "loading" || playbackStatus === "buffering";
  player.play.innerHTML = icon(pending ? "loader" : state.isPlaying ? "pause" : "play");
  player.play.setAttribute("aria-busy", String(pending));
  document.querySelector("#playback-state").textContent = pending ? (state.lang === "zh" ? "正在缓冲音源…" : "音源を読み込み中…") : "";
  player.play.setAttribute("aria-label", state.lang === "zh" ? (state.wantsAutoplay ? "暂停" : "播放") : (state.wantsAutoplay ? "一時停止" : "再生"));
  player.shell.classList.toggle("is-playing", state.isPlaying);
}

function updateSeekProgress() {
  const progress = Math.max(0, Math.min(100, Number(player.seek.value || 0) / 10));
  player.seek.style.setProperty("--seek-progress", `${progress}%`);
  const timeline = player.seek.closest(".player-timeline");
  const dotX = player.seek.offsetLeft + player.seek.clientWidth * (progress / 100);
  timeline?.style.setProperty("--seek-dot-x", `${dotX}px`);
}

window.addEventListener("resize", updateSeekProgress);

language.toggle.addEventListener("click", () => {
  setLanguageMenuOpen(language.menu.hidden);
});

language.toggle.addEventListener("keydown", (event) => {
  if (event.key !== "ArrowDown") return;
  event.preventDefault();
  setLanguageMenuOpen(true);
  language.options[0].focus();
});
language.menu.addEventListener("keydown", (event) => {
  const options = [...language.options];
  const index = options.indexOf(document.activeElement);
  const offsets = { ArrowDown: 1, ArrowUp: -1 };
  if (event.key in offsets) {
    event.preventDefault();
    options[(index + offsets[event.key] + options.length) % options.length].focus();
  }
});

language.options.forEach((option) => {
  option.addEventListener("click", () => {
    setLanguage(option.dataset.language);
    setLanguageMenuOpen(false);
  });
});

document.addEventListener("click", (event) => {
  if (event.target.closest(".language-switcher")) return;
  setLanguageMenuOpen(false);
});

intro.toggle?.addEventListener("click", () => setIntroOpen(intro.panel.hidden));
intro.close?.addEventListener("click", () => setIntroOpen(false));
intro.backdrop?.addEventListener("click", () => setIntroOpen(false));
document.querySelector(".skip-link").addEventListener("click", (event) => {
  event.preventDefault();
  app.focus();
  app.scrollIntoView({ block: "start" });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Tab" && !intro.panel.hidden) {
    const focusable = [...intro.panel.querySelectorAll("a[href], button")];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
  if (event.key === "Escape") {
    setLanguageMenuOpen(false);
    closePlaylist();
    setIntroOpen(false);
  }
});

function syncShellText() {
  document.documentElement.lang = state.lang === "zh" ? "zh-CN" : "ja";
  const brandTitle = document.querySelector(".brand strong");
  const brandSub = document.querySelector(".brand small");
  if (brandTitle) brandTitle.textContent = tr("brand");
  if (brandSub) brandSub.textContent = tr("brandSub");
  player.playlistToggle.setAttribute("aria-label", tr("playlist"));
  document.querySelector(".header-motto").textContent = tr("headerMotto");
  document.querySelector(".skip-link").textContent = tr("skipContent");
  if (!document.querySelector("#playback-message").hidden) showPlaybackError();
  syncMotionText();
  syncIntroText();
  updatePlayButton();
  player.prev.setAttribute("aria-label", state.lang === "zh" ? "上一首" : "前の曲");
  player.next.setAttribute("aria-label", state.lang === "zh" ? "下一首" : "次の曲");
  player.seek.setAttribute("aria-label", state.lang === "zh" ? "播放进度" : "再生位置");
  document.querySelector(".top-nav").setAttribute("aria-label", state.lang === "zh" ? "主导航" : "メインナビゲーション");
  player.shell.setAttribute("aria-label", state.lang === "zh" ? "音乐播放器" : "音楽プレーヤー");
  updateLanguageButtons();
}

function syncIntroText() {
  intro.toggle?.setAttribute("aria-label", tr("infoToggle"));
  intro.toggle?.setAttribute("title", tr("infoToggle"));
  intro.close?.setAttribute("aria-label", tr("closeIntro"));
  if (intro.title) intro.title.textContent = tr("introTitle");
  if (intro.about) intro.about.textContent = tr("introAbout");
  if (intro.experience) intro.experience.textContent = tr("introExperience");
  if (intro.note) intro.note.textContent = tr("introNote");
  if (intro.repo) {
    intro.repo.innerHTML = `${tr("introRepoPrefix")}<a href="https://github.com/cloud-oc/Secret-Sealing-Club" target="_blank" rel="noreferrer">${tr("introRepoLink")}</a>${tr("introRepoSuffix")}`;
  }
  if (intro.feedback) {
    intro.feedback.innerHTML = `<a href="https://github.com/cloud-oc/Secret-Sealing-Club/issues" target="_blank" rel="noreferrer">${tr("introFeedbackPrefix")}</a>`;
  }
  if (intro.close) intro.close.textContent = tr("closeIntroButton");
}

function setIntroOpen(isOpen) {
  if (!intro.panel || !intro.backdrop) return;
  const wasOpen = !intro.panel.hidden;
  intro.panel.hidden = !isOpen;
  intro.backdrop.hidden = !isOpen;
  intro.toggle?.classList.toggle("is-active", isOpen);
  intro.toggle?.setAttribute("aria-expanded", String(isOpen));
  [document.querySelector(".site-header"), app, player.shell].forEach(element => { element.inert = isOpen; });
  document.body.classList.toggle("intro-open", isOpen);
  if (isOpen) {
    closePlaylist();
    setLanguageMenuOpen(false);
    requestAnimationFrame(() => intro.close?.focus());
  } else if (wasOpen) {
    intro.toggle?.focus({ preventScroll: true });
  }
}

function setLanguageMenuOpen(isOpen) {
  const restoreFocus = !isOpen && language.menu.contains(document.activeElement);
  language.menu.hidden = !isOpen;
  language.toggle.classList.toggle("is-active", isOpen);
  language.toggle.setAttribute("aria-expanded", String(isOpen));
  if (restoreFocus) language.toggle.focus({ preventScroll: true });
}

function motionIsReduced() {
  return prefersReducedMotion.matches || motionPaused;
}

function syncMotionText() {
  const labels = { "gate-replay": "gateReplay" };
  Object.entries(labels).forEach(([id, key]) => { document.getElementById(id).textContent = tr(key); });
  document.querySelector("#gate-enter-label").textContent = tr("gateAction");
  gate.setAttribute("aria-label", tr("gateAction"));
  document.querySelector("#archive-enter").setAttribute("aria-label", tr("gateAction"));
  const toggle = document.querySelector("#motion-toggle");
  toggle.setAttribute("aria-label", tr(motionPaused ? "motionResume" : "motionPause"));
  toggle.title = tr(motionPaused ? "motionResume" : "motionPause");
  toggle.setAttribute("aria-pressed", String(motionPaused));
  document.body.classList.toggle("motion-paused", motionPaused);
}

function openArchiveGate(replay = false) {
  if (gate.open) return;
  gateReturnFocus = replay ? intro.toggle : app;
  if (!intro.panel.hidden) setIntroOpen(false);
  closePlaylist();
  gateClosing = false;
  gate.classList.remove("is-departing");
  document.body.classList.add("archive-locked");
  gate.showModal();
  document.querySelector("#archive-enter").focus({ preventScroll: true });
}

async function enterArchive(skip = false) {
  if (!gate.open || gateClosing) return;
  gateClosing = true;
  try {
    if (!skip && !motionIsReduced()) {
      gate.classList.add("is-departing");
      await gate.animate([{ opacity: 1, offset: 0 }, { opacity: 1, offset: .5 }, { opacity: 0, offset: 1 }], { duration: 1050, easing: "cubic-bezier(.22,1,.36,1)", fill: "forwards" }).finished;
    }
  } catch {
    // A cancelled transition must still release the modal and restore focus.
  } finally {
    gate.close();
    gate.getAnimations().forEach(animation => animation.cancel());
    gate.classList.remove("is-departing");
    document.body.classList.remove("archive-locked");
    document.body.classList.add("archive-entered");
    clearTimeout(entranceTimer);
    entranceTimer = setTimeout(() => document.body.classList.remove("archive-entered"), 1100);
    gateReturnFocus?.focus({ preventScroll: true });
    gateClosing = false;
  }
}

document.querySelector("#archive-enter").addEventListener("click", () => enterArchive());
document.querySelector("#gate-enter-label").addEventListener("click", () => enterArchive());
document.querySelector("#gate-replay").addEventListener("click", () => openArchiveGate(true));
gate.addEventListener("cancel", event => { event.preventDefault(); enterArchive(true); });
document.querySelector("#motion-toggle").addEventListener("click", () => {
  motionPaused = !motionPaused;
  storage.set("ssc-motion-paused", String(motionPaused));
  syncMotionText();
  resetStars();
});

function drawStars(time = 0) {
  const canvas = document.querySelector("#starfield");
  const context = canvas.getContext("2d");
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
  const width = window.innerWidth;
  const height = window.innerHeight;
  const slowTime = motionIsReduced() ? 0 : time * 0.00008;

  if (width !== starCanvasWidth || height !== starCanvasHeight || pixelRatio !== starCanvasPixelRatio) {
    starCanvasWidth = width;
    starCanvasHeight = height;
    starCanvasPixelRatio = pixelRatio;
    canvas.width = width * pixelRatio;
    canvas.height = height * pixelRatio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  }

  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.clearRect(0, 0, width, height);

  const space = context.createRadialGradient(width * 0.58, height * 0.42, 0, width * 0.58, height * 0.42, Math.max(width, height) * 0.82);
  space.addColorStop(0, "#11182a");
  space.addColorStop(0.5, "#090f1e");
  space.addColorStop(1, "#040711");
  context.fillStyle = space;
  context.fillRect(0, 0, width, height);

  drawNebula(context, width, height, slowTime);

  const starCount = Math.min(130, Math.floor((width * height) / 8500));

  for (let index = 0; index < starCount; index += 1) {
    const layer = index % 5;
    const drift = slowTime * (12 + layer * 8);
    const x = wrap((Math.sin(index * 91.7) * 0.5 + 0.5) * width + drift * (layer % 2 ? -1 : 1), width);
    const y = wrap((Math.cos(index * 53.3) * 0.5 + 0.5) * height + slowTime * (8 + layer * 5), height);
    const pulse = motionIsReduced() ? 0 : Math.sin(time * 0.0012 + index * 0.61) * 0.12;
    const radius = index % 29 === 0 ? 1.4 : index % 11 === 0 ? 1 : 0.56;
    context.globalAlpha = Math.min(0.78, (index % 7 === 0 ? 0.56 : 0.3) + pulse);
    context.fillStyle = index % 13 === 0 ? "rgba(215, 179, 99, 0.72)" : "rgba(244, 240, 231, 0.78)";
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }

  context.globalAlpha = 0.18;
  context.strokeStyle = "#56d6bd";
  context.beginPath();
  for (let index = 0; index < 9; index += 1) {
    const x = width * (0.62 + Math.sin(index * 1.7 + slowTime * 0.9) * 0.19);
    const y = height * (0.18 + index * 0.065 + Math.cos(index + slowTime) * 0.012);
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.stroke();

  context.globalAlpha = 1;
}

function drawNebula(context, width, height, time) {
  const clouds = [
    [0.18, 0.18, 0.44, "rgba(96, 217, 200, 0.1)"],
    [0.78, 0.22, 0.36, "rgba(104, 161, 188, 0.08)"],
    [0.55, 0.68, 0.5, "rgba(215, 179, 99, 0.07)"],
    [0.32, 0.78, 0.34, "rgba(113, 92, 171, 0.08)"],
  ];

  clouds.forEach(([baseX, baseY, size, color], index) => {
    const x = width * (baseX + Math.sin(time * (0.7 + index * 0.18) + index) * 0.035);
    const y = height * (baseY + Math.cos(time * (0.62 + index * 0.16) + index) * 0.04);
    const radius = Math.max(width, height) * size;
    const gradient = context.createRadialGradient(x, y, radius * 0.08, x, y, radius);
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.62, "rgba(11, 16, 32, 0.08)");
    gradient.addColorStop(1, "rgba(4, 7, 17, 0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
  });
}

function wrap(value, limit) {
  return ((value % limit) + limit) % limit;
}

let lastStarDraw = -Infinity;
function animateStars(time = 0) {
  if (document.hidden) return;
  if (time - lastStarDraw >= 33 || time === 0) { drawStars(time); lastStarDraw = time; }
  if (!motionIsReduced()) {
    starAnimationFrame = window.requestAnimationFrame(animateStars);
  }
}

function resetStars() {
  window.cancelAnimationFrame(starAnimationFrame);
  animateStars(0);
}

window.addEventListener("hashchange", route);
document.addEventListener("visibilitychange", () => {
  document.body.classList.toggle("page-hidden", document.hidden);
  if (document.hidden) { savePlaybackState(); window.cancelAnimationFrame(starAnimationFrame); }
  else resetStars();
});
window.addEventListener("pagehide", savePlaybackState);
window.addEventListener("resize", () => {
  resetStars();
  updateSeekProgress();
});
prefersReducedMotion.addEventListener("change", () => {
  resetStars();
});

animateStars();
applySavedPlaybackState();
syncShellText();
route();
openArchiveGate();
void ensureAlbumContent(state.albumId || albums[0].id);
setTimeout(() => void warmAlbumContent(), 500);

setupAstralCursor(() => !motionIsReduced());

// Capturing handles lazy images too, and falls back only once per image.
document.addEventListener("error", event => {
  const image = event.target;
  if (!(image instanceof HTMLImageElement) || image.dataset.fallback) return;
  image.dataset.fallback = "true";
  image.src = "./assets/visuals/cover-fallback.svg";
}, true);
