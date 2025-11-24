import { spotlightsaga } from "./module/config.js";
import ssActor from "./module/sheets/ssActor.js";
import ssCharacterSheet from "./module/sheets/ssCharacterSheet.js";
import "./module/spotlightDice.js";

Hooks.once("init", async () => {

    console.log("Spotlight Saga | Initalizing Spotlight Saga System");

    // Setting up the Global Configuration Object
    CONFIG.spotlightsaga = spotlightsaga;
    CONFIG.INIT = true;
    CONFIG.Actor.documentClass = ssActor;

    // Register custom Sheets and unregister the start Sheets
    // Items.unregisterSheet("core", ItemSheet);
    // Actors.unregisterSheet("core", ActorSheet);
    const DocumentSheetConfig = foundry.applications.apps.DocumentSheetConfig;
    DocumentSheetConfig.unregisterSheet(Actor, "core", foundry.appv1.sheets.ActorSheet);
    DocumentSheetConfig.registerSheet(Actor, "spotlightsaga", ssCharacterSheet, {makeDefault: true, label: "Spotlight Saga"});

    // Load all Partial-Handlebar Files
    preloadHandlebarsTemplates(); 
});

Hooks.once("ready", async () => {

    // Finished Initalization Phase and release lock
    CONFIG.INIT = false;

    // Only execute when run as Gamemaster
    if(!game.user.isGM) return;   
});

// When a new Actor is created, ensure sensible defaults for this system
Hooks.on("createActor", async (actor, options, userId) => {
    try {
        // Only apply to character actors in this system
        if (!actor || actor.type !== spotlightsaga.ACTOR_TYPES.CHARACTER) return;

        const updates = {};

        // Ensure skills exist and are set to 0 if not present
        if (spotlightsaga.SKILLS && Array.isArray(spotlightsaga.SKILLS)) {
            for (const s of spotlightsaga.SKILLS) {
                const key = s.key;
                const current = actor.system?.skills?.[key];
                if (current === undefined || current === null) {
                    updates[`system.skills.${key}`] = 0;
                }
            }
        }

        // Ensure first three plotArmor slots are true if not present
        for (let i = 0; i < 3; i++) {
            const cur = actor.system?.plotArmor?.[i];
            if (cur === undefined || cur === null) updates[`system.plotArmor.${i}`] = true;
        }

        // Ensure first three spotlights slots are true if not present
        for (let i = 0; i < 3; i++) {
            const cur = actor.system?.spotlights?.[i];
            if (cur === undefined || cur === null) updates[`system.spotlights.${i}`] = true;
        }

        // Apply updates if any
        if (Object.keys(updates).length > 0) await actor.update(updates, {diff: false});
    }
    catch (err) {
        console.error("Spotlight Saga | Error applying default actor data:", err);
    }
});

function preloadHandlebarsTemplates() {

    const templatePaths = [

        "systems/spotlight-saga/templates/partials/template.hbs",
        "systems/spotlight-saga/templates/partials/main.hbs",
        "systems/spotlight-saga/templates/partials/skills.hbs",
        "systems/spotlight-saga/templates/partials/spell.hbs",
        "systems/spotlight-saga/templates/partials/inventory.hbs",
        "systems/spotlight-saga/templates/partials/bio.hbs",
        "systems/spotlight-saga/templates/partials/notes.hbs"
    ];
    
    return foundry.applications.handlebars.loadTemplates(templatePaths);
};
