export const NAME_FORMATS = Object.freeze({
  NOUN: 1,
  ADJ: 2
});

/**
 * The Arcane Runes which exist in the Crucible spellcraft system.
 * These config objects are instantiated as CrucibleRune instances during system initialization.
 * @enum {CrucibleRune}
 */
export const RUNES = Object.seal({
  courage: {
    id: "courage",
    name: "SPELL.RuneCourage",
    resource: "morale",
    restoration: true,
    opposed: "mind",
    defense: "willpower",
    scaling: "presence",
    nameFormat: NAME_FORMATS.NOUN
  },
  death: {
    id: "death",
    name: "SPELL.RuneDeath",
    resource: "health",
    damageType: "unholy",
    opposed: "life",
    defense: "fortitude",
    scaling: "wisdom",
    nameFormat: NAME_FORMATS.NOUN
  },
  earth: {
    id: "earth",
    name: "SPELL.RuneEarth",
    resource: "health",
    damageType: "acid",
    opposed: "lightning",
    defense: "reflex",
    scaling: "intellect",
    nameFormat: NAME_FORMATS.ADJ
  },
  flame: {
    id: "flame",
    name: "SPELL.RuneFlame",
    resource: "health",
    damageType: "fire",
    opposed: "frost",
    defense: "reflex",
    scaling: "intellect",
    nameFormat: NAME_FORMATS.NOUN
  },
  frost: {
    id: "frost",
    name: "SPELL.RuneFrost",
    resource: "health",
    damageType: "frost",
    opposed: "flame",
    defense: "fortitude",
    scaling: "intellect",
    nameFormat: NAME_FORMATS.NOUN
  },
  kinesis: {
    id: "kinesis",
    name: "SPELL.RuneKinesis",
    resource: "health",
    damageType: "slashing", // TODO make this a choice
    opposed: "time",
    defense: "physical",
    scaling: "presence",
    nameFormat: NAME_FORMATS.ADJ
  },
  life: {
    id: "life",
    name: "SPELL.RuneLife",
    resource: "health",
    restoration: true,
    opposed: "death",
    defense: "fortitude",
    scaling: "wisdom",
    nameFormat: NAME_FORMATS.NOUN
  },
  lightning: {
    id: "lightning",
    name: "SPELL.RuneLightning",
    resource: "health",
    damageType: "lightning",
    opposed: "earth",
    defense: "reflex",
    scaling: "intellect",
    nameFormat: NAME_FORMATS.ADJ
  },
  mind: {
    id: "mind",
    name: "SPELL.RuneMind",
    resource: "morale",
    damageType: "psychic",
    opposed: "courage",
    defense: "willpower",
    scaling: "presence",
    nameFormat: NAME_FORMATS.NOUN
  },
  radiance: {
    id: "radiance",
    name: "SPELL.RuneRadiance",
    resource: "health",
    damageType: "radiant",
    opposed: "void",
    defense: "willpower",
    scaling: "wisdom",
    nameFormat: NAME_FORMATS.NOUN
  },
  time: {
    id: "time",
    name: "SPELL.RuneTime",
    resource: "morale",
    opposed: "kinesis",
    defense: "willpower",
    scaling: "presence",
    nameFormat: NAME_FORMATS.ADJ
  },
  void: {
    id: "void",
    name: "SPELL.RuneVoid",
    resource: "morale",
    damageType: "void",
    opposed: "radiance",
    defense: "fortitude",
    scaling: "wisdom",
    nameFormat: NAME_FORMATS.ADJ
  },
});

/**
 * The Somatic Gestures which exist in the Crucible spellcraft system.
 * These config objects are instantiated as CrucibleGesture instances during system initialization.
 * @enum {CrucibleGesture}
 */
