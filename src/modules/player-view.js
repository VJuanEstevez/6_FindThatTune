import {
  getCurrentAlbum,
  getCurrentTrack,
  getQueue,
  isPlaying,
  playQueueIndex,
  skipTrack,
  subscribePlayer,
  togglePlayback,
} from "./player.js";
import { openArtist } from "./artist-modal.js";
import { refreshMarquee, setMarqueeText } from "./marquee.js";
import { isFavorite, subscribeFavorites, toggleFavorite } from "./favorites.js";

const deck = document.querySelector("[data-deck]");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const vinylStage = document.querySelector("[data-deck-vinyl]");
const cassetteStage = document.querySelector("[data-deck-cassette]");
const albumStage = document.querySelector("[data-deck-album]");
const vinylLabel = document.querySelector("[data-vinyl-label]");
const albumPoster = document.querySelector("[data-album-poster]");
const cassetteTrack = document.querySelector("[data-cassette-track]");
const cassetteCover = document.querySelector("[data-cassette-cover]");
const cassetteArtist = document.querySelector("[data-cassette-artist]");
const deckTitle = document.querySelector("[data-deck-title]");
const deckArtist = document.querySelector("[data-deck-artist]");
const deckFavorite = document.querySelector("[data-deck-favorite]");
const toggleButton = document.querySelector("[data-deck-toggle]");
const typeInputs = document.querySelectorAll('input[name="player-type"]');
const upNextList = document.querySelector("[data-up-next]");

const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='11' fill='%231d1d2b'/%3E%3Ccircle cx='12' cy='12' r='4' fill='%23a78bfa'/%3E%3C/svg%3E";

const renderUpNext = () => {
  const { items, currentIndex } = getQueue();

  if (items.length === 0) {
    const empty = document.createElement("li");
    empty.className = "up-next__empty";
    empty.textContent = "No hay canciones en la cola.";
    upNextList.replaceChildren(empty);
    return;
  }

  const rows = items.map((item, index) => {
    const isCurrent = index === currentIndex;
    const row = document.createElement("li");
    row.className = isCurrent ? "is-current" : index < currentIndex ? "is-played" : "";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "up-next__item";
    button.setAttribute("aria-label", `Reproducir ${item.title}`);
    if (isCurrent) {
      button.setAttribute("aria-current", "true");
    }

    const order = document.createElement("span");
    order.className = "up-next__order";
    order.textContent = String(item.rank ?? index + 1).padStart(2, "0");

    const cover = document.createElement("img");
    cover.className = "up-next__cover";
    cover.src = item.artwork;
    cover.alt = "";
    cover.width = 40;
    cover.height = 40;
    cover.loading = "lazy";

    const info = document.createElement("span");
    info.className = "up-next__info";
    const songTitle = document.createElement("span");
    songTitle.className = "up-next__title-song marquee";
    setMarqueeText(songTitle, item.title);
    const songArtist = document.createElement("span");
    songArtist.className = "up-next__artist";
    songArtist.textContent = item.artist;
    info.append(songTitle, songArtist);

    if (isCurrent) {
      const now = document.createElement("span");
      now.className = "up-next__now";
      now.textContent = "Suena ahora";
      info.append(now);
    }

    button.addEventListener("click", () => playQueueIndex(index));
    button.append(order, cover, info);
    row.append(button);
    return row;
  });

  upNextList.replaceChildren(...rows);
};

const syncFavoriteButton = () => {
  const track = getCurrentTrack();
  const album = getCurrentAlbum();
  const active = Boolean(track) && isFavorite(track) && (!album || isFavorite(album));

  deckFavorite.disabled = !track;
  deckFavorite.classList.toggle("is-active", active);
  deckFavorite.setAttribute("aria-pressed", String(active));
  deckFavorite.setAttribute(
    "aria-label",
    track
      ? `${active ? "Quitar" : "Añadir"} la canción y el álbum ${active ? "de" : "a"} favoritos: ${track.title}`
      : "Añadir a favoritos"
  );
};

const render = () => {
  const track = getCurrentTrack();
  const playing = isPlaying();

  deckTitle.textContent = track?.title ?? "Selecciona una canción";
  deckArtist.textContent = track?.artist ?? "Reproductor";
  vinylLabel.src = track?.artwork ?? PLACEHOLDER;
  vinylLabel.alt = track ? `Portada de ${track.title}` : "";
  albumPoster.src = track?.artwork ?? PLACEHOLDER;
  albumPoster.alt = track ? `Póster del álbum ${track.title}` : "";
  setMarqueeText(cassetteTrack, track?.title ?? "Selecciona una canción");
  cassetteArtist.textContent = track?.artist ?? "Reproductor";
  cassetteCover.src = track?.artwork ?? PLACEHOLDER;
  cassetteCover.alt = track ? `Portada de ${track.title}` : "";

  deck.style.setProperty("--ambient-image", `url("${track?.artwork ?? PLACEHOLDER}")`);
  deck.classList.toggle("is-playing", playing);
  toggleButton.setAttribute("aria-label", playing ? "Pausar" : "Reproducir");
  syncFavoriteButton();
  renderUpNext();
};

export const initPlayerView = () => {
  if (!deck || !vinylStage || !cassetteStage) {
    return;
  }

  let activeType = null;

  const setDeckType = (type) => {
    if (type === activeType) {
      return;
    }

    const stages = {
      vinyl: vinylStage,
      cassette: cassetteStage,
      album: albumStage,
    };

    const applyType = () => {
      Object.entries(stages).forEach(([name, stage]) => {
        stage.hidden = name !== type;
      });
      typeInputs.forEach((input) => {
        input.checked = input.value === type;
      });
      activeType = type;
      refreshMarquee(cassetteTrack);
    };

    if (document.startViewTransition && !reducedMotion.matches && activeType !== null) {
      document.startViewTransition(applyType);
    } else {
      applyType();
    }
  };

  typeInputs.forEach((input) => {
    input.addEventListener("change", () => {
      if (input.checked) {
        setDeckType(input.value);
      }
    });
  });

  document.addEventListener("playeropen", (event) => {
    setDeckType(event.detail.type);
  });

  deckArtist.addEventListener("click", () => {
    const track = getCurrentTrack();
    if (track) {
      openArtist(track.artist, track.artistId);
    }
  });

  deckFavorite.addEventListener("click", () => {
    const track = getCurrentTrack();
    const album = getCurrentAlbum();
    if (!track) {
      return;
    }

    const removeBoth = isFavorite(track) && (!album || isFavorite(album));
    if (removeBoth) {
      toggleFavorite(track);
      if (album && isFavorite(album)) {
        toggleFavorite(album);
      }
      return;
    }

    if (!isFavorite(track)) {
      toggleFavorite(track);
    }
    if (album && !isFavorite(album)) {
      toggleFavorite(album);
    }
  });

  subscribeFavorites(syncFavoriteButton);

  toggleButton.addEventListener("click", togglePlayback);
  document.querySelector("[data-deck-prev]").addEventListener("click", () => skipTrack(-1));
  document.querySelector("[data-deck-next]").addEventListener("click", () => skipTrack(1));

  subscribePlayer(render);
  render();
};
