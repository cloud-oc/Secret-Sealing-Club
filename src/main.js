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
  playlistToggle: document.querySelector("#playlist-toggle"),
  playlistPanel: document.querySelector("#playlist-panel"),
  seek: document.querySelector("#seek"),
  current: document.querySelector("#current-time"),
  duration: document.querySelector("#duration"),
};

const t = {
  zh: {
    siteTitle: "秘封俱乐部 | 夜行读本",
    brand: "秘封俱乐部",
    brandSub: "夜行读本",
    heroKicker: "欢迎回到秘封俱乐部",
    heroTitleA: "夜还很长",
    heroTitleB: "翻开下一张秘封",
    heroBody:
      "在铁路、星图与旧科学的气味里，一边听曲，一边读梅莉和莲子的夜谈。",
    start: "翻阅藏书",
    tracks: "曲目",
    playlist: "曲目",
    closePlaylist: "收起曲目",
    trackUnit: "曲",
    source: "原典线索",
    quietNote: "愿每一次边界观测，都有一首曲子作证。",
    github: "GitHub",
    contentGuide: "内容格式",
    emptyStory: "这一页还在社团抽屉里。填入正文后，它会随曲目一起亮起。",
    notFoundTitle: "未观测到这个坐标",
    notFoundBody: "回到藏书目，重新选择一份秘封记录。",
  },
  ja: {
    siteTitle: "秘封倶楽部 | 夜行読本",
    brand: "秘封倶楽部",
    brandSub: "夜行読本",
    heroKicker: "秘封倶楽部へようこそ",
    heroTitleA: "夜はまだ長い",
    heroTitleB: "次の秘封を開く",
    heroBody:
      "鉄道、星図、古い科学の匂いの中で、曲を聴きながらメリーと蓮子の夜話を読む。",
    start: "蔵書を開く",
    tracks: "トラック",
    playlist: "曲目",
    closePlaylist: "曲目を閉じる",
    trackUnit: "曲",
    source: "原典の手掛かり",
    quietNote: "境界観測のたび、そばに一曲がありますように。",
    github: "GitHub",
    contentGuide: "内容形式",
    emptyStory: "この頁はまだ部室の引き出しの中です。本文を入れると、曲と一緒に灯ります。",
    notFoundTitle: "この座標は観測できません",
    notFoundBody: "蔵書目録へ戻って、もう一度秘封記録を選んでください。",
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
  document.title = tr("siteTitle");
  app.innerHTML = `
    <section class="hero">
      <div class="hero-copy">
        <p class="kicker">${tr("heroKicker")}</p>
        <h1>${tr("heroTitleA")}<br><span class="jp-title">${tr("heroTitleB")}</span></h1>
        <p>${tr("heroBody")}</p>
        <div class="hero-actions">
          <a class="primary-link" href="#albums">${tr("start")}</a>
        </div>
      </div>
      <div class="orbital" aria-hidden="true">
        <div class="orbit-ring"></div>
        <div class="orbit-ring"></div>
      </div>
    </section>
    <section class="album-grid" id="albums" aria-label="专辑列表">
      ${albums.map(albumCard).join("")}
    </section>
    ${siteFooter()}
  `;
  setPlaylistAvailability(Boolean(state.albumId));
  updateLanguageButtons();
}

function albumCard(album, index) {
  return `
    <a class="album-card" href="#/album/${album.id}" style="--album-color: ${album.color}">
      <span class="album-number">HIFUU ${String(index + 1).padStart(2, "0")}</span>
      <h2>${album.title[state.lang]}</h2>
      <p>${album.summary[state.lang]}</p>
      <span class="album-meta">
        <span>${album.year}</span>
        <span>${album.tracks.length}${tr("trackUnit")}</span>
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
      </aside>

      <section class="reader lyric-reader">
        <div class="story">
          ${album.story.map((section, index) => storySection(album, section, index)).join("")}
        </div>
      </section>
    </article>
    ${siteFooter()}
  `;

  bindAlbum(album);
  setPlaylistAvailability(true);
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
  const text = section.text[state.lang]?.trim() || tr("emptyStory");
  return `
    <section class="story-section lyric-section ${index === state.trackIndex ? "is-active" : ""}" id="story-${index}" data-story="${index}">
      <div class="story-track">TRACK ${String(section.track).padStart(2, "0")}</div>
      <div class="story-card">
        <h2>${track?.title || section.title[state.lang]}</h2>
        <p class="${section.text[state.lang]?.trim() ? "" : "empty-copy"}">${text}</p>
      </div>
    </section>
  `;
}

function renderNotFound() {
  app.innerHTML = `
    <section class="empty-state">
      <p class="kicker">404</p>
      <h1>${tr("notFoundTitle")}</h1>
      <p>${tr("notFoundBody")} <a class="source-link" href="#/">${tr("start")}</a></p>
    </section>
    ${siteFooter()}
  `;
  setPlaylistAvailability(Boolean(state.albumId));
}

function siteFooter() {
  return `
    <footer class="site-footer">
      <p>${tr("quietNote")}</p>
      <nav aria-label="站点链接">
        <a href="https://github.com/cloud-oc/Secret-Sealing-Club" target="_blank" rel="noreferrer">${tr("github")}</a>
        <a href="./content/${contentReadmeName()}">${tr("contentGuide")}</a>
      </nav>
    </footer>
  `;
}

function contentReadmeName() {
  return state.lang === "zh" ? "README.zh-CN.md" : "README.ja.md";
}

function bindAlbum(album) {
  renderPlaylist(album);
}

function selectTrack(album, index, autoplay) {
  state.trackIndex = index;
  document.querySelectorAll(".track-button").forEach((button, buttonIndex) => {
    button.classList.toggle("is-active", buttonIndex === index);
  });
  document.querySelectorAll(".story-section").forEach((section, sectionIndex) => {
    section.classList.toggle("is-active", sectionIndex === index);
  });
  updatePlayer(album, index, autoplay);
  closePlaylist();
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
  syncShellText();
  route();
}

function updateLanguageButtons() {
  player.playlistPanel.querySelectorAll(".track-button").forEach((button, index) => {
    button.classList.toggle("is-active", index === state.trackIndex);
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
      ${album.tracks.map((track, index) => trackButton(track, index)).join("")}
    </div>
  `;
  player.playlistToggle.setAttribute("aria-label", tr("playlist"));
  player.playlistToggle.disabled = false;

  player.playlistPanel.querySelectorAll("[data-track]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.track);
      selectTrack(album, index, true);
    });
  });
}

function updatePlayButton() {
  player.play.textContent = state.isPlaying ? "Ⅱ" : "▶";
}

document.querySelector("#lang-toggle").addEventListener("click", () => {
  setLanguage(state.lang === "zh" ? "ja" : "zh");
});

function syncShellText() {
  document.querySelector(".brand strong").textContent = tr("brand");
  document.querySelector(".brand small").textContent = tr("brandSub");
  player.playlistToggle.setAttribute("aria-label", tr("playlist"));
}

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
syncShellText();
route();
