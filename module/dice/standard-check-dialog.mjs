const {DialogV2} = foundry.applications.api;

/**
 * Prompt the user to perform a Standard Check.
 * @extends {DialogV2}
 */
export default class StandardCheckDialog extends DialogV2 {

  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    id: "dialog-{id}",
    classes: ["crucible", "dialog", "roll"],
    window: {
      contentTag: "form",
      contentClasses: ["standard-form", "standard-check"]
    }
  };

  /**
   * The template path used to render the Dialog.
   * @type {string}
   */
  static #TEMPLATE = "systems/crucible/templates/dice/standard-check-dialog.hbs";

  /**
   * A StandardCheck dice pool instance which organizes the data for this dialog
   * @type {StandardCheck}
   */
  roll = this.options.roll;

  /** @override */
  get title() {
    if ( this.options.window.title ) return this.options.window.title;
    const type = this.roll.data.type;
    const skill = SYSTEM.SKILLS[type];
    if ( skill ) return `${skill.name} Skill Check`;
    return "Generic Dice Check";
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _initializeApplicationOptions(options) {
    options = super._initializeApplicationOptions(options);
    options.buttons = {
      roll: {action: "roll", label: "Roll", icon: "fa-solid fa-dice", callback: this._onRoll.bind(this)},
      request: {action: "request", label: "Request", callback: this._onRequest.bind(this)}
    }
    return options;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preFirstRender(context, options) {
    await getTemplate(StandardCheckDialog.#TEMPLATE);
    await super._preFirstRender(context, options);
  }

  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const data = this.roll.data;
    const displayGMOptions = false; // TODO temporarily disable for playtest 1
    options.position = {width: displayGMOptions ? 520 : 360};
    return Object.assign({}, data, {
      dice: this.roll.dice.map(d => `d${d.faces}`),
      difficulty: this._getDifficulty(data.dc),
      difficulties: Object.entries(SYSTEM.dice.checkDifficulties).map(d => ({dc: d[0], label: `${d[1]} (DC ${d[0]})`})),
      isGM: displayGMOptions,
      rollMode: this.options.rollMode || game.settings.get("core", "rollMode"),
      rollModes: CONFIG.Dice.rollModes,
      canIncreaseBoons: data.totalBoons < SYSTEM.dice.MAX_BOONS,
      canDecreaseBoons: data.totalBoons > 0,
      canIncreaseBanes: data.totalBanes < SYSTEM.dice.MAX_BOONS,
      canDecreaseBanes: data.totalBanes > 0
    });
  }

  /* -------------------------------------------- */

  /** @override */
  async _renderHTML(context, _options) {
    const html = await renderTemplate(StandardCheckDialog.#TEMPLATE, context);
    const div = document.createElement("div");
    div.innerHTML = html;
    return Array.from(div.children);
  }

  /* -------------------------------------------- */

  /** @override */
  _replaceHTML(result, content, _options) {
    content.replaceChildren(...result);
  }

  /* -------------------------------------------- */

  /**
   * Get the text label for a roll DC.
   * @param {number} dc    The difficulty check for the test
   * @return {{dc: number, label: string, tier: number}}
   * @private
   */
  _getDifficulty(dc) {
    let label = "";
    let tier = 0;
    for ( let [d, l] of Object.entries(SYSTEM.dice.checkDifficulties) ) {
      if ( dc >= d ) {
        tier = d;
        label = `${l} (DC ${d})`;
      }
      else break;
    }
    return {dc, label, tier};
  }

  /* -------------------------------------------- */

  /** @override */
  _onRender(_context, _options) {
    const form = this.element.querySelector("form.window-content");
    form.addEventListener("submit", event => this._onSubmit(event.submitter, event));
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Resolve dialog submission to enact a Roll.
   * @returns {StandardCheck}
   * @protected
   */
  _onRoll(_event, _button, _dialog) {
    return this.roll;
  }

  /* -------------------------------------------- */

  /**
   * Resolve dialog submission to request a Roll.
   * @returns {StandardCheck}
   * @protected
   */
  _onRequest(_event, _button, _dialog) {
    return this.roll; // TODO implement this
  }

  /* -------------------------------------------- */

  /** @override */
  _onClickAction(event, target) {
    const action = target.dataset.action;
    const form = this.element.querySelector("form");
    const rollData = this.roll.data;
    switch ( action ) {
      case "boon-add":
        this.roll.initialize({boons: StandardCheckDialog.#modifyBoons(rollData.boons, 1)});
        return this.render(false, {height: "auto"});
      case "boon-subtract":
        this.roll.initialize({boons: StandardCheckDialog.#modifyBoons(rollData.boons, -1)});
        return this.render(false, {height: "auto"});
      case "bane-add":
        this.roll.initialize({banes: StandardCheckDialog.#modifyBoons(rollData.banes, 1)});
        return this.render(false, {height: "auto"});
      case "bane-subtract":
        this.roll.initialize({banes: StandardCheckDialog.#modifyBoons(rollData.banes, -1)});
        return this.render(false, {height: "auto"});
      case "request": // TODO
        this._updatePool(form);
        this.roll.request({
          title: this.title,
          flavor: this.options.flavor
        });
        const actor = game.actors.get(rollData.actorId);
        ui.notifications.info(`Requested a ${rollData.type} check be made by ${actor.name}.`);
        return this.close();
    }
  }

  /* -------------------------------------------- */

  /**
   * Update the boons or banes object by changing the number of "special" boons applied to the roll.
   * @param {Object<string, DiceBoon>} boons    The initial configuration of boons
   * @param {number} delta                      The requested delta change in special boons
   * @returns {Object<string, DiceBoon>}        The updated boons object
   */
  static #modifyBoons(boons, delta) {
    boons.special ||= {label: "Special", number: 0};
    const total = Object.values(boons).reduce((t, b) => t + (b.id === "special" ? 0 : b.number), 0);
    boons.special.number = Math.clamp(boons.special.number + delta, 0, SYSTEM.dice.MAX_BOONS - total);
    return boons;
  }

  /* -------------------------------------------- */

  /**
   * Handle changes to the difficulty tier select input
   * TODO support this
   * @param {Event} event           The event which triggers on select change
   * @private
   */
  _onChangeDifficultyTier(event) {
    event.preventDefault();
    event.stopPropagation();
    this._updatePool({dc: parseInt(event.target.value)});
    return this.render();
  }

  /* -------------------------------------------- */

  /**
   * Handle updating the StandardCheck dice pool
   * @param {HTMLFormElement} form    The updated form HTML
   * @param {object} updates          Additional data updates
   * @private
   */
  _updatePool(form, updates={}) {
    const fd = new FormDataExtended(form);
    updates = foundry.utils.mergeObject(fd.object, updates);
    this.roll.initialize(updates);
  }

  /* -------------------------------------------- */
  /*  Factory Methods                             */
  /* -------------------------------------------- */

  /** @inheritdoc */
  static async prompt(config={}) {
    config.rejectClose = false;
    return super.prompt(config);
  }
}
