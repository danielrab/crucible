import { SYSTEM } from "../config/system.js";


export default class CrucibleItem extends Item {

  /** @inheritdoc */
  _initialize() {
    this.config = this.prepareConfig();
    return super._initialize();
  }

  /* -------------------------------------------- */
  /*  Item Data Preparation                       */
  /* -------------------------------------------- */

  /**
   * Prepare the Configuration object for this Item type.
   * This configuration does not change when the data changes
   */
  prepareConfig() {
    switch ( this.data.type ) {
      case "skill":
        return SYSTEM.skills.skills[this.data.data.skill] || {};
      case "talent":
        return "foo";
    }
  }

  /* -------------------------------------------- */

  /** @override */
  prepareDerivedData() {
    const data = this.data;
    switch ( this.data.type ) {
      case "armor":
        return this._prepareArmorData(data);
      case "skill":
        return this._prepareSkillData(data);
      case "talent":
        return "foo";
      case "weapon":
        return this._prepareWeaponData(data);
    }
  }

  /* -------------------------------------------- */

  /**
   * Prepare base data for Armor type Items
   * @param {object} data     The item data object
   * @private
   */
  _prepareArmorData(data) {
    const {armor, dodge} = data.data;
    const category = SYSTEM.ARMOR.CATEGORIES[data.data.category] || "unarmored";

    // Base Armor can be between zero and the maximum allowed for the category
    armor.base = Math.clamped(armor.base, category.minArmor, category.maxArmor);

    // Base Dodge is defined as (18 - base_armor) / 2, to a maximum of 8
    dodge.base = Math.min(Math.floor((18 - armor.base) / 2), 8);

    // Dodge Start is defined as base armor / 3
    dodge.start = Math.ceil(armor.base / 3);

    // Armor can have an enchantment bonus up to a maximum of 6
    armor.bonus = Math.clamped(armor.bonus, 0, 6);
  }

  /* -------------------------------------------- */

  /**
   * Prepare additional data for Skill type Items
   * @param {object} data   The base Item data
   * @private
   */
  _prepareSkillData(data) {
    const skill = this.config || {};

    // Copy and merge skill data
    data.name = skill.name;
    data.img = skill.icon;
    data.category = skill.category;
    data.attributes = skill.attributes;

    // Skill rank
    let current = null;
    let next = null;
    data.ranks = duplicate(skill.ranks).map(r => {
      r.purchased = (r.rank > 0) && (r.rank <= data.data.rank);
      if ( r.rank === data.data.rank ) current = r;
      else if ( r.rank === data.data.rank + 1 ) next = r;
      return r;
    });
    data.currentRank = current;
    data.nextRank = next;

    // Skill progression paths
    let path = null;
    data.paths = duplicate(skill.paths).map(p => {
      p.active = p.id === data.data.path;
      if ( p.active ) path = p;
      return p;
    });
    data.path = path;
    return data;
  }

  /* -------------------------------------------- */

  /**
   * Prepare derived data for Weapon type Items
   * @param {object} itemData   The base Item data
   * @private
   */
  _prepareWeaponData(itemData) {
    const wd = itemData.data;
    const category = itemData.category = SYSTEM.WEAPON.CATEGORIES[wd.category] || SYSTEM.WEAPON.CATEGORIES.simple1;
    const quality = itemData.quality = SYSTEM.QUALITY_TIERS[wd.quality] || SYSTEM.QUALITY_TIERS.standard;
    const enchantment = itemData.enchantment = SYSTEM.ENCHANTMENT_TIERS[wd.enchantment] || SYSTEM.ENCHANTMENT_TIERS.mundane;

    // Determine weapon damage formula
    let formula = `${1+category.dice}d${Math.max(4+category.denomination, 4)}`;
    const bonus = quality.bonus + enchantment.bonus;
    if ( bonus ) formula += ` ${bonus}`;
    itemData.damage = formula;
  }

  /* -------------------------------------------- */
  /*  Helper Methods                              */
  /* -------------------------------------------- */

  /**
   * Provide an array of detail tags which are shown in each item description
   * @return {object}
   */
  getTags() {
    const d = this.data.data;
    switch ( this.data.type ) {
      case "armor":
        const defenses = this.actor.getDefenses({armor: this});
        return {
          category: SYSTEM.ARMOR.CATEGORIES[this.data.data.category].label,
          defenses: `${defenses.armor.total + defenses.dodge.total} PD`,
          weight: `${(d.quantity ?? 0) * (d.weight ?? 0)} lbs.`
        };
      case "weapon":
        return {
          category: SYSTEM.WEAPON.CATEGORIES[this.data.data.category].label,
          weight: `${(d.quantity ?? 0) * (d.weight ?? 0)} lbs.`
        };
      default:
        return {};
    }
  }

  /* -------------------------------------------- */
  /*  Dice Rolls                                  */
  /* -------------------------------------------- */

  roll({passive=false}={}) {
    if ( !this.isOwned ) return false;
    switch ( this.data.type ) {
      case "skill":
        this._rollSkillCheck({passive});
        break;
    }
  }

  /* -------------------------------------------- */

  _rollSkillCheck({passive=false}={}) {
    const formula = `${passive ? SYSTEM.dice.passiveCheck : SYSTEM.activeCheckFormula} + ${this.data.value}`;
    const roll = new Roll(formula).roll();
    const skillName = this.data.data.path ? `${this.name} (${this.data.path.name})` : this.name;
    return roll.toMessage({
      speaker: {actor: this.actor, user: game.user},
      flavor: passive ? `Passive ${skillName}` : `${skillName} Skill Check`
    });
  }
}