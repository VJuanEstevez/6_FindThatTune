import { fetchTrendingSongs, searchArtistSongs, searchCatalog } from "./albums.js";
import { fillGenreSelect, subscribeGenres } from "./genres.js";
import { initGhostAutocomplete } from "./ghost-autocomplete.js";
import { pausePlayback, playTrack } from "./player.js";

const STORAGE_KEY = "find-that-song-game";
const HISTORY_LIMIT = 20;

const board = document.querySelector("[data-game-board]");
const feedback = document.querySelector("[data-game-feedback]");
const startArea = document.querySelector("[data-game-start-area]");
const restartButton = document.querySelector("[data-game-restart]");
const round = document.querySelector("[data-game-round]");
const result = document.querySelector("[data-game-result]");
const statusText = document.querySelector("[data-game-status]");
const progress = document.querySelector("[data-game-progress]");
const optionsContainer = document.querySelector("[data-game-options]");
const message = document.querySelector("[data-game-message]");
const cover = document.querySelector("[data-game-cover]");
const answerTitle = document.querySelector("[data-game-answer-title]");
const answerArtist = document.querySelector("[data-game-answer-artist]");
const answerAlbum = document.querySelector("[data-game-answer-album]");
const modeSelect = document.querySelector("[data-game-mode]");
const genreSelect = document.querySelector("[data-game-genre]");
const genreField = document.querySelector("[data-game-genre-field]");
const artistField = document.querySelector("[data-game-artist-field]");
const artistInput = document.querySelector("[data-game-artist]");
const durationSelect = document.querySelector("[data-game-duration]");
const totalRoundsSelect = document.querySelector("[data-game-total-rounds]");
const settingsDialog = document.querySelector("#game-settings-dialog");
const scoresDialog = document.querySelector("#game-scores-dialog");
const settingsClose = document.querySelector("[data-game-settings-close]");
const scoresOpen = document.querySelector("[data-game-scores-open]");
const scoresClose = document.querySelector("[data-game-scores-close]");
const confirmDialog = document.querySelector("#game-confirm-dialog");
const confirmTitle = document.querySelector("#game-confirm-title");
const confirmText = document.querySelector("[data-game-confirm-text]");
const confirmAccept = document.querySelector("[data-game-confirm-accept]");
const confirmCancel = document.querySelectorAll("[data-game-confirm-cancel]");
const playButton = document.querySelector("[data-game-play]");
const roundNumberText = document.querySelector("[data-game-round-number]");
const playerNameInput = document.querySelector("[data-game-player-name]");
const playerText = document.querySelector("[data-game-player]");
const startButton = document.querySelector("[data-game-start]");
const repeatButton = document.querySelector("[data-game-repeat]");
const nextButton = document.querySelector("[data-game-next]");
const resetButton = document.querySelector("[data-game-reset]");
const summary = document.querySelector("[data-game-summary]");
const historyBody = document.querySelector("[data-game-history]");

const audio = new Audio();
const emptyStats = () => ({
  playerName: "",
  played: 0,
  correct: 0,
  streak: 0,
  bestStreak: 0,
  history: [],
});

let stats = emptyStats();
let pool = [];
let options = [];
let current = null;
let artistSuggestions = [];
let roundNumber = 0;
let totalRounds = 10;
let answered = false;
let timerId = null;

const normalize = (value) =>
  (value ?? "")
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

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

const shuffle = (values) => {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
};

const loadStats = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    stats = {
      ...emptyStats(),
      ...stored,
      history: Array.isArray(stored?.history) ? stored.history.slice(0, HISTORY_LIMIT) : [],
    };
  } catch {
    stats = emptyStats();
  }
};

const saveStats = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // Sin acceso a localStorage la clasificación sigue activa en la sesión.
  }
};

const renderScores = () => {
  playerText.textContent = stats.playerName?.trim() || "Jugador";
  const accuracy = stats.played ? Math.round((stats.correct / stats.played) * 100) : 0;
  summary.replaceChildren(
    ...[
      ["Partidas", String(stats.played)],
      ["Aciertos", String(stats.correct)],
      ["Precisión", `${accuracy}%`],
      ["Mejor racha", String(stats.bestStreak)],
    ].map(([label, value]) => {
      const stat = create("div", "scores-panel__stat");
      stat.append(create("dt", "", label), create("dd", "", value));
      return stat;
    }),
  );

  if (stats.history.length === 0) {
    const row = create("tr");
    const cell = create("td", "scores-panel__empty", "Aún no hay partidas. Empieza una ronda para aparecer aquí.");
    cell.colSpan = 4;
    row.append(cell);
    historyBody.replaceChildren(row);
    return;
  }

  historyBody.replaceChildren(
    ...stats.history.map((entry) => {
      const row = create("tr");
      const date = new Date(entry.date);
      row.append(
        create("td", "", Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("es")),
        create("td", "", entry.title ?? "—"),
        create("td", "", entry.mode === "artist" ? "Artista" : "Género"),
        create("td", entry.correct ? "is-correct" : "is-wrong", entry.correct ? "Acertada" : "Fallada"),
      );
      return row;
    }),
  );
};

