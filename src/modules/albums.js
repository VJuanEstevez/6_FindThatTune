export const EXTRA_GENRES = ["Trance", "Punk", "Emo", "Heavy Metal", "Gothic"];

const FEEDS = {
  albums: "https://itunes.apple.com/es/rss/topalbums/limit=50/json",
  songs: "https://itunes.apple.com/es/rss/topsongs/limit=50/json",
};

const pendingFeeds = { albums: null, songs: null };

const getLabel = (node) => node?.label ?? "";

const normalizeArtwork = (url) =>
  url.replace(/\/\d+x\d+bb\.(?:png|jpg)$/i, "/600x600bb.jpg");

const getHref = (entry) => {
  const link = entry.link;
  const attributes = Array.isArray(link) ? link[0]?.attributes : link?.attributes;
  return attributes?.href ?? "#";
};

const getArtistId = (entry) => {
  const href = entry["im:artist"]?.attributes?.href ?? "";
  return href.match(/\/artist\/[^/?]+\/(\d+)/)?.[1] ?? null;
};

const toItem = (entry, index, type) => {
  const images = entry["im:image"];
  const releaseDate = entry["im:releaseDate"];
  const href = getHref(entry);
  return {
    id: entry.id?.attributes?.["im:id"] ?? href,
    type,
    rank: index + 1,
    title: getLabel(entry["im:name"]),
    artist: getLabel(entry["im:artist"]),
    artistId: getArtistId(entry),
    artwork: normalizeArtwork(getLabel(Array.isArray(images) ? images.at(-1) : null)),
    genre: getLabel(entry.category?.attributes),
    releaseDate: getLabel(releaseDate?.attributes ?? releaseDate),
    href,
  };
};

const fetchFeed = (type) => {
  if (!pendingFeeds[type]) {
    pendingFeeds[type] = (async () => {
      const response = await fetch(FEEDS[type]);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const entries = data?.feed?.entry;
      if (!Array.isArray(entries) || entries.length === 0) {
        throw new Error("Feed vacío");
      }

      return entries.map((entry, index) => toItem(entry, index, type));
    })().catch((error) => {
      pendingFeeds[type] = null;
      throw error;
    });
  }

  return pendingFeeds[type];
};

export const fetchTrendingAlbums = () => fetchFeed("albums");
export const fetchTrendingSongs = () => fetchFeed("songs");

const searchCache = new Map();

const toCatalogItem = (result, index, type) => {
  const isAlbum = type === "albums";
  return {
    id: isAlbum ? result.collectionId : result.trackId,
    type,
    rank: index + 1,
    title: isAlbum ? result.collectionName : result.trackName,
    artist: result.artistName ?? "",
    artistId: result.artistId ?? null,
    artwork: result.artworkUrl100?.replace(/\/\d+x\d+bb/, "/600x600bb.jpg") ?? "",
    genre: result.primaryGenreName ?? "",
    releaseDate: result.releaseDate?.slice(0, 4) ?? "",
    href: isAlbum ? result.collectionViewUrl : result.trackViewUrl ?? "#",
  };
};

export const searchCatalog = (term, type) => {
  const key = `${type}:${term.toLowerCase()}`;
  if (!searchCache.has(key)) {
    searchCache.set(
      key,
      (async () => {
        const entity = type === "albums" ? "album" : "song";
        const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=${entity}&limit=200&country=es`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        const items = (data.results ?? [])
          .filter((result) =>
            type === "albums" ? result.collectionName : result.trackName,
          )
          .map((result, index) => toCatalogItem(result, index, type));

        if (items.length === 0) {
          throw new Error("Sin resultados");
        }

        return items;
      })().catch((error) => {
        searchCache.delete(key);
        throw error;
      }),
    );
  }

  return searchCache.get(key);
};
