import { SYSTEM } from "../config/system.js";
import StandardCheck from "../dice/standard-check.js"
import AttackRoll from "../dice/attack-roll.mjs";
import CrucibleAction from "../data/action.mjs";

/**
 * @typedef {Object} ActorEquippedWeapons
 * @property {CrucibleItem} mainhand
 * @property {CrucibleItem} offhand
 * @property {boolean} freehand
 * @property {boolean} unarmed
 * @property {boolean} shield
 * @property {boolean} twoHanded
 * @property {boolean} melee
 * @property {boolean} ranged
 * @property {boolean} dualWield
 * @property {boolean} dualMelee
 * @property {boolean} dualRanged
 * @property {boolean} slow
 */

/**
 * @typedef {Object} ActorEquipment
 * @property {CrucibleItem} armor
 * @property {ActorEquippedWeapons} weapons
 * @property {CrucibleItem[]} accessories
 */

/**
 * @typedef {Object}   ActorRoundStatus
 * @property {boolean} hasMoved
 * @property {boolean} hasAttacked
 * @property {boolean} wasAttacked
 */

/**
 * The Actor document subclass in the Crucible system which extends the behavior of the base Actor class.
 */
export default class CrucibleActor extends Actor {
  constructor(data, context) {
    super(data, context);
    this.#updateCachedResources();
  }

  /**
   * Track the Actions which this Actor has available to use
   * @type {Object<string, CrucibleAction>}
   */
  actions = this["actions"];

  /**
   * Temporary roll bonuses this actor has outside the fields of its data model.
   * @type {{
   *   damage: Object<string, number>
   * }}
   */
  rollBonuses = this.rollBonuses;

  /**
   * Track the Items which are currently equipped for the Actor.
   * @type {ActorEquipment}
   */
  equipment = this.equipment;

  /**
   * The spellcraft components known by this Actor
   * @type {{runes: Set<CrucibleRune>, inflections: Set<CrucibleInflection>, gestures: Set<CrucibleGesture>}}
   */
  grimoire = this.grimoire;

  /**
   * The ancestry of the Actor.
   * @returns {*}
   */
  get ancestry() {
    return this.system.details.ancestry;
  }

  /**
   * The prepared object of actor attributes
   * @type {object}
   */
  get abilities() {
    return this.system.abilities;
  }

  /**
   * The background of the Actor.
   * @returns {*}
   */
  get background() {
    return this.system.details.background;
  }

  /**
   * The prepared object of actor defenses
   * @type {object}
   */
  get defenses() {
    return this.system.defenses;
  }

  /**
   * A convenience reference to the Actor level.
   * @type {number}
   */
  get level() {
    return this.system.advancement.level;
  }

  /**
   * Is this actor currently "level zero"
   * @returns {boolean}
   */
  get isL0() {
    return this.system.advancement.level === 0;
  }

  get points() {
    return this.system.points;
  }

  /**
   * The prepared object of actor resistances
   * @returns {object}
   */
  get resistances() {
    return this.system.resistances;
  }

  /**
   * The prepared object of actor skills
   * @returns {object}
   */
  get skills() {
    return this.system.skills;
  }

  /**
   * The prepared object of actor status data
   * @returns {ActorRoundStatus}
   */
  get status() {
    return this.system.status;
  }

  /**
   * Is this Actor incapacitated?
   * @type {boolean}
   */
  get isIncapacitated() {
    return (this.system.resources.health.value === 0) && (this.system.resources.wounds.value < this.system.resources.wounds.max);
  }

  /**
   * Is this Actor broken?
   * @type {boolean}
   */
  get isBroken() {
    return (this.system.resources.morale.value === 0) && (this.system.resources.madness.value < this.system.resources.madness.max);
  }

  /**
   * Is this Actor dead?
   * @type {boolean}
   */
  get isDead() {
    if ( this.type === "npc" ) return this.system.resources.health.value === 0;
    return this.system.resources.wounds.value === this.system.resources.wounds.max;
  }

  /**
   * Is this Actor insane?
   * @type {boolean}
   */
  get isInsane() {
    return this.system.resources.madness.value === this.system.resources.madness.max;
  }

  /**
   * Is this Actor currently in the active Combat encounter?
   * @type {boolean}
   */
  get combatant() {
    if ( this.isToken ) return game.combat?.combatants.find(c => c.tokenId === this.token.id);
    return game.combat?.combatants.find(c => c.actorId === this.id);
  }

  /**
   * Track resource values prior to updates to capture differential changes.
   * @enum {number}
   */
  _cachedResources;

  /**
   * The IDs of purchased talents
   * @type {Set<string>}
   */
  talentIds;

  /**
   * Currently active status effects
   * @type {Set<string>}
   */
  statuses;

  /* -------------------------------------------- */
  /*  Actor Preparation
  /* -------------------------------------------- */

