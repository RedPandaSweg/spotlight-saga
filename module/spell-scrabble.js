// module/spell-scrabble.js
import * as Scrabble from "./scrabble.js";

/**
 * Handle drawing tiles for the spell builder.
 * `this` is expected to be the sheet instance.
 */
export async function onDraw(event, target) {
  const actor = this.document;
  const container = target?.closest?.(".ss-spell-builder") || this.element?.[0];

  try {
    // Get selected skill
    const select = container.querySelector(".ss-skill-select");
    const skillKey = select?.value;

    if (!skillKey) {
      ui.notifications?.warn?.("Please select a skill first.");
      return;
    }

    // Get actor skill value
    const rawValue = foundry.utils.getProperty(actor, `system.skills.${skillKey}`);
    const skillValue = Number(rawValue) || 0;

    if (skillValue <= 0) {
      ui.notifications?.warn?.("The selected skill has no positive value.");
      return;
    }

    // Roll Xd6 where X = skill value
    const roll = await this.rollWithDiceSoNice(`${skillValue}d6`);

    // Compute tile count
    const drawCount = skillValue + roll.total;
    console.log(`Scrabble Draw → skill=${skillValue}, roll=${roll.total}, drawCount=${drawCount}`);

    // Draw tiles
    const { drawn } = Scrabble.drawAndFind(drawCount, "de");

    // Render tiles into rack
    renderTilesInto(container, drawn);

    // Clear previous suggestions
    const suggestions = container.querySelector(".ss-suggestion-list");
    if (suggestions) suggestions.innerHTML = "";

    // Update composed word display
    updateComposedDisplay(container);

  } catch (err) {
    console.error("SpellScrabble.onDraw failed", err);
    ui.notifications?.warn?.("Failed to perform scrabble draw.");
  }
}

/**
 * Clear rack, suggestions, composed word.
 */
export async function onClear(event, target) {
  const container = target?.closest?.(".ss-spell-builder") || this.element?.[0];
  const rack = container.querySelector(".ss-tile-rack");
  const suggestions = container.querySelector(".ss-suggestion-list");
  const composed = container.querySelector(".ss-composed-word");
  const score = container.querySelector(".ss-composed-score");

  if (rack) rack.innerHTML = "";
  if (suggestions) suggestions.innerHTML = "";
  if (composed) composed.textContent = "";
  if (score) score.textContent = "";
}

/**
 * Find suggestions for DE and EN and render into their lists.
 */
export async function onSuggest(event, target) {
  const container = target?.closest?.(".ss-spell-builder") || this.element?.[0];
  const rack = container.querySelector(".ss-tile-rack");
  if (!rack) return ui.notifications?.warn?.("Spell builder not present.");

  const tiles = Array.from(rack.querySelectorAll(".ss-tile")).map(el => ({
    letter: el.dataset.letter,
    isBlank: el.dataset.letter === "_"
  }));

  // German
  const wordsDE = Scrabble.findPlayableWords(tiles, "de", {
    minLength: 2,
    maxResults: 30,
    sortBy: "score"
  });
  const suggestionsDE = container.querySelector(".ss-suggestion-listDE");
  if (suggestionsDE) {
    suggestionsDE.innerHTML = wordsDE
      .map(w => `<li>${w.word} — ${w.score}</li>`)
      .join("");
  }

  // English
  const wordsEN = Scrabble.findPlayableWords(tiles, "en", {
    minLength: 2,
    maxResults: 30,
    sortBy: "score"
  });
  const suggestionsEN = container.querySelector(".ss-suggestion-listEN");
  if (suggestionsEN) {
    suggestionsEN.innerHTML = wordsEN
      .map(w => `<li>${w.word} — ${w.score}</li>`)
      .join("");
  }
}

/**
 * Send the composed spell to chat.
 */
