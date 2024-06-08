import CrucibleBaseItemSheet from "./base-item.mjs";

/**
 * A CrucibleBaseItemSheet subclass used to configure Items of the "armor" type.
 */
export default class ArmorSheet extends CrucibleBaseItemSheet {

  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    classes: ["armor"]
  };

  /** @inheritDoc */
  static PARTS = foundry.utils.mergeObject(super.PARTS, {
    description: {
      template: "systems/crucible/templates/sheets/partials/item-description.hbs"
    },
    config: {
      template: `systems/crucible/templates/sheets/partials/armor-config.hbs`
    },
    actions: {
      id: "actions",
      template: "systems/crucible/templates/sheets/partials/item-actions.hbs",
      templates: [
        "systems/crucible/templates/sheets/partials/included-action.hbs"
      ]
    }
  }, {inplace: false});

  /** @inheritDoc */
  static TABS = foundry.utils.mergeObject(super.TABS, {
    description: [
      {id: "public", group: "description", label: "ITEM.TABS.PUBLIC"},
      {id: "secret", group: "description", label: "ITEM.TABS.SECRET"}
    ]
  }, {inplace: false});
  static {
    this.TABS.sheet.push({id: "actions", group: "sheet", icon: "fa-solid fa-bullseye", label: "ITEM.TABS.ACTIONS"})
  }

  /** @inheritDoc */
  tabGroups = {sheet: "description", description: "public"};

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    Object.assign(context, {
      actionPartial: this.constructor.PARTS.actions.templates[0],
      armorWidget: this.#armorWidget.bind(this),
      dodgeWidget: this.#dodgeWidget.bind(this),
      propertiesWidget: this.#propertiesWidget.bind(this),
      scaledPrice: new foundry.data.fields.StringField({label: game.i18n.localize("ARMOR.SHEET.SCALED_PRICE")})
    });
    return context;
  }

  /* -------------------------------------------- */

  /**
   * A custom form field widget for rendering armor defense.
   */
  #armorWidget(field, groupConfig, inputConfig) {
    const config = this.document.system.config.category.armor;
    const {widget, fields} = ArmorSheet.#createDefenseWidget(field, groupConfig, inputConfig, config);
    fields.appendChild(ArmorSheet._createElement("label", {innerText: game.i18n.localize("ARMOR.SHEET.ARMOR_BONUS")}));
    const armorBonus = this.document.system.armor.bonus;
    fields.appendChild(foundry.applications.fields.createNumberInput({value: armorBonus, disabled: true}));
    return widget;
  }

  /* -------------------------------------------- */

  /**
   * A custom form field widget for rendering dodge defense.
   */
  #dodgeWidget(field, groupConfig, inputConfig) {
    const config = this.document.system.config.category.dodge;
    const {widget, fields} = ArmorSheet.#createDefenseWidget(field, groupConfig, inputConfig, config);
    fields.appendChild(ArmorSheet._createElement("label", {innerText: game.i18n.localize("ARMOR.SHEET.DODGE_SCALING")}));
    const dodgeStart = `${this.document.system.dodge.start} ${crucible.CONST.ABILITIES.dexterity.abbreviation}`;
    fields.appendChild(foundry.applications.fields.createTextInput({value: dodgeStart, disabled: true}));
    return widget;
  }

  /* -------------------------------------------- */

  /**
   * Render the properties field as a multi-checkboxes element.
   * @returns {HTMLMultiCheckboxElement}
   */
  #propertiesWidget(field, groupConfig, inputConfig) {
    inputConfig.name = field.fieldPath;
    inputConfig.options = Object.entries(SYSTEM.ARMOR.PROPERTIES).map(([k, v]) => ({value: k, label: v.label}));
    inputConfig.type = "checkboxes";
    return foundry.applications.fields.createMultiSelectInput(inputConfig);
  }

  /* -------------------------------------------- */

  /**
   * Logic common to both the armor and dodge widgets.
   * @returns {widget: HTMLDivElement, fields: HTMLDivElement}
   */
  static #createDefenseWidget(field, groupConfig, inputConfig, config) {
    const widget = ArmorSheet._createElement("div", {className: "form-group slim defense"});
    widget.appendChild(ArmorSheet._createElement("label", {innerText: field.label}));
    const fields = widget.appendChild(ArmorSheet._createElement("div", {className: "form-fields"}));
    fields.appendChild(ArmorSheet._createElement("label", {innerText: field.fields.base.label}));
    fields.appendChild(foundry.applications.fields.createNumberInput({value: inputConfig.value.base, min: config.min,
      max: config.max, step: 1}));
    return {widget, fields}
  }
}