  /** @override */
  prepareBaseData() {
    this.rollBonuses = {damage: {}};
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  prepareEmbeddedDocuments() {
    super.prepareEmbeddedDocuments();
    if ( this.type === "adversary" ) return;
    const items = this.itemTypes;
    this._prepareTalents(items);
    this.equipment = this._prepareEquipment(items);
    this._prepareEffects();
    this._prepareActions();
  };

  /* -------------------------------------------- */

  /**
   * Classify the Items in the Actor's inventory to identify current equipment.
   * @returns {ActorEquipment}
   * @private
   */
  _prepareEquipment({armor, weapon, accessory}={}) {
    return {
      armor: this._prepareArmor(armor),
      weapons: this._prepareWeapons(weapon),
      accessories: {} // TODO: Equipped Accessories
    };
  }

  /* -------------------------------------------- */

  /**
   * Prepare the Armor item that this Actor has equipped.
   * @param {CrucibleItem[]} armorItems       The armor type Items in the Actor's inventory
   * @returns {CrucibleItem}                  The armor Item which is equipped
   * @private
   */
  _prepareArmor(armorItems) {
    let armors = armorItems.filter(i => i.system.equipped);
    if ( armors.length > 1 ) {
      ui.notifications.warn(`Actor ${this.name} has more than one equipped armor.`);
      armors = armors[0];
    }
    return armors[0] || this._getUnarmoredArmor();
  }

  /* -------------------------------------------- */

  /**
   * Get the default unarmored Armor item used by this Actor if they do not have other equipped armor.
   * @returns {CrucibleItem}
   * @private
   */
  _getUnarmoredArmor() {
    const itemCls = getDocumentClass("Item");
    return new itemCls(SYSTEM.ARMOR.UNARMORED_DATA, {parent: this});
  }

  /* -------------------------------------------- */

  /**
   * Prepare the Armor item that this Actor has equipped.
   * @param {CrucibleItem[]} weaponItems      The Weapon type Items in the Actor's inventory
   * @returns {EquippedWeapons}               The currently equipped weaponry for the Actor
   * @private
   */
  _prepareWeapons(weaponItems) {
    const warnSlotInUse = (item, type) => {
      const w = game.i18n.format("WARNING.CannotEquipSlotInUse", {actor: this.name, item: item.name, type});
      console.warn(w);
    }

    // Identify main-hand and off-hand weapons
    const weapons = {};
    const equippedWeapons = {mh: [], oh: [], either: []};
    for ( let w of weaponItems ) {
      if ( !w.system.equipped ) continue;
      const category = w.config.category;
      if ( (w.hands === 2) ) {
        equippedWeapons.mh.unshift(w);
        equippedWeapons.oh.unshift(w);
      }
      else if ( category.main && !category.off ) equippedWeapons.mh.push(w);
      else if ( category.off && !category.main ) equippedWeapons.oh.push(w);
      else equippedWeapons.either.push(w);
    }
    equippedWeapons.either.sort((a, b) => b.system.damage.base - a.system.damage.base);

    // Assign equipped weapons
    for ( const w of equippedWeapons.mh ) {
      if ( weapons.mainhand ) warnSlotInUse(w, "mainhand");
      else weapons.mainhand = w;
    }
    for ( const w of equippedWeapons.oh ) {
      if ( weapons.offhand ) warnSlotInUse(w, "offhand");
      else weapons.offhand = w;
    }
    for ( const w of equippedWeapons.either ) {
      if ( !weapons.mainhand ) weapons.mainhand = w;
      else if ( !weapons.offhand ) weapons.offhand = w;
      else warnSlotInUse(w, "mainhand");
    }

    // Mainhand Weapon
    if ( !weapons.mainhand ) weapons.mainhand = this._getUnarmedWeapon();
    const mh = weapons.mainhand;
    const mhCategory = mh.config.category;

    // Offhand Weapon
    if ( !weapons.offhand ) weapons.offhand =  mhCategory.hands < 2 ? this._getUnarmedWeapon() : null;
    const oh = weapons.offhand;
    const ohCategory = oh?.config.category || {};

    // Free Hand or Unarmed
    weapons.freehand = (mhCategory.id === "unarmed") || (ohCategory.id === "unarmed");
    weapons.unarmed = (mhCategory.id === "unarmed") && (ohCategory.id === "unarmed");

    // Shield
    weapons.shield = (ohCategory.id === "shieldLight") || (ohCategory.id === "shieldHeavy");

    // Two-Handed
    weapons.twoHanded = mhCategory.hands === 2;

    // Melee vs. Ranged
    weapons.melee = !mhCategory.ranged;
    weapons.ranged = !!mhCategory.ranged;

    // Dual Wielding
    weapons.dualWield = weapons.unarmed || ((mhCategory.hands === 1) && mh.id && (oh.id && !weapons.shield));
    weapons.dualMelee = weapons.dualWield && !(mhCategory.ranged || ohCategory.ranged);
    weapons.dualRanged = (mhCategory.hands === 1) && mhCategory.ranged && ohCategory.ranged;

    // Special Properties
    weapons.reload = mhCategory.reload || ohCategory.reload;
    weapons.slow = mh.system.properties.has("oversized") + oh?.system.properties.has("oversized");
    return weapons;
  }

  /* -------------------------------------------- */

  /**
   * Get the default unarmed weapon used by this Actor if they do not have other weapons equipped.
   * @returns {CrucibleItem}
   * @private
   */
  _getUnarmedWeapon() {
    const itemCls = getDocumentClass("Item");
    const data = foundry.utils.deepClone(SYSTEM.WEAPON.UNARMED_DATA);
    if ( this.talentIds.has("pugilist00000000") ) data.system.quality = "fine";
    if ( this.talentIds.has("martialartist000") ) data.system.enchantment = "minor";
    return new itemCls(data, {parent: this});
  }

  /* -------------------------------------------- */

  /**
   * Prepare Actions which the Actor may actively use
   * @private
   */
  _prepareActions() {
    this.actions = {};

    // Default actions that every character can do
    for ( let ad of SYSTEM.ACTION.DEFAULT_ACTIONS ) {
      const a = new CrucibleAction(ad);
      if ( (a.id === "cast") && !(this.grimoire.gestures.size && this.grimoire.runes.size) ) continue;
      if ( (a.id === "reload") && !this.equipment.weapons.reload ) continue;
      this.actions[a.id] = a.prepareForActor(this);
    }

    // Actions that are unlocked through an owned Talent
    for ( let t of this.itemTypes.talent ) {
      for ( let a of t.actions ) {
        this.actions[a.id] = a.prepareForActor(this);
      }
    }
  }

  /* -------------------------------------------- */

  /**
   * Prepare current Active Effects.
   * @private
   */
  _prepareEffects() {
    this.statuses = new Set();
    for ( const effect of this.effects ) {
      for ( const status of effect.statuses ) this.statuses.add(status);
    }
  }

  /* -------------------------------------------- */

  /**
   * Prepare owned Talent items that the Actor has unlocked
   * @private
   */
  _prepareTalents({talent}={}) {
    this.talentIds = new Set();
    this.grimoire = {runes: new Set(), gestures: new Set(), inflections: new Set()};
    const points = this.system.points.talent;

    // Iterate over talents
    for ( const t of talent ) {
      this.talentIds.add(t.id);
      points.spent += 1; // TODO - every talent costs 1 for now

      // Register spellcraft knowledge
      if ( t.system.rune ) {
        this.grimoire.runes.add(SYSTEM.SPELL.RUNES[t.system.rune]);
        if ( !this.grimoire.gestures.size ) this.grimoire.gestures.add(SYSTEM.SPELL.GESTURES.touch);
      }
      if ( t.system.gesture ) this.grimoire.gestures.add(SYSTEM.SPELL.GESTURES[t.system.gesture]);
      if ( t.system.inflection ) this.grimoire.inflections.add(SYSTEM.SPELL.INFLECTIONS[t.system.inflection]);
    }

    // Warn if the Actor does not have a legal build
    points.available = points.total - points.spent;
    if ( points.available < 0) {
      ui.notifications?.warn(`Actor ${this.name} has more Talents unlocked than they have talent points available.`);
    }
  }

  /* -------------------------------------------- */
  /*  Dice Rolling Methods                        */
  /* -------------------------------------------- */

  /**
   * Compute the ability score bonus for a given scaling mode
   * @param {string[]} scaling    How is the ability bonus computed?
   * @returns {number}            The ability bonus
   */
  getAbilityBonus(scaling) {
    const abilities = this.system.abilities;
    return Math.ceil(scaling.reduce((x, t) => x + abilities[t].value, 0) / scaling.length);
  }

  /* -------------------------------------------- */

  /**
   * Get the number of additional boons or banes you have when attacking a target.
   * @param {CrucibleActor} target  The target being attacked
   * @param {string} defenseType    The defense type being tested
   * @returns {{boons: number, banes: number}}  The number of additional boons and banes
   */
  getTargetBoons(target, defenseType) {
    let boons = 0;
    let banes = 0;

    // Physical Attacks
    if ( defenseType === "physical" ) {

      // Exposed
      if ( target.statuses.has("exposed") ) boons += 2;

      // Guarded
      if ( target.statuses.has("guarded") ) {
        if ( target.talentIds.has("testudo000000000") && target.equipment.weapons.shield ) banes += 2;
        else banes += 1;
      }
    }

    // Initiative Difference
    if ( this.talentIds.has("strikefirst00000") ) {
      const ac = this.combatant;
      const tc = target.combatant;
      if ( ac?.initiative > tc?.initiative ) boons += 1;
    }
    return {boons, banes};
  }

  /* -------------------------------------------- */

  /**
   * Roll a skill check for a given skill ID.
   *
   * @param {string} skillId      The ID of the skill to roll a check for, for example "stealth"
   * @param {number} [banes]      A number of banes applied to the roll, default is 0
   * @param {number} [boons]      A number of boons applied to the roll, default is 0
   * @param {number} [dc]         A known target DC
   * @param {string} [rollMode]   The roll visibility mode to use, default is the current dropdown choice
   * @param {boolean} [dialog]    Display a dialog window to further configure the roll. Default is false.
   *
   * @return {StandardCheck}      The StandardCheck roll instance which was produced.
   */
  async rollSkill(skillId, {banes=0, boons=0, dc, rollMode, dialog=false}={}) {
    const skill = this.system.skills[skillId];
    if ( !skill ) throw new Error(`Invalid skill ID ${skillId}`);

    // Create the check roll
    const sc = new StandardCheck({
      actorId: this.id,
      banes: banes,
      boons: boons,
      dc: dc,
      ability: skill.abilityBonus,
      skill: skill.skillBonus,
      enchantment: skill.enchantmentBonus,
      type: skillId,
      rollMode: rollMode,
    });

    // Prompt the user with a roll dialog
    const flavor = game.i18n.format("SKILL.RollFlavor", {name: this.name, skill: CONFIG.SYSTEM.SKILLS[skillId].name});
    if ( dialog ){
      const title = game.i18n.format("SKILL.RollTitle", {name: this.name, skill: CONFIG.SYSTEM.SKILLS[skillId].name});
      const response = await sc.dialog({title, flavor, rollMode});
      if ( response === null ) return null;
    }

    // Execute the roll to chat
    await sc.toMessage({flavor});
    return sc;
  }

  /* -------------------------------------------- */

  /**
   * Test the Actor's defense, determining which defense type is used to avoid an attack.
   * @param {string} defenseType      The defense type to test
   * @param {number} rollTotal        The rolled total
   * @param {number} [dc]             An explicit DC to test
   * @returns {AttackRoll.RESULT_TYPES}
   */
  testDefense(defenseType, rollTotal, dc) {
    const d = this.system.defenses;

    // Physical Defense
    if ( defenseType === "physical" ) {
      dc = d.physical;

      // Hit
      if ( rollTotal > dc ) return AttackRoll.RESULT_TYPES.HIT;

      // Dodge
      const r = twist.random() * d.physical;
      const dodge = d.dodge.total;
      if ( r <= dodge ) return AttackRoll.RESULT_TYPES.DODGE;

      // Parry
      const parry = dodge + d.parry.total;
      if ( r <= parry ) return AttackRoll.RESULT_TYPES.PARRY;

      // Block
      const block = dodge + d.block.total;
      if ( r <= block ) return AttackRoll.RESULT_TYPES.BLOCK;

      // Armor
      return AttackRoll.RESULT_TYPES.DEFLECT;
    }

    // Other Defenses
    else {
      if ( defenseType ) dc = d[defenseType].total;
      if ( rollTotal > dc ) return AttackRoll.RESULT_TYPES.EFFECTIVE;
      else return AttackRoll.RESULT_TYPES.RESIST;
    }
  }

  /* -------------------------------------------- */

  /**
   * Use an available Action.
   * @param {string} actionId     The action to use
   * @param {object} [options]    Options which configure action usage
   * @returns {Promise<Roll[]>}
   */
  async useAction(actionId, options={}) {
    const action = this.actions[actionId];
    if ( !action ) throw new Error(`Action ${actionId} does not exist in Actor ${this.id}`);
    return action.use(this, {dialog: true, ...options});
  }

  /* -------------------------------------------- */

  /**
   * Actor-specific spell preparation steps.
   * @param {CrucibleSpell} spell   The spell being prepared
   */
  prepareSpell(spell) {
    const s = this.system.status;
    switch ( spell.gesture.id ) {

      // Gesture: Strike
      case "strike":
        const mh = this.equipment.weapons.mainhand;
        spell.cost.action = mh.system.actionCost;
        spell.damage.base = mh.system.damage.weapon;
        spell.scaling = new Set([...mh.config.category.scaling.split("."), spell.rune.scaling]);
        spell.target.distance = mh.config.category.ranged ? 10 : 1;

        // Spellblade Signature
        if ( this.talentIds.has("spellblade000000") && s.meleeAttack && !s.spellblade ) {
          spell.cost.action -= 1;
          spell.status.spellblade = true;
        }
        break;

      // Gesture: Arrow:
      case "arrow":

        // Arcane Archer Signature
        if ( this.talentIds.has("arcanearcher0000") && s.rangedAttack && !s.arcaneArcher ) {
          spell.cost.action -= 1;
          spell.status.arcaneArcher = true;
        }
        break;
    }
  }

  /* -------------------------------------------- */

  /**
   * Cast a certain spell against a target
   * @param {CrucibleAction} action
   * @param {CrucibleActor} target
   * @param {object} bonuses
   * @returns {Promise<void>}
   */
  async castSpell(action, target) {
    if ( !(target instanceof CrucibleActor) ) throw new Error("You must define a target Actor for the spell.");
    const spell = action.spell;

    // Modify boons and banes against this target
    const defenseType = action.spell.defense;
    let {boons, banes} = action.usage.bonuses;
    const targetBoons = this.getTargetBoons(target, defenseType)
    boons += targetBoons.boons;
    banes += targetBoons.banes;

    // Create the Attack Roll instance
    const roll = new AttackRoll({
      actorId: this.id,
      spellId: spell.id,
      target: target.uuid,
      ability: this.getAbilityBonus(Array.from(spell.scaling)),
      skill: 0,
      enchantment: 0,
      banes, boons,
      defenseType,
      dc: target.defenses[defenseType].total
    });

    // Evaluate the result and record the result
    await roll.evaluate({async: true});
    const r = roll.data.result = target.testDefense(defenseType, roll.total);
    if ( (r === AttackRoll.RESULT_TYPES.HIT) || (r === AttackRoll.RESULT_TYPES.EFFECTIVE) ) {
      roll.data.damage = {
        overflow: roll.overflow,
        multiplier: spell.damage.multiplier ?? 1,
        base: spell.damage.base,
        bonus: spell.damage.bonus ?? 0,
        resistance: target.resistances[spell.rune.damageType]?.total ?? 0,
        resource: spell.rune.resource,
        type: spell.damage.type,
        healing: spell.damage.healing
      };
      roll.data.damage.total = CrucibleAction.computeDamage(roll.data.damage);
    }

    // Record actor updates
    for ( const [k, v] of Object.entries(spell.status) ) action.usage.actorUpdates[`system.status.${k}`] = v;
    action.usage.actorUpdates["flags.crucible.lastSpell"] = spell.id;
    return roll;
  }

  /* -------------------------------------------- */

  async skillAttack(action, target) {

    // Prepare Roll Data
    const {bonuses, defenseType, healing, resource, skillId} = action.usage;
    const rollData = Object.assign({}, bonuses, {
      actorId: this.id,
      type: skillId,
      target: target.uuid,
    });

    // Conventional defense
    if ( defenseType in target.defenses ) {
      Object.assign(rollData, {defenseType, dc: target.defenses[defenseType].total});
    }

    // Opposed skill
    else {
      Object.assign(rollData, {defenseType: skillId, dc: target.skills[skillId].passive});
    }

    // Create and evaluate the skill attack roll
    const roll = new game.system.api.dice.AttackRoll(rollData);
    await roll.evaluate();
    roll.data.result = target.testDefense(defenseType, roll.total, rollData.dc);

    // Create resulting damage
    if ( roll.data.result === AttackRoll.RESULT_TYPES.EFFECTIVE ) {
      roll.data.damage = {
        overflow: roll.overflow,
        multiplier: bonuses.multiplier,
        base: bonuses.base ?? 0,
        bonus: bonuses.damageBonus,
        resistance: 0,
        type: bonuses.damageType,
        resource: resource ?? "health",
        healing: healing
      };
      roll.data.damage.total = CrucibleAction.computeDamage(roll.data.damage);
    }
    return roll;
  }

  /* -------------------------------------------- */

  /**
   * Restore all resource pools to their maximum value.
   * @returns {Promise<CrucibleActor>}
   */
  async rest() {
    const r = this.system.resources;
    if ( r.wounds.value === r.wounds.max ) return this;
    if ( r.madness.value === r.madness.max ) return this;
    return this.update(this._getRestData());
  }

  /* -------------------------------------------- */

  /**
   * Prepare an object that replenishes all resource pools to their current maximum level
   * @returns {{}}
   * @private
   */
  _getRestData() {
    const updates = {};
    for ( let [id, resource] of Object.entries(this.system.resources) ) {
      const cfg = SYSTEM.RESOURCES[id];
      updates[`system.resources.${id}.value`] = cfg.type === "reserve" ? 0 : resource.max;
    }
    return updates;
  }

  /* -------------------------------------------- */

  /**
   * Alter the resource pools of the actor using an object of change data
   * @param {Object<string, number>} changes      Changes where the keys are resource names and the values are deltas
   * @param {object} [updates]                    Other Actor updates to make as part of the same transaction
   * @param {object} [options]                    Options which are forwarded to the update method
   * @param {string} [options.statusText]           Custom status text displayed on the Token.
   * @returns {Promise<CrucibleActor>}            The updated Actor document
   */
  async alterResources(changes, updates={}, {statusText}={}) {
    const r = this.system.resources;
    let tookWounds = false;
    let tookMadness = false;

    // Apply resource updates
    for ( let [resourceName, delta] of Object.entries(changes) ) {
      let resource = r[resourceName];
      const uncapped = resource.value + delta;
      let overflow = Math.min(uncapped, 0);

      // Overflow health onto wounds (double damage)
      if ( (resourceName === "health") && (overflow !== 0) ) {
        tookWounds = true;
        updates["system.resources.wounds.value"] = Math.clamped(r.wounds.value - overflow, 0, r.wounds.max);
      }
      else if ( resourceName === "wounds" ) tookWounds = true;

      // Overflow morale onto madness (double damage)
      if ( (resourceName === "morale") && (overflow !== 0) ) {
        const madness = this.system.resources.madness.value - overflow;
        updates["system.resources.madness.value"] = Math.clamped(madness, 0, r.madness.max);
      }
      else if ( resourceName === "madness" ) tookMadness = true;

      // Regular update
      updates[`system.resources.${resourceName}.value`] = Math.clamped(uncapped, 0, resource.max);
    }
    return this.update(updates, {statusText});
  }

  /* -------------------------------------------- */

  /**
   * Toggle a named status active effect for the Actor
   * @param {string} statusId     The status effect ID to toggle
   * @param {boolean} active      Should the effect be active?
   * @param {boolean} overlay     Should the effect be an overlay?
   * @returns {Promise<ActiveEffect|undefined>}
   */
  async toggleStatusEffect(statusId, {active=true, overlay=false}={}) {
    const effectData = CONFIG.statusEffects.find(e => e.id === statusId);
    if ( !effectData ) return;
    const existing = this.effects.find(e => e.statuses.has(effectData.id));

    // No changes needed
    if ( !active && !existing ) return;
    if ( active && existing ) return existing.update({"flags.core.overlay": overlay});

    // Remove an existing effect
    if ( !active && existing ) return existing.delete();

    // Add a new effect
    else if ( active ) {
      const createData = foundry.utils.mergeObject(effectData, {
        _id: SYSTEM.EFFECTS.getEffectId(statusId),
        label: game.i18n.localize(effectData.label),
        statuses: [statusId]
      });
      if ( overlay ) createData["flags.core.overlay"] = true;
      await ActiveEffect.create(createData, {parent: this, keepId: true});
    }
  }

  /* -------------------------------------------- */

  /**
   * @typedef {Object} DamageOutcome
   * @property {CrucibleActor} target   The damage target
   * @property {AttackRoll[]} rolls     The attack roll instances
   * @property {object} resources       Damage dealt per target resource
   * @property {number} total           The total damage applied across all resources
   * @property {boolean} incapacitated  Did the target become incapacitated?
   * @property {boolean} broken         Did the target become broken?
   * @property {boolean} critical       Did the damage contain a Critical Hit
   * @property {boolean} failure        Did the damage contain a Critical Miss
   */

  /**
   * Deal damage to a target. This method requires ownership of the target Actor.
   * Applies resource changes to both the initiating Actor and to affected Targets.
   * @param {CrucibleActor} target      The target being damaged
   * @param {AttackRoll[]} rolls        The rolls which produced damage
   * @param {object} [options]          Options which affect how damage is applied
   * @param {boolean} [options.reverse]   Reverse damage instead of applying it
   * @returns {Promise<DamageOutcome>}  The damage outcome
   */
  async dealDamage(target, rolls, {reverse=false}={}) {
    const outcome = {
      target, rolls,
      total: undefined,
      incapacitated: false,
      broken: false,
      critical: false,
      failure: false
    };
    const resources = outcome.resources = {};
    const direction = reverse ? 1 : -1;

    // Compute total damage
    for ( const roll of rolls ) {
      const damage = roll.data.damage || {};
      const resource = damage.resource ?? "health";
      resources[resource] ??= 0;
      resources[resource] += ((damage.total ?? 0) * (damage.healing ? -1 : 1) * direction);
      if ( roll.isCriticalSuccess ) outcome.critical = true;
      else if ( roll.isCriticalFailure) outcome.failure = true;
    }
    outcome.total = Object.values(resources).reduce((t, d) => t - d, 0);

    // Apply damage to the target
    const wasIncapacitated = target.isIncapacitated;
    const wasBroken = target.isBroken;
    await target.alterResources(resources);

    // Record state changes
    if ( target.isIncapacitated && !wasIncapacitated ) outcome.incapacitated = true;
    if ( target.isBroken && !wasBroken ) outcome.broken = true;
    return outcome;
  }

  /* -------------------------------------------- */

  /**
   * Additional steps taken when this Actor deals damage to other targets.
   * @param {CrucibleAction} action                           The action performed
   * @param {Map<CrucibleActor, DamageOutcome>} outcomes      The damage outcomes that occurred
   */
  async onDealDamage(action, outcomes) {

    // Battle Focus
    if ( this.talentIds.has("battlefocus00000") && !this.system.status.battleFocus ) {
      for ( const outcome of outcomes.values() ) {
        if ( outcome.critical || outcome.incapacitated ) {
          await this.alterResources({"focus": 1}, {"system.status.battleFocus": true}, {statusText: "Battle Focus"});
          break;
        }
      }
    }

    // Blood Frenzy
    if ( this.talentIds.has("bloodfrenzy00000") && !this.system.status.bloodFrenzy ) {
      for ( const outcome of outcomes.values() ) {
        if ( outcome.critical ) {
          await this.alterResources({"action": 1}, {"system.status.bloodFrenzy": true}, {statusText: "Blood Frenzy"});
          break;
        }
      }
    }

    // Poisoner
    if ( this.talentIds.has("poisoner00000000") &&
      this.effects.find(e => e.getFlag("crucible", "action") === "poison-blades") ) {
      await this.#applyCriticalEffect("poisoned", action, outcomes);
    }

    // Bloodletter
    if ( this.talentIds.has("bloodletter00000") ) {
      const {mainhand, offhand} = this.equipment.weapons;
      const damageTypes = new Set(["piercing", "slashing"]);
      if ( action.tags.has("mainhand") && damageTypes.has(mainhand.system.damageType) ) {
        await this.#applyCriticalEffect("bleeding", action, outcomes, {damageType: mainhand.system.damageType});
      }
      else if ( action.tags.has("offhand") && damageTypes.has(offhand.system.damageType) ) {
        await this.#applyCriticalEffect("bleeding", action, outcomes, {damageType: offhand.system.damageType});
      }
    }

    // Concussive Blows
    if ( this.talentIds.has("concussiveblows0") ) {
      const {mainhand, offhand} = this.equipment.weapons;
      if ( action.tags.has("mainhand") && (mainhand.system.damageType === "bludgeoning") ) {
        await this.#applyCriticalEffect("staggered", action, outcomes);
      }
      else if ( action.tags.has("offhand") && (offhand.system.damageType === "bludgeoning") ) {
        await this.#applyCriticalEffect("staggered", action, outcomes);
      }
    }

    // Elemental Critical Effects
    const elementalEffects = {
      "dustbinder000000": {rune: "earth", effectName: "corroding"},
      "pyromancer000000": {rune: "flame", effectName: "burning"},
      "rimecaller000000": {rune: "frost", effectName: "chilled"},
      "surgeweaver00000": {rune: "lightning", effectName: "shocked"},
    }
    for ( const [talentId, {rune, effectName}] of Object.entries(elementalEffects) ) {
      if ( this.talentIds.has(talentId) && action.spell?.rune.id === rune ) {
        await this.#applyCriticalEffect(effectName, action, outcomes);
      }
    }
  }

  /* -------------------------------------------- */

  /**
   * Apply effects to a target which occur on Critical Hit.
   * @param {string} effectName                               The named effect in SYSTEM.EFFECTS
   * @param {CrucibleAction} action                           The action performed
   * @param {Map<CrucibleActor, DamageOutcome>} outcomes      The damage outcomes that occurred
   * @param {object} [options]                                Additional options passed to the effect generator
   * @returns {Promise<void>}
   */
  async #applyCriticalEffect(effectName, action, outcomes, options={}) {
    for ( const {target, critical} of outcomes.values() ) {
      if ( !critical ) continue;
      const effectData = SYSTEM.EFFECTS[effectName](this, target, options);
      const existing = target.effects.get(effectData._id);
      if ( existing ) {
        effectData.duration.startRound = game.combat?.round || null;
        await existing.update(effectData);
      }
      else await ActiveEffect.create(effectData, {parent: target, keepId: true});
    }
  }

