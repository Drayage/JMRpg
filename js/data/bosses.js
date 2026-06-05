export const bosses = {
  fallen_seraph: {
    id: "fallen_seraph",
    day: 30,
    traits: ["holy_vulnerability", "dark_resistance", "summon_resistance", "critical_weakness"],
    stats: { HP: 520, PA: 30, PD: 18, MA: 38, MD: 18, SPD: 15, ACC: 90, EVA: 10, CRT: 8, CRD: 35 },
    xp: 0,
    relicCategories: ["holy"]
  },
  iron_tyrant: {
    id: "iron_tyrant",
    day: 30,
    traits: ["physical_resistance", "summon_resistance", "poison_immunity"],
    stats: { HP: 610, PA: 40, PD: 28, MA: 8, MD: 16, SPD: 9, ACC: 88, EVA: 4, CRT: 5, CRD: 30 },
    xp: 0,
    relicCategories: ["melee"]
  },
  plague_dragon: {
    id: "plague_dragon",
    day: 30,
    traits: ["poison_immunity", "holy_vulnerability", "physical_resistance"],
    stats: { HP: 570, PA: 36, PD: 22, MA: 30, MD: 19, SPD: 13, ACC: 90, EVA: 8, CRT: 7, CRD: 40 },
    xp: 0,
    relicCategories: ["dragon"]
  },
  mirror_queen: {
    id: "mirror_queen",
    day: 30,
    traits: ["critical_resistance", "magic_resistance", "poison_vulnerability"],
    stats: { HP: 500, PA: 28, PD: 18, MA: 36, MD: 24, SPD: 18, ACC: 92, EVA: 16, CRT: 10, CRD: 45 },
    xp: 0,
    relicCategories: ["magic", "dark"]
  },
  world_serpent: {
    id: "world_serpent",
    day: 30,
    traits: ["dragon_resistance", "holy_vulnerability", "summon_weakness"],
    stats: { HP: 650, PA: 34, PD: 24, MA: 34, MD: 22, SPD: 12, ACC: 90, EVA: 7, CRT: 8, CRD: 38 },
    xp: 0,
    relicCategories: ["dragon", "summon"]
  },
  oathbreaker: {
    id: "oathbreaker",
    day: 10,
    traits: ["physical_resistance"],
    stats: { HP: 210, PA: 23, PD: 14, MA: 5, MD: 8, SPD: 10, ACC: 85, EVA: 6, CRT: 5, CRD: 35 },
    xp: 95,
    relicCategories: ["melee", "holy"]
  },
  void_acolyte: {
    id: "void_acolyte",
    day: 20,
    traits: ["critical_resistance", "holy_vulnerability"],
    stats: { HP: 340, PA: 18, PD: 14, MA: 31, MD: 18, SPD: 12, ACC: 88, EVA: 9, CRT: 6, CRD: 35 },
    xp: 150,
    relicCategories: ["dark", "magic"]
  },
  dragon_herald: {
    id: "dragon_herald",
    day: 20,
    traits: ["physical_resistance", "dragon_resistance"],
    stats: { HP: 360, PA: 32, PD: 18, MA: 20, MD: 16, SPD: 12, ACC: 88, EVA: 7, CRT: 7, CRD: 40 },
    xp: 160,
    relicCategories: ["dragon"]
  }
};
