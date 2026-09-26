export function createStorage(getStorage) {
  return {
    get(key, fallback = null) { try { return getStorage().getItem(key) ?? fallback; } catch { return fallback; } },
    set(key, value) { try { getStorage().setItem(key, value); } catch { /* Private mode / quota must not stop playback. */ } },
  };
}

export async function fetchAlbum(id, { fetcher = fetch, timeoutMs = 8000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher(`./content/albums/${encodeURIComponent(id)}.json`, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const value = await response.json();
    if (value.id !== id || !Array.isArray(value.story)) throw new Error('Invalid album content');
    return value;
  } finally { clearTimeout(timer); }
}

export function createAudioController(audio, { onState, onError, onEnded = () => {}, timeoutMs = 15000 }) {
  let epoch = 0, timer = 0, wanted = false, failed = false;
  const clear = () => { clearTimeout(timer); timer = 0; };
  const publish = status => onState(status, wanted);
  const fail = reason => {
    if (failed) return;
    failed = true; wanted = false; epoch++; clear(); audio.pause(); publish('error'); onError(reason);
  };
  const arm = () => {
    if (timer) return;
    timer = setTimeout(() => fail('timeout'), timeoutMs);
  };
  audio.addEventListener('playing', () => { if (!wanted) { audio.pause(); return; } clear(); publish('playing'); });
  for (const event of ['waiting', 'stalled']) audio.addEventListener(event, () => { if (wanted) { publish('buffering'); arm(); } });
  audio.addEventListener('pause', () => { if (!wanted) publish(failed ? 'error' : 'paused'); });
  audio.addEventListener('error', () => { if (wanted) fail('source'); });
  audio.addEventListener('ended', () => {
    // A queued event from a replaced source must not advance the new track.
    if (!wanted || !audio.ended) return;
    wanted = false; clear(); publish('paused'); onEnded();
  });
  return {
    get wanted() { return wanted; },
    setSource(source, resumeTime = 0) {
      epoch++; wanted = false; failed = false; clear(); audio.pause();
      audio.dataset.src = source;
      audio.dataset.resumeTime = String(resumeTime || '');
      audio.src = source;
      // Abort pending play requests and discard the previous media resource now,
      // before another user gesture can start playback.
      audio.load();
      publish('paused');
    },
    async play() {
      const request = ++epoch;
      wanted = true; failed = false; clear(); publish('loading'); arm();
      if (audio.error) audio.load();
      try { await audio.play(); }
      catch (error) { if (request === epoch && wanted) fail(error.name === 'NotAllowedError' ? 'permission' : 'source'); }
    },
    pause() { epoch++; wanted = false; clear(); audio.pause(); publish('paused'); },
  };
}