export const GESTURES = Object.seal({
  arrow: {
    id: "arrow",
    name: "SPELL.GestureArrow",
    cost: {
      action: 2,
      focus: 0
    },
    damage: {
      base: 10
    },
    hands: 1,
    scaling: "intellect",
    target: {
      type: "single",
      number: 1,
      distance: 10
    },
    tier: 1
  },
  aspect: {
    id: "aspect",
    name: "SPELL.GestureAspect",
    cost: {
      action: 2,
      focus: 1
    },
    hands: 1,
    nameFormat: NAME_FORMATS.NOUN,
    scaling: "wisdom",
    target: {
      type: "self"
    },
    tier: 1
  },
  create: {
    id: "create",
    name: "SPELL.GestureCreate",
    cost: {
      action: 2,
      focus: 1
    },
    hands: 2,
    nameFormat: NAME_FORMATS.ADJ,
    scaling: "wisdom",
    target: {
      type: "none",
      distance: 1
    },
    tier: 1
  },
  fan: {
    id: "fan",
    name: "SPELL.GestureFan",
    cost: {
      action: 2,
      focus: 1
    },
    damage: {
      base: 4
    },
    hands: 1,
    scaling: "intellect",
    target: {
      type: "fan",
      number: 1,
      distance: 1
    },
    tier: 1
  },
  influence: {
    id: "influence",
    name: "SPELL.GestureInfluence",
    cost: {
      action: 2,
      focus: 1
    },
    damage: {
      base: 12
    },
    hands: 1,
    nameFormat: NAME_FORMATS.ADJ,
    scaling: "wisdom",
    target: {
      type: "single",
      number: 1,
      distance: 1
    },
    tier: 1
  },
  ray: {
    id: "ray",
    name: "SPELL.GestureRay",
    cost: {
      action: 2,
      focus: 1
    },
    damage: {
      base: 4
    },
    hands: 1,
    scaling: "intellect",
    target: {
      type: "ray",
      number: 1,
      distance: 6
    },
    tier: 1
  },
  step: {
    id: "step",
    name: "SPELL.GestureStep",
    cost: {
      action: 1,
      focus: 1
    },
    hands: 0,
    nameFormat: NAME_FORMATS.ADJ,
    scaling: "dexterity",
    target: {
      type: "self",
      distance: 4
    },
    tier: 1
  },
  strike: {
    id: "strike",
    name: "SPELL.GestureStrike",
    hands: 0,
    nameFormat: NAME_FORMATS.ADJ,
    scaling: "strength",
    target: {
      type: "single",
      number: 1,
      distance: 1
    },
    tier: 1
  },
  touch: {
    id: "touch",
    name: "SPELL.GestureTouch",
    img: "icons/magic/light/hand-sparks-smoke-teal.webp",
    cost: {
      action: 1,
      focus: 0
    },
    damage: {
      base: 4
    },
    hands: 1,
    scaling: "dexterity",
    target: {
      type: "single",
      number: 1,
      distance: 1
    },
    tier: 1
  },
  ward: {
    id: "ward",
    name: "SPELL.GestureWard",
    cost: {
      action: 2,
      focus: 1
    },
    damage: {
      base: 6
    },
    hands: 1,
    scaling: "toughness",
    target: {
      type: "self"
    },
    tier: 1
  }
});

/**
 * The Metamagic Inflections which exist in the Crucible spellcraft system.
 * These config objects are instantiated as CrucibleInflection instances during system initialization.
 * @enum {CrucibleInflection}
 */
export const INFLECTIONS = Object.seal({
  extend: {
    id: "extend",
    name: "SPELL.MetamagicExtend",
    cost: {
      action: 1,
      focus: 1
    },
    tier: 1
  },
  negate: {
    id: "negate",
    name: "SPELL.MetamagicNegate",
    cost: {
      focus: 1
    },
    tier: 1
  },
  pull: {
    id: "pull",
    name: "SPELL.MetamagicPull",
    cost: {
      focus: 1
    },
    tier: 1
  },
  push: {
    id: "push",
    name: "SPELL.MetamagicPush",
    cost: {
      focus: 1
    },
    tier: 1
  }
});
