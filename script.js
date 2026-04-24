const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const STRINGS = [
  { stringNumber: 6, openNote: "E", display: "E" },
  { stringNumber: 5, openNote: "A", display: "A" },
  { stringNumber: 4, openNote: "D", display: "D" },
  { stringNumber: 3, openNote: "G", display: "G" },
  { stringNumber: 2, openNote: "B", display: "B" },
  { stringNumber: 1, openNote: "E", display: "E" }
];
const FRET_NUMBERS = Array.from({ length: 24 }, (_, index) => index + 1);
const NATURAL_NOTES = new Set(["A", "B", "C", "D", "E", "F", "G"]);
const AUTO_ADVANCE_MS = 900;

const CHORD_SHAPES = {
  major: [
    {
      id: "e-shape",
      label: "Low E Shape",
      description: "Root on string 6",
      rootString: 6,
      openFrets: [0, 2, 2, 1, 0, 0],
      openFingers: [0, 2, 3, 1, 0, 0],
      movableFrets: [0, 2, 2, 1, 0, 0],
      movableFingers: [1, 3, 4, 2, 1, 1]
    },
    {
      id: "a-shape",
      label: "Middle A Shape",
      description: "Root on string 5",
      rootString: 5,
      openFrets: [null, 0, 2, 2, 2, 0],
      openFingers: [null, 0, 2, 3, 4, 0],
      movableFrets: [null, 0, 2, 2, 2, 0],
      movableFingers: [null, 1, 3, 4, 4, 1]
    },
    {
      id: "d-shape",
      label: "High D Shape",
      description: "Root on string 4",
      rootString: 4,
      openFrets: [null, null, 0, 2, 3, 2],
      openFingers: [null, null, 0, 1, 3, 2],
      movableFrets: [null, null, 0, 2, 3, 2],
      movableFingers: [null, null, 1, 2, 4, 3]
    }
  ],
  minor: [
    {
      id: "em-shape",
      label: "Low Em Shape",
      description: "Root on string 6",
      rootString: 6,
      openFrets: [0, 2, 2, 0, 0, 0],
      openFingers: [0, 2, 3, 0, 0, 0],
      movableFrets: [0, 2, 2, 0, 0, 0],
      movableFingers: [1, 3, 4, 1, 1, 1]
    },
    {
      id: "am-shape",
      label: "Middle Am Shape",
      description: "Root on string 5",
      rootString: 5,
      openFrets: [null, 0, 2, 2, 1, 0],
      openFingers: [null, 0, 2, 3, 1, 0],
      movableFrets: [null, 0, 2, 2, 1, 0],
      movableFingers: [null, 1, 3, 4, 2, 1]
    },
    {
      id: "dm-shape",
      label: "High Dm Shape",
      description: "Root on string 4",
      rootString: 4,
      openFrets: [null, null, 0, 2, 3, 1],
      openFingers: [null, null, 0, 2, 3, 1],
      movableFrets: [null, null, 0, 2, 3, 1],
      movableFingers: [null, null, 1, 3, 4, 2]
    }
  ]
};

const state = {
  mode: "practice",
  options: {
    showDebug: true,
    showFrets: true,
    showLabels: false,
    naturalOnly: false,
    enabledStrings: STRINGS.map((stringData) => stringData.stringNumber)
  },
  score: {
    correct: 0,
    incorrect: 0,
    streak: 0,
    bestStreak: 0
  },
  practice: {
    targetNote: null,
    lastTapped: null,
    isLocked: false,
    pendingAdvance: null
  },
  mapMode: {
    note: "C"
  },
  chordMode: {
    root: "C",
    quality: "major",
    voicingIndex: 0
  },
  feedback: {
    tone: "idle",
    text: "Tap every matching spot for the note shown."
  }
};

const app = document.querySelector("#app");

function getNoteAtFret(openNote, fret) {
  const start = NOTE_NAMES.indexOf(openNote);
  return NOTE_NAMES[(start + fret) % NOTE_NAMES.length];
}

