import { getItemId, isFavorite, toggleFavorite } from "./favorites.js";
import { playTrack } from "./player.js";
import { openArtist } from "./artist-modal.js";

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

const createCover = (item, variant) => {
  const frame = document.createElement("span");
  frame.className = `album-cover-frame album-cover-frame--${variant}`;

  const image = document.createElement("img");
  image.className = "album-cover-frame__image";
  image.src = item.artwork;
  image.alt = `Portada de ${item.title}`;
  image.width = 600;
  image.height = 600;
  image.loading = "lazy";
  image.decoding = "async";

  frame.append(image);
  return frame;
};

const createArtistButton = (item) => {
  const button = create("button", "artist-link", item.artist);
  button.type = "button";
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    openArtist(item.artist, item.artistId);
  });
  return button;
};

const syncFavoriteButton = (button, item) => {
  const active = isFavorite(item);
  button.classList.toggle("is-active", active);
  button.setAttribute("aria-pressed", String(active));
  button.setAttribute(
    "aria-label",
    `${active ? "Quitar de favoritos" : "Añadir a favoritos"}: ${item.title}`,
  );
};

const createFavoriteButton = (item) => {
  const button = create("button", "favorite-button");
  button.type = "button";
  button.append(
    createIcon(
      '<path d="M20.8 5.6a5.3 5.3 0 0 0-7.5 0L12 6.9l-1.3-1.3a5.3 5.3 0 0 0-7.5 7.5l1.3 1.3L12 22l7.5-7.6 1.3-1.3a5.3 5.3 0 0 0 0-7.5Z" />',
    ),
  );
  syncFavoriteButton(button, item);

  button.dataset.favoriteId = getItemId(item);
  button.dataset.favoriteTitle = item.title;
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleFavorite(item);
  });
  return button;
};

const attachPlay = (element, item, queue) => {
  element.classList.add("is-playable");
  element.tabIndex = 0;
  element.setAttribute("role", "button");
  element.setAttribute("aria-label", `Reproducir ${item.title}`);

  const play = () => playTrack(item, queue);
  element.addEventListener("click", play);
  element.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      play();
    }
  });
};

export const syncFavoriteButtons = (root = document) => {
  root.querySelectorAll(".favorite-button").forEach((button) => {
    syncFavoriteButton(button, {
      href: button.dataset.favoriteId,
      title: button.dataset.favoriteTitle,
    });
  });
};

export const createTile = (item, queue = [item]) => {
  const tile = create("article", "album-tile");
  const body = create("div", "album-tile__body");
  body.append(create("h3", "album-tile__title", item.title), createArtistButton(item));
  tile.append(createCover(item, "tile"), body, createFavoriteButton(item));
  attachPlay(tile, item, queue);
  return tile;
};

export const createRow = (item, queue = [item]) => {
  const row = create("li", "track-row");
  const info = create("div", "track-row__info");
  info.append(
    create("h3", "track-row__title", item.title),
    createArtistButton(item),
  );
  row.append(
    createCover(item, "row"),
    info,
    create("span", "track-row__genre", item.genre),
    createFavoriteButton(item),
  );
  attachPlay(row, item, queue);
  return row;
};
