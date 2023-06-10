import CrucibleAction from "./action.mjs";
import AttackRoll from "../dice/attack-roll.mjs";
import PhysicalItemData from "./physical.mjs";
import { SYSTEM } from "../config/system.js";

/**
 * Data schema, attributes, and methods specific to Weapon type Items.
 */
export default class CrucibleWeapon extends PhysicalItemData {

  /** @inheritDoc */
  _configure(options) {
    super._configure(options);
    Object.defineProperties(this.parent, {
      attack: {value: this.attack.bind(this), writable: false, configurable: true},
    });
  }

  /** @override */
  static DEFAULT_CATEGORY = "simple1";

  /** @override */
  static ITEM_PROPERTIES = SYSTEM.WEAPON.PROPERTIES;

  /**
   * Designate which equipped slot the weapon is used in.
   * @enum {Readonly<number>}
   */
  static WEAPON_SLOTS = Object.freeze({
    EITHER: 0,
    MAINHAND: 1,
    OFFHAND: 2,
    TWOHAND: 3
  });

  /* -------------------------------------------- */
  /*  Data Schema                                 */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static defineSchema() {
    const fields = foundry.data.fields;
    return foundry.utils.mergeObject(super.defineSchema(), {
      damageType: new fields.StringField({required: true, choices: SYSTEM.DAMAGE_TYPES, initial: "bludgeoning"}),
      loaded: new fields.BooleanField({required: false, initial: undefined}),
      slot: new fields.NumberField({required: true, choices: Object.values(CrucibleWeapon.WEAPON_SLOTS), initial: 0}),
      animation: new fields.StringField({required: false, choices: SYSTEM.WEAPON.ANIMATION_TYPES, initial: undefined})
    });
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /**
   * Bonuses applied to actions performed with this weapon
   * @type {DiceCheckBonuses}
   */
  actionBonuses;

  /**
   * Weapon Strike action cost.
   * @type {number}
   */
  actionCost;

  /**
   * Weapon configuration data.
   * @type {{category: WeaponCategory, quality: ItemQualityTier, enchantment: ItemEnchantmentTier}}
   */
  config;

  /**
   * Weapon damage data.
   * @type {{base: number, quality: number, weapon: number}}
   */
  damage;

  /**
   * Defensive bonuses provided by this weapon
   * @type {{block: number, parry: number}}
   */
  defense;

  /**
   * Item rarity score.
   * @type {number}
   */
  rarity;

  /* -------------------------------------------- */

  /**
   * Prepare derived data specific to the weapon type.
   */
  prepareBaseData() {

    // Weapon Category
    const categories = SYSTEM.WEAPON.CATEGORIES;
    const category = categories[this.category] || categories[this.constructor.DEFAULT_CATEGORY];

    // Weapon Quality
    const qualities = SYSTEM.QUALITY_TIERS;
    const quality = qualities[this.quality] || qualities.standard;

    // Enchantment Level
    const enchantments = SYSTEM.ENCHANTMENT_TIERS;
    const enchantment = enchantments[this.enchantment] || enchantments.mundane;

    // Weapon Configuration
    this.config = {category, quality, enchantment};

    // Equipment Slot
    const allowedSlots = this.getAllowedEquipmentSlots();
    if ( !allowedSlots.includes(this.slot) ) this.slot = allowedSlots[0];

    // Weapon Damage
    this.damage = this.#prepareDamage();

    // Weapon Defense
    this.defense = this.#prepareDefense();

    // Weapon Rarity Score
    this.rarity = quality.rarity + enchantment.rarity;
    this.price = this.price * Math.max(Math.pow(this.rarity, 3), 1);

    // Action bonuses and cost
    this.actionBonuses = this.parent.actor ? {
      ability: this.parent.actor.getAbilityBonus(category.scaling.split(".")),
      skill: 0,
      enchantment: enchantment.bonus
    } : {}
    this.actionCost = category.actionCost;

    // Weapon Properties
    for ( let p of this.properties ) {
      const prop = SYSTEM.WEAPON.PROPERTIES[p];
      if ( prop.actionCost ) this.actionCost += prop.actionCost;
      if ( prop.rarity ) this.rarity += prop.rarity;
    }

    // Versatile Two-Handed
    if ( this.properties.has("versatile") && this.slot === CrucibleWeapon.WEAPON_SLOTS.TWOHAND ) {
      this.damage.base += 2;
      this.actionCost += 1;
    }
  }

  /* -------------------------------------------- */

  prepareDerivedData() {
    this.damage.weapon = this.damage.base + this.damage.quality;
    if ( this.broken ) this.damage.weapon = Math.floor(this.damage.weapon / 2);
  }

  /* -------------------------------------------- */

  /**
   * Prepare damage for the Weapon.
   * @returns {{weapon: number, base: number, quality: number}}
   */
  #prepareDamage() {
    const damage = {
      base: this.config.category.damage.base,
      quality: this.config.quality.bonus,
      weapon: 0
    };
    if ( this.properties.has("oversized") ) damage.base += 2;
    return damage;
  }

