/**
 * Crucible (WIP) Game System
 * Author: Atropos
 * Software License: GNU GPLv3
 * Repository: https://gitlab.com/foundrynet/crucible
 */

// Import Modules
import {SYSTEM} from "./module/config/system.js";

// Documents
import CrucibleActor from "./module/documents/actor.mjs";
import CrucibleItem from "./module/documents/item.mjs";
import CrucibleCombat from "./module/documents/combat.mjs";
import CrucibleCombatant from "./module/documents/combatant.mjs";
import ActionData from "./module/data/action.mjs";
import {TalentData, TalentRankData, TalentPassiveData} from "./module/data/talent.mjs";

// Sheets
import HeroSheet from "./module/sheets/hero.js";
import AncestrySheet from "./module/sheets/ancestry.js";
import ArmorSheet from "./module/sheets/armor.js";
import BackgroundSheet from "./module/sheets/background.js";
import TalentSheet from "./module/sheets/talent.mjs";
import WeaponSheet from "./module/sheets/weapon.js";

// Apps
import StandardCheck from "./module/dice/standard-check.js";
import AttackRoll from "./module/dice/attack-roll.mjs";

// Helpers
import {handleSocketEvent} from "./module/socket.js";
import * as chat from "./module/chat.js";
import {localizeSkillConfig} from "./module/config/skills.js";
import {buildJournalCompendium, renderJournalRules} from "./module/documents/journal.mjs";


/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */

Hooks.once("init", async function() {
  console.log(`Initializing Crucible Game System`);

  // System configuration values and module structure
  CONFIG.SYSTEM = SYSTEM;
  game.system.dice = { AttackRoll, StandardCheck };
  game.system.journal = { buildJournalCompendium }
  game.system.api = {
    ActionData,
    AttackRoll,
    CrucibleActor,
    CrucibleItem,
    CrucibleCombat,
    CrucibleCombatant,
    StandardCheck,
    TalentData,
    TalentRankData,
    TalentPassiveData
  }

  // Actor document configuration
  CONFIG.Actor.documentClass = CrucibleActor;
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet(SYSTEM.id, HeroSheet, {types: ["hero", "npc"], makeDefault: true});

  // Item document configuration
  CONFIG.Item.documentClass = CrucibleItem;
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet(SYSTEM.id, AncestrySheet, {types: ["ancestry"], makeDefault: true});
  Items.registerSheet(SYSTEM.id, ArmorSheet, {types: ["armor"], makeDefault: true});
  Items.registerSheet(SYSTEM.id, BackgroundSheet, {types: ["background"], makeDefault: true});
  Items.registerSheet(SYSTEM.id, TalentSheet, {types: ["talent"], makeDefault: true});
  Items.registerSheet(SYSTEM.id, WeaponSheet, {types: ["weapon"], makeDefault: true});

  // Combat Configuration
  CONFIG.Combat.documentClass = CrucibleCombat;
  CONFIG.Combatant.documentClass = CrucibleCombatant;

  // Dice system configuration
  CONFIG.Dice.rolls.push(StandardCheck, AttackRoll);

  // Activate socket handler
  game.socket.on(`system.${SYSTEM.id}`, handleSocketEvent);
});


/* -------------------------------------------- */
/*  Ready Hooks                                 */
/* -------------------------------------------- */

Hooks.once("ready", function() {

  // Apply localizations
  const toLocalize = [
    "ABILITIES", "ARMOR.CATEGORIES", "ARMOR.PROPERTIES", "ATTRIBUTE_CATEGORIES", "DAMAGE_CATEGORIES",
    "DAMAGE_TYPES", "RESOURCES", "SAVE_DEFENSES", "SKILL_CATEGORIES", "SKILL_RANKS",
    "QUALITY_TIERS", "ENCHANTMENT_TIERS",
    "WEAPON.CATEGORIES", "WEAPON.PROPERTIES"
  ];
  for ( let c of toLocalize ) {
    const conf = foundry.utils.getProperty(SYSTEM, c);
    for ( let [k, v] of Object.entries(conf) ) {
      if ( v.label ) v.label = game.i18n.localize(v.label);
      if ( v.abbreviation) v.abbreviation = game.i18n.localize(v.abbreviation);
      if ( typeof v === "string" ) conf[k] = game.i18n.localize(v);
    }
    Object.freeze(c);
  }

  // TODO: Make this cleaner
  localizeSkillConfig(SYSTEM.SKILLS, SYSTEM.id);

  // Preload Handlebars Templates
  loadTemplates([
    // Dice Partials
    `systems/${SYSTEM.id}/templates/dice/partials/action-use-header.html`,
  ]);

  // Activate window listeners
  $("#chat-log").on("mouseenter mouseleave", ".crucible.action .target-link", chat.onChatTargetLinkHover);
});


/* -------------------------------------------- */
/*  Rendering Hooks                             */
/* -------------------------------------------- */

Hooks.on("getChatLogEntryContext", chat.addChatMessageContextOptions);
Hooks.on("renderChatMessage", chat.renderChatMessage)
Hooks.on("renderJournalSheet", renderJournalRules);
