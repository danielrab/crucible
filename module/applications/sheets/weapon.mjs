import CrucibleBaseItemSheet from "./base-item.mjs";

/**
 * A CrucibleBaseItemSheet subclass used to configure Items of the "weapon" type.
 */
export default class WeaponSheet extends CrucibleBaseItemSheet {

  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    classes: ["weapon"]
  };

  /** @inheritDoc */
  static PARTS = foundry.utils.mergeObject(super.PARTS, {config: {
    template: `systems/crucible/templates/sheets/partials/weapon-config.hbs`
  }}, {inplace: false});

  /** @inheritDoc */
  static TABS = foundry.utils.deepClone(super.TABS);
  static {
    this.TABS.sheet.push({id: "actions", group: "sheet", icon: "fa-solid fa-bullseye", label: "ITEM.TABS.ACTIONS"})
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const allowedSlots = this.document.system.getAllowedEquipmentSlots();
    Object.assign(context, {
      equipmentSlots: Object.entries(SYSTEM.WEAPON.SLOTS.choices).reduce((arr, [value, label]) => {
        arr.push({value, label, disabled: !allowedSlots.includes(Number(value))});
        return arr;
      }, []),
      usesReload: this.document.config.category.reload,
      propertiesWidget: this.#propertiesWidget.bind(this),
      scaledPrice: new foundry.data.fields.StringField({label: game.i18n.localize("ARMOR.SHEET.SCALED_PRICE")}),
      animations: SYSTEM.WEAPON.ANIMATION_TYPES.reduce((obj, v) => {
        obj[v] = v;
        return obj;
      }, {})
    });
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Render the properties field as a multi-checkboxes element.
   * @returns {HTMLMultiCheckboxElement}
   */
  #propertiesWidget(field, groupConfig, inputConfig) {
    inputConfig.name = field.fieldPath;
    inputConfig.options = Object.entries(SYSTEM.WEAPON.PROPERTIES).map(([k, v]) => ({value: k, label: v.label}));
    inputConfig.type = "checkboxes";
    return foundry.applications.fields.createMultiSelectInput(inputConfig);
  }
}