  /* -------------------------------------------- */

  /**
   * Prepare defense for the Weapon.
   * @returns {{block: number, parry: number}}
   */
  #prepareDefense() {

    // Broken weapons cannot defend
    if ( this.broken ) return {block: 0, parry: 0};

    // Base defense for the category
    const category = this.config.category
    const defense = {
      block: category.defense?.block ?? 0,
      parry: category.defense?.parry ?? 0
    };

    // Parrying and Blocking properties
    if ( this.properties.has("parrying") ) {
      defense.parry += (category.hands + this.config.enchantment.bonus);
    }
    if ( this.properties.has("blocking") ) {
      defense.block += (category.hands + this.config.enchantment.bonus);
    }
    return defense;
  }

  /* -------------------------------------------- */
  /*  Helper Methods                              */
  /* -------------------------------------------- */

  /**
   * Perform a weapon attack action.
   * TODO: Refactor this to be an Action usage which populates action data and bonuses from the Weapon item.
   * @param {CrucibleActor} target    The target creature being attacked
   * @param {number} [ability]        Override the default ability bonus for the weapon
   * @param {number} [banes=0]        The number of banes which afflict this attack roll
   * @param {number} [boons=0]        The number of boons which benefit this attack roll
   * @param {number} [damageBonus=0]  An additional damage bonus which applies to this attack
   * @param {string} [defenseType]    The defense type targeted by this attack. Physical by default.
   * @param {number} [multiplier=0]   An additional damage multiplier which applies to this attack
   * @param {string} [resource=health] The target resource affected by the attack.
   * @returns {Promise<AttackRoll>}   The created AttackRoll which results from attacking once with this weapon
   */
  async attack(target, {ability, banes=0, boons=0, multiplier=1, damageBonus=0, defenseType="physical", resource="health"}={}) {
    const actor = this.parent.actor;
    if ( !actor ) {
      throw new Error("You may only perform a weapon attack using an owned weapon Item.");
    }
    if ( !target ) {
      throw new Error("You must provide an Actor as the target for this weapon attack");
    }

    // Apply additional boons or banes
    const targetBoons = actor.getTargetBoons(target, {
      attackType: "weapon",
      defenseType,
      ranged: this.config.category.ranged
    });
    boons += targetBoons.boons;
    banes += targetBoons.banes;

    // Prepare roll data
    const rollData = {
      actorId: actor.id,
      itemId: this.parent.id,
      target: target.uuid,
      ability: ability ?? this.actionBonuses.ability,
      skill: this.actionBonuses.skill,
      enchantment: this.actionBonuses.enchantment,
      banes: banes,
      boons: boons,
      defenseType,
      dc: target.system.defenses[defenseType].total,
      criticalSuccessThreshold: this.properties.has("keen") ? 4 : 6,
      criticalFailureThreshold: this.properties.has("reliable") ? 4 : 6
    }

    // Call talent hooks
    actor.callTalentHooks("prepareStandardCheck", rollData);
    actor.callTalentHooks("prepareWeaponAttack", this, target, rollData);
    target.callTalentHooks("defendWeaponAttack", this, actor, rollData);

    // Create and evaluate the AttackRoll instance
    const roll = new AttackRoll(rollData);
    await roll.evaluate({async: true});
    const r = roll.data.result = target.testDefense(defenseType, roll.total);

    // Deflection and Avoidance
    const {HIT, DEFLECT} = AttackRoll.RESULT_TYPES;
    if ( r === DEFLECT ) {
      if ( roll.isCriticalFailure ) return roll;
    }
    else if ( r !== HIT ) return roll;

    // Damage
    roll.data.damage = {
      overflow: roll.overflow,
      multiplier: multiplier,
      base: this.damage.weapon,
      bonus: this.#getDamageBonus(damageBonus),
      resistance: target.getResistance(resource, this.damageType),
      resource,
      type: this.damageType
    };
    roll.data.damage.total = CrucibleAction.computeDamage(roll.data.damage);
    return roll;
  }

  /* -------------------------------------------- */

  /**
   * Get the damage bonus that should be applied to a weapon attack.
   * @param {number} bonus      The baseline roll damage bonus
   * @returns {number}          The final roll damage bonus
   */
  #getDamageBonus(bonus=0) {
    const rb = this.parent.actor.rollBonuses.damage;

    // Category-specific bonuses
    const category = this.config.category;
    if ( !category.ranged ) bonus += rb.melee ?? 0;
    if ( category.ranged ) bonus += rb.ranged ?? 0;
    if ( category.hands === 2 ) bonus += rb.twoHanded ?? 0;

    // Weapon-specific bonuses
    bonus += rb[this.damageType] ?? 0;
    return bonus;
  }

  /* -------------------------------------------- */

  /**
   * Identify which equipment slots are allowed for a certain weapon.
   * @returns {number[]}
   */
  getAllowedEquipmentSlots() {
    const SLOTS = this.constructor.WEAPON_SLOTS;
    const category = this.config.category;
    if ( category.hands === 2 ) return [SLOTS.TWOHAND];
    const slots = [SLOTS.MAINHAND];
    if ( category.off ) {
      slots.unshift(SLOTS.EITHER);
      slots.push(SLOTS.OFFHAND);
    }
    if ( this.properties.has("versatile") ) slots.push(SLOTS.TWOHAND);
    return slots;
  }

  /* -------------------------------------------- */

  /**
   * Return an object of string formatted tag data which describes this item type.
   * @param {string} [scope="full"]       The scope of tags being retrieved, "full" or "short"
   * @returns {Object<string, string>}    The tags which describe this weapon
   */
  getTags(scope="full") {
    const tags = {};

    // Damage
    tags.damage = `${this.damage.weapon} Damage`;
    if ( this.config.category.reload && !this.loaded ) tags.damage = "Reload";
    if ( scope === "short" ) return tags;

    // Weapon Category
    const category = this.config.category;
    tags.category = category.label;

    // Equipment Slot
    const slotKey = Object.entries(CrucibleWeapon.WEAPON_SLOTS).find(([k, v]) => v === this.slot)[0];
    tags.slot = game.i18n.localize(`WEAPON.SLOTS.${slotKey}`);

    // Weapon Properties
    if ( this.broken ) tags.broken = game.i18n.localize("ITEM.Broken");
    if ( this.defense.block ) tags.block = `Block ${this.defense.block}`;
    if ( this.defense.parry ) tags.parry = `Parry ${this.defense.parry}`;
    return tags;
  }

  /* -------------------------------------------- */

  /**
   * Prepare the Sequencer animation configuration for this Weapon.
   * @returns {{src: string}|null}
   */
  getAnimationConfiguration() {
    if ( !this.animation ) return null;
    let animation = `jb2a.${this.animation}`;

    // Restrict to melee animations
    if ( !this.config.category.ranged ) {
      const paths = Sequencer.Database.getPathsUnder(animation);
      const usage = ["melee", "standard", "200px"].find(p => paths.includes(p));
      if ( !usage ) {
        console.warn(`Crucible | Unable to find weapon animation usage for ${animation}`);
        return null
      }
      animation += `.${usage}`;
    }

    // Damage type
    const paths = Sequencer.Database.getPathsUnder(animation);
    const damageColors = {
      bludgeoning: "white",
      corruption: "green",
      piercing: "white",
      slashing: "white",
      poison: "green",
      acid: "green",
      fire: "orange",
      cold: "blue",
      electricity: "blue",
      psychic: "purple",
      radiant: "yellow",
      void: "purple"
    }
    const typePaths = [this.damageType, damageColors[this.damageType], SYSTEM.DAMAGE_TYPES[this.damageType].type];
    const typeSuffix = typePaths.find(p => paths.includes(p));
    if ( typeSuffix ) animation += `.${typeSuffix}`;

    // Return animation config
    return {src: animation}
  }
}
