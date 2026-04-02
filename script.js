const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const STRINGS = [
  { stringNumber: 6, openNote: "E", display: "E" },
  { stringNumber: 5, openNote: "A", display: "A" },
  { stringNumber: 4, openNote: "D", display: "D" },
  { stringNumber: 3, openNote: "G", display: "G" },
  { stringNumber: 2, openNote: "B", display: "B" },
  { stringNumber: 1, openNote: "E", display: "E" }
];
const FRET_NUMBERS = Array.from({ length: 25 }, (_, fret) => fret);
const NATURAL_NOTES = new Set(["A", "B", "C", "D", "E", "F", "G"]);
const AUTO_ADVANCE_MS = 900;

const state = {
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
  feedback: {
    tone: "idle",
    text: "Choose the note name that matches the glowing position."
  },
  selectedAnswer: null,
  target: null,
  isLocked: false,
  pendingAdvance: null
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

function pickRandomPosition(currentTarget = null) {
  const positions = getPlayablePositions();

  if (!positions.length) {
    return null;
  }

  if (positions.length === 1) {
    return positions[0];
  }

  let next = positions[Math.floor(Math.random() * positions.length)];

  while (
    currentTarget &&
    next.stringNumber === currentTarget.stringNumber &&
    next.fret === currentTarget.fret
  ) {
    next = positions[Math.floor(Math.random() * positions.length)];
  }

  return next;
}

function clearPendingAdvance() {
  if (state.pendingAdvance) {
    window.clearTimeout(state.pendingAdvance);
    state.pendingAdvance = null;
  }
}

function chooseNextTarget() {
  state.target = pickRandomPosition(state.target);
  state.selectedAnswer = null;
  state.isLocked = false;

  state.feedback = state.target
    ? {
        tone: "idle",
        text: "Choose the note name that matches the glowing position."
      }
    : {
        tone: "warning",
        text: "Enable at least one string to keep practicing."
      };

  render();
}

function resetScore() {
  clearPendingAdvance();
  state.score = {
    correct: 0,
    incorrect: 0,
    streak: 0,
    bestStreak: 0
  };
  state.selectedAnswer = null;
  state.isLocked = false;
  state.target = pickRandomPosition();
  state.feedback = state.target
    ? {
        tone: "idle",
        text: "Choose the note name that matches the glowing position."
      }
    : {
        tone: "warning",
        text: "Enable at least one string to keep practicing."
      };
  render();
}

function handleAnswer(note) {
  if (!state.target || state.isLocked) {
    return;
  }

  const isCorrect = note === state.target.note;
  state.isLocked = true;
  state.selectedAnswer = note;
  state.feedback = {
    tone: isCorrect ? "success" : "error",
    text: isCorrect ? "Correct!" : `Wrong, the answer was ${state.target.note}.`
  };

  if (isCorrect) {
    state.score.correct += 1;
    state.score.streak += 1;
    state.score.bestStreak = Math.max(state.score.bestStreak, state.score.streak);
  } else {
    state.score.incorrect += 1;
    state.score.streak = 0;
  }

  clearPendingAdvance();
  state.pendingAdvance = window.setTimeout(() => {
    chooseNextTarget();
  }, AUTO_ADVANCE_MS);

  render();
}

function updateOption(key, value) {
  clearPendingAdvance();
  state.options[key] = value;
  state.isLocked = false;
  state.selectedAnswer = null;
  state.target = pickRandomPosition(state.target);
  state.feedback = state.target
    ? {
        tone: "idle",
        text: "Choose the note name that matches the glowing position."
      }
    : {
        tone: "warning",
        text: "Enable at least one string to keep practicing."
      };
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

  state.isLocked = false;
  state.selectedAnswer = null;
  state.target = pickRandomPosition(state.target);
  state.feedback = state.target
    ? {
        tone: "idle",
        text: "Choose the note name that matches the glowing position."
      }
    : {
        tone: "warning",
        text: "Enable at least one string to keep practicing."
      };
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
  const stringHeader = state.options.showDebug
    ? `
      <div class="fret-row fret-row-header ${state.options.showFrets ? "" : "fret-row-no-label"}">
        ${state.options.showFrets ? '<div class="string-detail-spacer" aria-hidden="true"></div>' : ""}
        <div class="fret-row-board fret-row-board-header">
          ${STRINGS.map(
            (stringData) => `
              <div class="string-header">
                <span>String ${stringData.stringNumber}</span>
                <strong>${stringData.display}</strong>
              </div>
            `
          ).join("")}
        </div>
      </div>
    `
    : "";

  const rows = FRET_NUMBERS.map((fret) => {
    const fretLabel = state.options.showFrets
      ? `<div class="fret-number ${fret === 0 ? "open-fret" : ""}">Fret ${fret}</div>`
      : "";
    const cells = STRINGS.map((stringData) => {
      const note = getPositionNote(stringData.stringNumber, fret);
      const isTarget =
        state.target &&
        state.target.stringNumber === stringData.stringNumber &&
        state.target.fret === fret;

      return `
        <div class="fret-cell ${isTarget ? "is-target" : ""}">
          <span class="string-line string-${stringData.stringNumber}" aria-hidden="true"></span>
          ${state.options.showLabels ? `<span class="cell-note-label">${note}</span>` : ""}
          ${isTarget ? '<span class="target-marker" aria-hidden="true"></span>' : ""}
        </div>
      `;
    }).join("");

    return `
      <div class="fret-row ${fret === 0 ? "fret-row-open" : ""} ${state.options.showFrets ? "" : "fret-row-no-label"}">
        ${fretLabel}
        <div class="fret-row-board">
          ${renderInlay(fret)}
          ${cells}
        </div>
      </div>
    `;
  }).join("");

  return stringHeader + rows;
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
            A full vertical fretboard highlights one position at a time. Name the note,
            keep your streak alive, and build fretboard fluency.
          </p>
        </div>

        <div class="hero-actions">
          <button class="secondary-button" type="button" data-action="new-note">New Note</button>
          <button class="ghost-button" type="button" data-action="reset-score">Reset Score</button>
        </div>
      </section>

      <section class="status-grid" aria-label="Scoreboard">
        ${renderStatCard("Correct", state.score.correct)}
        ${renderStatCard("Incorrect", state.score.incorrect)}
        ${renderStatCard("Streak", state.score.streak)}
        ${renderStatCard("Best Streak", state.score.bestStreak)}
        ${renderStatCard("Accuracy", `${accuracy}%`)}
        ${renderStatCard("Playable Spots", playablePositions.length)}
      </section>

      <section class="game-layout">
        <section class="panel">
          <div class="panel-heading">
            <div>
              <h2>Vertical Fretboard</h2>
              <p>Strings 6 to 1 follow standard tuning: E, A, D, G, B, E.</p>
            </div>
            <p class="board-caption">Frets 0 through 24</p>
          </div>

          <div class="fretboard-wrap">
            <div
              class="fretboard"
              role="img"
              aria-label="Guitar fretboard with six strings and twenty four frets"
            >
              ${renderFretboard()}
            </div>
          </div>
        </section>

        <div class="side-column">
          <section class="panel" aria-live="polite">
            <h2>How To Play</h2>
            <p class="prompt-copy">
              Look at the glowing target on the fretboard, then tap the matching note name.
            </p>
            <ol class="instruction-list">
              <li>Study the highlighted string and fret position.</li>
              <li>Choose one of the 12 note buttons.</li>
              <li>Get instant feedback and move to the next target.</li>
            </ol>
            <p class="feedback-banner tone-${state.feedback.tone}">${state.feedback.text}</p>
            ${
              state.options.showDebug && state.target
                ? `<p class="debug-pill">String ${state.target.stringNumber} • Fret ${state.target.fret}</p>`
                : ""
            }
          </section>

          <section class="panel">
            <h2>Answer Buttons</h2>
            <div class="answers-grid">
              ${NOTE_NAMES.map((note) => {
                const isSelected = state.selectedAnswer === note;
                const revealCorrect =
                  Boolean(state.target) &&
                  state.feedback.tone !== "idle" &&
                  state.target.note === note;

                return `
                  <button
                    class="answer-button ${isSelected ? "is-selected" : ""} ${revealCorrect ? "is-correct-answer" : ""}"
                    type="button"
                    data-note="${note}"
                    ${!state.target || state.isLocked ? "disabled" : ""}
                  >
                    ${note}
                  </button>
                `;
              }).join("")}
            </div>
          </section>

          <section class="panel">
            <h2>Practice Options</h2>
            <div class="toggle-list">
              <label class="toggle-row">
                <input type="checkbox" data-option="showDebug" ${state.options.showDebug ? "checked" : ""} />
                <span>Show string and fret details</span>
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
        </div>
      </section>
    </main>
  `;

  app.querySelector('[data-action="new-note"]').addEventListener("click", () => {
    clearPendingAdvance();
    chooseNextTarget();
  });

  app.querySelector('[data-action="reset-score"]').addEventListener("click", () => {
    resetScore();
  });

  app.querySelectorAll("[data-note]").forEach((button) => {
    button.addEventListener("click", () => {
      handleAnswer(button.dataset.note);
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

state.target = pickRandomPosition();
render();
