export {default as ACTIONS} from "./actions.mjs";
import {SKILLS} from "./skills.mjs";
import {ABILITIES, DAMAGE_TYPES, RESOURCES} from "./attributes.mjs";
import Enum from "./enum.mjs";

/**
 * The allowed target types which an Action may have.
 * @enum {{label: string}}
 */
export const TARGET_TYPES = Object.freeze({
  none: {
    label: "None",
    template: null
  },
  self: {
    label: "Self",
    template: null
  },
  single: {
    label: "Single",
    template: null
  },
  cone: {
    label: "Cone",
    template: {
      t: "cone",
      angle: 60,
      directionDelta: 15,
      anchor: "self",
      distanceOffset: 0
    }
  },
  fan: {
    label: "Fan",
    template: {
      t: "cone",
      angle: 210,
      directionDelta: 45,
      anchor: "self",
      distanceOffset: 0.5
    }
  },
  pulse: {
    label: "Pulse",
    template: {
      t: "rect",
      anchor: "self",
      distanceOffset: 0
    }
  },
  blast: {
    label: "Blast",
    template: {
      t: "circle",
      anchor: "vertex",
      distanceOffset: 0
    }
  },
  ray: {
    label: "Ray",
    template: {
      t: "ray",
      width: 1,
      directionDelta: 3,
      anchor: "self",
      distanceOffset: 0.5
    }
  },
  summon: {
    label: "Summon",
    template: {
      t: "rect",
      anchor: "vertex",
      distanceOffset: 0
    }
  },
  wall: {
    label: "Wall",
    template: {
      t: "ray",
      width: 1,
      anchor: "vertex",
      distanceOffset: 0
    }
  }
});

/**
 * The scope of creatures affected by an action.
 * @enum {number}
 */
export const TARGET_SCOPES = new Enum({
  NONE: {value: 0, label: "None"},
  SELF: {value: 1, label: "Self"},
  ALLIES: {value: 2, label: "Allies"},
  ENEMIES: {value: 3, label: "Enemies"},
  ALL: {value: 4, label: "All"}
});

/* -------------------------------------------- */

/**
 * @typedef {Object}    ActionTag
 * @property {string} tag
 * @property {string} label
 * @property {Function} [prepare]
 * @property {Function} [can]
 * @property {Function} [pre]
 * @property {Function} [roll]
 * @property {Function} [post]
 */

/**
 * A generalized helper which populates tags for mainhand, offhand, and twoHanded tags.
 */
function weaponAttack(type="mainhand") {
  return {
    prepare() {
      const w = this.actor.equipment.weapons[type === "offhand" ? "offhand" : "mainhand"];
      if ( !w ) return;
      this.cost.action += (w?.system.actionCost || 0);
      this.target.distance ??= w.system.range;
      Object.assign(this.usage, {weapon: w, hasDice: true, defenseType: "physical"});
      Object.assign(this.usage.bonuses, w.system.actionBonuses);
      Object.assign(this.usage.context, {type: "weapons", label: "Weapon Tags", icon: "fa-solid fa-swords"});
      this.usage.context.tags.add(w.name);
    },
    canUse() {
      if ( (type === "twoHanded") && !this.actor.equipment.weapons.twoHanded ) {
        throw new Error("You must have a two-handed weapon equipped")
      }
      const w = this.usage.weapon;
      if ( !w ) return false;
      if ( w.config.category.reload && !w.system.loaded && !this.tags.has("reload") ) {
        throw new Error("Your weapon requires reloading in order to attack")
      }
    },
    async roll(target, rolls) {
      const w = this.usage.weapon;
      this.usage.actorUpdates["system.status.hasAttacked"] = true;
      if ( w.config.category.ranged ) {
        this.usage.actorUpdates["system.status.rangedAttack"] = true;
        if ( w.config.category.reload ) {
          this.usage.actorUpdates.items ||= [];
          this.usage.actorUpdates.items.push({_id: w.id, "system.loaded": false});
        }
      }
      else this.usage.actorUpdates["system.status.meleeAttack"] = true;
      const n = this.target.multiple ?? 1;
      for ( let i=0; i<n; i++ ) {
        const r = await this.actor.weaponAttack(this, target);
        rolls.push(r);
      }
    }
  }
}

