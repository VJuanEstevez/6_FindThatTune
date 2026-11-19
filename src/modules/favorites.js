const STORAGE_KEY = "find-that-song-favorites";

let favorites = [];
const listeners = new Set();

const loadFavorites = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    favorites = Array.isArray(stored) ? stored : [];
  } catch {
    favorites = [];
  }
};

const saveFavorites = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  } catch {
    // Sin acceso a localStorage los favoritos siguen activos en la sesión.
  }
};

const notify = () => {
  listeners.forEach((listener) => listener());
};

export const getItemId = (item) => item.id ?? item.href;

export const getFavorites = () => favorites;

export const isFavorite = (item) => favorites.some((saved) => getItemId(saved) === getItemId(item));

export const toggleFavorite = (item) => {
  const id = getItemId(item);
  if (isFavorite(item)) {
    favorites = favorites.filter((saved) => getItemId(saved) !== id);
  } else {
    favorites = [...favorites, item];
  }

  saveFavorites();
  notify();
};

export const subscribeFavorites = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const initFavorites = () => {
  loadFavorites();
};
