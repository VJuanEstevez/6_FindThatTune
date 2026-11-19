const STORAGE_KEY = "find-that-song-grid-columns";
const MOBILE_QUERY = "(max-width: 48rem)";

const RANGES = {
  desktop: { min: 4, max: 6 },
  mobile: { min: 1, max: 3 },
};

const DEFAULTS = { desktop: 4, mobile: 1 };

const root = document.documentElement;
const slider = document.querySelector("#grid-columns");
const output = document.querySelector("#grid-columns-value");
const mediaQuery = window.matchMedia(MOBILE_QUERY);

let columns = { ...DEFAULTS };

const isValid = (value, mode) =>
  Number.isInteger(value) && value >= RANGES[mode].min && value <= RANGES[mode].max;

const readStored = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return {
      desktop: isValid(stored?.desktop, "desktop") ? stored.desktop : DEFAULTS.desktop,
      mobile: isValid(stored?.mobile, "mobile") ? stored.mobile : DEFAULTS.mobile,
    };
  } catch {
    return { ...DEFAULTS };
  }
};

const getMode = () => (mediaQuery.matches ? "mobile" : "desktop");

const applyColumns = (mode) => {
  root.style.setProperty("--grid-columns", String(columns[mode]));
};

const syncSlider = () => {
  const mode = getMode();
  const { min, max } = RANGES[mode];
  slider.min = String(min);
  slider.max = String(max);
  slider.value = String(columns[mode]);
  output.value = String(columns[mode]);
};

const saveColumns = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(columns));
  } catch {
    // Sin acceso a localStorage el ajuste sigue activo en la sesión.
  }
};

export const initGridColumns = () => {
  if (!slider || !output) {
    return;
  }

  columns = readStored();
  syncSlider();
  applyColumns(getMode());

  slider.addEventListener("input", () => {
    const mode = getMode();
    columns[mode] = Number(slider.value);
    output.value = slider.value;
    applyColumns(mode);
    saveColumns();
  });

  mediaQuery.addEventListener("change", () => {
    syncSlider();
    applyColumns(getMode());
  });
};
