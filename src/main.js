import { albums as baseAlbums } from "./data.js";

let albums = baseAlbums;

const state = {
  lang: localStorage.getItem("ssc-language") || "zh",
  albumId: "",
  trackIndex: 0,
  isPlaying: false,
};

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
  seek: document.querySelector("#seek"),
  current: document.querySelector("#current-time"),
  duration: document.querySelector("#duration"),
};

const t = {
  zh: {
    heroKicker: "ZUN's Music Collection Reader",
    heroTitleA: "在两个世界的缝隙里",
    heroTitleB: "听见秘封",
    heroBody:
      "把秘封俱乐部音乐 CD 做成可阅读的档案：每张专辑独立成页，曲目与故事片段互相对应。读者可以一边播放音乐，一边在中文与日文之间切换。",
    start: "进入专辑",
    guide: "内容维护指南",
    observation: "观测记录",
    observationText:
      "当前站点已搭好完整交互结构。为尊重原作与汉化版权，示例小说是占位摘要；你可以在 src/data.js 中替换为已获授权的中文与日文全文。",
    tracks: "曲目",
    readMode: "阅读语言",
    noAudio: "音频文件未放入仓库时，播放器会显示曲目并保持阅读联动；放入 assets/audio 后即可播放。",
    source: "资料页",
    copyright:
      "版权提示：本页结构用于个人整理与阅读体验。请只填入你有权使用或公开授权可转载的小说文本与音频文件。",
    aboutTitle: "站点维护指南",
    aboutBody:
      "这是一个纯静态网站，可以直接部署到 GitHub Pages。完整小说与音频不要硬编码进页面，统一维护在 src/data.js 与 assets/audio 目录中。",
    aboutSteps: [
      "在 src/data.js 的 albums 数组里找到对应专辑。",
      "把 story.zh 和 story.ja 的占位摘要替换为已授权文本。",
      "把音频文件放进 assets/audio，并把 tracks[].audio 改成对应路径。",
      "提交到 GitHub 后，在仓库 Settings → Pages 选择 Deploy from a branch / main / root。",
    ],
  },
  ja: {
    heroKicker: "ZUN's Music Collection Reader",
    heroTitleA: "ふたつの世界の隙間で",
    heroTitleB: "秘封を聴く",
    heroBody:
      "秘封倶楽部の音楽 CD を読むためのアーカイブです。アルバムごとにページを分け、曲と物語の断片を対応させています。中国語と日本語を切り替えながら読めます。",
    start: "アルバムへ",
    guide: "編集ガイド",
    observation: "観測記録",
    observationText:
      "サイトの構造とインタラクションは実装済みです。原作と翻訳の権利に配慮し、本文は要約プレースホルダーです。許諾済みの全文を src/data.js に入れてください。",
    tracks: "トラック",
    readMode: "表示言語",
    noAudio: "音声ファイルが未配置の場合でも、曲目表示と読書連動は利用できます。assets/audio に入れると再生できます。",
    source: "資料ページ",
    copyright:
      "権利に関する注意：このページ構造は個人整理と読書体験のためのものです。使用権または転載許可のある本文と音声のみ追加してください。",
    aboutTitle: "サイト編集ガイド",
    aboutBody:
      "このサイトは静的ファイルだけで動作し、GitHub Pages にそのまま配置できます。本文と音声は src/data.js と assets/audio で管理します。",
    aboutSteps: [
      "src/data.js の albums 配列で対象アルバムを探します。",
      "story.zh と story.ja の要約を、許諾済みの本文に置き換えます。",
      "音声ファイルを assets/audio に置き、tracks[].audio を更新します。",
      "GitHub に push 後、Settings → Pages で Deploy from a branch / main / root を選びます。",
    ],
  },
};

function tr(key) {
  return t[state.lang][key];
}

