export const bosses = {
  fallen_seraph: {
    id: "fallen_seraph",
    day: 30,
    traits: ["holy_vulnerability", "poison_immunity", "critical_resistance"],
    stats: { HP: 470, PA: 30, PD: 18, MA: 34, MD: 16, SPD: 15, ACC: 90, EVA: 10, CRT: 8, CRD: 35 },
    xp: 0,
    relicCategories: ["holy"]
  },
  iron_tyrant: {
    id: "iron_tyrant",
    day: 30,
    traits: ["physical_resistance", "summon_resistance", "poison_immunity"],
    stats: { HP: 560, PA: 38, PD: 26, MA: 8, MD: 14, SPD: 9, ACC: 88, EVA: 4, CRT: 5, CRD: 30 },
    xp: 0,
    relicCategories: ["melee"]
  },
  plague_dragon: {
    id: "plague_dragon",
    day: 30,
    traits: ["poison_immunity", "holy_vulnerability", "physical_resistance"],
    stats: { HP: 520, PA: 35, PD: 21, MA: 28, MD: 18, SPD: 13, ACC: 90, EVA: 8, CRT: 7, CRD: 40 },
    xp: 0,
    relicCategories: ["dragon"]
  },
  oathbreaker: {
    id: "oathbreaker",
    day: 10,
    traits: ["physical_resistance"],
    stats: { HP: 185, PA: 22, PD: 13, MA: 5, MD: 8, SPD: 10, ACC: 85, EVA: 6, CRT: 5, CRD: 35 },
    xp: 95,
    relicCategories: ["melee", "holy"]
  },
  void_acolyte: {
    id: "void_acolyte",
    day: 20,
    traits: ["critical_resistance", "holy_vulnerability"],
    stats: { HP: 310, PA: 18, PD: 14, MA: 30, MD: 18, SPD: 12, ACC: 88, EVA: 9, CRT: 6, CRD: 35 },
    xp: 150,
    relicCategories: ["dark", "magic"]
  }
};