function getPositionNote(stringNumber, fret) {
  const stringData = STRINGS.find((item) => item.stringNumber === stringNumber);
  return getNoteAtFret(stringData.openNote, fret);
}

function getPlayablePositions() {
  return STRINGS.flatMap((stringData) =>
    FRET_NUMBERS.map((fret) => ({
      stringNumber: stringData.stringNumber,
      fret,
      note: getNoteAtFret(stringData.openNote, fret)
    }))
  ).filter((position) => {
    const stringAllowed = state.options.enabledStrings.includes(position.stringNumber);
    const noteAllowed = !state.options.naturalOnly || NATURAL_NOTES.has(position.note);
    return stringAllowed && noteAllowed;
  });
}

function getUniquePlayableNotes() {
  return NOTE_NAMES.filter((note) =>
    getPlayablePositions().some((position) => position.note === note)
  );
}

function clearPendingAdvance() {
  if (state.practice.pendingAdvance) {
    window.clearTimeout(state.practice.pendingAdvance);
    state.practice.pendingAdvance = null;
  }
}

function chooseNextPracticeNote(currentNote = null) {
  const notes = getUniquePlayableNotes();

  if (!notes.length) {
    state.practice.targetNote = null;
    state.feedback = {
      tone: "warning",
      text: "Enable at least one string to keep practicing."
    };
    return;
  }

  if (notes.length === 1) {
    state.practice.targetNote = notes[0];
  } else {
    let nextNote = notes[Math.floor(Math.random() * notes.length)];

    while (currentNote && nextNote === currentNote) {
      nextNote = notes[Math.floor(Math.random() * notes.length)];
    }

    state.practice.targetNote = nextNote;
  }

  state.practice.lastTapped = null;
  state.practice.isLocked = false;
  state.feedback = {
    tone: "idle",
    text: `Find any ${state.practice.targetNote} on the current practice neck and tap it.`
  };
}

function resetScore() {
  clearPendingAdvance();
  state.score = {
    correct: 0,
    incorrect: 0,
    streak: 0,
    bestStreak: 0
  };
  chooseNextPracticeNote();
  render();
}

function setMode(mode) {
  clearPendingAdvance();
  state.mode = mode;
  state.practice.isLocked = false;
  state.practice.lastTapped = null;

  if (mode === "practice") {
    chooseNextPracticeNote(state.practice.targetNote);
  } else if (mode === "map") {
    state.feedback = {
      tone: "idle",
      text: `Showing every ${state.mapMode.note} on the visible fretboard.`
    };
  } else {
    state.feedback = {
      tone: "idle",
      text: `Showing ${getChordLabel()} in a ${getSelectedChordVoicing().label.toLowerCase()} position.`
    };
  }

  render();
}

function updateOption(key, value) {
  clearPendingAdvance();
  state.options[key] = value;
  state.practice.isLocked = false;
  state.practice.lastTapped = null;

  if (state.mode === "practice") {
    chooseNextPracticeNote(state.practice.targetNote);
  } else if (state.mode === "map") {
    state.feedback = {
      tone: "idle",
      text: `Showing every ${state.mapMode.note} on the visible fretboard.`
    };
  }

  render();
}

function toggleString(stringNumber) {
  const enabled = state.options.enabledStrings.includes(stringNumber);

  if (enabled && state.options.enabledStrings.length === 1) {
    return;
  }

  clearPendingAdvance();
  state.options.enabledStrings = enabled
    ? state.options.enabledStrings.filter((item) => item !== stringNumber)
    : [...state.options.enabledStrings, stringNumber].sort((a, b) => b - a);

  state.practice.isLocked = false;
  state.practice.lastTapped = null;

  if (state.mode === "practice") {
    chooseNextPracticeNote(state.practice.targetNote);
  }

  render();
}

function setMapNote(note) {
  state.mapMode.note = note;
  state.feedback = {
    tone: "idle",
    text: `Showing every ${note} on the visible fretboard.`
  };
  render();
}