/* -------------------------------------------- */

/**
 * Categories of action tags which are supported by the system.
 * @type {Readonly<Object<string, {label: string}>>}
 */
export const TAG_CATEGORIES = Object.freeze({
  attack: {label: "ACTION.TAG_CATEGORIES.ATTACK"},
  requirements: {label: "ACTION.TAG_CATEGORIES.REQUIREMENTS"},
  context: {label: "ACTION.TAG_CATEGORIES.CONTEXT"},
  modifiers: {label: "ACTION.TAG_CATEGORIES.MODIFIERS"},
  defenses: {label: "ACTION.TAG_CATEGORIES.DEFENSES"},
  damage: {label: "ACTION.TAG_CATEGORIES.DAMAGE"},
  scaling: {label: "ACTION.TAG_CATEGORIES.SCALING"},
  resources: {label: "ACTION.TAG_CATEGORIES.RESOURCES"},
  skills: {label: "ACTION.TAG_CATEGORIES.SKILLS"},
  special: {label: "ACTION.TAG_CATEGORIES.SPECIAL"},
});

/* -------------------------------------------- */

/**
 * Define special logic for action tag types
 * @enum {ActionTag}
 */
export const TAGS = {

  /* -------------------------------------------- */
  /*  Required Equipment                          */
  /* -------------------------------------------- */

  // Requires Dual-Wield
  dualwield: {
    tag: "dualwield",
    label: "ACTION.TagDualWield",
    tooltip: "ACTION.TagDualWieldTooltip",
    category: "requirements",
    canUse() {
      return this.actor.equipment.weapons.dualWield;
    }
  },

  // Requires One-Handed weapon
  onehand: {
    tag: "onehand",
    label: "ACTION.TagOneHand",
    tooltip: "ACTION.TagOneHandTooltip",
    category: "requirements",
    canUse() {
      return !this.actor.equipment.weapons.twoHanded;
    }
  },

  // Requires Dexterity Weapon
  finesse: {
    tag: "finesse",
    label: "ACTION.TagFinesse",
    tooltip: "ACTION.TagFinesseTooltip",
    category: "requirements",
    canUse() {
      return this.actor.equipment.weapons.mainhand.config.category.scaling.includes("dexterity");
    }
  },

  // Requires Strength Weapon
  heavy: { // TODO re-id as "brute"
    tag: "heavy",
    label: "ACTION.TagBrute",
    tooltip: "ACTION.TagBruteTooltip",
    category: "requirements",
    canUse() {
      return this.actor.equipment.weapons.mainhand.config.category.scaling.includes("strength");
    }
  },

  // Requires a Melee Weapon
  melee: {
    tag: "melee",
    label: "ACTION.TagMelee",
    tooltip: "ACTION.TagMeleeTooltip",
    category: "requirements",
    canUse() {
      return this.actor.equipment.weapons.melee;
    }
  },

  // Requires a Ranged Weapon
  ranged: {
    tag: "ranged",
    label: "ACTION.TagRanged",
    tooltip: "ACTION.TagRangedTooltip",
    category: "requirements",
    canUse() {
      return this.actor.equipment.weapons.ranged;
    }
  },

  // Requires a Projectile Weapon
  projectile: {
    tag: "projectile",
    label: "ACTION.TagProjectile",
    tooltip: "ACTION.TagProjectileTooltip",
    category: "requirements",
    canUse() {
      const {mainhand: mh, offhand: oh} = this.actor.equipment.weapons;
      if ( this.tags.has("offhand") ) return oh.config.category.training === "projectile";
      else return mh.config.category.training === "projectile";
    }
  },

  // Requires a Mechanical Weapon
  mechanical: {
    tag: "mechanical",
    label: "ACTION.TagMechanical",
    tooltip: "ACTION.TagMechanicalTooltip",
    category: "requirements",
    canUse() {
      const {mainhand: mh, offhand: oh} = this.actor.equipment.weapons;
      if ( this.tags.has("offhand") ) return oh.config.category.training === "mechanical";
      else return mh.config.category.training === "mechanical";
    }
  },

  // Requires Shield
  shield: {
    tag: "shield",
    label: "ACTION.TagShield",
    tooltip: "ACTION.TagShieldTooltip",
    category: "requirements",
    canUse() {
      return this.actor.equipment.weapons.shield;
    }
  },

  // Requires Unarmed
  unarmed: {
    tag: "unarmed",
    label: "ACTION.TagUnarmed",
    tooltip: "ACTION.TagUnarmedTooltip",
    category: "requirements",
    canUse() {
      return this.actor.equipment.weapons.unarmed;
    }
  },

  // Requires Unarmored
  unarmored: {
    tag: "unarmored",
    label: "ACTION.TagUnarmored",
    tooltip: "ACTION.TagUnarmoredTooltip",
    category: "requirements",
    canUse() {
      return this.actor.equipment.unarmored;
    }
  },

  // Requires Free Hand
  freehand: {
    tag: "freehand",
    label: "ACTION.TagFreehand",
    tooltip: "ACTION.TagFreehandTooltip",
    category: "requirements",
    canUse() {
      const weapons = this.actor.equipment.weapons;
      if ( weapons.twoHanded && this.actor.talentIds.has("stronggrip000000") ) return true;
      return weapons.freehand;
    }
  },

  /* -------------------------------------------- */
  /*  Context Requirements                        */
  /* -------------------------------------------- */

  // Involves Movement
  movement: {
    tag: "movement",
    label: "ACTION.TagMovement",
    tooltip: "ACTION.TagMovementTooltip",
    category: "context",
    canUse() {
      if ( this.actor.statuses.has("restrained") ) throw new Error("You may not move while Restrained!");
    },
    prepare() {
      const a = this.actor;
      if ( a.system.status.hasMoved || !a.equipment.canFreeMove ) this.cost.action += 1;
      if ( a.statuses.has("slowed") ) this.cost.action += 1;
      this.usage.actorUpdates["system.status.hasMoved"] = true
    },
    async confirm() {
      if ( this.actor.statuses.has("prone") ) {
        await this.actor.toggleStatusEffect("prone", {active: false});
      }
    }
  },

  // Requires Reaction
  reaction: {
    tag: "reaction",
    label: "ACTION.TagReaction",
    tooltip: "ACTION.TagReactionTooltip",
    category: "context",
    displayOnSheet(combatant) {
      if ( !combatant ) return false;
      return this.actor !== game.combat.combatant?.actor;
    },
    canUse() {
      return this.actor !== game.combat?.combatant?.actor;
    },
    prepare() {
      const a = this.actor;
      const canFreeReact = a.talentIds.has("gladiator0000000") && !a.system.status.gladiator
        && (this.tags.has("mainhand") || this.tags.has("offhand"));
      if ( canFreeReact ) {
        this.cost.focus = -Infinity;
        this.usage.actorUpdates["system.status.gladiator"] = true;
      }
    }
  },

  // Non-Combat Actions
  noncombat: {
    tag: "noncombat",
    label: "ACTION.TagNonCombat",
    tooltip: "ACTION.TagNonCombatTooltip",
    category: "context",
    displayOnSheet(combatant) {
      return !combatant;
    }
  },

  // Requires a Flanked Opponent
  flanking: {
    tag: "flanking",
    label: "ACTION.TagFlanking",
    tooltip: "ACTION.TagFlankingTooltip",
    category: "context",
    async preActivate(targets) {
      for ( const target of targets ) {
        if ( !target.statuses.has("flanked") ) {
          throw new Error(`${this.name} requires a flanked target. Target "${target.name}" is not flanked.`);
        }
      }
    },
  },

  /* -------------------------------------------- */
  /*  Spellcasting Tags                           */
  /* -------------------------------------------- */

  spell: {
    tag: "spell",
    label: "ACTION.TagSpell",
    tooltip: "ACTION.TagSpellTooltip",
    category: "attack",
    prepare() {
      Object.assign(this.usage.context, {
        type: "spell",
        label: "Spell Tags",
        icon: "fa-solid fa-sparkles"
      });
      this.usage.context.tags.add(`Rune: ${this.rune.name}`);
      this.usage.context.tags.add(`Gesture: ${this.gesture.name}`);
      if ( this.inflection ) this.usage.context.tags.add(this.inflection.name);
      this.usage.actorFlags.lastSpell = this.id;
    },
    canUse() {
      if ( this.cost.hands > this.actor.equipment.weapons.spellHands ) {
        throw new Error(`You cannot cast a Spell using the ${this.gesture.name} gesture which requires `
          + `${this.cost.hands} free hands for spellcraft.`);
      }
    },
    async roll(target, rolls) {
      this.usage.actorUpdates["system.status.hasCast"] = true;
      const cast = await this.actor.castSpell(this, target);
      rolls.push(cast);
    }
  },

  summon: {
    tag: "summon",
    label: "ACTION.TagSummon",
    tooltip: "ACTION.TagSummonTooltip",
    category: "special",
    async confirm() {
      const {x, y} = this.template;

      // Import or reference the Actor to summon
      let summonActor = await fromUuid(this.usage.summon);
      const ownership = game.users.reduce((obj, u) => {
        if ( u.isGM || !this.actor.testUserPermission(u, "OWNER") ) return obj;
        obj[u.id] = CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
        return obj;
      }, {});
      if ( game.actors.has(summonActor.id) ) {
        summonActor = game.actors.get(summonActor.id);
        await summonActor.update({ownership});
      }
      else {
        const summonData = game.actors.fromCompendium(summonActor, {keepId: true, clearOwnership: true});
        summonData.ownership = ownership;
        summonActor = await summonActor.constructor.create(summonData, {keepId: true});
      }

      // Create a Token
      let token = await summonActor.getTokenDocument({x, y,
        name: `${this.actor.name} ${summonActor.name}`,
        disposition: this.actor.prototypeToken.disposition,
        delta: {
          system: {
            resources: {
              "health.value": 9e99,
              "morale.value": 9e99,
              "action.value": 9e99,
              "focus.value": 9e99
            },
            details: {
              level: Math.ceil(this.actor.system.details.threatLevel / 2)
            }
          }
        }
      });
      token = await token.constructor.create(token, {parent: canvas.scene});

      // Record summon ID on the active effect
      const self = this.outcomes.get(this.actor);
      const ae = self.effects?.[0];
      if ( ae ) foundry.utils.setProperty(ae, "flags.crucible.summon",  token.uuid);

      // Create a Combatant
      if ( this.actor.inCombat ) {
        await game.combat.createEmbeddedDocuments("Combatant", [{
          tokenId: token.id,
          sceneId: canvas.scene.id,
          actorId: summonActor.id,
          initiative: 1
        }]);
      }
    }
  },

  /* -------------------------------------------- */
  /*  Attack Rolls                                */
  /* -------------------------------------------- */

  mainhand: {
    tag: "mainhand",
    label: "ACTION.TagMainHand",
    tooltip: "ACTION.TagMainHandTooltip",
    category: "attack",
    ...weaponAttack("mainhand")
  },

  twohand: {
    tag: "twohand",
    label: "ACTION.TagTwoHanded",
    tooltip: "ACTION.TagTwoHandedTooltip",
    category: "attack",
    ...weaponAttack("twoHanded")
  },

  offhand: {
    tag: "offhand",
    label: "ACTION.TagOffHand",
    tooltip: "ACTION.TagOffHandTooltip",
    category: "attack",
    ...weaponAttack("offhand")
  },

  /* -------------------------------------------- */
  /*  Ranged Attacks                              */
  /* -------------------------------------------- */

  reload: {
    tag: "Reload",
    label: "ACTION.TagReload",
    tooltip: "ACTION.TagReloadTooltip",
    category: "special",
    canUse() {
      const {mainhand: m, offhand: o, reload} = this.actor.equipment.weapons;
      if ( !reload || (m.system.loaded && (!o || o.system.loaded)) ) {
        throw new Error("Your weapons do not require reloading");
      }
    },
    prepare() {
      const {mainhand: m, offhand: o} = this.actor.equipment.weapons;
      this.usage.actorUpdates.items ||= [];
      if (m.config.category.reload && !m.system.loaded) {
        this.usage.actorUpdates.items.push({_id: m.id, "system.loaded": true});
      }
      else if (o?.config.category.reload && !o.system.loaded) {
        this.usage.actorUpdates.items.push({_id: o.id, "system.loaded": true});
      }
    }
  },

  /* -------------------------------------------- */
  /*  Attack Modifiers                            */
  /* -------------------------------------------- */

  deadly: {
    tag: "deadly",
    label: "ACTION.TagDeadly",
    tooltip: "ACTION.TagDeadlyTooltip",
    category: "modifiers",
    prepare() {
      this.usage.bonuses.multiplier += 1;
    },
  },

  difficult: {
    tag: "difficult",
    label: "ACTION.TagDifficult",
    tooltip: "ACTION.TagDifficultTooltip",
    category: "modifiers",
    prepare() {
      this.usage.banes.difficult = {label: "ACTION.TagDifficult", number: 1};
    }
  },

  empowered: {
    tag: "empowered",
    label: "ACTION.TagEmpowered",
    tooltip: "ACTION.TagEmpoweredTooltip",
    category: "modifiers",
    prepare() {
      this.usage.bonuses.damageBonus += 6;
    },
  },

  accurate: {
    tag: "accurate",
    label: "ACTION.TagAccurate",
    tooltip: "ACTION.TagAccurateTooltip",
    category: "modifiers",
    prepare() {
      this.usage.boons.accurate = {label: "ACTION.TagAccurate", number: 2};
    }
  },
  harmless: {
    tag: "harmless",
    label: "ACTION.TagHarmless",
    tooltip: "ACTION.TagHarmlessTooltip",
    category: "modifiers",
    async postActivate(outcome) {
      for ( const roll of outcome.rolls ) {
        if ( roll.data.damage ) roll.data.damage.total = 0;
      }
    }
  },
  weakened: {
    tag: "weakened",
    label: "ACTION.TagWeakened",
    tooltip: "ACTION.TagWeakenedTooltip",
    category: "modifiers",
    prepare() {
      this.usage.bonuses.damageBonus -= 6;
    }
  },

  /* -------------------------------------------- */
  /*  Defense Modifiers                           */
  /* -------------------------------------------- */

  // Target Fortitude
  fortitude: {
    tag: "fortitude",
    label: "Fortitude",
    category: "defenses",
    prepare() {
      this.usage.defenseType = "fortitude";
      this.usage.context.tags.add("Fortitude");
    },
  },

  // Target Reflex
  reflex: {
    tag: "reflex",
    label: "Reflex",
    category: "defenses",
    prepare() {
      this.usage.defenseType = "reflex";
      this.usage.context.tags.add("Reflex");
    },
  },

  // Target Willpower
  willpower: {
    tag: "willpower",
    label: "Willpower",
    category: "defenses",
    prepare() {
      this.usage.defenseType = "willpower";
      this.usage.context.tags.add("Willpower");
    },
  },

  /* -------------------------------------------- */
  /*  Healing Actions                             */
  /* -------------------------------------------- */

  healing: {
    tag: "healing",
    label: "ACTION.TagHealing",
    tooltip: "ACTION.TagHealingTooltip",
    category: "damage",
    prepare() {
      this.usage.resource = "health";
      this.usage.defenseType = "wounds";
      this.usage.restoration = true;
    }
  },

  rallying: {
    tag: "rallying",
    label: "ACTION.TagRallying",
    tooltip: "ACTION.TagRallyingTooltip",
    category: "damage",
    prepare() {
      this.usage.resource = "morale";
      this.usage.defenseType = "madness";
      this.usage.restoration = true;
    }
  }
}

