const OFFSET_PROPERTY = "--marquee-offset";
const registered = new Set();

const measure = (element) => {
  const text = element.querySelector(".marquee__text");
  if (!text) {
    return;
  }

  element.classList.remove("has-overflow");
  element.style.removeProperty(OFFSET_PROPERTY);

  const overflow = Math.ceil(text.scrollWidth - element.clientWidth);
  if (overflow > 1) {
    element.style.setProperty(OFFSET_PROPERTY, `${overflow}px`);
    element.classList.add("has-overflow");
  }
};

export const refreshMarquee = (element) => {
  if (element) {
    requestAnimationFrame(() => measure(element));
  }
};

export const setMarqueeText = (element, value) => {
  if (!element) {
    return;
  }

  let text = element.querySelector(".marquee__text");
  if (!text) {
    text = document.createElement("span");
    text.className = "marquee__text";
    element.replaceChildren(text);
  }

  text.textContent = value ?? "";
  registered.add(element);
  requestAnimationFrame(() => measure(element));
};

export const initMarquee = () => {
  let frame = 0;
  const refreshAll = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      registered.forEach((element) => {
        if (element.isConnected) {
          measure(element);
        } else {
          registered.delete(element);
        }
      });
    });
  };

  window.addEventListener("resize", refreshAll);
  document.addEventListener("viewchange", refreshAll);
};
