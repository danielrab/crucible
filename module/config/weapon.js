/**
 * Enumerate the weapon categories which are allowed by the system.
 * Record certain mechanical metadata which applies to weapons in each category.
 * @type {{string, object}}
 */
export const CATEGORIES = {
  light1: {
    label: "WEAPON.Light1",
    hands: 1,
    main: true,
    off: true,
    scaling: "dex",
    bonus: 0,
    multiplier: 1,
    ap: 0
  },
  simple1: {
    label: "WEAPON.Simple1",
    hands: 1,
    main: true,
    off: true,
    scaling: "str",
    bonus: 0,
    multiplier: 1,
    ap: 0
  },
  balanced1: {
    label: "WEAPON.Balanced1",
    hands: 1,
    main: true,
    off: true,
    scaling: "strdex",
    bonus: 1,
    multiplier: 1,
    ap: 0
  },
  heavy1: {
    label: "WEAPON.Heavy1",
    hands: 1,
    main: true,
    off: false,
    scaling: "str",
    bonus: 2,
    multiplier: 1,
    ap: 1
  },
  massive1: {
    label: "WEAPON.Massive1",
    hands: 1,
    main: true,
    off: false,
    scaling: "str",
    bonus: 2,
    multiplier: 2,
    ap: 2
  },
  simple2: {
    label: "WEAPON.Simple2",
    hands: 2,
    main: true,
    off: false,
    scaling: "str",
    bonus: 0,
    multiplier: 2,
    ap: 1
  },
  balanced2: {
    label: "WEAPON.Balanced2",
    hands: 2,
    main: true,
    off: false,
    scaling: "strdex",
    bonus: 1,
    multiplier: 2,
    ap: 1
  },
  heavy2: {
    label: "WEAPON.Heavy2",
    hands: 2,
    main: true,
    off: false,
    scaling: "str",
    bonus: 2,
    multiplier: 2,
    ap: 2
  },
  massive2: {
    label: "WEAPON.Massive2",
    hands: 2,
    main: true,
    off: false,
    scaling: "str",
    bonus: 2,
    multiplier: 3,
    ap: 3
  },
  projectile2: {
    label: "WEAPON.Projectile2",
    hands: 2,
    main: true,
    off: false,
    ranged: true,
    scaling: "strdex",
    bonus: 0,
    multiplier: 2,
    ap: 2
  },
  mechanical1: {
    label: "WEAPON.Mechanical1",
    hands: 1,
    main: true,
    off: true,
    ranged: true,
    scaling: "dex",
    bonus: 0,
    multiplier: 1,
    ap: 1
  },
  mechanical2: {
    label: "WEAPON.Mechanical2",
    hands: 2,
    main: true,
    off: false,
    ranged: true,
    scaling: "dex",
    bonus: 0,
    multiplier: 2,
    ap: 2
  },
  shield: {
    label: "WEAPON.Shield",
    hands: 1,
    main: false,
    off: true,
    ranged: false,
    scaling: "str",
    bonus: 0,
    multiplier: 1,
    ap: 1
  }
}


/**
 * The boolean properties which a Weapon may have.
 * @enum {object}
 */
export const PROPERTIES = {
  ambush: {
    label: "WEAPON.PropertyAmbush",
    rarity: 1
  },
  blocking: {
    label: "WEAPON.PropertyBlocking",
    denomination: -2
  },
  grasping: {
    label: "WEAPON.PropertyGrasping"
  },
  keen: {
    label: "WEAPON.PropertyKeen",
    rarity: 1
  },
  slow: {
    label: "WEAPON.PropertySlow",
  },
  parrying: {
    label: "WEAPON.PropertyParrying",
    denomination: -2
  },
  reach: {
    label: "WEAPON.PropertyReach"
  },
  thrown: {
    label: "WEAPON.PropertyThrown"
  },
  versatile: {
    label: "WEAPON.PropertyVersatile"
  }
}

/**
 * The valid ways that weapon damage can scale
 * @type {object}
 */
export const SCALING_MODES = {
  "str": {
    label: "WEAPON.ScalingStr"
  },
  "strdex": {
    label: "WEAPON.ScalingStrDex"
  },
  "dex": {
    label: "WEAPON.ScalingDex"
  }
}

/**
 * The configuration of the default unarmed Weapon.
 * @type {object}
 */
export const UNARMED_DATA = {
  name: "Unarmed",
  type: "weapon",
  img: "icons/skills/melee/unarmed-punch-fist.webp",
  category: "simple1",
  quality: "shoddy",
  enchantment: "mundane",
  damageType: "bludgeoning"
}
