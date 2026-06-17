const { albums: baseAlbums } = await import("./data.js?v=20260617-orbit-polish-v7");

let albums = baseAlbums;

const state = {
  lang: localStorage.getItem("ssc-language") || "zh",
  albumId: "",
  trackIndex: 0,
  homeAlbumIndex: 0,
  isPlaying: false,
};

let homeOrbitAnimationFrame = 0;
let homeOrbitLastTime = 0;
let homeOrbitAngle = 0;
let homeOrbitTargetAngle = 0;
let homeOrbitIsSettling = false;
let homeOrbitResumeAt = 0;
const homeOrbitSpeed = -9.6;
const homeOrbitSettleRate = 8.5;
const homeOrbitFrameDelay = 32;
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let starAnimationFrame = 0;
let starCanvasWidth = 0;
let starCanvasHeight = 0;
let starCanvasPixelRatio = 0;
let earthAnimationFrame = 0;
let earthRenderer = null;
let earthScene = null;
let earthCamera = null;
let earthGroup = null;
let earthClockStart = 0;
let playerSignalAnimationFrame = 0;
let playerSignalStart = 0;
const playerSignalTrailCount = 9;

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
  signalDots: [],
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
  body: document.querySelector("#intro-body"),
};

const t = {
  zh: {
    siteTitle: "秘封俱乐部 | 夜行读本",
    brand: "秘封俱乐部",
    brandSub: "夜行读本",
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
    introTitle: "夜行读本",
    introBody: "这里收录着九张秘封俱乐部的音乐 CD 读本。选一张专辑，曲目会带着对应的故事段落一起亮起，就像深夜的列车窗外闪烁的星星。",
    closeIntro: "关闭简介",
    emptyStory: "这一页还在社团抽屉里。填入正文后，它会随曲目一起亮起。",
    notFoundTitle: "未观测到这个坐标",
    notFoundBody: "回到藏书目，重新选择一份秘封记录。",
  },
  ja: {
    siteTitle: "秘封倶楽部 | 夜行読本",
    brand: "秘封倶楽部",
    brandSub: "夜行読本",
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
    introTitle: "夜行読本",
    introBody: "ここには秘封倶楽部の九枚の音楽 CD 読本を収めています。一枚を選ぶと、曲に寄り添う物語の断片が、深夜列車の窓の外でまたたく星のように灯ります。",
    closeIntro: "説明を閉じる",
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

function cssUrl(value) {
  return String(value).replace(/[\s()"']/g, encodeURIComponent);
}

function route() {
  const hash = location.hash.replace(/^#\/?/, "");
  const [kind, id] = hash.split("/");

  const render = () => {
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
  if (prefersReducedMotion.matches || !document.startViewTransition) {
    render();
    return;
  }

  document.startViewTransition(render);
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
  stopHomeCarouselTimer();
  if (state.homeAlbumIndex >= albums.length) state.homeAlbumIndex = 0;
  document.body.dataset.view = "home";
  document.title = tr("siteTitle");
  app.innerHTML = `
    <section class="hero">
      <div class="hero-stage" aria-hidden="true">
        <span class="stage-orbit stage-orbit-a"></span>
        <span class="stage-orbit stage-orbit-b"></span>
        <span class="stage-slice stage-slice-a"></span>
        <span class="stage-slice stage-slice-b"></span>
      </div>
      <div class="hero-copy">
        <p class="kicker">${tr("heroKicker")}</p>
        <h1>${tr("heroTitleA")}<br><span class="jp-title">${tr("heroTitleB")}</span></h1>
        <div class="hero-system" aria-hidden="true">
          <span>RENKO</span>
          <i></i>
          <span>MERRY</span>
          <i></i>
          <span>BARRIER FIELD</span>
        </div>
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
    <section class="album-carousel orbit-timeline" id="albums" aria-label="${tr("albumCarousel")}" aria-roledescription="carousel">
      <div class="orbit-mask" aria-hidden="true"></div>
      <div class="orbit-core" aria-hidden="true">
        <canvas id="earth-canvas"></canvas>
        <div class="earth-fallback"><span></span></div>
      </div>
      <div class="orbit-progress" role="tablist" aria-label="${tr("albumCarousel")}">
        ${albums.map(carouselDot).join("")}
      </div>
      <div class="orbit-guide" aria-hidden="true">
        <span class="orbit-ring orbit-ring-main"></span>
        <span class="orbit-ring orbit-ring-ghost"></span>
        <span class="orbit-axis"></span>
      </div>
      <div class="carousel-viewport">
        ${albums.map(albumPoster).join("")}
      </div>
    </section>
  `;
}

function albumPoster(album, index) {
  const offset = carouselOffset(index);
  return `
    <a class="album-card album-poster timeline-card" href="#/album/${album.id}" style="--album-color: ${album.color}" data-carousel-slide="${index}" aria-label="${tr("openAlbum")}: ${album.title[state.lang]}" ${offset === 0 ? "" : 'aria-hidden="true" tabindex="-1"'}>
      <span class="poster-glow" aria-hidden="true"></span>
      <span class="timeline-stem" aria-hidden="true"></span>
      <span class="album-number">HIFUU ${String(index + 1).padStart(2, "0")}</span>
      <span class="poster-title-block">
        <h2>${album.title[state.lang]}</h2>
      </span>
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
    <button class="orbit-progress-button ${isActive ? "is-active" : ""}" type="button" role="tab" data-carousel-index="${index}" aria-label="${album.title[state.lang]}" aria-selected="${String(isActive)}">
      <span></span>
      <em>${String(index + 1).padStart(2, "0")}</em>
    </button>
  `;
}

function renderAlbum(id) {
  stopHomeCarouselTimer();
  disposeEarth();
  const album = albums.find((item) => item.id === id);
  if (!album) {
    renderNotFound();
    return;
  }

  const albumIndex = albums.findIndex((item) => item.id === album.id);
  const previousAlbum = albums[(albumIndex - 1 + albums.length) % albums.length];
  const nextAlbum = albums[(albumIndex + 1) % albums.length];
  document.body.dataset.view = "album";
  state.albumId = album.id;
  if (state.trackIndex >= album.tracks.length) state.trackIndex = 0;
  document.title = `${album.title[state.lang]} | ${tr("brand")}`;

  app.innerHTML = `
    <article class="album-page" style="--album-color: ${album.color}">
      <aside class="album-aside">
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
  disposeEarth();
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

function bindHomeCarousel() {
  stopHomeOrbit();
  homeOrbitAngle = indexToOrbitAngle(state.homeAlbumIndex);
  homeOrbitTargetAngle = homeOrbitAngle;
  homeOrbitLastTime = 0;
  homeOrbitIsSettling = false;
  updateHomeCarousel();
  initEarth();

  document.querySelectorAll("[data-carousel-index]").forEach((button) => {
    button.addEventListener("click", () => {
      setHomeCarouselIndex(Number(button.dataset.carouselIndex), true);
    });
  });

  startHomeOrbit();
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
  homeOrbitTargetAngle = indexToOrbitAngle(state.homeAlbumIndex);
  homeOrbitIsSettling = true;
  homeOrbitResumeAt = performance.now() + (userInitiated ? 2600 : 1200);
  updateHomeCarousel();
}

function updateHomeCarousel() {
  const slides = document.querySelectorAll("[data-carousel-slide]");
  const dots = document.querySelectorAll("[data-carousel-index]");
  const activeAlbum = albums[state.homeAlbumIndex];
  const step = 360 / albums.length;
  const focusedAngle = normalizeAngle(homeOrbitAngle);

  slides.forEach((slide) => {
    const index = Number(slide.dataset.carouselSlide);
    const isCompact = window.innerWidth <= 760;
    const angle = normalizeAngle(index * step + focusedAngle);
    const slotDistance = circularDistance(angle, 0);
    const distance = Math.round(slotDistance / step);
    const isActive = index === state.homeAlbumIndex;
    const radians = (angle * Math.PI) / 180;
    const carousel = document.querySelector(".album-carousel");
    const carouselWidth = carousel?.clientWidth || window.innerWidth;
    const carouselHeight = carousel?.clientHeight || window.innerHeight;
    const centerRatio = isCompact ? 0.5 : window.innerWidth <= 1060 ? 0.46 : 0.42;
    const cardEstimate = isCompact ? Math.min(window.innerWidth * 0.34, 136) : Math.min(Math.max(window.innerWidth * 0.12, 142), 186);
    const availableRight = carouselWidth * (1 - centerRatio);
    const orbitRadiusX = isCompact
      ? Math.max(104, Math.min(132, carouselWidth * 0.3))
      : Math.max(182, Math.min(274, availableRight - cardEstimate / 2 - 14));
    const orbitRadiusY = isCompact ? Math.max(110, Math.min(138, carouselHeight * 0.31)) : Math.max(192, Math.min(262, carouselHeight * 0.41));
    const x = Math.cos(radians) * orbitRadiusX;
    const y = Math.sin(radians) * orbitRadiusY;
    const orbitCos = Math.cos(radians);
    const isHiddenSide = !isCompact && orbitCos < -0.52;
    const frontness = (orbitCos + 1) / 2;
    const axisDissolve = 1 - Math.pow(Math.min(1, Math.abs(orbitCos) / 0.42), 1.7);
    const behindFade = isCompact ? 1 : 1 - smoothStep(0.06, 0.48, -orbitCos);
    const dissolveOpacity = 1 - axisDissolve * 0.76;
    const dissolveCut = 5 + axisDissolve * 32;
    const dissolveGrain = 1 - axisDissolve;
    const dissolveSaturate = 1 - axisDissolve * 0.28;
    const dissolveBlur = axisDissolve * 2;
    const compactDistanceFade = Math.max(0, 1 - distance * 0.22);
    const opacity = isCompact
      ? Math.max(0.12, (0.2 + frontness * 0.8) * compactDistanceFade)
      : Math.max(0, (0.24 + frontness * 0.76) * dissolveOpacity * behindFade);
    const scale = isCompact ? 0.52 + frontness * 0.3 : 0.62 + frontness * 0.28;
    const pointerEnabled = isCompact ? isActive || frontness > 0.78 : !isHiddenSide && frontness > 0.58;

    slide.dataset.offset = String(Math.round(signedCircularDistance(angle, 0) / step));
    slide.dataset.side = isHiddenSide ? "hidden" : "visible";
    slide.dataset.interactive = String(pointerEnabled);
    slide.style.setProperty("--poster-x", `${x}px`);
    slide.style.setProperty("--poster-y", `${y}px`);
    slide.style.setProperty("--poster-scale", String(scale));
    slide.style.setProperty("--poster-opacity", String(opacity));
    slide.style.setProperty("--poster-dissolve", axisDissolve.toFixed(3));
    slide.style.setProperty("--poster-dissolve-cut", `${dissolveCut.toFixed(2)}%`);
    slide.style.setProperty("--poster-dissolve-grain", dissolveGrain.toFixed(3));
    slide.style.setProperty("--poster-saturate", dissolveSaturate.toFixed(3));
    slide.style.setProperty("--poster-blur", `${dissolveBlur.toFixed(2)}px`);
    slide.style.setProperty("--poster-rotate", `${isCompact ? 0 : Math.sin(radians) * 2.5}deg`);
    slide.style.setProperty("--poster-rotate-y", "0deg");
    slide.style.setProperty("--poster-z-depth", "0");
    slide.style.setProperty("--poster-z", String(Math.round(10 + frontness * 20 - distance)));
    slide.classList.toggle("is-active", isActive);
    slide.classList.toggle("is-near", distance === 1 && !isHiddenSide);
    slide.classList.toggle("is-far", !isActive && (distance > 1 || isHiddenSide));
    slide.setAttribute("aria-hidden", String(!pointerEnabled));
    slide.tabIndex = pointerEnabled ? 0 : -1;
  });

  dots.forEach((dot) => {
    const isActive = Number(dot.dataset.carouselIndex) === state.homeAlbumIndex;
    dot.classList.toggle("is-active", isActive);
    dot.setAttribute("aria-selected", String(isActive));
  });

  if (!state.albumId && activeAlbum) syncPlayerAlbumLink(activeAlbum);
}

function indexToOrbitAngle(index) {
  return -index * (360 / albums.length);
}

function normalizeAngle(angle) {
  return ((angle % 360) + 360) % 360;
}

function signedCircularDistance(from, to) {
  return ((((to - from) % 360) + 540) % 360) - 180;
}

function circularDistance(from, to) {
  return Math.abs(signedCircularDistance(from, to));
}

function smoothStep(edge0, edge1, value) {
  const x = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return x * x * (3 - 2 * x);
}

async function initEarth() {
  const canvas = document.querySelector("#earth-canvas");
  if (!canvas || canvas.dataset.ready) return;
  canvas.dataset.ready = "true";

  try {
    const THREE = await import("https://unpkg.com/three@0.165.0/build/three.module.js");
    if (!document.contains(canvas)) return;
    earthRenderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    earthRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    earthScene = new THREE.Scene();
    earthCamera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    earthCamera.position.set(0, 0.2, 5.2);

    earthGroup = new THREE.Group();
    earthScene.add(earthGroup);

    const earthGeometry = new THREE.SphereGeometry(1.22, 96, 96);
    const earthMaterial = new THREE.MeshStandardMaterial({
      color: 0x2b8794,
      roughness: 0.78,
      metalness: 0.04,
      emissive: 0x0b3038,
      emissiveIntensity: 0.62,
    });
    const earth = new THREE.Mesh(earthGeometry, earthMaterial);
    earthGroup.add(earth);

    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.28, 96, 96),
      new THREE.MeshBasicMaterial({ color: 0x76ead8, transparent: true, opacity: 0.12, side: THREE.BackSide }),
    );
    earthGroup.add(atmosphere);

    const wire = new THREE.Mesh(
      new THREE.SphereGeometry(1.235, 32, 16),
      new THREE.MeshBasicMaterial({ color: 0xece6d7, wireframe: true, transparent: true, opacity: 0.08 }),
    );
    earthGroup.add(wire);

    earthScene.add(new THREE.AmbientLight(0xb9eef0, 1.55));
    const keyLight = new THREE.DirectionalLight(0xb8fff4, 2.4);
    keyLight.position.set(3.6, 2.5, 4);
    earthScene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0xd7b363, 1.1);
    rimLight.position.set(-3, -1.2, 2);
    earthScene.add(rimLight);
    const frontLight = new THREE.DirectionalLight(0x76ead8, 1.2);
    frontLight.position.set(0.2, 0.3, 5);
    earthScene.add(frontLight);

    earthClockStart = performance.now();
    resizeEarth();
    animateEarth();
  } catch {
    canvas.closest(".orbit-core")?.classList.add("is-fallback");
  }
}

function resizeEarth() {
  if (!earthRenderer || !earthCamera) return;
  const canvas = document.querySelector("#earth-canvas");
  const rect = canvas?.getBoundingClientRect();
  if (!rect?.width || !rect?.height) return;
  earthRenderer.setSize(rect.width, rect.height, false);
  earthCamera.aspect = rect.width / rect.height;
  earthCamera.updateProjectionMatrix();
}

function animateEarth(time = performance.now()) {
  if (!earthRenderer || !earthScene || !earthCamera || !earthGroup) return;
  resizeEarth();
  const elapsed = (time - earthClockStart) * 0.001;
  if (!prefersReducedMotion.matches) {
    earthGroup.rotation.y = elapsed * 0.16;
    earthGroup.rotation.x = Math.sin(elapsed * 0.35) * 0.045;
  }
  earthRenderer.render(earthScene, earthCamera);
  if (!prefersReducedMotion.matches) {
    earthAnimationFrame = window.requestAnimationFrame(animateEarth);
  }
}

function startHomeCarouselTimer() {
  startHomeOrbit();
}

function stopHomeCarouselTimer() {
  stopHomeOrbit();
}

function startHomeOrbit() {
  stopHomeOrbit();
  if (!document.querySelector(".album-carousel")) return;
  homeOrbitLastTime = 0;
  homeOrbitAnimationFrame = window.requestAnimationFrame(animateHomeOrbit);
}

function stopHomeOrbit() {
  window.cancelAnimationFrame(homeOrbitAnimationFrame);
  window.clearTimeout(homeOrbitAnimationFrame);
  homeOrbitAnimationFrame = 0;
}

function animateHomeOrbit(time = performance.now()) {
  if (!document.querySelector(".album-carousel")) {
    stopHomeOrbit();
    return;
  }

  if (document.hidden) {
    homeOrbitAnimationFrame = window.setTimeout(() => animateHomeOrbit(performance.now()), 250);
    return;
  }

  if (!homeOrbitLastTime) homeOrbitLastTime = time;
  const delta = Math.min(48, time - homeOrbitLastTime) / 1000;
  homeOrbitLastTime = time;

  if (prefersReducedMotion.matches) {
    homeOrbitAngle = homeOrbitTargetAngle;
  } else if (homeOrbitIsSettling) {
    const remaining = signedCircularDistance(homeOrbitAngle, homeOrbitTargetAngle);
    homeOrbitAngle += remaining * Math.min(1, delta * homeOrbitSettleRate);
    if (Math.abs(remaining) < 0.08) {
      homeOrbitAngle = homeOrbitTargetAngle;
      homeOrbitIsSettling = false;
    }
  } else if (time >= homeOrbitResumeAt) {
    homeOrbitAngle += homeOrbitSpeed * delta;
    const nearestIndex = Math.round(-homeOrbitAngle / (360 / albums.length));
    const nextIndex = ((nearestIndex % albums.length) + albums.length) % albums.length;
    if (nextIndex !== state.homeAlbumIndex) state.homeAlbumIndex = nextIndex;
  }

  updateHomeCarousel();
  homeOrbitAnimationFrame = prefersReducedMotion.matches
    ? window.setTimeout(() => animateHomeOrbit(performance.now()), 250)
    : window.requestAnimationFrame(animateHomeOrbit);
}

function disposeEarth() {
  window.cancelAnimationFrame(earthAnimationFrame);
  earthAnimationFrame = 0;

  if (earthScene) {
    earthScene.traverse((object) => {
      object.geometry?.dispose?.();
      if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose?.());
      else object.material?.dispose?.();
    });
  }

  earthRenderer?.dispose?.();
  earthRenderer = null;
  earthScene = null;
  earthCamera = null;
  earthGroup = null;
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
    updateSeekProgress();
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
  if (album.cover) player.art.style.setProperty("--album-cover", `url(${cssUrl(album.cover)})`);
  else player.art.style.removeProperty("--album-cover");
  player.art.classList.toggle("has-cover", Boolean(album.cover));
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
  updateSeekProgress();
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
  updateSeekProgress();
});

audio.addEventListener("timeupdate", () => {
  player.current.textContent = formatTime(audio.currentTime);
  if (audio.duration) {
    player.seek.value = Math.round((audio.currentTime / audio.duration) * 1000);
    updateSeekProgress();
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

function updateSeekProgress() {
  const progress = Math.max(0, Math.min(100, Number(player.seek.value || 0) / 10));
  player.seek.style.setProperty("--seek-progress", `${progress}%`);
  const timeline = player.seek.closest(".player-timeline");
  const dotX = player.seek.offsetLeft + player.seek.clientWidth * (progress / 100);
  timeline?.style.setProperty("--seek-dot-x", `${dotX}px`);
}

window.addEventListener("resize", updateSeekProgress);

function animatePlayerSignal(time = performance.now()) {
  if (!playerSignalStart) playerSignalStart = time;
  ensurePlayerSignalTrail();
  const rect = player.shell.getBoundingClientRect();
  const radius = Math.min(18, Math.max(12, parseFloat(getComputedStyle(player.shell).borderRadius) || 16));
  const inset = 1;

  if (rect.width && rect.height) {
    const width = Math.max(1, rect.width - inset * 2);
    const height = Math.max(1, rect.height - inset * 2);
    const straightX = Math.max(1, width - radius * 2);
    const straightY = Math.max(1, height - radius * 2);
    const corner = (Math.PI * radius) / 2;
    const perimeter = Math.max(1, straightX * 2 + straightY * 2 + corner * 4);
    const distance = (((time - playerSignalStart) * 0.038) % perimeter + perimeter) % perimeter;
    const spacing = Math.min(11, perimeter / 52);

    player.signalDots.forEach((dot, index) => {
      const trailDistance = (distance - index * spacing + perimeter) % perimeter;
      const point = roundedRectPoint(trailDistance, { inset, width, height, radius, straightX, straightY, corner });
      const falloff = index / Math.max(1, playerSignalTrailCount - 1);
      dot.style.setProperty("--signal-x", `${point.x}px`);
      dot.style.setProperty("--signal-y", `${point.y}px`);
      dot.style.setProperty("--signal-alpha", `${Math.max(0.06, 1 - falloff * 1.04)}`);
      dot.style.setProperty("--signal-scale", `${Math.max(0.32, 1 - falloff * 0.62)}`);
      dot.style.setProperty("--signal-blur", `${falloff * 1.8}px`);
    });
  }

  playerSignalAnimationFrame = prefersReducedMotion.matches
    ? window.setTimeout(() => animatePlayerSignal(performance.now()), 250)
    : window.requestAnimationFrame(animatePlayerSignal);
}

function ensurePlayerSignalTrail() {
  if (player.signalDots.length === playerSignalTrailCount) return;
  player.shell.querySelectorAll(".player-signal-dot").forEach((dot) => dot.remove());
  player.signalDots = Array.from({ length: playerSignalTrailCount }, (_, index) => {
    const dot = document.createElement("span");
    dot.className = `player-signal-dot ${index === 0 ? "is-head" : ""}`;
    dot.setAttribute("aria-hidden", "true");
    player.shell.append(dot);
    return dot;
  });
}

function restartPlayerSignal() {
  window.cancelAnimationFrame(playerSignalAnimationFrame);
  window.clearTimeout(playerSignalAnimationFrame);
  playerSignalAnimationFrame = 0;
  playerSignalStart = 0;
  animatePlayerSignal();
}

function roundedRectPoint(distance, metrics) {
  const { inset, width, height, radius, straightX, straightY, corner } = metrics;
  let d = distance;
  const right = inset + width;
  const bottom = inset + height;
  const left = inset;
  const top = inset;

  if (d < straightX) return { x: left + radius + d, y: top };
  d -= straightX;

  if (d < corner) {
    const t = d / corner;
    const angle = -Math.PI / 2 + t * (Math.PI / 2);
    return { x: right - radius + Math.cos(angle) * radius, y: top + radius + Math.sin(angle) * radius };
  }
  d -= corner;

  if (d < straightY) return { x: right, y: top + radius + d };
  d -= straightY;

  if (d < corner) {
    const t = d / corner;
    const angle = t * (Math.PI / 2);
    return { x: right - radius + Math.cos(angle) * radius, y: bottom - radius + Math.sin(angle) * radius };
  }
  d -= corner;

  if (d < straightX) return { x: right - radius - d, y: bottom };
  d -= straightX;

  if (d < corner) {
    const t = d / corner;
    const angle = Math.PI / 2 + t * (Math.PI / 2);
    return { x: left + radius + Math.cos(angle) * radius, y: bottom - radius + Math.sin(angle) * radius };
  }
  d -= corner;

  if (d < straightY) return { x: left, y: bottom - radius - d };
  d -= straightY;

  const t = Math.min(1, d / corner);
  const angle = Math.PI + t * (Math.PI / 2);
  return { x: left + radius + Math.cos(angle) * radius, y: top + radius + Math.sin(angle) * radius };
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

intro.toggle?.addEventListener("click", () => setIntroOpen(intro.panel.hidden));
intro.close?.addEventListener("click", () => setIntroOpen(false));
intro.backdrop?.addEventListener("click", () => setIntroOpen(false));

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setLanguageMenuOpen(false);
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
  syncIntroText();
  updateLanguageButtons();
}

function syncIntroText() {
  intro.toggle?.setAttribute("aria-label", tr("infoToggle"));
  intro.toggle?.setAttribute("title", tr("infoToggle"));
  intro.close?.setAttribute("aria-label", tr("closeIntro"));
  if (intro.title) intro.title.textContent = tr("introTitle");
  if (intro.body) intro.body.textContent = tr("introBody");
}

function setIntroOpen(isOpen) {
  if (!intro.panel || !intro.backdrop) return;
  const wasOpen = !intro.panel.hidden;
  intro.panel.hidden = !isOpen;
  intro.backdrop.hidden = !isOpen;
  intro.toggle?.classList.toggle("is-active", isOpen);
  intro.toggle?.setAttribute("aria-expanded", String(isOpen));
  if (isOpen) {
    setLanguageMenuOpen(false);
    requestAnimationFrame(() => intro.close?.focus());
  } else if (wasOpen) {
    intro.toggle?.focus({ preventScroll: true });
  }
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
  resizeEarth();
}

window.addEventListener("hashchange", route);
window.addEventListener("resize", () => {
  resetStars();
  updateHomeCarousel();
  updateSeekProgress();
  restartPlayerSignal();
});
prefersReducedMotion.addEventListener("change", () => {
  resetStars();
  window.cancelAnimationFrame(earthAnimationFrame);
  if (document.querySelector("#earth-canvas")) animateEarth();
  restartPlayerSignal();
});

animateStars();
restartPlayerSignal();
await loadContentOverrides();
syncShellText();
route();