  /* -------------------------------------------- */
  /*  Combat Encounters and Turn Order            */
  /* -------------------------------------------- */

  /**
   * Actions that occur at the beginning of an Actor's turn in Combat.
   * This method is only called for one User who has ownership permission over the Actor.
   * @returns {Promise<CrucibleActor>}
   */
  async onBeginTurn() {

    // Remove Active Effects which expire at the start of a turn
    await this.expireEffects(true);

    // Apply damage-over-time before recovery
    await this.applyDamageOverTime();

    // Recover resources
    const updates = {"system.status": null}
    if ( !this.isIncapacitated ) updates["system.resources.action.value"] = this.system.resources.action.max;
    return this.update(updates);
  }

  /* -------------------------------------------- */

  /**
   * Actions that occur at the end of an Actor's turn in Combat.
   * This method is only called for one User who has ownership permission over the Actor.
   * @returns {Promise<void>}
   */
  async onEndTurn() {

    // Remove active effects which expire at the end of a turn
    await this.expireEffects(false);
  }

  /* -------------------------------------------- */

  /**
   * Apply damage over time effects which are currently active on the Actor.
   * @returns {Promise<void>}
   */
  async applyDamageOverTime() {
    for ( const effect of this.effects ) {
      const dot = effect.flags.crucible?.dot;
      if ( !dot ) continue;

      // Categorize damage
      const damage = {};
      for ( const r of Object.keys(SYSTEM.RESOURCES) ) {
        if ( !(r in dot) ) continue;
        const d = Math.clamped(dot[r] - this.resistances[dot.damageType].total, 0, 2 * dot[r]);
        damage[r] ||= 0;
        damage[r] -= d;
      }
      if ( foundry.utils.isEmpty(damage) ) return;
      await this.alterResources(damage, {}, {statusText: effect.label});
    }
  }

