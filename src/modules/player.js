import { getItemId } from "./favorites.js";
import { openArtist } from "./artist-modal.js";
import { showView } from "./navigation.js";
import { setMarqueeText } from "./marquee.js";

const player = document.querySelector("[data-player]");
const cover = document.querySelector("[data-player-cover]");
const title = document.querySelector("[data-player-title]");
const artist = document.querySelector("[data-player-artist]");
const progress = document.querySelector("[data-player-progress]");
const toggleButton = document.querySelector("[data-player-toggle]");
const prevButton = document.querySelector("[data-player-prev]");
const nextButton = document.querySelector("[data-player-next]");
const queueToggle = document.querySelector("[data-player-queue-toggle]");
const queuePanel = document.querySelector("[data-player-queue]");
const queueList = document.querySelector("[data-player-queue-list]");

const audio = new Audio();
const previewCache = new Map();
const albumTracksCache = new Map();

let queue = [];
let currentIndex = 0;
let currentItem = null;
let playRequest = 0;
const listeners = new Set();

const notify = () => listeners.forEach((listener) => listener());

const getAlbumTracks = async (album) => {
  const key = getItemId(album);
  if (albumTracksCache.has(key)) {
    return albumTracksCache.get(key);
  }

  const response = await fetch(
    `https://itunes.apple.com/lookup?id=${encodeURIComponent(key)}&country=es&entity=song`,
  );
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();
  const tracks = (data.results ?? [])
    .filter((result) => result.wrapperType === "track" && result.previewUrl)
    .map((result, index) => ({
      id: result.trackId,
      type: "songs",
      rank: Number(result.trackNumber) || index + 1,
      title: result.trackName,
      artist: result.artistName ?? album.artist,
      artistId: result.artistId ?? album.artistId,
      artwork: album.artwork ?? result.artworkUrl100,
      genre: result.primaryGenreName ?? album.genre,
      releaseDate: result.releaseDate?.slice(0, 4) ?? album.releaseDate,
      href: result.trackViewUrl ?? "#",
    }));

  albumTracksCache.set(key, tracks);
  return tracks;
};

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
  setMarqueeText(title, item.title);
  artist.textContent = item.artist;
  cover.src = item.artwork;
  cover.alt = `Portada de ${item.title}`;
  progress.value = "0";
  if (queuePanel && !queuePanel.hidden) {
    renderQueuePanel();
  }
  notify();
};

const loadAndPlay = async () => {
  if (!currentItem) {
    return;
  }

  const requestId = ++playRequest;
  audio.pause();
  setPlaying(false);
  setMarqueeText(title, currentItem.title);

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

export const playTrack = async (item, items = []) => {
  if (!item) {
    return;
  }

  let nextQueue = items.length > 0 ? items : [item];
  let target = item;

  if (item.type === "albums") {
    try {
      const tracks = await getAlbumTracks(item);
      if (tracks.length > 0) {
        nextQueue = tracks;
        target = tracks[0];
      }
    } catch {
      // Si no hay pistas, se mantiene el álbum como elemento reproducible.
    }
  }

  queue = nextQueue;
  const foundIndex = queue.findIndex((entry) => getItemId(entry) === getItemId(target));
  currentIndex = foundIndex >= 0 ? foundIndex : 0;
  currentItem = queue[currentIndex];
  updateInfo(currentItem);
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

export const pausePlayback = () => {
  if (!audio.paused) {
    audio.pause();
  }
};

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

const renderQueuePanel = () => {
  const indices = [];
  const seen = new Set();
  const pastIndices = new Set();
  const addIndex = (index) => {
    if (!seen.has(index)) {
      seen.add(index);
      indices.push(index);
    }
  };

  const previousCount = Math.min(2, Math.max(0, queue.length - 1));
  for (let offset = previousCount; offset >= 1; offset -= 1) {
    const index = (currentIndex - offset + queue.length) % queue.length;
    pastIndices.add(index);
    addIndex(index);
  }

  const upcomingCount = Math.min(5, Math.max(0, queue.length - 1));
  for (let offset = 1; offset <= upcomingCount; offset += 1) {
    addIndex((currentIndex + offset) % queue.length);
  }

  if (indices.length === 0) {
    const empty = document.createElement("li");
    empty.className = "player__queue-empty";
    empty.textContent = "No hay más canciones en la cola.";
    queueList.replaceChildren(empty);
    return;
  }

  const rows = indices.map((index) => {
    const item = queue[index];
    const isPast = pastIndices.has(index);
    const li = document.createElement("li");
    if (isPast) {
      li.className = "is-past";
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "player__queue-item";
    button.setAttribute("aria-label", `Reproducir ${item.title}`);

    const number = document.createElement("span");
    number.textContent = String(item.rank ?? index + 1).padStart(2, "0");
    const name = document.createElement("span");
    name.className = "player__queue-name marquee";
    setMarqueeText(name, item.title);

    button.append(number, name);
    button.addEventListener("click", () => {
      playQueueIndex(index);
      toggleQueuePanel(false);
    });
    li.append(button);
    return li;
  });

  queueList.replaceChildren(...rows);
};

const toggleQueuePanel = (force) => {
  const open = force ?? queuePanel.hidden;
  queuePanel.hidden = !open;
  queueToggle.setAttribute("aria-expanded", String(open));
  if (open) {
    renderQueuePanel();
  }
};

export const initPlayer = () => {
  if (!player || !audio) {
    return;
  }

  toggleButton.addEventListener("click", togglePlayback);
  prevButton.addEventListener("click", () => step(-1));
  nextButton.addEventListener("click", () => step(1));
  queueToggle.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleQueuePanel();
  });

  document.addEventListener("click", (event) => {
    if (!player.contains(event.target)) {
      toggleQueuePanel(false);
    }
  });

  player.addEventListener("click", (event) => {
    if (event.target.closest("button, input, .player__info, .player__queue")) {
      return;
    }
    showView("player");
    document.dispatchEvent(new CustomEvent("playeropen", { detail: { type: "album" } }));
  });

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
