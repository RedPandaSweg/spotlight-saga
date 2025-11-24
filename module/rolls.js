// module/rolls.js

import { spotlightsaga } from "./config.js";

export class SSRoller {

  static #convertDrama(value) {
    switch (value) {
      case 1: return -2;
      case 2: return -1;
      case 3: return +1;
      case 4: return +2;
      default: return 0;
    }
  }

  /**
   * Roll a skill for an actor.
   * @param {Actor} actor   The actor document
   * @param {string} skillKey e.g. "arcana"
   * @param {Object} options
   * @param {boolean} options.drama  Whether to include drama die
   */
  static async rollSkill(actor, skillKey, { drama = false, bonus = 0 } = {}){
    const system = actor.system ?? {};
    const skillVal = Number(system.skills?.[skillKey]) || 0;

    const roll = await (new Roll("4dF")).evaluate({});
    const term = roll.terms[0];
    const fudgeResults = term.results.map(r => r.result);
    const normalTotal = fudgeResults.reduce((a, b) => a + b, 0);

    let dramaRoll = null;
    let dramaValue = 0;
    if (drama) {
      dramaRoll = Math.ceil(Math.random() * 4);
      dramaValue = this.#convertDrama(dramaRoll);
    }

    const total = normalTotal + dramaValue + skillVal + bonus;

    const formatSigned = (n) => (n >= 0 ? `+${n}` : `${n}`);

    const dFDisplay = fudgeResults
      .map(v => {
        if (v === -1) return '<i class="fa-sharp fa-solid fa-square-minus"></i>';
        if (v === 0)  return '<i class="fa-sharp fa-solid fa-square"></i>';
        return '<i class="fa-sharp fa-solid fa-square-plus"></i>';
      })
      .join(" ");

    let dramaDisplay = "";
    if (drama) {
      switch (dramaValue) {
        case -2:
          dramaDisplay = '<i class="fa-sharp fa-solid fa-square-minus"></i><i class="fa-sharp fa-solid fa-square-minus"></i>';
          break;
        case -1:
          dramaDisplay = '<i class="fa-sharp fa-solid fa-square-minus"></i>';
          break;
        case 1:
          dramaDisplay = '<i class="fa-sharp fa-solid fa-square-plus"></i>';
          break;
        case 2:
          dramaDisplay = '<i class="fa-sharp fa-solid fa-square-plus"></i><i class="fa-sharp fa-solid fa-square-plus"></i>';
          break;
        default:
          dramaDisplay = '<i class="fa-sharp fa-solid fa-square"></i>';
      }
    }

    const portrait = actor.img || (spotlightsaga?.DEFAULTS?.portraitFallback ?? "");

    // ✅ Use spotlightsaga.skills (not SKILLS)
    const skillsConfig = spotlightsaga?.skills ?? [];
    const skillObj = skillsConfig.find(s => s.key === skillKey) ?? {};

    // Prefer label from config, fall back to simple capitalization
    const skillLabel = skillObj.label ?? (skillKey.charAt(0).toUpperCase() + skillKey.slice(1));

    // Icon from config, fall back to a neutral icon if missing
    const skillIcon = skillObj.icon ?? "circle-question";

let html = `
  <div class="ss-roll-result ss-roll-card">
    <div class="ss-roll-title">${actor.name}</div>

    <div class="ss-roll-main">
      <div class="ss-roll-main-col ss-roll-main-left">
        <img class="ss-roll-portrait" src="${portrait}" alt="${actor.name}">
      </div>

      <div class="ss-roll-main-col ss-roll-main-right">
        <div class="ss-roll-rolls">
          <div class="ss-roll-action">
            <span class="ss-roll-skill-label">
              ${skillLabel} <i class="fa-solid fa-${skillIcon}"></i>
            </span>
          </div>

          <div class="ss-roll-row">
            <div>Rolls:</div>
            <div class="ss-d6-display">${dFDisplay}</div>
          </div>
          `;if (drama) {
            html += `
            <div class="ss-roll-row">
              <div>Drama Die:</div>
              <div class="ss-d6-display">${dramaDisplay}</div>
            </div>
          `;}
          html += `
        </div> <!-- .ss-roll-rolls -->
      </div> <!-- .ss-roll-main-right -->
    </div> <!-- .ss-roll-main -->

    <div class="ss-roll-bottom">
      <div class="ss-roll-breakdown">
        <span class="ss-pill">Skill ${formatSigned(skillVal)}</span>
        <span class="ss-pill">Roll ${formatSigned(normalTotal)}</span>
        `; if (drama) {
          html += `
                <span class="ss-pill">Drama ${formatSigned(dramaValue)}</span>
          `;}
          html += `
                  `; if (bonus !== 0) {
          html += `
                <span class="ss-pill">Bonus ${formatSigned(bonus)}</span>
          `;}
          html += `
      </div>
      <div class="ss-roll-final">
        <div class="ss-roll-total">${total}</div>
        <strong>Total</strong>
      </div>
    </div> <!-- .ss-roll-bottom -->
  </div> <!-- .ss-roll-result.ss-roll-card -->
  `;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: html
    });

    return {
      fudgeResults,
      normalTotal,
      dramaRoll,
      dramaValue,
      skillVal,
      total
    };
  }
}
