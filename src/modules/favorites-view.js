import { EXTRA_GENRES } from "./albums.js";
import { createTile, createRow } from "./album-card.js";
import { getFavorites, subscribeFavorites } from "./favorites.js";

const grid = document.querySelector("[data-favorites-grid]");
const genreSelect = document.querySelector("[data-favorites-genre]");
const typeSelect = document.querySelector("[data-favorites-type]");
const viewInputs = document.querySelectorAll('input[name="favorites-view-mode"]');

const state = { genre: "all", type: "albums", mode: "cards" };

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

const createStatus = (message) => {
  const status = create("p", "album-slider__status", message);
  status.setAttribute("role", "status");
  return status;
};

const itemsByType = () =>
  getFavorites().filter((item) => (item.type ?? "albums") === state.type);

const filteredItems = () => {
  const items = itemsByType();
  if (state.genre === "all") {
    return items;
  }
  return items.filter((item) => item.genre === state.genre);
};

const populateGenres = () => {
  const genres = [
    ...new Set([
      ...itemsByType().map((item) => item.genre).filter(Boolean),
      ...EXTRA_GENRES,
    ]),
  ].sort((a, b) => a.localeCompare(b, "es"));

  if (!genres.includes(state.genre)) {
    state.genre = "all";
  }

  const options = [create("option", "", "Todos los géneros")];
  options[0].value = "all";
  genres.forEach((genre) => {
    const option = create("option", "", genre);
    option.value = genre;
    options.push(option);
  });

  genreSelect.replaceChildren(...options);
  genreSelect.value = state.genre;
};

const render = () => {
  populateGenres();

  const items = filteredItems();
  if (items.length === 0) {
    const message =
      getFavorites().length === 0
        ? "Aún no has guardado nada. Pulsa el corazón de una tarjeta para añadirla a favoritos."
        : "No hay favoritos para estos filtros.";
    grid.replaceChildren(createStatus(message));
    return;
  }

  if (state.mode === "list") {
    const list = create("ul", "track-list");
    list.append(...items.map((item) => createRow(item, items)));
    grid.replaceChildren(list);
  } else {
    grid.replaceChildren(...items.map((item) => createTile(item, items)));
  }
};

export const initFavoritesView = () => {
  if (!grid || !genreSelect || !typeSelect) {
    return;
  }

  typeSelect.addEventListener("change", () => {
    state.type = typeSelect.value;
    state.genre = "all";
    render();
  });

  genreSelect.addEventListener("change", () => {
    state.genre = genreSelect.value;
    render();
  });

  viewInputs.forEach((input) => {
    input.addEventListener("change", () => {
      if (!input.checked) {
        return;
      }
      state.mode = input.value;
      grid.classList.toggle("album-grid--list", state.mode === "list");
      render();
    });
  });

  subscribeFavorites(render);
  render();
};