  /* -------------------------------------------- */

  /**
   * Expire active effects whose durations have concluded at the end of the Actor's turn.
   * @param {boolean} start       Is it the start of the turn (true) or the end of the turn (false)
   * @returns {Promise<void>}
   */
  async expireEffects(start=true) {
    const toDelete = [];
    for ( const effect of this.effects ) {
      if ( this.#isEffectExpired(effect, start) ) toDelete.push(effect.id);
    }
    await this.deleteEmbeddedDocuments("ActiveEffect", toDelete);
  }

  /* -------------------------------------------- */

  #isEffectExpired(effect, start=true) {
    const {startRound, rounds} = effect.duration;
    if ( !Number.isNumeric(rounds) ) return false;
    const isSelf = effect.origin === this.uuid;
    const remaining = (startRound + rounds) - game.combat.round;

    // Self effects expire at the beginning of your next turn
    if ( isSelf ) return remaining <=0;

    // Effects from others expire at the end of your turn
    else {
      if ( start ) return remaining < 0;
      else return remaining <= 0;
    }
  }

  /* -------------------------------------------- */
  /*  Character Creation Methods                  */
  /* -------------------------------------------- */

  /**
   * Toggle display of the Talent Tree.
   */
  async toggleTalentTree(active) {
    const tree = game.system.tree;
    if ( (tree.actor === this) && (active !== true) ) return game.system.tree.close();
    else if ( active !== false ) return game.system.tree.open(this);
  }

