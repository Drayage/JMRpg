export const relics = {
  holy_grail: {
    id: "holy_grail",
    category: "holy",
    tags: ["holy"],
    modifiers: [{ type: "tag_damage", tag: "holy", multiplier: 1.22 }, { type: "tag_heal", tag: "holy", multiplier: 1.18 }]
  },
  sun_censer: {
    id: "sun_censer",
    category: "holy",
    tags: ["holy"],
    modifiers: [{ type: "activation", tag: "holy", amount: 0.08 }]
  },
  dragon_scale: {
    id: "dragon_scale",
    category: "dragon",
    tags: ["dragon"],
    modifiers: [{ type: "stat", stat: "PD", amount: 6 }, { type: "stat", stat: "HP", amount: 18 }]
  },
  dragon_heart: {
    id: "dragon_heart",
    category: "dragon",
    tags: ["dragon"],
    modifiers: [{ type: "tag_damage", tag: "dragon", multiplier: 1.35 }, { type: "stat", stat: "PA", amount: 3 }]
  },
  berserker_blood: {
    id: "berserker_blood",
    category: "melee",
    tags: ["physical", "melee"],
    modifiers: [{ type: "tag_damage", tag: "melee", multiplier: 1.18 }, { type: "stat", stat: "CRT", amount: 5 }]
  },
  iron_medal: {
    id: "iron_medal",
    category: "melee",
    tags: ["physical", "guard"],
    modifiers: [{ type: "stat", stat: "PA", amount: 3 }, { type: "stat", stat: "PD", amount: 3 }]
  },
  dark_contract: {
    id: "dark_contract",
    category: "dark",
    tags: ["dark"],
    modifiers: [{ type: "tag_damage", tag: "dark", multiplier: 1.3 }, { type: "xp", tag: "dark", multiplier: 1.15 }]
  },
  shadow_coin: {
    id: "shadow_coin",
    category: "dark",
    tags: ["dark", "critical"],
    modifiers: [{ type: "stat", stat: "CRD", amount: 15 }, { type: "activation", tag: "critical", amount: 0.06 }]
  },
  glass_orb: {
    id: "glass_orb",
    category: "magic",
    tags: ["magic"],
    modifiers: [{ type: "stat", stat: "MA", amount: 5 }, { type: "tag_damage", tag: "magic", multiplier: 1.12 }]
  },
  storm_quill: {
    id: "storm_quill",
    category: "magic",
    tags: ["magic"],
    modifiers: [{ type: "activation", tag: "magic", amount: 0.07 }, { type: "stat", stat: "SPD", amount: 2 }]
  },
  viper_fang: {
    id: "viper_fang",
    category: "poison",
    tags: ["poison"],
    modifiers: [{ type: "tag_damage", tag: "poison", multiplier: 1.2 }, { type: "poison", multiplier: 1.35 }]
  },
  toxic_vial: {
    id: "toxic_vial",
    category: "poison",
    tags: ["poison"],
    modifiers: [{ type: "activation", tag: "poison", amount: 0.1 }, { type: "stat", stat: "ACC", amount: 3 }]
  }
};