function getRootFretForShape(rootNote, rootString) {
  const openNote = STRINGS.find((stringData) => stringData.stringNumber === rootString).openNote;
  const openIndex = NOTE_NAMES.indexOf(openNote);
  const rootIndex = NOTE_NAMES.indexOf(rootNote);
  return (rootIndex - openIndex + NOTE_NAMES.length) % NOTE_NAMES.length;
}

function buildChordVoicing(shape, rootNote) {
  const rootFret = getRootFretForShape(rootNote, shape.rootString);
  const useOpen = rootFret === 0;
  const baseFrets = useOpen ? shape.openFrets : shape.movableFrets;
  const baseFingers = useOpen ? shape.openFingers : shape.movableFingers;

  const frets = baseFrets.map((fret) => {
    if (fret === null) {
      return null;
    }

    return useOpen ? fret : rootFret + fret;
  });

  return {
    id: shape.id,
    label: shape.label,
    description: shape.description,
    frets,
    fingers: baseFingers,
    baseFret: getChordDiagramBaseFret(frets)
  };
}

function getChordVoicings() {
  return CHORD_SHAPES[state.chordMode.quality]
    .map((shape) => buildChordVoicing(shape, state.chordMode.root))
    .filter((voicing) =>
      voicing.frets.every((fret) => fret === null || fret <= 24)
    )
    .sort((left, right) => left.baseFret - right.baseFret);
}

function getSelectedChordVoicing() {
  const voicings = getChordVoicings();
  return voicings[Math.min(state.chordMode.voicingIndex, voicings.length - 1)];
}

function setChordRoot(note) {
  state.chordMode.root = note;
  state.chordMode.voicingIndex = 0;
  state.feedback = {
    tone: "idle",
    text: `Showing ${getChordLabel()} in different fretboard areas.`
  };
  render();
}

function setChordQuality(quality) {
  state.chordMode.quality = quality;
  state.chordMode.voicingIndex = 0;
  state.feedback = {
    tone: "idle",
    text: `Showing ${getChordLabel()} in different fretboard areas.`
  };
  render();
}

function setChordVoicing(index) {
  state.chordMode.voicingIndex = index;
  state.feedback = {
    tone: "idle",
    text: `Showing ${getChordLabel()} in a ${getSelectedChordVoicing().label.toLowerCase()} position.`
  };
  render();
}

function getChordLabel() {
  return `${state.chordMode.root}${state.chordMode.quality === "minor" ? "m" : ""}`;
}

function getChordDiagramBaseFret(frets) {
  const pressedFrets = frets.filter((fret) => typeof fret === "number" && fret > 0);

  if (!pressedFrets.length) {
    return 1;
  }

  const minFret = Math.min(...pressedFrets);
  const maxFret = Math.max(...pressedFrets);

  if (minFret <= 1 && maxFret <= 5) {
    return 1;
  }

  return minFret;
}

function handleFretSelection(stringNumber, fret) {
  const note = getPositionNote(stringNumber, fret);

  if (state.mode !== "practice") {
    return;
  }

  if (!state.practice.targetNote || state.practice.isLocked) {
    return;
  }

  state.practice.lastTapped = { stringNumber, fret, note };
  state.practice.isLocked = true;

  if (note === state.practice.targetNote) {
    state.score.correct += 1;
    state.score.streak += 1;
    state.score.bestStreak = Math.max(state.score.bestStreak, state.score.streak);
    state.feedback = {
      tone: "success",
      text: `Correct. ${note} is on string ${stringNumber}, fret ${fret}.`
    };
  } else {
    state.score.incorrect += 1;
    state.score.streak = 0;
    state.feedback = {
      tone: "error",
      text: `Wrong. You tapped ${note} on string ${stringNumber}, fret ${fret}.`
    };
  }

  clearPendingAdvance();
  state.practice.pendingAdvance = window.setTimeout(() => {
    chooseNextPracticeNote(state.practice.targetNote);
    render();
  }, AUTO_ADVANCE_MS);

  render();
}

