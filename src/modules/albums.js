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

const getPreviewUrl = (entry) => {
  const links = Array.isArray(entry.link) ? entry.link : [entry.link];
  return links.find((link) => link?.attributes?.["im:assetType"] === "preview")?.attributes?.href ?? "";
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
    album: getLabel(entry["im:collection"]?.["im:name"]),
    albumId: entry["im:collection"]?.attributes?.["im:id"] ?? null,
    artist: getLabel(entry["im:artist"]),
    artistId: getArtistId(entry),
    artwork: normalizeArtwork(getLabel(Array.isArray(images) ? images.at(-1) : null)),
    genre: getLabel(entry.category?.attributes),
    releaseDate: getLabel(releaseDate?.attributes ?? releaseDate),
    href,
    previewUrl: getPreviewUrl(entry),
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

const chartCache = new Map();
const CHART_FEEDS = {
  albums: "topalbums",
  songs: "topsongs",
};

const fetchChart = (type, limit) => {
  const key = `${type}:${limit}`;
  if (!chartCache.has(key)) {
    chartCache.set(
      key,
      (async () => {
        const response = await fetch(
          `https://itunes.apple.com/es/rss/${CHART_FEEDS[type]}/limit=${limit}/json`,
        );
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
        chartCache.delete(key);
        throw error;
      }),
    );
  }
  return chartCache.get(key);
};

export const fetchAlbumChart = (limit = 50) => fetchChart("albums", limit);
export const fetchSongChart = (limit = 50) => fetchChart("songs", limit);

const getTime = (value = "") => {
  const iso = value.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    return Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  }
  const local = value.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (local) {
    return Date.UTC(Number(local[3]), Number(local[2]) - 1, Number(local[1]));
  }
  const year = value.match(/\b(19|20)\d{2}\b/);
  return year ? Date.UTC(Number(year[0]), 0, 1) : 0;
};

const getYear = (item) => {
  const year = (item.releaseDate ?? "").match(/\b(19|20)\d{2}\b/);
  return year ? Number(year[0]) : 0;
};

const artistKey = (item) =>
  (item.artistId ?? item.artist ?? "").trim().toLocaleLowerCase("es");

const selectTrendingArtists = async (type, limit) => {
  const chart = await fetchChart(type, 200);
  const seen = new Set();
  const selected = [];

  for (const item of chart) {
    const key = artistKey(item);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    selected.push(item);
    if (selected.length >= limit) {
      break;
    }
  }

  if (selected.length < limit) {
    const ids = new Set(selected.map((item) => item.id));
    for (const item of chart) {
      if (ids.has(item.id)) {
        continue;
      }
      ids.add(item.id);
      selected.push(item);
      if (selected.length >= limit) {
        break;
      }
    }
  }

  return selected;
};

export const fetchTrendingArtists = (limit = 15) => selectTrendingArtists("albums", limit);
export const fetchTrendingSongArtists = (limit = 100) => selectTrendingArtists("songs", limit);

const newest = async (type, limit) =>
  [...(await fetchChart(type, 200))]
    .sort((a, b) => getTime(b.releaseDate) - getTime(a.releaseDate))
    .slice(0, limit);

export const fetchNewAlbums = (limit = 100) => newest("albums", limit);
export const fetchNewSongs = (limit = 100) => newest("songs", limit);

const DECADES = {
  "70s": [1970, 1979],
  "80s": [1980, 1989],
  "90s": [1990, 1999],
  "2000s": [2000, 2009],
};

const classics = async (type, decade, limit) => {
  const chart = await fetchChart(type, 200);
  const range = DECADES[decade];

  const collection = chart.filter((item) => {
    const year = getYear(item);
    if (!year) {
      return false;
    }
    return range ? year >= range[0] && year <= range[1] : year <= 2009;
  });

  return collection
    .sort((a, b) => getTime(a.releaseDate) - getTime(b.releaseDate))
    .slice(0, limit);
};

export const fetchClassicAlbums = (decade = "all", limit = 100) =>
  classics("albums", decade, limit);
export const fetchClassicSongs = (decade = "all", limit = 100) =>
  classics("songs", decade, limit);

const searchCache = new Map();

const toCatalogItem = (result, index, type) => {
  const isAlbum = type === "albums";
  return {
    id: isAlbum ? result.collectionId : result.trackId,
    type,
    rank: index + 1,
    title: isAlbum ? result.collectionName : result.trackName,
    album: result.collectionName ?? "",
    albumId: result.collectionId ?? null,
    artist: result.artistName ?? "",
    artistId: result.artistId ?? null,
    artwork: result.artworkUrl100?.replace(/\/\d+x\d+bb/, "/600x600bb.jpg") ?? "",
    genre: result.primaryGenreName ?? "",
    releaseDate: result.releaseDate?.slice(0, 4) ?? "",
    href: isAlbum ? result.collectionViewUrl : result.trackViewUrl ?? "#",
    previewUrl: result.previewUrl ?? "",
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

const normalizeText = (value) =>
  (value ?? "")
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export const searchArtistSongs = async (name) => {
  const key = `artist:${normalizeText(name)}`;
  if (!searchCache.has(key)) {
    searchCache.set(
      key,
      (async () => {
        const url = `https://itunes.apple.com/search?term=${encodeURIComponent(name)}&entity=song&limit=200&country=es`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        const term = normalizeText(name);
        const items = (data.results ?? [])
          .filter(
            (result) =>
              result.trackName && normalizeText(result.artistName).includes(term),
          )
          .map((result, index) => toCatalogItem(result, index, "songs"));

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
