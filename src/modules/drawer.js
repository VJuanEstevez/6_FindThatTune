const drawer = document.querySelector("[data-drawer]") ?? document.querySelector(".drawer");
const toggle = document.querySelector("[data-drawer-toggle]");
const backdrop = document.querySelector("[data-drawer-backdrop]");
const links = document.querySelectorAll(".nav-link");

const setOpen = (open) => {
  drawer.classList.toggle("is-open", open);
  backdrop.classList.toggle("is-open", open);
  toggle.setAttribute("aria-expanded", String(open));
  toggle.setAttribute("aria-label", open ? "Cerrar menú de navegación" : "Abrir menú de navegación");
  document.body.classList.toggle("drawer-is-open", open);
};

export const initDrawer = () => {
  if (!drawer || !toggle || !backdrop) {
    return;
  }

  const isMobile = () => window.matchMedia("(max-width: 60rem)").matches;

  toggle.addEventListener("click", () => {
    const open = !drawer.classList.contains("is-open");
    setOpen(open);
    if (open) {
      drawer.querySelector(".nav-link")?.focus();
    }
  });

  backdrop.addEventListener("click", () => {
    setOpen(false);
    toggle.focus();
  });

  links.forEach((link) => {
    link.addEventListener("click", () => {
      if (isMobile()) {
        setOpen(false);
        document.getElementById("main-content")?.focus();
      }
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && drawer.classList.contains("is-open")) {
      setOpen(false);
      toggle.focus();
    }
  });

  window.matchMedia("(max-width: 60rem)").addEventListener("change", (event) => {
    if (!event.matches) {
      setOpen(false);
    }
  });
};
