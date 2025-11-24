import { spotlightsaga } from "../config.js";
import { SSRoller } from "../rolls.js";

export function openSkillOptionsDialog(actor, skillKey) {
  const skillObj = spotlightsaga.skills.find(s => s.key === skillKey);
  const skillLabel = skillObj?.label ?? (skillKey.charAt(0).toUpperCase() + skillKey.slice(1));

  const roleBonusFlag = foundry.utils.getProperty(actor, "system.roleBonus");
  const roleBonusValue = roleBonusFlag ? 3 : 1;

  const content = `
    <div class="ss-dialog ss-skill-options">

      <div class="ss-dialog-left">
        <div class="ss-dialog-section ss-pill">
          <label class="ss-checkbox">
            <input type="checkbox" name="roleCue" checked>
            <span>Cue +${roleBonusValue} Role Bonus</span>
          </label>
        </div>

        <div class="ss-dialog-section ss-pill">
          <label class="ss-checkbox">
            <input type="checkbox" name="spotlight">
            <span>Cue an Edge (+2)</span>
          </label>
        </div>

        <div class="ss-dialog-section ss-pill">
          <label class="ss-checkbox">
            <input type="checkbox" name="dramadie">
            <span>Use Drama Die</span>
          </label>
        </div>
      </div>

      <div class="ss-dialog-right">
        <label>Direct Modifier</label>
        <div class="ss-number-control">
          <button type="button" data-action="dec" class="ss-num-btn">−</button>
          <input type="number" name="flatBonus" value="0" step="1" class="ss-num-input">
          <button type="button" data-action="inc" class="ss-num-btn">＋</button>
        </div>
      </div>

    </div>
  `;

  const dialog = new foundry.applications.api.DialogV2({
    classes: ["ss-themed-dialog"],
    window: {
      title: `Skill Options: ${skillLabel}`,
      resizable: false
    },
    content,
    position: { width: 350, height: "auto" },

    buttons: [
      {
        type: "submit",
        action: "roll",
        label: "Action!",
        icon: "fa-solid fa-dice"
      },
      {
        type: "button",
        action: "cancel",
        label: "Cancel"
      }
    ],

    submit: async (event, formData) => {
      const useRoleCue   = formData.roleCue === true;
      const useSpotlight = formData.spotlight === true;
      const useDramaDie  = formData.dramadie === true;
      const flatBonus    = Number(formData.flatBonus ?? 0);

      let totalBonus = flatBonus;
      if (useRoleCue) totalBonus += roleBonusValue;
      if (useSpotlight) totalBonus += 2;

      await SSRoller.rollSkill(actor, skillKey, {
        drama: useDramaDie, 
        bonus: totalBonus
      });
    },

    render: (html) => {
      const input = html.querySelector('input[name="flatBonus"]');
      html.querySelector('[data-action="dec"]')?.addEventListener("click", () => {
        input.value = Number(input.value || 0) - 1;
      });
      html.querySelector('[data-action="inc"]')?.addEventListener("click", () => {
        input.value = Number(input.value || 0) + 1;
      });
    }
  });

  dialog.render(true);
}