  /* -------------------------------------------- */

  /**
   * Reset all Talents for the Actor.
   * @param {object} [options]        Options which modify how talents are reset
   * @param {boolean} [options.dialog]    Present the user with a confirmation dialog?
   * @returns {Promise<void>}         A Promise which resolves once talents are reset or the dialog is declined
   */
  async resetTalents({dialog=true}={}) {

    // Prompt for confirmation
    if ( dialog ) {
      const confirm = await Dialog.confirm({
        title: `Reset Talents: ${this.name}`,
        content: `<p>Are you sure you wish to reset all Talents?</p>`,
        defaultYes: false
      });
      if ( !confirm ) return;
    }

    // Remove all Talent items
    const deleteIds = this.items.reduce((arr, i) => {
      if ( i.type === "talent" ) arr.push(i.id);
      return arr;
    }, []);
    await this.deleteEmbeddedDocuments("Item", deleteIds);
  }

  /* -------------------------------------------- */

  /**
   * Re-sync all Talent data on this actor with updated source data.
   * @returns {Promise<void>}
   */
  async syncTalents() {
    const pack = game.packs.get(CONFIG.SYSTEM.COMPENDIUM_PACKS.talent);
    const updates = [];
    for ( const item of this.itemTypes.talent ) {
      const talent = pack.get(item.id);
      if ( talent ) updates.push(talent.toObject());
    }
    return this.updateEmbeddedDocuments("Item", updates, {diff: false, recursive: false, noHook: true});
  }

