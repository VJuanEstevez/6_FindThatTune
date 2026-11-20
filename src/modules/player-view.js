import {
  getCurrentTrack,
  getQueue,
  isPlaying,
  playQueueIndex,
  skipTrack,
  subscribePlayer,
  togglePlayback,
} from "./player.js";
import { openArtist } from "./artist-modal.js";

const deck = document.querySelector("[data-deck]");
const vinylStage = document.querySelector("[data-deck-vinyl]");
const cassetteStage = document.querySelector("[data-deck-cassette]");
const albumStage = document.querySelector("[data-deck-album]");
const vinylLabel = document.querySelector("[data-vinyl-label]");
const albumPoster = document.querySelector("[data-album-poster]");
const cassetteTrack = document.querySelector("[data-cassette-track]");
const deckTitle = document.querySelector("[data-deck-title]");
const deckArtist = document.querySelector("[data-deck-artist]");
const toggleButton = document.querySelector("[data-deck-toggle]");
const typeInputs = document.querySelectorAll('input[name="player-type"]');
const upNextList = document.querySelector("[data-up-next]");

const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='11' fill='%231d1d2b'/%3E%3Ccircle cx='12' cy='12' r='4' fill='%23a78bfa'/%3E%3C/svg%3E";

const renderUpNext = () => {
  const { items, currentIndex } = getQueue();

  if (items.length < 2) {
    const empty = document.createElement("li");
    empty.className = "up-next__empty";
    empty.textContent = "No hay más canciones en la cola.";
    upNextList.replaceChildren(empty);
    return;
  }

  const rows = [];
  for (let offset = 1; offset < items.length; offset += 1) {
    const index = (currentIndex + offset) % items.length;
    const item = items[index];

    const row = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "up-next__item";
    button.setAttribute("aria-label", `Reproducir ${item.title}`);

    const order = document.createElement("span");
    order.className = "up-next__order";
    order.textContent = String(offset).padStart(2, "0");

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
    songTitle.className = "up-next__title-song";
    songTitle.textContent = item.title;
    const songArtist = document.createElement("span");
    songArtist.className = "up-next__artist";
    songArtist.textContent = item.artist;
    info.append(songTitle, songArtist);

    button.addEventListener("click", () => playQueueIndex(index));
    button.append(order, cover, info);
    row.append(button);
    rows.push(row);
  }

  upNextList.replaceChildren(...rows);
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
  cassetteTrack.textContent = track?.title ?? "Selecciona una canción";

  deck.classList.toggle("is-playing", playing);
  toggleButton.setAttribute("aria-label", playing ? "Pausar" : "Reproducir");
  renderUpNext();
};

export const initPlayerView = () => {
  if (!deck || !vinylStage || !cassetteStage) {
    return;
  }

  const setDeckType = (type) => {
    const stages = {
      vinyl: vinylStage,
      cassette: cassetteStage,
      album: albumStage,
    };
    Object.entries(stages).forEach(([name, stage]) => {
      stage.hidden = name !== type;
    });
    typeInputs.forEach((input) => {
      input.checked = input.value === type;
    });
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

  toggleButton.addEventListener("click", togglePlayback);
  document.querySelector("[data-deck-prev]").addEventListener("click", () => skipTrack(-1));
  document.querySelector("[data-deck-next]").addEventListener("click", () => skipTrack(1));

  subscribePlayer(render);
  render();
};