const clearTimer = () => {
  if (timerId !== null) {
    clearInterval(timerId);
    timerId = null;
  }
};

const stopAudio = () => {
  clearTimer();
  audio.pause();
  progress.value = "0";
};

const playFragment = () => {
  if (!current?.previewUrl) {
    return;
  }

  clearTimer();
  audio.src = current.previewUrl;
  audio.currentTime = 0;
  audio.play().catch(() => {
    statusText.textContent = "No se pudo reproducir el fragmento.";
    statusText.hidden = false;
  });

  const duration = Number(durationSelect.value);
  let played = 0;
  progress.value = "0";

  timerId = setInterval(() => {
    played += 0.1;
    progress.value = String(Math.min(100, Math.round((played / duration) * 100)));
    if (played >= duration) {
      clearTimer();
      audio.pause();
    }
  }, 100);
};

const renderOptions = () => {
  optionsContainer.replaceChildren(
    ...options.map((option) => {
      const button = create("button", "game__option");
      button.type = "button";
      button.dataset.optionId = String(option.id);
      button.setAttribute("aria-label", `Adivinar ${option.title} de ${option.artist}`);
      button.append(
        create("span", "game__option-title", option.title),
        create("span", "game__option-artist", option.artist),
      );
      button.addEventListener("click", () => handleAnswer(option, button));
      return button;
    }),
  );
};

const handleAnswer = (option, button) => {
  if (answered) {
    return;
  }
  answered = true;
  clearTimer();
  audio.pause();

  const correct = option.id === current.id;
  stats.played += 1;
  if (correct) {
    stats.correct += 1;
    stats.streak += 1;
    stats.bestStreak = Math.max(stats.bestStreak, stats.streak);
  } else {
    stats.streak = 0;
    button.classList.add("is-wrong");
  }

  stats.history.unshift({
    date: new Date().toISOString(),
    title: current.title,
    mode: modeSelect.value,
    correct,
  });
  stats.history = stats.history.slice(0, HISTORY_LIMIT);
  saveStats();
  renderScores();

  optionsContainer.querySelectorAll(".game__option").forEach((element) => {
    element.disabled = true;
    if (element.dataset.optionId === String(current.id)) {
      element.classList.add("is-correct");
    }
  });

  message.textContent = correct
    ? `¡Correcto! Era «${current.title}».`
    : `Fallaste. Era «${current.title}».`;
  message.classList.toggle("is-correct", correct);
  message.classList.toggle("is-wrong", !correct);
  message.hidden = false;

  cover.src = current.artwork;
  cover.alt = `Portada de ${current.title}`;
  answerTitle.textContent = current.title;
  answerArtist.textContent = current.artist;
  answerAlbum.textContent = current.album || "Álbum desconocido";

  result.hidden = false;
  nextButton.hidden = false;
  feedback.hidden = false;
  repeatButton.disabled = true;
  progress.value = "100";
  playTrack(current, [current]);
};

const endGame = () => {
  stopAudio();
  pausePlayback();
  round.hidden = true;
  result.hidden = true;
  nextButton.hidden = true;
  feedback.hidden = false;
  startArea.hidden = false;
  restartButton.hidden = true;
  roundNumberText.hidden = true;
  message.hidden = false;
  message.classList.remove("is-correct", "is-wrong");
  message.textContent = `Juego terminado: ${stats.correct} aciertos de ${stats.played}. Pulsa «Comenzar juego» para volver a jugar.`;
};

