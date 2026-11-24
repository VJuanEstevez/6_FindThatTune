import { EXTRA_GENRES, fetchAlbumChart, fetchSongChart } from "./albums.js";

let genres = [...EXTRA_GENRES];
let loadPromise = null;
const listeners = new Set();

const normalize = (values) =>
  [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));

const publish = (values) => {
  genres = normalize(values);
  listeners.forEach((listener) => listener(genres));
};

const createOption = (text, value) => {
  const option = document.createElement("option");
  option.textContent = text;
  option.value = value;
  return option;
};

export const getGenres = () => genres;

export const subscribeGenres = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const addGenres = (values = []) => {
  publish([...genres, ...values]);
};

export const fillGenreSelect = (select, selected = "all", leadingNodes = []) => {
  const genreGroup = document.createElement("optgroup");
  genreGroup.label = "Géneros";
  genreGroup.append(createOption("Todos los géneros", "all"));
  genres.forEach((genre) => genreGroup.append(createOption(genre, genre)));
  select.replaceChildren(...leadingNodes, genreGroup);

  const leadingValues = leadingNodes.flatMap((node) =>
    node.tagName === "OPTGROUP" ? [...node.children].map((option) => option.value) : [node.value]
  );
  const valid = [...leadingValues, "all", ...genres];
  const value = valid.includes(selected) ? selected : "all";
  select.value = value;
  return value;
};

export const loadGenres = () => {
  if (!loadPromise) {
    loadPromise = Promise.allSettled([fetchAlbumChart(200), fetchSongChart(200)]).then(
      (results) => {
        const values = results.flatMap((result) =>
          result.status === "fulfilled" ? result.value.map((item) => item.genre) : []
        );
        addGenres(values);
      }
    );
  }
  return loadPromise;
};
