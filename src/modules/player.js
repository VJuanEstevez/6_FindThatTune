import { getItemId } from "./favorites.js";
import { openArtist } from "./artist-modal.js";

const player = document.querySelector("[data-player]");
const cover = document.querySelector("[data-player-cover]");
const title = document.querySelector("[data-player-title]");
const artist = document.querySelector("[data-player-artist]");
const progress = document.querySelector("[data-player-progress]");
const toggleButton = document.querySelector("[data-player-toggle]");
const prevButton = document.querySelector("[data-player-prev]");
const nextButton = document.querySelector("[data-player-next]");

const audio = new Audio();
const previewCache = new Map();

let queue = [];
let currentIndex = 0;
let currentItem = null;
let playRequest = 0;
const listeners = new Set();

const notify = () => listeners.forEach((listener) => listener());

const getPreviewUrl = async (item) => {
  const key = getItemId(item);
  if (previewCache.has(key)) {
    return previewCache.get(key);
  }

  const id = encodeURIComponent(key);
  const response = await fetch(
    `https://itunes.apple.com/lookup?id=${id}&country=es&entity=song`,
  );
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();
  const url = data.results?.find((result) => result.previewUrl)?.previewUrl ?? null;
  previewCache.set(key, url);
  return url;
};

const setPlaying = (playing) => {
  player?.classList.toggle("is-playing", playing);
  toggleButton?.setAttribute("aria-label", playing ? "Pausar" : "Reproducir");
  notify();
};

const updateInfo = (item) => {
  title.textContent = item.title;
  artist.textContent = item.artist;
  cover.src = item.artwork;
  cover.alt = `Portada de ${item.title}`;
  progress.value = "0";
  notify();
};

const loadAndPlay = async () => {
  if (!currentItem) {
    return;
  }

  const requestId = ++playRequest;
  audio.pause();
  setPlaying(false);
  title.textContent = currentItem.title;

  try {
    const url = await getPreviewUrl(currentItem);
    if (requestId !== playRequest) {
      return;
    }
    if (!url) {
      artist.textContent = "Preview no disponible";
      return;
    }

    audio.src = url;
    await audio.play();
    if (requestId === playRequest) {
      setPlaying(true);
    }
  } catch {
    if (requestId === playRequest) {
      artist.textContent = "No se pudo reproducir";
    }
  }
};

export const playTrack = (item, items = []) => {
  if (!item) {
    return;
  }

  queue = items.length > 0 ? items : [item];
  const foundIndex = queue.findIndex((entry) => getItemId(entry) === getItemId(item));
  currentIndex = foundIndex >= 0 ? foundIndex : 0;
  currentItem = item;
  updateInfo(item);
  loadAndPlay();
};

const step = (direction) => {
  if (queue.length === 0) {
    return;
  }

  currentIndex = (currentIndex + direction + queue.length) % queue.length;
  currentItem = queue[currentIndex];
  updateInfo(currentItem);
  loadAndPlay();
};

export const getCurrentTrack = () => currentItem;

export const isPlaying = () => !audio.paused;

export const subscribePlayer = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const togglePlayback = () => {
  if (!audio.src) {
    return;
  }
  if (audio.paused) {
    audio.play();
  } else {
    audio.pause();
  }
};

export const skipTrack = (direction) => step(direction);

export const getQueue = () => ({ items: queue, currentIndex });

export const playQueueIndex = (index) => {
  if (!queue.length || index < 0 || index >= queue.length) {
    return;
  }

  currentIndex = index;
  currentItem = queue[index];
  updateInfo(currentItem);
  loadAndPlay();
};

export const initPlayer = () => {
  if (!player || !audio) {
    return;
  }

  toggleButton.addEventListener("click", togglePlayback);
  prevButton.addEventListener("click", () => step(-1));
  nextButton.addEventListener("click", () => step(1));

  progress.addEventListener("input", () => {
    if (Number.isFinite(audio.duration)) {
      audio.currentTime = (Number(progress.value) / 100) * audio.duration;
    }
  });

  audio.addEventListener("timeupdate", () => {
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      progress.value = String((audio.currentTime / audio.duration) * 100);
    }
  });

  audio.addEventListener("play", () => setPlaying(true));
  audio.addEventListener("pause", () => setPlaying(false));
  audio.addEventListener("ended", () => step(1));

  document.addEventListener("viewchange", (event) => {
    player.hidden = event.detail.view === "player";
  });

  artist.addEventListener("click", () => {
    if (currentItem) {
      openArtist(currentItem.artist, currentItem.artistId);
    }
  });

  document.addEventListener("artisttrackchange", (event) => {
    playTrack(event.detail.item, event.detail.queue);
  });
};