  /* -------------------------------------------- */

  /**
   * Handle requests to add a new Talent to the Actor.
   * Confirm that the Actor meets the requirements to add the Talent, and if so create it on the Actor
   * @param {CrucibleItem} talent     The Talent item to add to the Actor
   * @param {object} [options]        Options which configure how the Talent is added
   * @param {boolean} [options.dialog]    Prompt the user with a confirmation dialog?
   * @returns {Promise<CrucibleItem>} The created talent Item
   */
  async addTalent(talent, {dialog=false}={}) {

    // Ensure the Talent is not already owned
    if ( this.items.find(i => (i.type === "talent") && (i.name === talent.name)) ) {
      const err = game.i18n.format("TALENT.AlreadyOwned", {name: talent.name});
      return ui.notifications.warn(err);
    }

    // Confirm that the Actor meets the requirements to add the Talent
    try {
      talent.system.assertPrerequisites(this);
    } catch(err) {
      return ui.notifications.warn(err.message);
    }

    // Confirm that the Actor has sufficient Talent points
    const points = this.points.talent;
    if ( !points.available ) {  // TODO - every talent costs 1 for now
      const err = game.i18n.format("TALENT.CannotAfford", {
        name: talent.name,
        cost: 1
      });
      return ui.notifications.warn(err);
    }

    // Confirmation dialog
    if ( dialog ) {
      const confirm = await Dialog.confirm({
        title: `Purchase Talent: ${talent.name}`,
        content: `<p>Spend 1 Talent Point to purchase <strong>${talent.name}</strong>?</p>`,
        defaultYes: false
      });
      if ( !confirm ) return;
    }

    // Create the talent
    return talent.constructor.create(talent.toObject(), {parent: this, keepId: true});
  }

  /* -------------------------------------------- */

  /**
   * When an Ancestry item is dropped on an Actor, apply its contents to the data model
   * @param {object|null} itemData  The ancestry data to apply to the Actor.
   * @return {CrucibleActor}        The updated Actor with the new Ancestry applied.
   */
  async applyAncestry(itemData) {

    // Clear an existing ancestry
    if ( !itemData ) {
      if ( this.isL0 ) return this.update({"system.details.ancestry": null});
      else throw new Error("Ancestry data not provided");
    }

    const ancestry = foundry.utils.deepClone(itemData.system);
    ancestry.name = itemData.name;

    // Only proceed if we are level 1 with no points already spent
    if ( !this.isL0 || (this.points.skill.spent > 0) || (this.points.ability.spent > 0) ) {
      const err = game.i18n.localize("ANCESTRY.ApplyError");
      ui.notifications.warn(err);
      throw new Error(err);
    }

    // Update the Actor
    await this.update({"system.details.ancestry": ancestry});
    ui.notifications.info(game.i18n.format("ANCESTRY.Applied", {ancestry: ancestry.name, actor: this.name}));
    return this;
  }

  /* -------------------------------------------- */

  /**
   * When a Background item is dropped on an Actor, apply its contents to the data model
   * @param {object|null} itemData    The background data to apply to the Actor.
   * @return {CrucibleActor}          The updated Actor with the new Background applied.
   */
  async applyBackground(itemData) {

    // Clear an existing background
    if ( !itemData ) {
      if ( this.isL0 ) return this.update({"system.details.background": null});
      else throw new Error("Background data not provided");
    }

    const background = foundry.utils.deepClone(itemData.system);
    background.name = itemData.name;

    // Only proceed if we are level 1 with no points already spent
    if ( !this.isL0 || (this.points.skill.spent > 0) ) {
      const err = game.i18n.localize("BACKGROUND.ApplyError");
      ui.notifications.warn(err);
      throw new Error(err);
    }

    // Update the Actor
    await this.update({"system.details.background": background});
    ui.notifications.info(game.i18n.format("BACKGROUND.Applied", {background: background.name, actor: this.name}));
    return this;
  }

  /* -------------------------------------------- */

  /**
   * Apply data from an Archetype Item to this Actor.
   * @param {CrucibleItem} item         The Archetype Item to apply
   * @return {Promise<CrucibleActor>}   The updated Actor with the Archetype applied
   */
  async applyArchetype(item) {
    const archetype = item.toObject().system;
    archetype.name = item.name;
    await this.update({"system.details.archetype": archetype});
    ui.notifications.info(game.i18n.format("ARCHETYPE.Applied", {archetype: item.name, actor: this.name}));
    return this;
  }

  /* -------------------------------------------- */