/* -------------------------------------------- */
/*  Specialized Damage Type                     */
/* -------------------------------------------- */

for ( const {id, label} of Object.values(DAMAGE_TYPES) ) {
  TAGS[id] = {
    tag: id,
    label: label,
    category: "damage",
    prepare() {
      this.usage.damageType = id;
    }
  }
}

/* -------------------------------------------- */
/*  Specialized Scaling                         */
/* -------------------------------------------- */

for ( const {id, label} of Object.values(ABILITIES) ) {
  TAGS[id] = {
    tag: id,
    label,
    category: "scaling",
    prepare() {
      this.usage.bonuses.ability = this.actor.getAbilityBonus([id]);
    }
  }
}

/* -------------------------------------------- */
/*  Target Resources                            */
/* -------------------------------------------- */

for ( const {id, label} of Object.values(RESOURCES) ) {
  TAGS[id] = {
    tag: id,
    label: label,
    category: "resources",
    prepare() {
      this.usage.resource = id;
    }
  }
}

/* -------------------------------------------- */
/*  Skill Attacks                               */
/* -------------------------------------------- */

for ( const {id, name} of Object.values(SKILLS) ) {
  TAGS[id] = {
    tag: id,
    label: name,
    category: "skills",
    prepare() {
      this.usage.skillId = id;
      const skill = this.actor.skills[id];
      this.usage.hasDice = true;
      Object.assign(this.usage.bonuses, {
        ability: skill.abilityBonus,
        skill: skill.skillBonus,
        enchantment: skill.enchantmentBonus
      });
      Object.assign(this.usage.context, {type: "skill", label: "Skill Tags", icon: "fa-solid fa-cogs"});
      this.usage.context.tags.add(SKILLS[id].label);
    },
    async roll(target, rolls) {
      const attack = await this.actor.skillAttack(this, target);
      rolls.push(attack);
    }
  }
}