function renderStatCard(label, value) {
  return `
    <div class="stat-card">
      <span>${label}</span>
      <strong>${value}</strong>
    </div>
  `;
}

function renderFretboard() {
  const selectedChordVoicing = state.mode === "chord" ? getSelectedChordVoicing() : null;
  const stringHeader = state.options.showDebug
    ? `
      <div class="fret-row fret-row-header">
        <div class="fret-row-board fret-row-board-header">
          ${STRINGS.map(
            (stringData) => `
              <div class="string-header">
                <span>${stringData.stringNumber}</span>
                <strong>${stringData.display}</strong>
              </div>
            `
          ).join("")}
        </div>
      </div>
    `
    : "";

  const rows = FRET_NUMBERS.map((fret) => {
    const cells = STRINGS.map((stringData) => {
      const note = getPositionNote(stringData.stringNumber, fret);
      const stringIndex = STRINGS.findIndex((item) => item.stringNumber === stringData.stringNumber);
      const isTapped =
        state.practice.lastTapped &&
        state.practice.lastTapped.stringNumber === stringData.stringNumber &&
        state.practice.lastTapped.fret === fret;
      const isMapHit = state.mode === "map" && note === state.mapMode.note;
      const chordFinger =
        selectedChordVoicing &&
        selectedChordVoicing.frets[stringIndex] === fret &&
        selectedChordVoicing.fingers[stringIndex] > 0
          ? selectedChordVoicing.fingers[stringIndex]
          : null;
      const marker = isMapHit
        ? `<span class="map-marker" aria-hidden="true">${state.mapMode.note}</span>`
        : chordFinger
          ? `<span class="chord-neck-marker" aria-hidden="true">${chordFinger}</span>`
        : "";

      return `
        <button
          class="fret-cell ${isTapped ? "is-last-tapped" : ""} ${isMapHit ? "is-map-hit" : ""} ${chordFinger ? "is-chord-hit" : ""}"
          type="button"
          data-cell="true"
          data-string-number="${stringData.stringNumber}"
          data-fret="${fret}"
          aria-label="String ${stringData.stringNumber}, fret ${fret}, note ${note}"
        >
          <span class="string-line string-${stringData.stringNumber}" aria-hidden="true"></span>
          ${state.options.showLabels ? `<span class="cell-note-label">${note}</span>` : ""}
          ${marker}
        </button>
      `;
    }).join("");

    return `
      <div class="fret-row">
        <div class="fret-row-board">
          ${renderInlay(fret)}
          ${cells}
        </div>
      </div>
    `;
  }).join("");

  return stringHeader + rows;
}

function renderFretLabels() {
  if (!state.options.showFrets) {
    return "";
  }

  const headerSpacer = state.options.showDebug
    ? '<div class="fret-label-row fret-label-row-header" aria-hidden="true"></div>'
    : "";

  const rows = FRET_NUMBERS.map(
    (fret) => `
      <div class="fret-label-row">
        <span class="fret-number">${fret}</span>
      </div>
    `
  ).join("");

  return `
    <div class="fret-label-column" aria-hidden="true">
      <div class="fret-label-head-spacer"></div>
      ${headerSpacer}
      ${rows}
    </div>
  `;
}

function renderInlay(fret) {
  if ([3, 5, 7, 9, 15, 17, 19, 21].includes(fret)) {
    return '<span class="fret-inlay fret-inlay-single" aria-hidden="true"></span>';
  }

  if ([12, 24].includes(fret)) {
    return `
      <span class="fret-inlay fret-inlay-double" aria-hidden="true">
        <span></span>
        <span></span>
      </span>
    `;
  }

  return "";
}

function renderPracticePanel() {
  return `
    <section class="panel" aria-live="polite">
      <h2>Find This Note</h2>
      <p class="prompt-copy">
        Tap any correct location for the target note on the guitar neck.
      </p>
      <div class="target-note-card">
        <span>Target Note</span>
        <strong>${state.practice.targetNote || "?"}</strong>
      </div>
      <p class="feedback-banner tone-${state.feedback.tone}">${state.feedback.text}</p>
      ${
        state.options.showDebug && state.practice.lastTapped
          ? `<p class="debug-pill">Last tap: String ${state.practice.lastTapped.stringNumber} • Fret ${state.practice.lastTapped.fret} • ${state.practice.lastTapped.note}</p>`
          : ""
      }
    </section>
  `;
}