  /**
   * Advance the Actor a certain number of levels (or decrease level with a negative delta).
   * When advancing in level, resources are restored and advancement progress is reset.
   * @param {number} delta                The number of levels to advance or decrease
   * @returns {Promise<CrucibleActor>}    The modified Actor
   */
  async levelUp(delta=1) {
    if ( delta === 0 ) return;

    // Confirm that character creation is complete
    if ( this.isL0 ) {
      const steps = [
        this.system.details.ancestry?.name,
        this.system.details.background?.name,
        !this.points.ability.requireInput,
        !this.points.skill.available,
        !this.points.talent.available
      ];
      if ( !steps.every(k => k) ) return ui.notifications.warn("WALKTHROUGH.LevelZeroIncomplete", {localize: true});
    }

    // Clone the actor and advance level
    const clone = this.clone();
    const level = Math.clamped(this.level + delta, 0, 24);
    const update = {"system.advancement.level": level};
    clone.updateSource(update);

    // Update resources and progress
    Object.assign(update, clone._getRestData());
    update["system.advancement.progress"] = delta > 0 ? 0 : clone.system.advancement.next;

    // Commit the update
    return this.update(update);
  }

  /* -------------------------------------------- */

  /**
   * Purchase an ability score increase or decrease for the Actor
   * @param {string} ability      The ability id to increase
   * @param {number} delta        A number in [-1, 1] for the direction of the purchase
   * @return {Promise}
   */
  async purchaseAbility(ability, delta=1) {
    delta = Math.sign(delta);
    const a = this.system.abilities[ability];
    if ( !a || !delta ) return;

    // Can the ability be purchased?
    if ( !this.canPurchaseAbility(ability, delta) ) {
      return ui.notifications.warn(`WARNING.AbilityCannot${delta > 0 ? "Increase" : "Decrease"}`, {localize: true});
    }

    // Modify the ability
    if ( this.isL0 ) return this.update({[`system.abilities.${ability}.base`]: Math.max(a.base + delta, 0)});
    else return this.update({[`system.abilities.${ability}.increases`]: a.increases + delta});
  }

  /* -------------------------------------------- */

  /**
   * Test whether this Actor can modify an ability score in a certain direction.
   * @param {string} ability      A value in ABILITIES
   * @param {number} delta        A number in [-1, 1] for the direction of the purchase
   * @returns {boolean}           Can the ability score be changed?
   */
  canPurchaseAbility(ability, delta=1) {
    delta = Math.sign(delta);
    const points = this.points.ability;
    const a = this.system.abilities[ability];
    if ( !a || !delta ) return;

    // Case 1 - Point Buy
    if ( this.isL0 ) {
      if ( (delta > 0) && ((a.base === 3) || !points.pool) ) return false;
      else if ( (delta < 0) && (a.base === 0) ) return false;
      return true;
    }

    // Case 2 - Regular Increase
    else {
      if ( (delta > 0) && ((a.value === 12) || !points.available) ) return false;
      else if ( (delta < 0) && (a.increases === 0) ) return false;
      return true;
    }
  }

  /* -------------------------------------------- */

  /**
   * Purchase a skill rank increase or decrease for the Actor
   * @param {string} skillId      The skill id to increase
   * @param {number} delta        A number in [-1, 1] for the direction of the purchase
   * @return {Promise}
   */
  async purchaseSkill(skillId, delta=1) {
    delta = Math.sign(delta);
    const skill = this.system.skills[skillId];
    if ( !skill ) return;

    // Assert that the skill can be purchased
    try {
      this.canPurchaseSkill(skillId, delta, true);
    } catch (err) {
      return ui.notifications.warn(err);
    }

    // Adjust rank
    const rank = skill.rank + delta;
    const update = {[`system.skills.${skillId}.rank`]: rank};
    if ( rank === 3 ) update[`system.skills.${skillId}.path`] = null;
    return this.update(update);
  }

  /* -------------------------------------------- */

  /**
   * Test whether this Actor can modify a Skill rank in a certain direction.
   * @param {string} skillId      A skill in SKILLS
   * @param {number} delta        A number in [-1, 1] for the direction of the purchase
   * @param {boolean} strict      In strict mode an error message is thrown if the skill cannot be changed
   * @returns {boolean}           In non-strict mode, a boolean for whether the rank can be purchased
   * @throws                      In strict mode, an error if the skill cannot be purchased
   */
  canPurchaseSkill(skillId, delta=1, strict=false) {
    delta = Math.sign(delta);
    const skill = this.system.skills[skillId];
    if ( !skill || (delta === 0) ) return false;

    // Must Choose Background first
    if ( !this.ancestry.name || !this.background.name ) {
      if ( strict ) throw new Error(game.i18n.localize("WARNING.SkillRequireAncestryBackground"));
      return false;
    }

    // Decreasing Skill
    if ( delta < 0 ) {
      if ( skill.rank === 0 ) {
        if ( strict ) throw new Error("Cannot decrease skill rank");
        return false;
      }
      return true;
    }

    // Maximum Rank
    if ( skill.rank === 5 ) {
      if ( strict ) throw new Error("Skill already at maximum");
      return false;
    }

    // Require Specialization
    if ( (skill.rank === 3) && !skill.path ) {
      if ( strict ) throw new Error(game.i18n.localize(`SKILL.ChoosePath`));
      return false;
    }

    // Cannot Afford
    const p = this.points.skill;
    if ( p.available < skill.cost ) {
      if ( strict ) throw new Error(game.i18n.format(`SKILL.CantAfford`, {cost: skill.cost, points: p.available}));
      return false;
    }

    // Can purchase
    return true;
  }

  /* -------------------------------------------- */
  /*  Equipment Management Methods                */
  /* -------------------------------------------- */

  /**
   * Equip an owned armor Item.
   * @param {string} itemId       The owned Item id of the Armor to equip
   * @param {boolean} [equipped]  Is the armor being equipped (true), or unequipped (false)
   * @return {Promise}            A Promise which resolves once the armor has been equipped or un-equipped
   */
  async equipArmor({itemId, equipped=true}={}) {
    const current = this.equipment.armor;
    const item = this.items.get(itemId);

    // Modify the currently equipped armor
    if ( current === item ) {
      if ( equipped ) return current;
      else return current.update({"system.equipped": false});
    }

    // Cannot equip armor
    if ( current.id ) {
      return ui.notifications.warn(game.i18n.format("WARNING.CannotEquipSlotInUse", {
        actor: this.name,
        item: item.name,
        type: game.i18n.localize("TYPES.Item.armor")
      }));
    }

    // Equip new armor
    return item.update({"system.equipped": true});
  }

  /* -------------------------------------------- */

