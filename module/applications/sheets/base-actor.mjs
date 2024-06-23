const {api, sheets} = foundry.applications;

/**
 * A base ActorSheet built on top of ApplicationV2 and the Handlebars rendering backend.
 */
export default class CrucibleBaseActorSheet extends api.HandlebarsApplicationMixin(sheets.ActorSheetV2) {

  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    classes: ["crucible", "actor", "standard-form"],
    tag: "form",
    position: {
      width: 900,
      height: 720
    },
    actions: {},
    form: {
      submitOnChange: true
    },
    actor: {
      type: undefined, // Defined by subclass
    }
  };

  /** @override */
  static PARTS = {
    sidebar: {
      id: "sidebar",
      template: "systems/crucible/templates/sheets/actor/sidebar.hbs"
    },
    tabs: {
      id: "tabs",
      template: "systems/crucible/templates/sheets/actor/tabs.hbs"
    },
    body: {
      id: "body",
      template: "systems/crucible/templates/sheets/actor/body.hbs"
    },
    header: {
      id: "header",
      template: "systems/crucible/templates/sheets/actor/header.hbs"
    },
    attributes: {
      id: "attributes",
      template: "systems/crucible/templates/sheets/actor/attributes.hbs"
    },
    biography: {
      id: "biography",
      template: "systems/crucible/templates/sheets/actor/biography.hbs"
    }
  };

  /**
   * Define the structure of tabs used by this Item Sheet.
   * @type {Record<string, Record<string, ApplicationTab>>}
   */
  static TABS = {
    sheet: [
      {id: "attributes", group: "sheet", label: "ACTOR.TABS.ATTRIBUTES"},
      {id: "skills", group: "sheet", label: "ACTOR.TABS.SKILLS"},
      {id: "talents", group: "sheet", label: "ACTOR.TABS.TALENTS"},
      {id: "inventory", group: "sheet", label: "ACTOR.TABS.INVENTORY"},
      {id: "spells", group: "sheet", label: "ACTOR.TABS.SPELLS"},
      {id: "biography", group: "sheet", label: "ACTOR.TABS.BIOGRAPHY"},
    ]
  }

  /** @override */
  tabGroups = {
    sheet: "attributes"
  };

  /* -------------------------------------------- */

  /**
   * A method which can be called by subclasses in a static initialization block to refine configuration options at the
   * class level.
   */
  static _initializeActorSheetClass() {
    const actor = this.DEFAULT_OPTIONS.actor;
    this.PARTS = foundry.utils.deepClone(this.PARTS);
    this.TABS = foundry.utils.deepClone(this.TABS);
    this.DEFAULT_OPTIONS.classes = [actor.type];
  }

  /* -------------------------------------------- */
  /*  Sheet Rendering                             */
  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const tabGroups = this.#getTabs();
    return {
      abilityScores: this.#prepareAbilities(),
      actions: this.#prepareAvailableActions(),
      actor: this.document,
      biography: this.#prepareBiography(),
      defenses: this.#prepareDefenses(),
      effects: this.#prepareActiveEffects(),
      featuredEquipment: this.#prepareFeaturedEquipment(),
      fieldDisabled: this.isEditable ? "" : "disabled",
      fields: this.document.system.schema.fields,
      incomplete: {},
      isEditable: this.isEditable,
      resources: this.#prepareResources(),
      source: this.document.toObject(),
      tabGroups,
      tabs: tabGroups.sheet
    };
  }

  /* -------------------------------------------- */

  /**
   * Configure the tabs used by this sheet.
   * @returns {Record<string, Record<string, ApplicationTab>>}
   */
  #getTabs() {
    const tabs = {};
    for ( const [groupId, config] of Object.entries(this.constructor.TABS) ) {
      const group = {};
      for ( const t of config ) {
        const active = this.tabGroups[t.group] === t.id;
        const icon = `systems/crucible/ui/tabs/${t.id}.webp`;
        group[t.id] = Object.assign({active, cssClass: active ? "active" : "", icon}, t);
      }
      tabs[groupId] = group;
    }
    return tabs;
  }

  /* -------------------------------------------- */

  /**
   * Prepare formatted ability scores for display on the Actor sheet.
   * @return {object[]}
   */
  #prepareAbilities() {
    const a = this.actor.system.abilities;
    const abilities = Object.values(SYSTEM.ABILITIES).map(cfg => {
      const ability = foundry.utils.deepClone(cfg);
      ability.value = a[ability.id].value;
      if ( this.actor.points ) {
        ability.canIncrease = this.actor.canPurchaseAbility(ability.id, 1);
        ability.canDecrease = this.actor.canPurchaseAbility(ability.id, -1);
      }
      return ability;
    });
    abilities.sort((a, b) => a.sheetOrder - b.sheetOrder);
    return abilities;
  }

  /* -------------------------------------------- */

  /**
   * Prepare enriched biography HTML for the actor.
   * @returns {Promise<{private: string, public: string}>}
   */
  async #prepareBiography() {
    const biography = this.document.system.details.biography;
    const context = {relativeTo: this.document, secrets: this.document.isOwner};
    return {
      public: await TextEditor.enrichHTML(biography.public, context),
      private: await TextEditor.enrichHTML(biography.private, context)
    }
  }

  /* -------------------------------------------- */

  /**
   * Prepare and structure data used to render defenses.
   * @returns {Record<string, object>}
   */
  #prepareDefenses() {
    const data = this.document.system.defenses;

    // Physical defenses
    const defenses = {
      physical: {
        value: data.physical.total,
        label: SYSTEM.DEFENSES.physical.label,
        subtitle: this.actor.equipment.armor.name,
        components: {
          armor: {
            value: data.armor.total,
            label: SYSTEM.DEFENSES.armor.label,
            pct: Math.round(data.armor.total * 100 / data.physical.total),
            cssClass: data.armor.total > 0 ? "active" : "inactive",
            separator: "="
          },
          dodge: {
            value: data.dodge.total,
            label: SYSTEM.DEFENSES.dodge.label,
            pct: Math.round(data.dodge.total * 100 / data.physical.total),
            cssClass: data.dodge.total > 0 ? "active" : "inactive",
            separator: "+"
          },
          parry: {
            value: data.parry.total,
            label: SYSTEM.DEFENSES.parry.label,
            pct: Math.round(data.parry.total * 100 / data.physical.total),
            cssClass: data.parry.total > 0 ? "active" : "inactive",
            separator: "+"
          },
          block: {
            value: data.block.total,
            label: SYSTEM.DEFENSES.block.label,
            pct: Math.round(data.block.total * 100 / data.physical.total),
            cssClass: data.block.total > 0 ? "active" : "inactive",
            separator: "+"
          }
        }
      },
    };

    // Non-physical defenses
    for ( const [id, defense] of Object.entries(SYSTEM.DEFENSES) ) {
      if ( defense.type === "physical" ) continue;
      const d = foundry.utils.mergeObject(defense, data[id], {inplace: false});
      d.id = id;
      if ( d.bonus !== 0 ) {
        const sign = d.bonus > 0 ? "+" : "-";
        d.tooltip += ` ${sign} ${Math.abs(d.bonus)}`;
      }
      defenses[id] = d;
    }
    return defenses;
  }

  /* -------------------------------------------- */

  /**
   * Prepare the items of equipment which are showcased at the top of the sidebar.
   * @returns {{name: string, img: string, tag: string[]}[]}
   */
  #prepareFeaturedEquipment() {
    const featuredEquipment = [];
    const {armor, weapons} = this.actor.equipment;
    const {mainhand: mh, offhand: oh, twoHanded: th} = weapons;
    featuredEquipment.push({name: mh.name, img: mh.img, tag: [mh.getTags().damage]});
    if ( oh?.id && !th ) featuredEquipment.push({name: oh.name, img: oh.img, tag: [oh.getTags().damage]})
    featuredEquipment.push({name: armor.name, img: armor.img, tag: armor.getTags().armor});
    return featuredEquipment;
  }

  /* -------------------------------------------- */

  /**
   * Prepare data for the set of actions that are displayed on the Available Actions portion of the sheet.
   * @returns {{img: *, name: *, id: *, totalCost, tags: *}[]}
   */
  #prepareAvailableActions() {
    const combatant = game.combat?.getCombatantByActor(this.actor);
    const actions = [];
    for ( const action of Object.values(this.actor.actions) ) {
      if ( !action._displayOnSheet(combatant) ) continue;
      const tags = action.getTags().activation;
      actions.push({
        id: action.id,
        name: action.name,
        img: action.img,
        tags,
        totalCost: action.cost.action + action.cost.focus
      });
    }
    actions.sort((a, b) => (a.totalCost - b.totalCost) || (a.name.localeCompare(b.name)));
    return actions;
  }

  /* -------------------------------------------- */

  /**
   * Format ActiveEffect data required for rendering the sheet
   * @returns {object[]}
   */
  #prepareActiveEffects() {
    return this.actor.effects.map(effect => {
      const {startRound, rounds, turns} = effect.duration;
      const elapsed = game.combat ? game.combat.round - startRound : 0;
      const tags = {};

      // Turn-based duration
      if ( Number.isFinite(turns) ) {
        const remaining = turns - elapsed;
        tags.duration = `${remaining} ${remaining === 1 ? "Turn" : "Turns"}`;
      }

      // Round-based duration
      else if ( Number.isFinite(rounds) ) {
        const remaining = rounds - elapsed + 1;
        tags.duration = `${remaining} ${remaining === 1 ? "Round" : "Rounds"}`;
      }

      // Infinite duration
      else tags.duration = "∞";
      return {
        id: effect.id,
        icon: effect.icon,
        label: effect.name,
        tags: tags
      }
    });
  }

  /* -------------------------------------------- */

  /**
   * Prepare and format the display of resource attributes on the actor sheet.
   * @returns {Record<string, {id: string, pct: number, color: {bg: string, fill: string}}>}
   */
  #prepareResources() {
    const resources = {};
    const rs = this.document.system.resources;

    // Pools
    for ( const [id, resource] of Object.entries(rs) ) {
      const r = foundry.utils.mergeObject(SYSTEM.RESOURCES[id], resource, {inplace: false});
      r.id = id;
      r.pct = Math.round(r.value * 100 / r.max);
      r.cssPct = `--resource-pct: ${100 - r.pct}%`;
      resources[r.id] = r;
    }

    // Action
    resources.action.pips = [];
    const maxAction = Math.min(resources.action.max, 6);
    for ( let i=1; i<=maxAction; i++ ) {
      const full = resources.action.value >= i;
      const double = (resources.action.value - 6) >= i;
      const cssClass = [full ? "full" : "", double ? "double" : ""].filterJoin(" ");
      resources.action.pips.push({full, double, cssClass});
    }

    // Focus
    resources.focus.pips = [];
    const maxFocus = Math.min(resources.focus.max, 12);
    for ( let i=1; i<=maxFocus; i++ ) {
      const full = resources.focus.value >= i;
      const double = (resources.focus.value - 12) >= i;
      const cssClass = [full ? "full" : "", double ? "double" : ""].filterJoin(" ");
      resources.focus.pips.push({full, double, cssClass});
    }

    // Heroism
    resources.heroism.pips = [];
    for ( let i=1; i<=3; i++ ) {
      const full = resources.heroism.value >= i;
      const cssClass = full ? "full" : "";
      resources.heroism.pips.push({full, double: false, cssClass});
    }
    return resources;
  }
}
