const { albums: baseAlbums } = await import("./data.js?v=20260616-hypergryph-polish");

let albums = baseAlbums;

const state = {
  lang: localStorage.getItem("ssc-language") || "zh",
  albumId: "",
  trackIndex: 0,
  homeAlbumIndex: 0,
  isPlaying: false,
};

let homeCarouselTimer = 0;
const homeCarouselDelay = 5200;
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
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

const t = {
  zh: {
    siteTitle: "秘封俱乐部 | 夜行读本",
    brand: "秘封俱乐部",
    brandSub: "夜行读本",
    heroKicker: "欢迎来到秘封俱乐部",
    heroTitleA: "科学世纪",
    heroTitleB: "听见秘封",
    start: "回到首页",
    tracks: "曲目",
    playlist: "曲目",
    closePlaylist: "收起曲目",
    trackUnit: "曲",
    albumCarousel: "秘封藏书",
    openAlbum: "打开读本",
    source: "原典线索",
    switchAlbum: "切换专辑",
    prevAlbum: "上一张",
    nextAlbum: "下一张",
    netease: "网易云",
    languageToggle: "切换语言",
    emptyStory: "这一页还在社团抽屉里。填入正文后，它会随曲目一起亮起。",
    notFoundTitle: "未观测到这个坐标",
    notFoundBody: "回到藏书目，重新选择一份秘封记录。",
  },
  ja: {
    siteTitle: "秘封倶楽部 | 夜行読本",
    brand: "秘封倶楽部",
    brandSub: "夜行読本",
    heroKicker: "秘封倶楽部へようこそ",
    heroTitleA: "科学世紀",
    heroTitleB: "秘封を聴く",
    start: "表紙へ戻る",
    tracks: "トラック",
    playlist: "曲目",
    closePlaylist: "曲目を閉じる",
    trackUnit: "曲",
    albumCarousel: "秘封蔵書",
    openAlbum: "読本を開く",
    source: "原典の手掛かり",
    switchAlbum: "アルバム切替",
    prevAlbum: "前の一枚",
    nextAlbum: "次の一枚",
    netease: "网易云",
    languageToggle: "言語を切り替える",
    emptyStory: "この頁はまだ部室の引き出しの中です。本文を入れると、曲と一緒に灯ります。",
    notFoundTitle: "この座標は観測できません",
    notFoundBody: "蔵書目録へ戻って、もう一度秘封記録を選んでください。",
  },
};

function tr(key) {
  return t[state.lang][key];
}

function icon(name) {
  return `<svg class="ui-icon" aria-hidden="true"><use href="#icon-${name}"></use></svg>`;
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
  stopHomeCarouselTimer();
  if (state.homeAlbumIndex >= albums.length) state.homeAlbumIndex = 0;
  document.title = tr("siteTitle");
  app.innerHTML = `
    <section class="hero">
      <div class="hero-copy">
        <p class="kicker">${tr("heroKicker")}</p>
        <h1>${tr("heroTitleA")}<br><span class="jp-title">${tr("heroTitleB")}</span></h1>
      </div>
      ${albumCarousel()}
    </section>
  `;
  const playerAlbum = currentAlbum();
  if (!state.albumId && playerAlbum) state.albumId = playerAlbum.id;
  if (playerAlbum) {
    if (state.trackIndex >= playerAlbum.tracks.length) state.trackIndex = 0;
    renderPlaylist(playerAlbum);
    updatePlayer(playerAlbum, state.trackIndex, false);
  }
  setPlaylistAvailability(Boolean(playerAlbum));
  updateLanguageButtons();
  bindHomeCarousel();
}

function albumCarousel() {
  return `
    <section class="album-carousel" id="albums" aria-label="${tr("albumCarousel")}" aria-roledescription="carousel">
      <div class="carousel-viewport">
        ${albums.map(albumPoster).join("")}
      </div>
      <div class="carousel-dots" role="tablist" aria-label="${tr("albumCarousel")}">
        ${albums.map(carouselDot).join("")}
      </div>
    </section>
  `;
}

