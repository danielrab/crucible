/**
 * Crucible Game System
 * Author: Atropos of Foundry Virtual Tabletop
 * Software License: MIT
 * Repository: https://github.com/foundryvtt/crucible
 */

// Configuration
import {SYSTEM} from "./module/config/system.js";
import CrucibleTalentNode from "./module/config/talent-tree.mjs";
import {statusEffects} from "./module/config/statuses.mjs";

// Data Models
import ActionData from "./module/data/action.mjs";
import AdversaryData from "./module/data/adversary.mjs";
import AncestryData from "./module/data/ancestry.mjs";
import ArchetypeData from "./module/data/archetype.mjs";
import ArmorData from "./module/data/armor.mjs";
import BackgroundData from "./module/data/background.mjs";
import TalentData from "./module/data/talent.mjs";
import WeaponData from "./module/data/weapon.mjs";
import CrucibleSpell from "./module/data/spell.mjs";
import CrucibleGesture from "./module/data/gesture.mjs";
import CrucibleInflection from "./module/data/inflection.mjs";
import CrucibleRune from "./module/data/rune.mjs";

// Documents
import CrucibleActor from "./module/documents/actor.mjs";
import CrucibleChatMessage from "./module/documents/chat-message.mjs";
import CrucibleCombat from "./module/documents/combat.mjs";
import CrucibleCombatant from "./module/documents/combatant.mjs";
import CrucibleItem from "./module/documents/item.mjs";

// Sheets
import HeroSheet from "./module/sheets/hero.js";
import AdversarySheet from "./module/sheets/adversary.mjs";
import AncestrySheet from "./module/sheets/ancestry.mjs";
import ArchetypeSheet from "./module/sheets/archetype.mjs";
import ArmorSheet from "./module/sheets/armor.mjs";
import BackgroundSheet from "./module/sheets/background.js";
import TalentSheet from "./module/sheets/talent.mjs";
import WeaponSheet from "./module/sheets/weapon.mjs";

// Dice
import StandardCheck from "./module/dice/standard-check.js";
import AttackRoll from "./module/dice/attack-roll.mjs";

// Canvas
import CrucibleTalentTree from "./module/canvas/talent-tree.mjs";

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
  CONFIG.SYSTEM = SYSTEM;

  // Expose the system API
  game.system.api = {
    canvas: {
      CrucibleTalentTree
    },
    dice: {
      AttackRoll,
      StandardCheck
    },
    models: {
      ActionData,
      AncestryData,
      ArmorData,
      BackgroundData,
      CrucibleSpell,
      CrucibleGesture,
      CrucibleInflection,
      CrucibleRune,
      TalentData,
      WeaponData
    },
    documents: {
      CrucibleActor,
      CrucibleChatMessage,
      CrucibleCombat,
      CrucibleCombatant,
      CrucibleItem,
    },
    methods: {
      buildJournalCompendium,
      packageItemCompendium,
      packageCompendiumPacks,
      standardizeItemIds,
      syncTalents
    },
    talents: {
      CrucibleTalentNode
    }
  }

  // Actor document configuration
  CONFIG.Actor.documentClass = CrucibleActor;
  CONFIG.Actor.dataModels = {
    adversary: AdversaryData
  };
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet(SYSTEM.id, HeroSheet, {types: ["hero", "npc"], makeDefault: true});
  Actors.registerSheet(SYSTEM.id, AdversarySheet, {types: ["adversary"], makeDefault: true});

  // Item document configuration
  CONFIG.Item.documentClass = CrucibleItem;
  CONFIG.Item.dataModels = {
    ancestry: AncestryData,
    archetype: ArchetypeData,
    armor: ArmorData,
    background: BackgroundData,
    talent: TalentData,
    weapon: WeaponData
  };
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet(SYSTEM.id, AncestrySheet, {types: ["ancestry"], makeDefault: true});
  Items.registerSheet(SYSTEM.id, ArchetypeSheet, {types: ["archetype"], makeDefault: true});
  Items.registerSheet(SYSTEM.id, ArmorSheet, {types: ["armor"], makeDefault: true});
  Items.registerSheet(SYSTEM.id, BackgroundSheet, {types: ["background"], makeDefault: true});
  Items.registerSheet(SYSTEM.id, TalentSheet, {types: ["talent"], makeDefault: true});
  Items.registerSheet(SYSTEM.id, WeaponSheet, {types: ["weapon"], makeDefault: true});

  // Other Document Configuration
  CONFIG.ChatMessage.documentClass = CrucibleChatMessage;
  CONFIG.Combat.documentClass = CrucibleCombat;
  CONFIG.Combatant.documentClass = CrucibleCombatant;

  // Dice system configuration
  CONFIG.Dice.rolls.push(StandardCheck, AttackRoll);

  // Status Effects
  CONFIG.statusEffects = statusEffects;
  CONFIG.specialStatusEffects.BLIND = "blinded";

  // Activate socket handler
  game.socket.on(`system.${SYSTEM.id}`, handleSocketEvent);
});