  /**
   * Equip an owned weapon Item.
   * @param {string} itemId       The owned Item id of the Weapon to equip. The slot is automatically determined.
   * @param {string} [mainhandId] The owned Item id of the Weapon to equip specifically in the mainhand slot.
   * @param {string} [offhandId]  The owned Item id of the Weapon to equip specifically in the offhand slot.
   * @param {boolean} [equipped]  Are these weapons being equipped (true), or unequipped (false).
   * @return {Promise}            A Promise which resolves once the weapon has been equipped or un-equipped
   */
  async equipWeapon({itemId, mainhandId, offhandId, equipped=true}={}) {
    const weapons = this.equipment.weapons;
    let isMHFree = !weapons.mainhand.id;
    let isOHFree = (weapons.mainhand.config.category.hands === 1) && !weapons.offhand.id;

    // Identify the items being requested
    const w1 = this.items.get(mainhandId ?? itemId, {strict: true});
    const w2 = this.items.get(offhandId);
    const updates = [];
    let actionCost = 0;

    // Handle un-equipping weapons which are currently equipped
    if ( !equipped ) {
      if ( (w1 === weapons.mainhand) || (w1 === weapons.offhand) ) {
        updates.push({_id: w1.id, "system.equipped": false});
      }
      if ( w2 && (w2 === weapons.offhand) ) {
        updates.push({_id: w2.id, "system.equipped": false});
      }
      return this.updateEmbeddedDocuments("Item", updates);
    }

    // Equip a secondary weapon that can only go in an offhand slot
    if ( w2 ) {
      if ( !w2.config.category.off ) {
        ui.notifications.warn(game.i18n.format("WARNING.CannotEquipInvalidCategory", {
          actor: this.name,
          item: w2.name,
          type: game.i18n.localize("ACTION.TagOffhand")
        }));
      }
      if ( !isOHFree ) {
        ui.notifications.warn(game.i18n.format("WARNING.CannotEquipSlotInUse", {
          actor: this.name,
          item: w2.name,
          type: game.i18n.localize("ACTION.TagOffhand")
        }));
      }
      else {
        isOHFree = false;
        updates.push({_id: w2.id, "system.equipped": true});
        actionCost += w2.system.properties.has("ambush") ? 0 : 1;
      }
    }

    // Equip the primary weapon in the main-hand slot
    if ( w1.config.category.main && isMHFree ) {
      updates.push({_id: w1.id, "system.equipped": true});
      actionCost += w1.system.properties.has("ambush") ? 0 : 1;
    }

    // Equip the primary weapon in the off-hand slot
    else if ( w1.config.category.off && isOHFree ) {
      updates.push({_id: w1.id, "system.equipped": true});
      actionCost += w1.system.properties.has("ambush") ? 0 : 1;
    }

    // Failed to equip
    else {
      ui.notifications.warn(game.i18n.format("WARNING.CannotEquipSlotInUse", {
        actor: this.name,
        item: w1.name,
        type: game.i18n.localize(`ACTION.Tag${w1.config.category.off ? "Off" : "Main"}Hand`)
      }));
    }

    // Apply the updates
    if ( this.combatant && actionCost ) {
      if ( this.system.resources.action.value < actionCost ) {
        return ui.notifications.warn("WARNING.CannotEquipActionCost", {localize: true});
      }
      await this.alterResources({action: -actionCost});
    }
    await this.updateEmbeddedDocuments("Item", updates);
  }

  /* -------------------------------------------- */
  /*  Database Workflows                          */
  /* -------------------------------------------- */

  /** @inheritdoc */
  async _preCreate(data, options, user) {
    await super._preCreate(data, options, user);

    // Prototype Token configuration
    switch ( this.type ) {
      case "hero":
        this.updateSource({prototypeToken: {vision: true, actorLink: true, disposition: 1}});
        break;
      case "adversary":
        this.updateSource({prototypeToken: {vision: false, actorLink: false, disposition: -1}});
        break;
    }
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  _onUpdate(data, options, userId) {
    super._onUpdate(data, options, userId);
    this.#displayScrollingStatus(data, options);
    if ( game.userId === userId ) {    // Follow-up updates only made by the initiating user
      this.#replenishResources(data);
      this.#applyResourceStatuses(data);
    }
    this.#updateCachedResources();

    // Refresh talent tree
    const tree = game.system.tree;
    if ( tree.actor === this ) {
      const talentChange = (foundry.utils.hasProperty(data, "system.advancement.level") || ("items" in data));
      if ( talentChange ) tree.refresh();
    }
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  _onCreateEmbeddedDocuments(...args) {
    super._onCreateEmbeddedDocuments(...args);
    const tree = game.system.tree;
    if ( tree.actor === this ) tree.refresh();
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  _onDeleteEmbeddedDocuments(...args) {
    super._onDeleteEmbeddedDocuments(...args);
    const tree = game.system.tree;
    if ( tree.actor === this ) tree.refresh();
  }

  /* -------------------------------------------- */

  /**
   * Display changes to the Actor as scrolling combat text.
   */
  #displayScrollingStatus(changed, {statusText}={}) {
    if ( !changed.system?.resources ) return;
    const tokens = this.getActiveTokens(true);
    if ( !tokens.length ) return;
    for ( let [resourceName, prior] of Object.entries(this._cachedResources ) ) {
      if ( changed.system.resources[resourceName]?.value === undefined ) continue;

      // Get change data
      const resource = SYSTEM.RESOURCES[resourceName];
      const attr = this.system.resources[resourceName];
      const delta = attr.value - prior;
      if ( delta === 0 ) continue;
      const text = `${delta.signedString()} ${statusText ?? resource.label}`;
      const pct = Math.clamped(Math.abs(delta) / attr.max, 0, 1);
      const fontSize = (24 + (24 * pct)) * (canvas.dimensions.size / 100).toNearest(0.25); // Range between [24, 48]
      const healSign = resource.type === "active" ? 1 : -1;
      const fillColor = resource.color[Math.sign(delta) === healSign ? "heal" : "high"];

      // Display for all tokens
      for ( let token of tokens ) {
        canvas.interface.createScrollingText(token.center, text, {
          anchor: CONST.TEXT_ANCHOR_POINTS.TOP,
          fontSize: fontSize,
          fill: fillColor,
          stroke: 0x000000,
          strokeThickness: 4,
          jitter: 0.5
        });
      }
    }
  }

  /* -------------------------------------------- */

  /**
   * Apply status effect changes when attribute pools change
   * @param {object} data     The data which changed
   * @returns {Promise<void>}
   * @private
   */
  async #applyResourceStatuses(data) {
    const r = data?.system?.resources || {};
    if ( ("health" in r) || ("wounds" in r) ) {
      await this.toggleStatusEffect("incapacitated", {active: this.isIncapacitated });
      await this.toggleStatusEffect("dead", {active: this.isDead});
    }
    if ( ("morale" in r) || ("madness" in r) ) {
      await this.toggleStatusEffect("broken", {active: this.isBroken});
      await this.toggleStatusEffect("insane", {active: this.isInsane});
    }
  }

  /* -------------------------------------------- */

  /**
   * Update the cached resources for this actor.
   * @private
   */
  #updateCachedResources() {
    this._cachedResources = Object.entries(this.system.resources).reduce((obj, [id, {value}]) => {
      obj[id] = value;
      return obj;
    }, {});
  }

  /* -------------------------------------------- */

  #replenishResources(data) {
    const levelChange = foundry.utils.hasProperty(data, "system.advancement.level");
    const attributeChange = Object.keys(SYSTEM.ABILITIES).some(k => {
      return foundry.utils.hasProperty(data, `system.abilities.${k}`);
    });
    if ( this.isOwner && (levelChange || attributeChange) ) this.rest();
  }
}
