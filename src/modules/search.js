import { showView } from "./navigation.js";
import { clearSearchQuery, setSearchQuery } from "./search-view.js";

const DEBOUNCE_DELAY = 350;

export const initSearch = () => {
  const form = document.querySelector(".search-form");
  const input = document.querySelector("#song-search");

  if (!form || !input) {
    return;
  }

  let timer = null;

  form.addEventListener("submit", (event) => event.preventDefault());

  input.addEventListener("input", () => {
    window.clearTimeout(timer);
    const query = input.value.trim();

    if (!query) {
      clearSearchQuery();
      return;
    }

    timer = window.setTimeout(() => {
      showView("search");
      setSearchQuery(query);
    }, DEBOUNCE_DELAY);
  });
};