function renderMapPanel() {
  return `
    <section class="panel" aria-live="polite">
      <h2>Note Map</h2>
      <p class="prompt-copy">
        Pick a note and the neck will show every place you can play it.
      </p>
      <div class="target-note-card">
        <span>Showing</span>
        <strong>${state.mapMode.note}</strong>
      </div>
      <p class="feedback-banner tone-${state.feedback.tone}">${state.feedback.text}</p>
    </section>

    <section class="panel">
      <h2>Pick A Note</h2>
      <div class="answers-grid note-picker-grid">
        ${NOTE_NAMES.map(
          (note) => `
            <button
              class="answer-button ${state.mapMode.note === note ? "is-selected" : ""}"
              type="button"
              data-map-note="${note}"
            >
              ${note}
            </button>
          `
        ).join("")}
      </div>
    </section>
  `;
}

function renderChordDiagram() {
  const voicing = getSelectedChordVoicing();
  const startFret = voicing.baseFret;
  const topMarkers = voicing.frets.map((fret) => {
    if (fret === null) {
      return '<span class="diagram-top-marker is-muted">x</span>';
    }

    if (fret === 0) {
      return '<span class="diagram-top-marker is-open">o</span>';
    }

    return '<span class="diagram-top-marker"></span>';
  }).join("");

  const rows = Array.from({ length: 5 }, (_, rowIndex) => {
    const fretNumber = startFret + rowIndex;
    const cells = STRINGS.map((stringData, stringIndex) => {
      const finger = voicing.fingers[stringIndex];
      const fret = voicing.frets[stringIndex];
      const matches = fret !== null && fret > 0 && fret === fretNumber;

      return `
        <div class="diagram-cell">
          ${matches ? `<span class="finger-marker">${finger}</span>` : ""}
        </div>
      `;
    }).join("");

    return `
      <div class="chord-diagram-row">
        ${rowIndex === 0 && startFret > 1 ? `<span class="diagram-base-fret">${startFret}fr</span>` : ""}
        ${cells}
      </div>
    `;
  }).join("");

  return `
    <section class="panel chord-panel" aria-live="polite">
      <h2>Chord Shapes</h2>
      <p class="prompt-copy">
        Pick a chord and switch between different fretboard areas. Numbers show finger placement.
      </p>
      <div class="target-note-card chord-name-card">
        <span>Chord</span>
        <strong>${getChordLabel()}</strong>
      </div>
      <div class="chord-meta">
        <span>${voicing.label}</span>
        <span>${voicing.description}</span>
      </div>
      <div class="chord-diagram-wrap">
        <div class="chord-diagram-top">
          ${topMarkers}
        </div>
        <div class="chord-diagram-grid">
          ${rows}
        </div>
      </div>
      <p class="feedback-banner tone-${state.feedback.tone}">${state.feedback.text}</p>
    </section>
  `;
}

function renderChordControls() {
  const voicings = getChordVoicings();

  return `
    <section class="panel">
      <h2>Chord Builder</h2>
      <p class="string-picker-label">Pick a root note</p>
      <div class="answers-grid note-picker-grid">
        ${NOTE_NAMES.map(
          (note) => `
            <button
              class="answer-button ${state.chordMode.root === note ? "is-selected" : ""}"
              type="button"
              data-chord-root="${note}"
            >
              ${note}
            </button>
          `
        ).join("")}
      </div>

      <div class="quality-picker">
        <p class="string-picker-label">Pick a chord quality</p>
        <div class="mode-tabs quality-tabs">
          <button class="mode-tab ${state.chordMode.quality === "major" ? "is-active" : ""}" type="button" data-quality="major">
            Major
          </button>
          <button class="mode-tab ${state.chordMode.quality === "minor" ? "is-active" : ""}" type="button" data-quality="minor">
            Minor
          </button>
        </div>
      </div>

      <div class="voicing-picker">
        <p class="string-picker-label">Choose a fretboard area</p>
        <div class="voicing-list">
          ${voicings.map(
            (voicing, index) => `
              <button
                class="voicing-button ${state.chordMode.voicingIndex === index ? "is-selected" : ""}"
                type="button"
                data-voicing-index="${index}"
              >
                <strong>${voicing.label}</strong>
                <span>${voicing.description}</span>
              </button>
            `
          ).join("")}
        </div>
      </div>
    </section>
  `;
}