const startRound = async (reset = false) => {
  stopAudio();
  pausePlayback();

  if (reset) {
    roundNumber = 0;
  }
  if (roundNumber >= totalRounds) {
    endGame();
    return;
  }

  answered = false;
  startArea.hidden = true;
  restartButton.hidden = false;
  board.hidden = false;
  round.hidden = true;
  result.hidden = true;
  message.hidden = true;
  nextButton.hidden = true;
  feedback.hidden = true;
  repeatButton.disabled = false;
  roundNumber += 1;
  roundNumberText.hidden = false;
  roundNumberText.textContent = `Ronda ${roundNumber} de ${totalRounds}`;
  statusText.hidden = false;
  statusText.textContent = "Cargando canciones...";

  try {
    let songs;
    if (modeSelect.value === "artist") {
      const artist = artistInput.value.trim();
      if (!artist) {
        statusText.textContent = "Escribe el nombre de un artista para jugar.";
        return;
      }
      songs = await searchArtistSongs(artist);
    } else {
      const genre = genreSelect.value;
      songs = genre === "all" ? await fetchTrendingSongs() : await searchCatalog(genre, "songs");
    }

    const seen = new Set();
    pool = songs.filter((song) => {
      if (!song.previewUrl || !song.title) {
        return false;
      }
      const key = normalize(song.title);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });

    if (pool.length < 4) {
      statusText.textContent = "No hay suficientes canciones con fragmento para esta selección.";
      return;
    }

    current = pool[Math.floor(Math.random() * pool.length)];
    const distractors = shuffle(
      pool.filter((song) => normalize(song.title) !== normalize(current.title)),
    ).slice(0, 3);
    options = shuffle([current, ...distractors]);

    renderOptions();
    statusText.hidden = true;
    round.hidden = false;
    playFragment();
  } catch {
    statusText.textContent = "No se pudieron cargar las canciones. Inténtalo de nuevo.";
  }
};

const populateArtists = () => {
  fetchTrendingSongs()
    .then((songs) => {
      const artists = [...new Set(songs.map((song) => song.artist).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, "es"),
      );
      artistSuggestions = artists;
    })
    .catch(() => {});
};

export const initGame = () => {
  if (!board || !modeSelect || !genreSelect || !startButton) {
    return;
  }

  loadStats();
  renderScores();
  if (playerNameInput) {
    playerNameInput.value = stats.playerName ?? "";
    playerNameInput.addEventListener("input", () => {
      stats.playerName = playerNameInput.value;
      saveStats();
      renderScores();
    });
  }
  totalRounds = Number(totalRoundsSelect?.value) || totalRounds;
  totalRoundsSelect?.addEventListener("change", () => {
    totalRounds = Number(totalRoundsSelect.value) || totalRounds;
  });
  fillGenreSelect(genreSelect, "all");
  subscribeGenres(() => fillGenreSelect(genreSelect, genreSelect.value));
  populateArtists();
  initGhostAutocomplete(artistInput, () => artistSuggestions);

  modeSelect.addEventListener("change", () => {
    const isArtist = modeSelect.value === "artist";
    genreField.hidden = isArtist;
    artistField.hidden = !isArtist;
  });

  settingsClose?.addEventListener("click", () => settingsDialog?.close());
  scoresOpen?.addEventListener("click", () => {
    renderScores();
    if (!scoresDialog?.open) {
      scoresDialog?.showModal();
    }
  });
  scoresClose?.addEventListener("click", () => scoresDialog?.close());

  const openRestartConfirm = () => {
    confirmTitle.textContent = "¿Comenzar de nuevo?";
    confirmText.textContent = "Se reiniciará la cuenta de rondas. Tu clasificación se conservará.";
    if (!confirmDialog?.open) {
      confirmDialog?.showModal();
    }
  };

  playButton?.addEventListener("click", () => {
    if (!settingsDialog?.open) {
      settingsDialog?.showModal();
    }
  });
  restartButton?.addEventListener("click", openRestartConfirm);
  confirmCancel.forEach((button) => button.addEventListener("click", () => confirmDialog?.close()));
  confirmAccept?.addEventListener("click", () => {
    confirmDialog?.close();
    startRound(true);
  });

  startButton.addEventListener("click", () => {
    settingsDialog?.close();
    startRound(true);
  });
  repeatButton?.addEventListener("click", playFragment);
  nextButton?.addEventListener("click", () => startRound());

  resetButton?.addEventListener("click", () => {
    if (!window.confirm("¿Reiniciar la clasificación del juego?")) {
      return;
    }
    stats = emptyStats();
    saveStats();
    renderScores();
  });

  document.addEventListener("viewchange", (event) => {
    stopAudio();
    if (event.detail.view === "game") {
      startArea.hidden = false;
      board.hidden = true;
      feedback.hidden = true;
      restartButton.hidden = true;
      roundNumberText.hidden = true;
    }
  });
};
