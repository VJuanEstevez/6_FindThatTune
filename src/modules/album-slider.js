import { fetchTrendingArtists } from "./albums.js";
import { playTrack } from "./player.js";
import { openArtist } from "./artist-modal.js";

const AUTOPLAY_DELAY = 5500;

const slider = document.querySelector("[data-album-slider]");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

let albums = [];
let currentIndex = 0;
let timerId = null;
let isPaused = false;
let track = null;
let slides = [];
let dots = [];

const create = (tag, className, text) => {
  const element = document.createElement(tag);
  if (className) {
    element.className = className;
  }
  if (text !== undefined) {
    element.textContent = text;
  }
  return element;
};

const createIcon = (paths) => {
  const wrapper = document.createElement("span");
  wrapper.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths}</svg>`;
  return wrapper.firstElementChild;
};

const createSlide = (album, index, queue) => {
  const slide = create("li", "album-slide");
  const card = create("article", "album-card ambient-blur");
  card.style.setProperty("--ambient-image", `url("${album.artwork}")`);

  const cover = document.createElement("span");
  cover.className = "album-cover-frame album-cover-frame--feature";
  const coverImage = document.createElement("img");
  coverImage.className = "album-cover-frame__image";
  coverImage.src = album.artwork;
  coverImage.alt = `Portada del álbum ${album.title}`;
  coverImage.width = 600;
  coverImage.height = 600;
  coverImage.loading = "lazy";
  coverImage.decoding = "async";
  cover.append(coverImage);

  const artistButton = create("button", "artist-link", album.artist);
  artistButton.type = "button";
  artistButton.addEventListener("click", (event) => {
    event.stopPropagation();
    openArtist(album.artist, album.artistId);
  });

  const body = create("div", "album-card__body");
  body.append(create("h3", "album-card__title", album.title), artistButton);

  const meta = create("dl", "album-card__meta");
  const genre = document.createElement("div");
  genre.append(create("dt", "", "Género"), create("dd", "", album.genre));
  const release = document.createElement("div");
  release.append(
    create("dt", "", "Lanzamiento"),
    create("dd", "", album.releaseDate),
  );
  meta.append(genre, release);
  body.append(meta);

  card.append(cover, body);

  card.classList.add("is-playable");
  card.tabIndex = 0;
  card.setAttribute("role", "button");
  card.setAttribute("aria-label", `Reproducir ${album.title}`);
  const play = () => playTrack(album, queue);
  card.addEventListener("click", play);
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      play();
    }
  });

  slide.append(card);
  return slide;
};

const createArrow = (direction) => {
  const button = create("button", "album-slider__arrow");
  button.type = "button";
  button.setAttribute(
    "aria-label",
    direction === "prev" ? "Disco anterior" : "Disco siguiente",
  );
  button.append(
    createIcon(
      direction === "prev"
        ? '<path d="m15 18-6-6 6-6" />'
        : '<path d="m9 18 6-6-6-6" />',
    ),
  );
  button.addEventListener("click", () => {
    goTo(currentIndex + (direction === "prev" ? -1 : 1));
    resetAutoplay();
  });
  return button;
};

const createDot = (album, index) => {
  const dot = create("button", "album-slider__dot");
  dot.type = "button";
  dot.setAttribute("aria-label", `Ver disco ${album.rank}: ${album.title}`);
  dot.addEventListener("click", () => {
    goTo(index);
    resetAutoplay();
  });
  return dot;
};

const goTo = (index) => {
  if (albums.length === 0) {
    return;
  }

  currentIndex = (index + albums.length) % albums.length;
  if (track) {
    track.style.transform = `translateX(-${currentIndex * 100}%)`;
  }

  slides.forEach((slide, slideIndex) => {
    slide.inert = slideIndex !== currentIndex;
  });
  dots.forEach((dot, dotIndex) => {
    const isActive = dotIndex === currentIndex;
    dot.classList.toggle("is-active", isActive);
    if (isActive) {
      dot.setAttribute("aria-current", "true");
    } else {
      dot.removeAttribute("aria-current");
    }
  });
};

const stopAutoplay = () => {
  if (timerId !== null) {
    window.clearInterval(timerId);
    timerId = null;
  }
};

const syncAutoplay = () => {
  const shouldPlay = !isPaused && !document.hidden && !reducedMotion.matches && albums.length > 1;
  if (shouldPlay && timerId === null) {
    timerId = window.setInterval(() => goTo(currentIndex + 1), AUTOPLAY_DELAY);
  } else if (!shouldPlay) {
    stopAutoplay();
  }
};

const resetAutoplay = () => {
  stopAutoplay();
  syncAutoplay();
};

const setPaused = (paused) => {
  isPaused = paused;
  syncAutoplay();
};

const showStatus = (message, withRetry = false) => {
  track = null;
  slides = [];
  dots = [];

  const status = create("p", "album-slider__status", message);
  status.setAttribute("role", "status");

  if (withRetry) {
    const retry = create("button", "album-slider__retry", "Reintentar");
    retry.type = "button";
    retry.addEventListener("click", loadAlbums);
    status.append(retry);
  }

  slider.replaceChildren(status);
};

const render = () => {
  track = create("ul", "album-slider__track");
  slides = albums.map(createSlide);
  track.append(...slides);

  dots = albums.map(createDot);
  const dotsContainer = create("div", "album-slider__dots");
  dotsContainer.append(...dots);

  const controls = create("div", "album-slider__controls");
  controls.append(createArrow("prev"), dotsContainer, createArrow("next"));

  slider.replaceChildren(track, controls);
  goTo(0);
};

const loadAlbums = async () => {
  stopAutoplay();
  showStatus("Cargando discos...");

  try {
    albums = await fetchTrendingArtists(15);
    render();
    syncAutoplay();
  } catch {
    albums = [];
    showStatus(
      "No se pudieron cargar los discos. Comprueba tu conexión e inténtalo de nuevo.",
      true,
    );
  }
};

export const initAlbumSlider = () => {
  if (!slider) {
    return;
  }

  slider.addEventListener("pointerenter", () => setPaused(true));
  slider.addEventListener("pointerleave", () => setPaused(false));
  slider.addEventListener("focusin", () => setPaused(true));
  slider.addEventListener("focusout", (event) => {
    if (!slider.contains(event.relatedTarget)) {
      setPaused(false);
    }
  });

  document.addEventListener("visibilitychange", syncAutoplay);
  reducedMotion.addEventListener("change", syncAutoplay);

  loadAlbums();
};