function renderOptionsPanel() {
  return `
    <section class="panel">
      <h2>Practice Options</h2>
      <div class="toggle-list">
        <label class="toggle-row">
          <input type="checkbox" data-option="showDebug" ${state.options.showDebug ? "checked" : ""} />
          <span>Show string details and debug info</span>
        </label>
        <label class="toggle-row">
          <input type="checkbox" data-option="showFrets" ${state.options.showFrets ? "checked" : ""} />
          <span>Show fret numbers</span>
        </label>
        <label class="toggle-row">
          <input type="checkbox" data-option="showLabels" ${state.options.showLabels ? "checked" : ""} />
          <span>Show note labels on the fretboard</span>
        </label>
        <label class="toggle-row">
          <input type="checkbox" data-option="naturalOnly" ${state.options.naturalOnly ? "checked" : ""} />
          <span>Practice natural notes only</span>
        </label>
      </div>

      <div class="string-picker">
        <p class="string-picker-label">Choose specific strings</p>
        <div class="string-chips">
          ${STRINGS.map((stringData) => {
            const enabled = state.options.enabledStrings.includes(stringData.stringNumber);
            const lockLastEnabled = enabled && state.options.enabledStrings.length === 1;

            return `
              <label class="string-chip ${enabled ? "is-enabled" : ""}">
                <input
                  type="checkbox"
                  data-string="${stringData.stringNumber}"
                  ${enabled ? "checked" : ""}
                  ${lockLastEnabled ? "disabled" : ""}
                />
                <span>String ${stringData.stringNumber} (${stringData.display})</span>
              </label>
            `;
          }).join("")}
        </div>
      </div>
    </section>
  `;
}

function renderSideColumn() {
  if (state.mode === "practice") {
    return `${renderPracticePanel()}${renderOptionsPanel()}`;
  }

  if (state.mode === "map") {
    return `${renderMapPanel()}${renderOptionsPanel()}`;
  }

  return `${renderChordDiagram()}${renderChordControls()}${renderOptionsPanel()}`;
}

