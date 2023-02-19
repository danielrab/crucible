export default {
  "beast-shape-revert": {
    confirm: async (actor, action, outcomes) => {
      const effect = actor.effects.find(e => e.getFlag("crucible", "action") === "beast-shape");
      await effect.delete();
    }
  },
  "second-wind": {
    post: (actor, action, target) => {
      return actor.alterResources({health: actor.attributes.toughness.value}, {}, {statusText: action.name});
    }
  },
  "shield-bash": {
    can: (actor, action) => {
      if ( !actor.system.status.basicStrike ) throw new Error("You can only perform Shield Bash after a basic Strike.");
      if ( actor.system.status.shieldBash ) throw new Error("You cannot use Shield Bash again this Turn.");
    },
    post: async (actor, action, target) => action.usage.actorUpdates["system.status.shieldBash"] = true
  },
  "strike": {
    post: async (actor, action, target, rolls) => {
      if ( !rolls[0].isCriticalFailure ) action.usage.actorUpdates["system.status.basicStrike"] = true;
    }
  },
  "offhand-strike": {
    prepare: (actor, action) => {
      const {basicStrike, offhandStrike} = actor.system.status;
      if ( basicStrike && !offhandStrike ) action.actionCost = 0;
    },
    post: async (actor, action, target) => action.usage.actorUpdates["system.status.offhandStrike"] = true
  },
  "uppercut": {
    can: (actor, action) => {
      if ( !actor.system.status.basicStrike ) throw new Error("You can only perform Uppercut after a basic Strike.");
      if ( actor.system.status.uppercut ) throw new Error("You cannot use Uppercut again this Turn.");
    },
    post: async (actor, action, target) => action.usage.actorUpdates["system.status.uppercut"] = true
  },
  "vampiric-bite": {
    pre: (actor, action) => {
      const cls = getDocumentClass("Item");
      const bite = new cls(CONFIG.SYSTEM.WEAPON.VAMPIRE_BITE, {parent: actor});
      action.context.weapon = bite;
      action.context.tags.add("Vampiric Bite");
      foundry.utils.mergeObject(action.usage.bonuses, bite.system.actionBonuses);
      foundry.utils.mergeObject(action.context, {
        type: "weapons",
        label: "Weapon Tags",
        icon: "fa-solid fa-swords",
        hasDice: true
      });
    },
    roll: (actor, action, target) => action.context.weapon.attack(target, action.usage.bonuses),
    confirm: async (actor, action, outcomes) => {
      for ( const outcome of outcomes.values() ) {
        if ( outcome.total ) {
          await actor.alterResources({"health": actor.attributes.toughness.value}, {}, {statusText: action.name});
          break;
        }
      }
    }
  },
}
