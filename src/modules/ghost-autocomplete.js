const normalize = (value) =>
  (value ?? "")
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const COPIED_STYLES = [
  "fontStyle",
  "fontVariant",
  "fontWeight",
  "fontStretch",
  "fontSize",
  "fontFamily",
  "lineHeight",
  "letterSpacing",
  "textAlign",
  "textIndent",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "borderRadius",
];

export const initGhostAutocomplete = (input, getSuggestions) => {
  if (!input || !input.parentNode || typeof getSuggestions !== "function") {
    return;
  }

  const field = document.createElement("span");
  field.className = "ghost-field";
  input.parentNode.insertBefore(field, input);
  field.append(input);

  const shadow = document.createElement("span");
  shadow.className = "ghost-field__shadow";
  shadow.setAttribute("aria-hidden", "true");

  const typed = document.createElement("span");
  typed.className = "ghost-field__typed";
  const hint = document.createElement("span");
  hint.className = "ghost-field__hint";

  shadow.append(typed, hint);
  field.append(shadow);

  const computed = window.getComputedStyle(input);
  COPIED_STYLES.forEach((property) => {
    shadow.style[property] = computed[property];
  });
  shadow.style.borderStyle = "solid";
  shadow.style.borderColor = "transparent";
  shadow.style.boxSizing = "border-box";

  let match = "";

  const update = () => {
    const value = input.value;
    typed.textContent = value;
    match = "";

    if (value.trim()) {
      const found = (getSuggestions() ?? []).find((entry) => {
        const candidate = String(entry ?? "");
        return candidate.length > value.length && normalize(candidate).startsWith(normalize(value));
      });
      if (found) {
        match = String(found);
      }
    }

    hint.textContent = match.slice(value.length);
  };

  const accept = () => {
    input.value = match;
    match = "";
    hint.textContent = "";
    typed.textContent = input.value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
  };

  input.addEventListener("input", update);
  input.addEventListener("focus", update);
  input.addEventListener("keydown", (event) => {
    if (!match || (event.key !== "Tab" && event.key !== "ArrowRight")) {
      return;
    }
    event.preventDefault();
    accept();
  });

  update();
};