function render() {
  const playablePositions = getPlayablePositions();
  const totalAnswers = state.score.correct + state.score.incorrect;
  const accuracy = totalAnswers ? Math.round((state.score.correct / totalAnswers) * 100) : 0;

  app.innerHTML = `
    <main class="app-shell">
      <section class="hero-card">
        <div>
          <p class="eyebrow">Music Learning Game</p>
          <h1>Guitar Note Guesser</h1>
          <p class="hero-copy">
            Practice note finding on the neck, map every note position, or study chord shapes across different fretboard areas.
          </p>
        </div>

        <div class="hero-actions">
          <button class="secondary-button" type="button" data-action="new-note" ${state.mode !== "practice" ? "disabled" : ""}>
            New Note
          </button>
          <button class="ghost-button" type="button" data-action="reset-score" ${state.mode !== "practice" ? "disabled" : ""}>
            Reset Score
          </button>
        </div>
      </section>

      <section class="mode-tabs app-mode-tabs" aria-label="App modes">
        <button class="mode-tab ${state.mode === "practice" ? "is-active" : ""}" type="button" data-tab="practice">
          Practice
        </button>
        <button class="mode-tab ${state.mode === "map" ? "is-active" : ""}" type="button" data-tab="map">
          Note Map
        </button>
        <button class="mode-tab ${state.mode === "chord" ? "is-active" : ""}" type="button" data-tab="chord">
          Chord Shapes
        </button>
      </section>

      <section class="status-grid" aria-label="Scoreboard">
        ${renderStatCard("Correct", state.score.correct)}
        ${renderStatCard("Incorrect", state.score.incorrect)}
        ${renderStatCard("Streak", state.score.streak)}
        ${renderStatCard("Best Streak", state.score.bestStreak)}
        ${renderStatCard("Accuracy", `${accuracy}%`)}
        ${renderStatCard("Visible Spots", playablePositions.length)}
      </section>

      <section class="game-layout">
        <section class="panel fretboard-panel">
          <div class="panel-heading">
            <div>
              <h2>${state.mode === "practice" ? "Tap The Right Position" : state.mode === "map" ? "Note Position Map" : "Reference Neck"}</h2>
              <p>Strings 6 to 1 follow standard tuning: E, A, D, G, B, E.</p>
            </div>
            <p class="board-caption">Frets 0 through 24</p>
          </div>

          <div class="fretboard-wrap">
            <div class="fretboard-shell">
              ${renderFretLabels()}
              <div class="guitar-figure" role="img" aria-label="Guitar fretboard with headstock, six strings and twenty four frets">
                <div class="headstock" aria-hidden="true">
                  <div class="headstock-shape">
                    <span class="tuner-hole tuner-hole-left tuner-hole-top"></span>
                    <span class="tuner-hole tuner-hole-right tuner-hole-top"></span>
                    <span class="tuner-hole tuner-hole-left tuner-hole-mid"></span>
                    <span class="tuner-hole tuner-hole-right tuner-hole-mid"></span>
                    <span class="tuner-hole tuner-hole-left tuner-hole-low"></span>
                    <span class="tuner-hole tuner-hole-right tuner-hole-low"></span>
                    <div class="headstock-endcap"></div>
                  </div>
                  <div class="nut-block">
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
                <div class="fretboard">
                  ${renderFretboard()}
                </div>
              </div>
            </div>
          </div>
        </section>

        <div class="side-column">
          ${renderSideColumn()}
        </div>
      </section>
    </main>
  `;

  app.querySelector('[data-action="new-note"]').addEventListener("click", () => {
    if (state.mode !== "practice") {
      return;
    }

    clearPendingAdvance();
    chooseNextPracticeNote(state.practice.targetNote);
    render();
  });

  app.querySelector('[data-action="reset-score"]').addEventListener("click", () => {
    if (state.mode !== "practice") {
      return;
    }

    resetScore();
  });

  app.querySelectorAll("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      setMode(button.dataset.tab);
    });
  });

  app.querySelectorAll("[data-cell]").forEach((button) => {
    button.addEventListener("click", () => {
      handleFretSelection(Number(button.dataset.stringNumber), Number(button.dataset.fret));
    });
  });

  app.querySelectorAll("[data-map-note]").forEach((button) => {
    button.addEventListener("click", () => {
      setMapNote(button.dataset.mapNote);
    });
  });

  app.querySelectorAll("[data-chord-root]").forEach((button) => {
    button.addEventListener("click", () => {
      setChordRoot(button.dataset.chordRoot);
    });
  });

  app.querySelectorAll("[data-quality]").forEach((button) => {
    button.addEventListener("click", () => {
      setChordQuality(button.dataset.quality);
    });
  });

  app.querySelectorAll("[data-voicing-index]").forEach((button) => {
    button.addEventListener("click", () => {
      setChordVoicing(Number(button.dataset.voicingIndex));
    });
  });

  app.querySelectorAll("[data-option]").forEach((input) => {
    input.addEventListener("change", () => {
      updateOption(input.dataset.option, input.checked);
    });
  });

  app.querySelectorAll("[data-string]").forEach((input) => {
    input.addEventListener("change", () => {
      toggleString(Number(input.dataset.string));
    });
  });
}

chooseNextPracticeNote();
render();