/* -------------------------------------------- */

Hooks.once("i18nInit", function() {

  // Apply localizations
  const toLocalize = [
    "ABILITIES", "ARMOR.CATEGORIES", "ARMOR.PROPERTIES", "DAMAGE_CATEGORIES", "DEFENSES",
    "RESOURCES", "SKILL_CATEGORIES", "SKILL_RANKS",
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
  }

  // Pre-localize translations
  localizeSkillConfig(SYSTEM); // TODO: Make this cleaner

  // Pre-localize configuration objects
  preLocalizeConfig();

  // Initialize Spellcraft Components
  CrucibleGesture.initialize();
  CrucibleInflection.initialize();
  CrucibleRune.initialize();

  // Preload Handlebars Templates
  loadTemplates([
    `systems/${SYSTEM.id}/templates/dice/partials/action-use-header.html`,
    `systems/${SYSTEM.id}/templates/dice/partials/spell-cast-header.html`,
  ]);
});

/* -------------------------------------------- */
/*  Ready Hooks                                 */
/* -------------------------------------------- */

Hooks.once("setup", function() {

  // Initialize Talent tree data
  CrucibleTalentNode.initialize();

  // Create Talent Tree canvas
  game.system.tree = new CrucibleTalentTree();

  // Activate window listeners
  $("#chat-log").on("mouseenter mouseleave", ".crucible.action .target-link", chat.onChatTargetLinkHover);
});

/* -------------------------------------------- */
/*  Rendering Hooks                             */
/* -------------------------------------------- */

Hooks.on("getChatLogEntryContext", chat.addChatMessageContextOptions);
Hooks.on("renderChatMessage", chat.renderChatMessage)
Hooks.on("renderJournalSheet", renderJournalRules);

/* -------------------------------------------- */
/*  Convenience Functions                       */
/* -------------------------------------------- */

async function packageCompendiumPacks() {
  const toPack = ["ancestry", "armor", "background", "talent", "weapon"];
  for ( const type of toPack ) {
    await packageItemCompendium(type);
  }
}

/* -------------------------------------------- */

/**
 * Package all Items of a certain type into their appropriate Compendium pack
 * @param itemType
 * @returns {Promise<void>}
 */
async function packageItemCompendium(itemType) {
  const pack = game.packs.get(`crucible.${itemType}`);
  const items = game.items.filter(i => i.type === itemType);
  const toCreate = items.map(i => i.toCompendium(pack, {keepId: true}));
  await pack.configure({locked: false});
  await pack.getDocuments();
  await Item.deleteDocuments([], {pack: pack.collection, deleteAll: true});
  await Item.createDocuments(toCreate, {pack: pack.collection, keepId: true});
  await pack.configure({locked: true});
}

/* -------------------------------------------- */


function preLocalizeConfig() {
  const localizeConfigObject = (obj, keys) => {
    for ( let o of Object.values(obj) ) {
      for ( let k of keys ) {
        o[k] = game.i18n.localize(o[k]);
      }
    }
  }

  // Action Tags
  localizeConfigObject(SYSTEM.DAMAGE_TYPES, ["label", "abbreviation"]);
  localizeConfigObject(SYSTEM.ACTION.TAGS, ["label", "tooltip"]);
}

/* -------------------------------------------- */

/**
 * Standardize all World item IDs
 * @returns {Promise<void>}
 */
async function standardizeItemIds() {
  const creations = [];
  const deletions = [];
  for ( const item of game.items ) {
    const standardId = item.name.slugify({replacement: "", strict: true}).slice(0, 16).padEnd(16, "0");
    if ( item.id === standardId ) continue;
    if ( game.items.has(standardId) ) throw new Error(`Standardized system ID ${standardId} is already in use`);
    deletions.push(item.id);
    creations.push(Object.assign(item.toObject(), {_id: standardId}));
  }
  await Item.deleteDocuments(deletions);
  await Item.createDocuments(creations, {keepId: true});
}

// TODO for development
Hooks.on("preCreateItem", (item, data, options, user) => {
  if ( !item.parent && !item.id ) {
    const standardId = item.name.slugify({replacement: "", strict: true}).slice(0, 16).padEnd(16, "0");
    item.updateSource({_id: standardId});
    options.keepId = true;
  }
});


/* -------------------------------------------- */

async function syncTalents() {
  for ( const actor of game.actors ) {
    if ( actor.type !== "hero" ) continue;
    await actor.syncTalents();
    console.log(`Crucible | Synced talents with latest data for Actor "${actor.name}"`);
  }
}