function route() {
  const hash = location.hash.replace(/^#\/?/, "");
  const [kind, id] = hash.split("/");

  if (!kind) {
    renderHome();
    return;
  }

  if (kind === "album" && id) {
    renderAlbum(id);
    return;
  }

  if (kind === "about") {
    renderAbout();
    return;
  }

  renderNotFound();
}

async function loadContentOverrides() {
  const overrides = [];

  try {
    await Promise.all(
      baseAlbums.map(async (album) => {
        const response = await fetch(`./content/albums/${album.id}.json`, { cache: "no-store" });
        if (!response.ok) return;
        overrides.push(await response.json());
      }),
    );
  } catch {
    albums = baseAlbums;
    return;
  }

  albums = mergeAlbums(baseAlbums, overrides);
}

function mergeAlbums(sourceAlbums, overrideAlbums) {
  return sourceAlbums.map((album) => {
    const override = overrideAlbums.find((item) => item.id === album.id);
    if (!override) return album;

    return {
      ...album,
      ...pickDefined(override, ["source", "color", "catalog", "year"]),
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
    return override ? { ...track, ...pickDefined(override, ["title", "audio"]) } : track;
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
  document.title = "秘封俱乐部 | Music & Stories";
  app.innerHTML = `
    <section class="hero">
      <div class="hero-copy">
        <p class="kicker">${tr("heroKicker")}</p>
        <h1>${tr("heroTitleA")}<br><span class="jp-title">${tr("heroTitleB")}</span></h1>
        <p>${tr("heroBody")}</p>
        <div class="hero-actions">
          <a class="primary-link" href="#albums">${tr("start")}</a>
          <a class="secondary-link" href="#/about">${tr("guide")}</a>
        </div>
      </div>
      <div class="orbital" aria-hidden="true">
        <div class="orbit-ring"></div>
        <div class="orbit-ring"></div>
        <div class="constellation-card">
          <strong>${tr("observation")}</strong>
          <p>${tr("observationText")}</p>
        </div>
      </div>
    </section>
    <section class="album-grid" id="albums" aria-label="专辑列表">
      ${albums.map(albumCard).join("")}
    </section>
  `;
  updateLanguageButtons();
}

function albumCard(album, index) {
  return `
    <a class="album-card" href="#/album/${album.id}" style="--album-color: ${album.color}">
      <span class="album-number">ARCHIVE ${String(index + 1).padStart(2, "0")}</span>
      <h2>${album.title[state.lang]}</h2>
      <p>${album.summary[state.lang]}</p>
      <span class="album-meta">
        <span>${album.year}</span>
        <span>${album.tracks.length} tracks</span>
      </span>
    </a>
  `;
}

function renderAlbum(id) {
  const album = albums.find((item) => item.id === id);
  if (!album) {
    renderNotFound();
    return;
  }

  state.albumId = album.id;
  if (state.trackIndex >= album.tracks.length) state.trackIndex = 0;
  document.title = `${album.title.zh} | 秘封俱乐部`;

  app.innerHTML = `
    <article class="album-page" style="--album-color: ${album.color}">
      <aside class="album-aside">
        <div class="album-cover">
          <p class="kicker">${album.catalog}</p>
          <div class="cover-disc"><span></span></div>
        </div>
        <div class="album-info">
          <h1>${album.title[state.lang]}</h1>
          <p>${album.summary[state.lang]}</p>
          <a class="source-link" href="${album.source}" target="_blank" rel="noreferrer">${tr("source")}</a>
        </div>
        <div class="track-list" aria-label="${tr("tracks")}">
          ${album.tracks.map((track, index) => trackButton(track, index)).join("")}
        </div>
      </aside>

      <section class="reader">
        <div class="reader-tools">
          <div>
            <strong>${tr("readMode")}</strong>
            <div class="reader-note">${tr("noAudio")}</div>
          </div>
          <div class="language-switch">
            <button class="language-button" data-lang="zh" type="button">中文</button>
            <button class="language-button" data-lang="ja" type="button">日本語</button>
          </div>
        </div>

        <div class="story">
          ${album.story.map((section, index) => storySection(album, section, index)).join("")}
        </div>
        <p class="copyright-note">${tr("copyright")}</p>
      </section>
    </article>
  `;

  bindAlbum(album);
  updatePlayer(album, state.trackIndex, false);
  updateLanguageButtons();
}

function trackButton(track, index) {
  return `
    <button class="track-button ${index === state.trackIndex ? "is-active" : ""}" type="button" data-track="${index}">
      <span class="track-number">${String(index + 1).padStart(2, "0")}</span>
      <span class="track-title">${track.title}</span>
    </button>
  `;
}

function storySection(album, section, index) {
  const track = album.tracks[section.track - 1] || album.tracks[index];
  return `
    <section class="story-section ${index === state.trackIndex ? "is-active" : ""}" id="story-${index}" data-story="${index}">
      <div class="story-track">TRACK ${String(section.track).padStart(2, "0")}</div>
      <div class="story-card">
        <h2>${track?.title || section.title[state.lang]}</h2>
        <p>${section.text[state.lang]}</p>
      </div>
    </section>
  `;
}

function renderAbout() {
  document.title = "维护指南 | 秘封俱乐部";
  app.innerHTML = `
    <section class="about-page">
      <p class="kicker">Static archive</p>
      <h1>${tr("aboutTitle")}</h1>
      <p>${tr("aboutBody")}</p>
      <ol>
        ${tr("aboutSteps").map((step) => `<li>${step}</li>`).join("")}
      </ol>
      <p>发布命令建议使用 <code>git init</code>、<code>git add .</code>、<code>git commit</code>，再推送到 GitHub 仓库并开启 Pages。</p>
    </section>
  `;
  updateLanguageButtons();
}

function renderNotFound() {
  app.innerHTML = `
    <section class="empty-state">
      <p class="kicker">404</p>
      <h1>未观测到这个坐标</h1>
      <p>回到 <a class="source-link" href="#/">专辑列表</a> 重新选择一个秘封记录。</p>
    </section>
  `;
}

function bindAlbum(album) {
  document.querySelectorAll("[data-track]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.track);
      selectTrack(album, index, true);
    });
  });

  document.querySelectorAll("[data-lang]").forEach((button) => {
    button.addEventListener("click", () => setLanguage(button.dataset.lang));
  });
}

function selectTrack(album, index, autoplay) {
  state.trackIndex = index;
  document.querySelectorAll(".track-button").forEach((button, buttonIndex) => {
    button.classList.toggle("is-active", buttonIndex === index);
  });
  document.querySelectorAll(".story-section").forEach((section, sectionIndex) => {
    section.classList.toggle("is-active", sectionIndex === index);
  });
  document.querySelector(`#story-${index}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  updatePlayer(album, index, autoplay);
}

function updatePlayer(album, index, autoplay) {
  const track = album.tracks[index] || album.tracks[0];
  if (!track) return;

  player.index.textContent = `TRACK ${String(index + 1).padStart(2, "0")}`;
  player.title.textContent = track.title;
  player.album.textContent = album.title[state.lang];

  if (audio.dataset.src !== track.audio) {
    audio.dataset.src = track.audio;
    audio.src = track.audio;
    player.seek.value = 0;
    player.current.textContent = "0:00";
    player.duration.textContent = "0:00";
  }

  if (autoplay) {
    audio.play().catch(() => {
      state.isPlaying = false;
      updatePlayButton();
    });
  }
}

function setLanguage(lang) {
  state.lang = lang;
  localStorage.setItem("ssc-language", lang);
  route();
}

function updateLanguageButtons() {
  document.querySelectorAll("[data-lang]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.lang === state.lang);
  });
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

player.play.addEventListener("click", () => {
  if (audio.paused) {
    audio.play().catch(() => {});
  } else {
    audio.pause();
  }
});

player.prev.addEventListener("click", () => {
  const album = currentAlbum();
  const index = (state.trackIndex - 1 + album.tracks.length) % album.tracks.length;
  selectTrack(album, index, !audio.paused);
});

player.next.addEventListener("click", () => {
  const album = currentAlbum();
  const index = (state.trackIndex + 1) % album.tracks.length;
  selectTrack(album, index, !audio.paused);
});

player.seek.addEventListener("input", () => {
  if (!audio.duration) return;
  audio.currentTime = (Number(player.seek.value) / 1000) * audio.duration;
});

audio.addEventListener("play", () => {
  state.isPlaying = true;
  updatePlayButton();
});

audio.addEventListener("pause", () => {
  state.isPlaying = false;
  updatePlayButton();
});

audio.addEventListener("loadedmetadata", () => {
  player.duration.textContent = formatTime(audio.duration);
});

audio.addEventListener("timeupdate", () => {
  player.current.textContent = formatTime(audio.currentTime);
  if (audio.duration) {
    player.seek.value = Math.round((audio.currentTime / audio.duration) * 1000);
  }
});

audio.addEventListener("ended", () => {
  player.next.click();
});

function updatePlayButton() {
  player.play.textContent = state.isPlaying ? "Ⅱ" : "▶";
}

document.querySelector("#lang-toggle").addEventListener("click", () => {
  setLanguage(state.lang === "zh" ? "ja" : "zh");
});

function drawStars() {
  const canvas = document.querySelector("#starfield");
  const context = canvas.getContext("2d");
  const pixelRatio = window.devicePixelRatio || 1;
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = width * pixelRatio;
  canvas.height = height * pixelRatio;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  context.scale(pixelRatio, pixelRatio);
  context.clearRect(0, 0, width, height);

  const starCount = Math.min(170, Math.floor((width * height) / 7600));
  context.fillStyle = "rgba(236, 230, 215, 0.8)";

  for (let index = 0; index < starCount; index += 1) {
    const x = (Math.sin(index * 91.7) * 0.5 + 0.5) * width;
    const y = (Math.cos(index * 53.3) * 0.5 + 0.5) * height;
    const radius = index % 11 === 0 ? 1.35 : 0.75;
    context.globalAlpha = index % 7 === 0 ? 0.84 : 0.38;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }

  context.globalAlpha = 0.28;
  context.strokeStyle = "#56d6bd";
  context.beginPath();
  for (let index = 0; index < 9; index += 1) {
    const x = width * (0.62 + Math.sin(index * 1.7) * 0.19);
    const y = height * (0.18 + index * 0.065);
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.stroke();
}

window.addEventListener("hashchange", route);
window.addEventListener("resize", drawStars);

drawStars();
await loadContentOverrides();
route();
