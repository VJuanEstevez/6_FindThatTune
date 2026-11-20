const links = document.querySelectorAll(".nav-link");
const views = document.querySelectorAll("main [data-view]");

const setActiveLink = (activeLink) => {
  links.forEach((link) => {
    const isActive = link === activeLink;
    link.classList.toggle("is-active", isActive);

    if (isActive) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
};

const setView = (viewName) => {
  const applyView = () => {
    views.forEach((view) => {
      view.hidden = view.dataset.view !== viewName;
    });
    document.dispatchEvent(new CustomEvent("viewchange", { detail: { view: viewName } }));
  };

  if (document.startViewTransition) {
    document.startViewTransition(applyView);
  } else {
    applyView();
  }
};

export const showView = (viewName) => {
  const link = [...links].find((item) => item.dataset.view === viewName);
  if (link) {
    setActiveLink(link);
  }
  setView(viewName);
};

export const initNavigation = () => {
  links.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      setActiveLink(link);

      if (link.dataset.view) {
        setView(link.dataset.view);
      }
    });
  });
};
