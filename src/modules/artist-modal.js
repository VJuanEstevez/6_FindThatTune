const dialog = document.querySelector("#artist-dialog");
const artistTitle = document.querySelector("#artist-dialog-title");
const content = document.querySelector("[data-artist-content]");
const closeButton = document.querySelector("[data-artist-close]");
const viewInputs = document.querySelectorAll('input[name="artist-view-mode"]');

const cache = new Map();
let albums = [];
let mode = "cards";

const create = (tag, className, text) => {
  const element = document.createElement(tag);
  if (className) {
    element.className = className;
  }
  if (text !== undefined) {
    element.textContent = text;
  }
  return element;
};

const toAlbum = (result) => ({
  id: result.collectionId,
  title: result.collectionName,
  artist: result.artistName,
  artwork: result.artworkUrl100?.replace(/\/\d+x\d+bb/, "/200x200bb.jpg") ?? "",
  genre: result.primaryGenreName ?? "",
  releaseDate: result.releaseDate?.slice(0, 4) ?? "",
  href: result.collectionViewUrl ?? "#",
  type: "albums",
});

const fetchDiscography = async (name, id) => {
  const key = id ?? name;
  if (cache.has(key)) {
    return cache.get(key);
  }

  const url = id
    ? `https://itunes.apple.com/lookup?id=${encodeURIComponent(id)}&entity=album&limit=200&country=es`
    : `https://itunes.apple.com/search?term=${encodeURIComponent(name)}&entity=album&limit=200&country=es`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();
  const albums = (data.results ?? [])
    .filter((result) => result.wrapperType === "collection" && result.collectionName)
    .map(toAlbum);

  if (albums.length === 0) {
    throw new Error("Sin resultados");
  }

  cache.set(key, albums);
  return albums;
};

const setStatus = (message, withRetry, retryAction) => {
  const status = create("p", "artist-dialog__status", message);
  status.setAttribute("role", "status");

  if (withRetry) {
    const retry = create("button", "artist-dialog__retry", "Reintentar");
    retry.type = "button";
    retry.addEventListener("click", retryAction);
    status.append(retry);
  }

  content.replaceChildren(status);
};

const createAlbumButton = (album, collection) => {
  const button = create("button", "artist-album");
  button.type = "button";
  if (mode === "cards") {
    button.classList.add("artist-album--card");
  }
  button.setAttribute("aria-label", `Escuchar ${album.title}`);

  const cover = document.createElement("img");
  cover.className = "artist-album__cover";
  cover.src = album.artwork;
  cover.alt = "";
  cover.width = 56;
  cover.height = 56;
  cover.loading = "lazy";

  const info = create("span", "artist-album__info");
  info.append(
    create("span", "artist-album__title", album.title),
    create("span", "artist-album__year", album.releaseDate),
  );

  button.append(cover, info);
  button.addEventListener("click", () => {
    document.dispatchEvent(
      new CustomEvent("artisttrackchange", { detail: { item: album, queue: collection } }),
    );
    dialog.close();
  });
  return button;
};

const renderAlbums = () => {
  if (albums.length === 0) {
    return;
  }

  const list = create("div", "artist-dialog__list");
  if (mode === "cards") {
    list.classList.add("artist-dialog__list--grid");
  }
  list.append(...albums.map((album) => createAlbumButton(album, albums)));
  content.replaceChildren(list);
};

const loadDiscography = async (name, id) => {
  setStatus("Cargando discografía...", false);
  try {
    albums = await fetchDiscography(name, id);
    renderAlbums();
  } catch {
    albums = [];
    setStatus("No se pudo cargar la discografía.", true, () => loadDiscography(name, id));
  }
};

export const openArtist = (name, id = null) => {
  if (!dialog || !name) {
    return;
  }

  artistTitle.textContent = name;
  loadDiscography(name, id);
  dialog.showModal();
};

export const initArtistModal = () => {
  if (!dialog) {
    return;
  }

  viewInputs.forEach((input) => {
    input.addEventListener("change", () => {
      if (!input.checked) {
        return;
      }
      mode = input.value;
      renderAlbums();
    });
  });

  closeButton?.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      dialog.close();
    }
  });
};
