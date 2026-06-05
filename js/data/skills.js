export const skills = {
  basic_attack: {
    id: "basic_attack",
    type: "active",
    apCost: 0,
    chance: 1,
    priority: false,
    scalingStat: "PA",
    power: 1,
    tags: ["physical"],
    effects: [{ type: "damage", stat: "PA", power: 1 }]
  },
  power_slash: {
    id: "power_slash",
    type: "active",
    apCost: 2,
    chance: 0.55,
    priority: false,
    scalingStat: "PA",
    tags: ["physical", "melee"],
    effects: [{ type: "damage", stat: "PA", power: 1.7 }]
  },
  battle_instinct: {
    id: "battle_instinct",
    type: "passive",
    apCost: 2,
    tags: ["physical"],
    passiveStats: { PA: 3, CRT: 4 }
  },
  shield_bash: {
    id: "shield_bash",
    type: "active",
    apCost: 2,
    chance: 0.5,
    priority: false,
    scalingStat: "PD",
    tags: ["physical", "guard"],
    effects: [{ type: "damage", stat: "PD", power: 1.35 }, { type: "guard", amount: 4 }]
  },
  counterattack: {
    id: "counterattack",
    type: "special",
    apCost: 3,
    chance: 0.45,
    priority: true,
    condition: { type: "hp_below", value: 0.65 },
    scalingStat: "PD",
    tags: ["physical", "guard"],
    effects: [{ type: "damage", stat: "PD", power: 1.9 }, { type: "guard", amount: 6 }]
  },
  precise_shot: {
    id: "precise_shot",
    type: "active",
    apCost: 2,
    chance: 0.62,
    priority: false,
    scalingStat: "ACC",
    tags: ["physical", "ranged"],
    effects: [{ type: "damage", stat: "ACC", power: 1.45 }]
  },
  eagle_eye: {
    id: "eagle_eye",
    type: "passive",
    apCost: 2,
    tags: ["ranged"],
    passiveStats: { ACC: 5, CRT: 3 }
  },
  evasive_strike: {
    id: "evasive_strike",
    type: "active",
    apCost: 2,
    chance: 0.58,
    priority: false,
    scalingStat: "EVA",
    tags: ["physical", "agile"],
    effects: [{ type: "damage", stat: "EVA", power: 1.4 }, { type: "guard", amount: 3 }]
  },
  backstab: {
    id: "backstab",
    type: "special",
    apCost: 3,
    chance: 0.42,
    priority: true,
    condition: { type: "enemy_hp_above", value: 0.45 },
    scalingStat: "SPD",
    tags: ["physical", "agile", "critical"],
    effects: [{ type: "damage", stat: "SPD", power: 2.05, critBonus: 12 }]
  },
  healing_prayer: {
    id: "healing_prayer",
    type: "special",
    apCost: 3,
    chance: 0.5,
    priority: true,
    condition: { type: "hp_below", value: 0.55 },
    scalingStat: "MA",
    tags: ["holy", "support"],
    effects: [{ type: "heal", stat: "MA", power: 1.45 }]
  },
  holy_light: {
    id: "holy_light",
    type: "active",
    apCost: 3,
    chance: 0.52,
    priority: false,
    scalingStat: "MA",
    tags: ["holy", "magic"],
    effects: [{ type: "damage", stat: "MA", power: 1.55 }]
  },
  smite: {
    id: "smite",
    type: "active",
    apCost: 4,
    chance: 0.48,
    priority: false,
    scalingStat: "PA",
    tags: ["holy", "physical", "melee"],
    effects: [{ type: "damage", stat: "PA", power: 1.9 }]
  },
  firebolt: {
    id: "firebolt",
    type: "active",
    apCost: 2,
    chance: 0.6,
    priority: false,
    scalingStat: "MA",
    tags: ["magic", "fire"],
    effects: [{ type: "damage", stat: "MA", power: 1.45 }]
  },
  arcane_focus: {
    id: "arcane_focus",
    type: "passive",
    apCost: 2,
    tags: ["magic"],
    passiveStats: { MA: 4, MD: 2 }
  },
  spellblade: {
    id: "spellblade",
    type: "active",
    apCost: 4,
    chance: 0.48,
    priority: false,
    scalingStat: "MA",
    tags: ["magic", "physical", "melee"],
    effects: [{ type: "damage", stat: "MA", power: 1.05 }, { type: "damage", stat: "PA", power: 1.05 }]
  },
  poison_dart: {
    id: "poison_dart",
    type: "active",
    apCost: 2,
    chance: 0.55,
    priority: false,
    scalingStat: "ACC",
    tags: ["poison", "ranged"],
    effects: [{ type: "damage", stat: "ACC", power: 1.1 }, { type: "poison", power: 5, turns: 3 }]
  },
  venom_mastery: {
    id: "venom_mastery",
    type: "passive",
    apCost: 2,
    tags: ["poison"],
    passiveStats: { ACC: 3, SPD: 2 }
  },
  dragon_strike: {
    id: "dragon_strike",
    type: "active",
    apCost: 5,
    chance: 0.42,
    priority: false,
    scalingStat: "PA",
    tags: ["dragon", "physical", "melee"],
    effects: [{ type: "damage", stat: "PA", power: 2.45 }]
  },
  divine_aegis: {
    id: "divine_aegis",
    type: "special",
    apCost: 4,
    chance: 0.45,
    priority: true,
    condition: { type: "hp_below", value: 0.7 },
    scalingStat: "MD",
    tags: ["holy", "guard"],
    effects: [{ type: "heal", stat: "MD", power: 1.1 }, { type: "guard", amount: 12 }]
  },
  shadow_assault: {
    id: "shadow_assault",
    type: "special",
    apCost: 4,
    chance: 0.46,
    priority: true,
    condition: { type: "enemy_hp_below", value: 0.55 },
    scalingStat: "SPD",
    tags: ["dark", "agile", "critical"],
    effects: [{ type: "damage", stat: "SPD", power: 2.35, critBonus: 15 }]
  }
};
