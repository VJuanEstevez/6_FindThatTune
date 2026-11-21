import { EXTRA_GENRES, fetchTrendingAlbums, fetchTrendingSongs } from "./albums.js";

let genres = [...EXTRA_GENRES];
let loadPromise = null;
const listeners = new Set();

const normalize = (values) => [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));

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

export const fillGenreSelect = (select, selected = "all") => {
  const options = [createOption("Todos los géneros", "all")];
  genres.forEach((genre) => options.push(createOption(genre, genre)));
  select.replaceChildren(...options);

  const value = genres.includes(selected) ? selected : "all";
  select.value = value;
  return value;
};

export const loadGenres = () => {
  if (!loadPromise) {
    loadPromise = Promise.allSettled([fetchTrendingAlbums(), fetchTrendingSongs()]).then((results) => {
      const values = results.flatMap((result) =>
        result.status === "fulfilled" ? result.value.map((item) => item.genre) : [],
      );
      addGenres(values);
    });
  }
  return loadPromise;
};
