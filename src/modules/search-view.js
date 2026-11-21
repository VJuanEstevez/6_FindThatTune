import { fetchTrendingAlbums, fetchTrendingSongs, searchCatalog } from "./albums.js";
import { createTile, createRow, syncFavoriteButtons } from "./album-card.js";
import { subscribeFavorites } from "./favorites.js";
import { addGenres, fillGenreSelect, subscribeGenres } from "./genres.js";

const PAGE_SIZE = 12;

const grid = document.querySelector("[data-album-grid]");
const pagination = document.querySelector("[data-album-pagination]");
const genreSelect = document.querySelector("[data-genre-select]");
const typeSelect = document.querySelector("[data-type-select]");
const viewInputs = document.querySelectorAll('input[name="view-mode"]');

const data = { albums: [], songs: [] };
const state = { type: "albums", genre: "all", mode: "cards", query: "" };

let currentPage = 1;
let loaded = false;
let loadRequest = 0;

const fetchers = { albums: fetchTrendingAlbums, songs: fetchTrendingSongs };

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

const filteredItems = () => {
  const items = data[state.type];
  if (state.genre === "all") {
    return items;
  }
  return items.filter((item) => item.genre === state.genre);
};

const getPageCount = () => Math.ceil(filteredItems().length / PAGE_SIZE);

const createPageButton = (page) => {
  const button = create("button", "album-pagination__page", String(page));
  button.type = "button";
  button.setAttribute("aria-label", `Ir a la página ${page}`);

  if (page === currentPage) {
    button.classList.add("is-active");
    button.setAttribute("aria-current", "page");
  }

  button.addEventListener("click", () => changePage(page));
  return button;
};

const createArrowButton = (direction) => {
  const previous = direction === "prev";
  const button = create("button", "album-pagination__arrow");
  button.type = "button";
  button.setAttribute("aria-label", previous ? "Página anterior" : "Página siguiente");
  button.disabled = previous ? currentPage === 1 : currentPage === getPageCount();
  button.append(
    createIcon(
      previous
        ? '<path d="m15 18-6-6 6-6" />'
        : '<path d="m9 18 6-6-6-6" />',
    ),
  );
  button.addEventListener("click", () => changePage(currentPage + (previous ? -1 : 1)));
  return button;
};

const renderPagination = () => {
  const pageCount = getPageCount();
  pagination.hidden = pageCount <= 1;

  const buttons = [createArrowButton("prev")];
  for (let page = 1; page <= pageCount; page += 1) {
    buttons.push(createPageButton(page));
  }
  buttons.push(createArrowButton("next"));

  pagination.replaceChildren(...buttons);
};

const showStatus = (message) => {
  pagination.hidden = true;
  const status = create("p", "album-slider__status", message);
  status.setAttribute("role", "status");
  grid.replaceChildren(status);
};

const renderPage = () => {
  const items = filteredItems();
  if (items.length === 0) {
    showStatus("No hay resultados para este género.");
    return;
  }

  const start = (currentPage - 1) * PAGE_SIZE;
  const visibleItems = items.slice(start, start + PAGE_SIZE);

  if (state.mode === "list") {
    const list = create("ul", "track-list");
    list.append(...visibleItems.map((item) => createRow(item, visibleItems)));
    grid.replaceChildren(list);
  } else {
    grid.replaceChildren(...visibleItems.map((item) => createTile(item, visibleItems)));
  }

  renderPagination();
};

const changePage = (page) => {
  currentPage = Math.min(Math.max(page, 1), getPageCount());
  renderPage();
  grid.scrollIntoView({ block: "start" });
};

const populateGenres = () => {
  addGenres(data[state.type].map((item) => item.genre));
};

const showLoadError = () => {
  pagination.hidden = true;
  const status = create(
    "p",
    "album-slider__status",
    "No se pudieron cargar los discos. Comprueba tu conexión e inténtalo de nuevo.",
  );
  status.setAttribute("role", "status");
  const retry = create("button", "album-slider__retry", "Reintentar");
  retry.type = "button";
  retry.addEventListener("click", loadResults);
  status.append(retry);
  grid.replaceChildren(status);
};

const loadResults = async () => {
  const requestId = ++loadRequest;
  showStatus("Cargando discos...");

  try {
    const items = state.query
      ? await searchCatalog(state.query, state.type)
      : state.genre !== "all"
        ? await searchCatalog(state.genre, state.type)
        : await fetchers[state.type]();

    if (requestId !== loadRequest) {
      return;
    }

    data[state.type] = items;
    currentPage = 1;
    populateGenres();
    renderPage();
    loaded = true;
  } catch {
    data[state.type] = [];
    showLoadError();
  }
};

export const setSearchQuery = (query) => {
  state.query = query.trim();
  state.genre = "all";
  genreSelect.value = "all";
  loadResults();
};

export const clearSearchQuery = () => {
  if (!state.query) {
    return;
  }
  state.query = "";
  loadResults();
};

export const initSearchView = () => {
  if (!grid || !pagination || !genreSelect || !typeSelect) {
    return;
  }

  typeSelect.addEventListener("change", () => {
    state.type = typeSelect.value;
    loadResults();
  });

  genreSelect.addEventListener("change", () => {
    state.genre = genreSelect.value;
    state.query = "";
    loadResults();
  });

  viewInputs.forEach((input) => {
    input.addEventListener("change", () => {
      if (!input.checked) {
        return;
      }
      state.mode = input.value;
      grid.classList.toggle("album-grid--list", state.mode === "list");
      renderPage();
    });
  });

  subscribeFavorites(() => {
    if (loaded) {
      syncFavoriteButtons(grid);
    }
  });

  subscribeGenres(() => {
    state.genre = fillGenreSelect(genreSelect, state.genre);
  });

  document.addEventListener("viewchange", (event) => {
    if (event.detail.view === "search" && !loaded && !state.query) {
      loadResults();
    }
  });
};
