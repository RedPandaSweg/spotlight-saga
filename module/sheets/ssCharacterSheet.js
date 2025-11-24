import { SSRoller } from "../rolls.js";
import * as SpellScrabble from "../spell-scrabble.js";
import { openSkillOptionsDialog } from "../apps/skill-options-dialog.js";

const api = foundry.applications.api;
const sheets = foundry.applications.sheets;

export default class ssCharacterSheet extends api.HandlebarsApplicationMixin(sheets.ActorSheetV2) {
  
  sheetContext = {};
  _activeTab = "main";
  _allocationMode = false;

  static DEFAULT_OPTIONS = {
    tag: "form",
    classes: ["spotlightsaga", "sheet", "characterSheet"],
    actions: {
      editImage: this.#onEditImage,
      useBonus: this.#onUseBonus,
      skillRoll: this.#onSkillRoll,
      skillOptions: this.#onSkillOptions,
      startSkillAlloc: this.#onStartSkillAlloc,
      applySkillAlloc: this.#onApplySkillAlloc,
      // Scrabble / spell-builder actions:
      draw: SpellScrabble.onDraw,
      clear: SpellScrabble.onClear,
      suggest: SpellScrabble.onSuggest,
      "to-chat": SpellScrabble.onToChat,
      "save-spell": SpellScrabble.onSaveSpell

    },
    position: {
        width: 620
    },
    window: {
    resizable: false,
    minimizable: true
    },
    form: {
      submitOnChange: true,
      closeOnSubmit: false
    }
  };

  static PARTS = {
    template:  { template: "systems/spotlight-saga/templates/sheets/character/playerSheet.hbs" }
  };

  get title() {
    return this.actor.name;
  }

  async _prepareContext(options){
    const baseData = await super._prepareContext(options);
    const context = {
      owner: baseData.document.isOwner,
      editable: baseData.editable,
      actor: baseData.document,
      system: baseData.document.system,
      items: baseData.document.items,
      config: CONFIG.spotlightsaga
    };
    return context;
  }

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);
    this.element[0].style.height = "auto";

    const tabs = new foundry.applications.ux.Tabs({
      navSelector: ".tabs",
      contentSelector: ".content",
      initial: this._activeTab ?? "main",
      callback: (event, tabs, active) => {
        // "active" is the data-tab of the clicked tab
        this._activeTab = active;
      }
    });

    tabs.bind(this.element);
  }

  static async #onUseBonus(event, target) {
    const actor = this.document;

    // Don’t reuse if already used
    if (actor.system.bonusUsed) return;

    // Example: post a message
    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<strong>${actor.name}</strong> uses their <strong>+3 Bonus</strong>!`
    });

    // Mark used
    await actor.update({ "system.bonusUsed": true });
  }

  static async #onEditImage(event, target) {
    const field = target.dataset.field || "img";
    const current = foundry.utils.getProperty(this.document, field);

    const fp = new foundry.applications.apps.FilePicker({
      type: "image",
      current,
      callback: path => {
        this.document.update({ [field]: path });
      },
      top: this.position.top + 40,
      left: this.position.left + 10
    });

    fp.render(true);
  }

  static async #onSkillRoll(event, target) {
  const actor = this.document;
  const skillKey = target.dataset.skill;
  const mode = target.dataset.mode; // "normal" or "drama"

  const drama = mode === "drama";

  await SSRoller.rollSkill(actor, skillKey, { drama });
}

static async #onSkillOptions(event, target) {
  const actor = this.document;
  const skillKey = target.dataset.skill;
  openSkillOptionsDialog(actor, skillKey);
}

/* ------------------------- */
/* ----General Stuff----- */
/* ------------------------- */

async _onChangeForm(event, formData) {
  // While in allocation mode, do NOT push every change to the Actor
  if (this._allocationMode) {
    this.recalculateSkillPoints();
    return;
  }

  // Normal behavior otherwise
  return super._onChangeForm(event, formData);
}

async rollWithDiceSoNice(formula, rollData = {}) {
    const roll = await (new Roll(formula, rollData)).evaluate();

    // Show dice in chat
    const message = await roll.toMessage({});

    // If Dice So Nice is not active, return immediately
    if (!game.dice3d) return roll;

    // Wait for DSN animation to finish
    await new Promise(resolve => {
        Hooks.once("diceSoNiceRollComplete", resolve);
    });

    return roll;
}

/* ------------------------- */
/* ----Skill Allocation----- */
/* ------------------------- */

static async #onStartSkillAlloc(event, target) {
  const confirmed = await foundry.applications.api.DialogV2.confirm({
    window: { title: "Reset Skills?" },
    content: "<p>Are you sure? All skills will be reset to 0.</p>",
    modal: true
  });
  if (!confirmed) return;

  this._allocationMode = true;
  this.element.classList.add("ss-allocation-mode");

  // Reset skill inputs in DOM to 0
  for (const el of this.element.querySelectorAll(".ss-skill-input")) {
    el.value = "0";
  }
}

static async #onApplySkillAlloc(event, target) {
  const updates = {};

  for (const el of this.element.querySelectorAll(".ss-skill-input")) {
    const key = el.dataset.skill;
    if (!key) continue;
    const value = Number(el.value) || 0;
    updates[`system.skills.${key}`] = value;
  }

  if (Object.keys(updates).length) {
    await this.document.update(updates);
  }

  this._allocationMode = false;
  this.element.classList.remove("ss-allocation-mode");

  this.render(false);
}

recalculateSkillPoints() {
  if (!this._allocationMode) return;

  const inputs = this.element.querySelectorAll(".ss-skill-input");

  let total = 0;
  let negOnes = 0;

  for (const el of inputs) {
    const v = Number(el.value) || 0;
    if (v > 0) total += v;
    if (v === -1) negOnes++;
  }

  const START_POINTS = 16;
  const remaining = START_POINTS - total;

  const pointsEl = this.element.querySelector("[data-points-remaining]");
  const negEl = this.element.querySelector("[data-neg-count]");

  if (pointsEl) pointsEl.textContent = remaining;
  if (negEl) negEl.textContent = negOnes;
}

}