/* -------------------------------------------- */

/**
 * The default actions that every character can perform regardless of their attributes or talents.
 * @type {object[]}
 */
export const DEFAULT_ACTIONS = Object.freeze([
  {
    id: "cast",
    name: "Cast Spell",
    img: "icons/magic/air/air-smoke-casting.webp",
    description: "Weave arcana to create a work of spellcraft.",
    tags: ["spell"],
    target: {
      type: "none",
    }
  },
  {
    id: "move",
    name: "Move",
    img: "icons/skills/movement/arrow-upward-yellow.webp",
    description: "Move quickly up to 4 spaces in any direction, or move cautiously one space in any direction.",
    target: {
      type: "none",
      number: 0,
      distance: 4,
      scope: 1
    },
    tags: ["movement"]
  },
  {
    id: "defend",
    name: "Defend",
    img: "icons/magic/defensive/shield-barrier-deflect-teal.webp",
    description: "You concentrate effort on avoiding harm, heightening your physical defense. You gain the "
      + "<strong>Guarded</strong> condition until the start of your next Turn.",
    target: {
      type: "self",
      number: 0,
      distance: 0,
      scope: 1
    },
    cost: {
      action: 1
    },
    effects: [
      {
        duration: { rounds: 1 },
        statuses: ["guarded"]
      }
    ]
  },
  {
    id: "delay",
    name: "Delay",
    img: "icons/magic/time/clock-analog-gray.webp",
    description: "You delay your action until a later point in the Combat round. Choose an Initiative between 1 and "
      + "the Initiative value of the combatant after you. You will act at this new Initiative value. You may only "
      + "delay your turn once per round.",
    target: {
      type: "self",
      scope: 1
    }
  },
  {
    id: "disengagementStrike",
    name: "Disengagement Strike",
    img: "icons/skills/melee/blade-tip-orange.webp",
    description: "Perform a strike when an enemy leaves your engagement and you are not fully engaged.",
    cost: {
      action: 0,
      focus: 1
    },
    target: {
      type: "single",
      number: 1,
      distance: 1,
      scope: 3
    },
    tags: ["reaction"]
  },
  {
    id: "recover",
    name: "Recover",
    img: "icons/magic/life/cross-area-circle-green-white.webp",
    description: "Spend 10 minutes outside of Combat recovering from exertion to fully restore Health, Morale, Action, and Focus.",
    target: {
      type: "self",
      number: 0,
      distance: 0,
      scope: 1
    },
    cost: {
      action: 0
    },
    tags: ["noncombat"]
  },
  {
    id: "refocus",
    name: "Recover Focus",
    img: "icons/magic/light/orb-shadow-blue.webp",
    description: "Use your equipped Talisman to recover Focus.",
    target: {
      type: "self",
      scope: 1
    },
    cost: {
      action: 2
    }
  },
  {
    id: "reload",
    name: "Reload Weapon",
    img: "icons/skills/ranged/arrow-flying-broadhead-metal.webp",
    description: "Reload a ranged weapon which features a reloading time.",
    cost: {
      action: 1
    },
    tags: ["reload"],
    target: {
      type: "self",
    }
  },

  {
    id: "strike",
    name: "Strike",
    img: "icons/skills/melee/blade-tip-orange.webp",
    description: "Attack a single target creature or object with your main-hand weapon.",
    target: {
      type: "single",
      number: 1,
      distance: 1,
      scope: 3
    }
  }
]);
