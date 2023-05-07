/**
 * The cost in skill points to obtain the next skill rank.
 * @enum {Readonly<{
 *  id: string,
 *  rank: number,
 *  label: string,
 *  description: string,
 *  cost: number,
 *  spent: number,
 *  bonus: number,
 *  path: boolean
 * }>}
 */
export const RANKS = {
  0: {
    id: "untrained",
    rank: 0,
    label: "SKILL.RANKS.Untrained",
    description: "SKILL.RANKS.UntrainedHint",
    cost: 0,
    spent: 0,
    bonus: -4,
    path: false
  },
  1: {
    id: "novice",
    rank: 1,
    label: "SKILL.RANKS.Novice",
    description: "SKILL.RANKS.NoviceHint",
    cost: 1,
    spent: 1,
    bonus: 0,
    path: false
  },
  2: {
    id: "apprentice",
    rank: 2,
    label: "SKILL.RANKS.Apprentice",
    description: "SKILL.RANKS.ApprenticeHint",
    cost: 1,
    spent: 2,
    bonus: 2,
    path: false
  },
  3: {
    id: "specialist",
    rank: 3,
    label: "SKILL.RANKS.Specialist",
    description: "SKILL.RANKS.SpecialistHint",
    cost: 2,
    spent: 4,
    bonus: 4,
    path: true
  },
  4: {
    id: "adept",
    rank: 4,
    label: "SKILL.RANKS.Adept",
    description: "SKILL.RANKS.AdeptHint",
    cost: 4,
    spent: 8,
    bonus: 8,
    path: false
  },
  5: {
    id: "master",
    rank: 5,
    label: "SKILL.RANKS.Master",
    description: "SKILL.RANKS.MasterHint",
    cost: 4,
    spent: 12,
    bonus: 12,
    path: true
  }
};

/**
 * A reverse mapping of skill rank IDs to rank numbers.
 * @enum {Readonly<number>}
 */
export const RANK_IDS = Object.freeze({
  untrained: 0,
  novice: 1,
  apprentice: 2,
  specialist: 3,
  adept: 4,
  master: 5
});

/**
 * The four thematic categories of skills. Each skill belongs to one of these four categories.
 * @enum {Readonly<{label: string, defaultIcon: string}>}
 */
export const CATEGORIES = {
  "exp": {
    label: "SKILL.CATEGORY.Exploration",
    hint: "SKILL.CATEGORY.ExplorationHint",
    defaultIcon: "icons/skills/no-exp.jpg"
  },
  "kno": {
    label: "SKILL.CATEGORY.Knowledge",
    hint: "SKILL.CATEGORY.KnowledgeHint",
    defaultIcon: "icons/skills/no-kno.jpg"
  },
  "soc": {
    label: "SKILL.CATEGORY.Social",
    hint: "SKILL.CATEGORY.SocialHint",
    defaultIcon: "icons/skills/no-soc.jpg"
  },
  "tch": {
    label: "SKILL.CATEGORY.Technical",
    hint: "SKILL.CATEGORY.TechnicalHint",
    defaultIcon: "icons/skills/no-tch.jpg"
  }
};

/**
 * The UUID of the journal entry which provides skill definitions to the system.
 * @type {string}
 */
export let JOURNAL_ID = "JournalEntry.CrucibleSkills00";

// The starting outline of each skill. The final structure of the SKILLS const is derived from this data.
export const SKILLS = {
  acrobatics: {
    id: "acrobatics",
    name: "SKILLS.Acrobatics",
    category: "exp",
    abilities: ["strength", "dexterity"]
  },
  perception: {
    id: "perception",
    name: "SKILLS.Perception",
    category: "exp",
    abilities: ["intellect", "wisdom"]
  },
  stealth: {
    id: "stealth",
    name: "SKILLS.Stealth",
    category: "exp",
    abilities: ["dexterity", "intellect"]
  },
  survival: {
    id: "survival",
    name: "SKILLS.Survival",
    category: "exp",
    abilities: ["toughness", "wisdom"]
  },
  arcana: {
    id: "arcana",
    name: "SKILLS.Arcana",
    category: "kno",
    abilities: ["intellect", "wisdom"]
  },
  investigation: {
    id: "investigation",
    name: "SKILLS.Investigation",
    category: "kno",
    abilities: ["intellect", "presence"]
  },
  lore: {
    id: "lore",
    name: "SKILLS.Lore",
    category: "kno",
    abilities: ["intellect", "wisdom"]
  },
  religion: {
    id: "religion",
    name: "SKILLS.Religion",
    category: "kno",
    abilities: ["wisdom", "presence"]
  },
  bartering: {
    id: "bartering",
    name: "SKILLS.Bartering",
    category: "soc",
    abilities: ["intellect", "presence"]
  },
  deception: {
    id: "deception",
    name: "SKILLS.Deception",
    category: "soc",
    abilities: ["intellect", "presence"]
  },
  diplomacy: {
    id: "diplomacy",
    name: "SKILLS.Diplomacy",
    category: "soc",
    abilities: ["wisdom", "presence"]
  },
  intimidation: {
    id: "intimidation",
    name: "SKILLS.Intimidation",
    category: "soc",
    abilities: ["strength", "presence"]
  },
  animal: {
    id: "animal",
    name: "SKILLS.AnimalHandling",
    category: "tch",
    abilities: ["strength", "wisdom"]
  },
  craftsmanship: {
    id: "craftsmanship",
    name: "SKILLS.Craftsmanship",
    category: "tch",
    abilities: ["dexterity", "intellect"]
  },
  medicine: {
    id: "medicine",
    name: "SKILLS.Medicine",
    category: "tch",
    abilities: ["toughness", "intellect"]
  },
  performance: {
    id: "performance",
    name: "SKILLS.Performance",
    category: "tch",
    abilities: ["dexterity", "presence"]
  },
};
