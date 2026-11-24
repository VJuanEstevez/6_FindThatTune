const THEMES = [
  "violet",
  "emerald",
  "ocean",
  "light",
  "amber",
  "rose",
  "night",
  "mono",
];
const STORAGE_KEY = "find-that-song-theme";
const DEFAULT_THEME = "violet";

const root = document.documentElement;
const dialog = document.querySelector("#theme-dialog");
const settingsButton = document.querySelector("[data-settings-open]");
const closeButton = document.querySelector("[data-dialog-close]");
const themeInputs = document.querySelectorAll('input[name="theme"]');

const isValidTheme = (theme) => THEMES.includes(theme);

const readStoredTheme = () => {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

const applyTheme = (theme) => {
  const selectedTheme = isValidTheme(theme) ? theme : DEFAULT_THEME;
  root.dataset.theme = selectedTheme;

  const selectedInput = document.querySelector(
    `input[name="theme"][value="${selectedTheme}"]`,
  );
  if (selectedInput) {
    selectedInput.checked = true;
  }

  try {
    localStorage.setItem(STORAGE_KEY, selectedTheme);
  } catch {
    // Almacenamiento no disponible: el tema sigue aplicándose en la sesión.
  }
};

export const initTheme = () => {
  applyTheme(readStoredTheme() ?? DEFAULT_THEME);

  settingsButton?.addEventListener("click", () => {
    if (!dialog.open) {
      dialog.showModal();
    }
  });

  closeButton?.addEventListener("click", () => dialog.close());

  dialog?.addEventListener("click", (event) => {
    if (event.target === dialog) {
      dialog.close();
    }
  });

  themeInputs.forEach((input) => {
    input.addEventListener("change", () => {
      if (input.checked) {
        applyTheme(input.value);
      }
    });
  });
};