function albumPoster(album, index) {
  const offset = carouselOffset(index);
  return `
    <a class="album-card album-poster" href="#/album/${album.id}" style="--album-color: ${album.color}" data-carousel-slide="${index}" aria-label="${tr("openAlbum")}: ${album.title[state.lang]}" ${offset === 0 ? "" : 'aria-hidden="true" tabindex="-1"'}>
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

function carouselDot(album, index) {
  const isActive = index === state.homeAlbumIndex;
  return `
    <button class="carousel-dot ${isActive ? "is-active" : ""}" type="button" role="tab" data-carousel-index="${index}" aria-label="${album.title[state.lang]}" aria-selected="${String(isActive)}">
      <span></span>
    </button>
  `;
}

function renderAlbum(id) {
  stopHomeCarouselTimer();
  const album = albums.find((item) => item.id === id);
  if (!album) {
    renderNotFound();
    return;
  }

  const albumIndex = albums.findIndex((item) => item.id === album.id);
  const previousAlbum = albums[(albumIndex - 1 + albums.length) % albums.length];
  const nextAlbum = albums[(albumIndex + 1) % albums.length];
  state.albumId = album.id;
  if (state.trackIndex >= album.tracks.length) state.trackIndex = 0;
  document.title = `${album.title[state.lang]} | ${tr("brand")}`;

  app.innerHTML = `
    <article class="album-page" style="--album-color: ${album.color}">
      <aside class="album-aside">
        <div class="album-switcher" aria-label="${tr("switchAlbum")}">
          <a class="album-switch-button" href="#/album/${previousAlbum.id}" data-album-jump="${previousAlbum.id}" aria-label="${tr("prevAlbum")}: ${previousAlbum.title[state.lang]}">${icon("chevron-left")}</a>
          <a class="album-switch-button" href="#/album/${nextAlbum.id}" data-album-jump="${nextAlbum.id}" aria-label="${tr("nextAlbum")}: ${nextAlbum.title[state.lang]}">${icon("chevron-right")}</a>
        </div>
        <div class="album-cover">
          <p class="kicker">${album.catalog}</p>
          <div class="cover-disc"><span></span></div>
        </div>
        <div class="album-info">
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
        <div class="story">
          ${album.story.map((section, index) => storySection(album, section, index)).join("")}
        </div>
      </section>
    </article>
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
  stopHomeCarouselTimer();
  app.innerHTML = `
    <section class="empty-state">
      <p class="kicker">404</p>
      <h1>${tr("notFoundTitle")}</h1>
      <p>${tr("notFoundBody")} <a class="text-link" href="#/">${tr("start")}</a></p>
    </section>
  `;
  setPlaylistAvailability(Boolean(state.albumId));
}

function bindHomeCarousel() {
  updateHomeCarousel();

  document.querySelectorAll("[data-carousel-index]").forEach((button) => {
    button.addEventListener("click", () => {
      setHomeCarouselIndex(Number(button.dataset.carouselIndex), true);
    });
  });

  const carousel = document.querySelector(".album-carousel");
  carousel?.addEventListener("mouseenter", stopHomeCarouselTimer);
  carousel?.addEventListener("mouseleave", startHomeCarouselTimer);
  carousel?.addEventListener("focusin", stopHomeCarouselTimer);
  carousel?.addEventListener("focusout", () => {
    if (!carousel.contains(document.activeElement)) startHomeCarouselTimer();
  });

  startHomeCarouselTimer();
}

function carouselOffset(index) {
  const count = albums.length;
  let offset = index - state.homeAlbumIndex;
  if (offset > count / 2) offset -= count;
  if (offset < -count / 2) offset += count;
  return offset;
}

function shiftHomeCarousel(direction, userInitiated = false) {
  setHomeCarouselIndex(state.homeAlbumIndex + direction, userInitiated);
}

function setHomeCarouselIndex(index, userInitiated = false) {
  state.homeAlbumIndex = (index + albums.length) % albums.length;
  updateHomeCarousel();
  if (userInitiated) restartHomeCarouselTimer();
}

function updateHomeCarousel() {
  const slides = document.querySelectorAll("[data-carousel-slide]");
  const dots = document.querySelectorAll("[data-carousel-index]");
  const activeAlbum = albums[state.homeAlbumIndex];

  slides.forEach((slide) => {
    const index = Number(slide.dataset.carouselSlide);
    const offset = carouselOffset(index);
    const distance = Math.abs(offset);
    const isActive = offset === 0;
    const isNear = distance === 1;
    const x = offset * 42;

    slide.dataset.offset = String(offset);
    slide.style.setProperty("--poster-x", `${x}px`);
    slide.style.setProperty("--poster-scale", isActive ? "1" : "0.92");
    slide.style.setProperty("--poster-opacity", isActive || isNear ? "1" : "0");
    slide.style.setProperty("--poster-rotate", `${offset * -1.8}deg`);
    slide.style.setProperty("--poster-z", String(20 - distance));
    slide.classList.toggle("is-active", isActive);
    slide.classList.toggle("is-near", isNear);
    slide.classList.toggle("is-far", distance > 1);
    slide.setAttribute("aria-hidden", String(!isActive));
    slide.tabIndex = isActive ? 0 : -1;
  });

  dots.forEach((dot) => {
    const isActive = Number(dot.dataset.carouselIndex) === state.homeAlbumIndex;
    dot.classList.toggle("is-active", isActive);
    dot.setAttribute("aria-selected", String(isActive));
  });

  if (!state.albumId && activeAlbum) syncPlayerAlbumLink(activeAlbum);
}