export async function onToChat(event, target) {
  const actor = this.document;
  const container = target?.closest?.(".ss-spell-builder") || this.element?.[0];

  const spellName = container.querySelector(".ss-spell-name")?.value || "Untitled Spell";
  const description = container.querySelector(".ss-spell-description")?.value || "";
  const composed = computeComposedWord(container) || "";
  const score = Scrabble.scoreWord(composed, "de");

  const escape = foundry.utils?.escapeHTML || (s => String(s));
  const html = `
    <div class="ss-spell-chat">
      <h3>${escape(spellName)}</h3>
      <div><strong>Spell Word:</strong> ${escape(composed)} <em>(${score} pts)</em></div>
      <div>${escape(description)}</div>
    </div>
  `;

  try {
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: html
    });
  } catch (err) {
    console.warn("Failed to create ChatMessage", err);
  }
}

/**
 * Save the current spell into a flag on the actor.
 */
export async function onSaveSpell(event, target) {
  const actor = this.document;
  const container = target?.closest?.(".ss-spell-builder") || this.element?.[0];

  const spellName = container.querySelector(".ss-spell-name")?.value || "Untitled Spell";
  const composed = computeComposedWord(container) || "";
  const description = container.querySelector(".ss-spell-description")?.value || "";

  const entry = {
    name: spellName,
    word: composed,
    description,
    score: Scrabble.scoreWord(composed, "de"),
    created: Date.now()
  };

  try {
    const existing =
      (actor.getFlag && (await actor.getFlag("spotlightsaga", "savedSpells"))) || [];
    await actor.setFlag("spotlightsaga", "savedSpells", [...existing, entry]);
    ui.notifications?.info?.("Spell saved.");
  } catch (err) {
    console.warn("Failed to save spell", err);
    ui.notifications?.warn?.("Failed to save spell");
  }
}

/* ---------- Internal helper functions ---------- */

function computeComposedWord(container) {
  const rack = container.querySelector(".ss-tile-rack");
  if (!rack) return "";

  const selected = Array.from(rack.querySelectorAll(".ss-tile.selected"))
    .map(el => ({ el, order: Number(el.dataset.order ?? Infinity) }))
    .sort((a, b) => a.order - b.order)
    .map(x => x.el.dataset.letter);

  return selected.join("");
}

function updateComposedDisplay(container) {
  const word = computeComposedWord(container);
  const composedEl = container.querySelector(".ss-composed-word");
  const scoreEl = container.querySelector(".ss-composed-score");
  if (composedEl) composedEl.textContent = word;
  if (scoreEl) {
    scoreEl.textContent = word ? ` — ${Scrabble.scoreWord(word, "de")} pts` : "";
  }
}

function renderTilesInto(container, tiles) {
  const rack = container.querySelector(".ss-tile-rack");
  if (!rack) return;

  rack.innerHTML = "";
  rack.dataset.nextOrder = "1";

  const tpl = document.getElementById("ss-tile-template");
  for (const t of tiles) {
    let btn;
    if (tpl && tpl.content) {
      const clone = tpl.content.firstElementChild.cloneNode(true);
      clone.dataset.letter = t.letter;
      clone.textContent = t.letter;
      delete clone.dataset.order;
      btn = clone;
    } else {
      btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ss-tile";
      btn.dataset.letter = t.letter;
      btn.textContent = t.letter;
    }
    rack.appendChild(btn);
  }

  // Delegated click handler for tile selection
  if (!rack.dataset.listenerBound) {
    rack.addEventListener("click", ev => {
      const btn = ev.target.closest(".ss-tile");
      if (!btn) return;

      const nowSelected = btn.classList.toggle("selected");
      if (nowSelected) {
        const next = Number(rack.dataset.nextOrder || 1);
        btn.dataset.order = String(next);
        rack.dataset.nextOrder = String(next + 1);
      } else {
        delete btn.dataset.order;
      }

      updateComposedDisplay(container);
    });

    rack.dataset.listenerBound = "1";
  }
}