function startHomeCarouselTimer() {
  stopHomeCarouselTimer();
  if (prefersReducedMotion.matches || !document.querySelector(".album-carousel")) return;
  homeCarouselTimer = window.setInterval(() => shiftHomeCarousel(1), homeCarouselDelay);
}

function stopHomeCarouselTimer() {
  if (!homeCarouselTimer) return;
  window.clearInterval(homeCarouselTimer);
  homeCarouselTimer = 0;
}

function restartHomeCarouselTimer() {
  stopHomeCarouselTimer();
  startHomeCarouselTimer();
}

function bindAlbum(album) {
  renderPlaylist(album);
  document.querySelectorAll("[data-album-jump]").forEach((link) => {
    link.addEventListener("click", () => {
      state.trackIndex = 0;
      closePlaylist();
    });
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
  updatePlayer(album, index, autoplay);
  closePlaylist();
}

function updatePlayer(album, index, autoplay) {
  const track = album.tracks[index] || album.tracks[0];
  if (!track) return;
  const source = trackAudioSource(track);

  player.index.textContent = `TRACK ${String(index + 1).padStart(2, "0")}`;
  player.title.textContent = track.title;
  syncPlayerTrackLink(track);
  player.album.textContent = album.title[state.lang];
  syncPlayerAlbumLink(album);

  if (audio.dataset.src !== source) {
    audio.dataset.src = source;
    audio.src = source;
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
  player.art.setAttribute("aria-label", `${tr("openAlbum")}: ${album.title[state.lang]}`);
}

function setLanguage(lang) {
  state.lang = lang;
  localStorage.setItem("ssc-language", lang);
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
  player.play.innerHTML = icon(state.isPlaying ? "pause" : "play");
}

language.toggle.addEventListener("click", () => {
  setLanguageMenuOpen(language.menu.hidden);
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

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setLanguageMenuOpen(false);
});

function syncShellText() {
  document.documentElement.lang = state.lang === "zh" ? "zh-CN" : "ja";
  document.querySelector(".brand strong").textContent = tr("brand");
  document.querySelector(".brand small").textContent = tr("brandSub");
  player.playlistToggle.setAttribute("aria-label", tr("playlist"));
  updateLanguageButtons();
}

function setLanguageMenuOpen(isOpen) {
  language.menu.hidden = !isOpen;
  language.toggle.classList.toggle("is-active", isOpen);
  language.toggle.setAttribute("aria-expanded", String(isOpen));
}

function drawStars(time = 0) {
  const canvas = document.querySelector("#starfield");
  const context = canvas.getContext("2d");
  const pixelRatio = window.devicePixelRatio || 1;
  const width = window.innerWidth;
  const height = window.innerHeight;
  const slowTime = prefersReducedMotion.matches ? 0 : time * 0.00008;

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

  const starCount = Math.min(300, Math.floor((width * height) / 4800));

  for (let index = 0; index < starCount; index += 1) {
    const layer = index % 5;
    const drift = slowTime * (12 + layer * 8);
    const x = wrap((Math.sin(index * 91.7) * 0.5 + 0.5) * width + drift * (layer % 2 ? -1 : 1), width);
    const y = wrap((Math.cos(index * 53.3) * 0.5 + 0.5) * height + slowTime * (8 + layer * 5), height);
    const pulse = prefersReducedMotion.matches ? 0 : Math.sin(time * 0.0012 + index * 0.61) * 0.12;
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

function animateStars(time = 0) {
  drawStars(time);
  if (!prefersReducedMotion.matches) {
    starAnimationFrame = window.requestAnimationFrame(animateStars);
  }
}

function resetStars() {
  window.cancelAnimationFrame(starAnimationFrame);
  animateStars(0);
}

window.addEventListener("hashchange", route);
window.addEventListener("resize", resetStars);
prefersReducedMotion.addEventListener("change", resetStars);

animateStars();
await loadContentOverrides();
syncShellText();
route();
