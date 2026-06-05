export const jobs = {
  warrior: {
    id: "warrior",
    tier: 1,
    xpRequired: 100,
    apReward: 2,
    themes: ["physical", "melee", "guard"],
    growth: { HP: 12, PA: 4, PD: 2 },
    skills: ["power_slash", "battle_instinct"],
    milestones: [
      { percent: 30, type: "skill", skillId: "power_slash" },
      { percent: 70, type: "skill", skillId: "battle_instinct" },
      { percent: 100, type: "master" }
    ],
    unlocksOnMaster: ["knight"]
  },
  archer: {
    id: "archer",
    tier: 1,
    xpRequired: 95,
    apReward: 2,
    themes: ["physical", "ranged", "critical"],
    growth: { HP: 7, PA: 2, SPD: 2, ACC: 4 },
    skills: ["precise_shot", "eagle_eye"],
    milestones: [
      { percent: 30, type: "skill", skillId: "precise_shot" },
      { percent: 70, type: "skill", skillId: "eagle_eye" },
      { percent: 100, type: "master" }
    ]
  },
  rogue: {
    id: "rogue",
    tier: 1,
    xpRequired: 90,
    apReward: 2,
    themes: ["physical", "agile", "critical", "dark"],
    growth: { HP: 6, PA: 2, SPD: 4, EVA: 4, CRT: 2 },
    skills: ["evasive_strike", "backstab"],
    milestones: [
      { percent: 30, type: "skill", skillId: "evasive_strike" },
      { percent: 70, type: "skill", skillId: "backstab" },
      { percent: 100, type: "master" }
    ]
  },
  cleric: {
    id: "cleric",
    tier: 1,
    xpRequired: 100,
    apReward: 2,
    themes: ["holy", "support", "magic"],
    growth: { HP: 8, MA: 3, MD: 4 },
    skills: ["healing_prayer", "holy_light"],
    milestones: [
      { percent: 30, type: "skill", skillId: "healing_prayer" },
      { percent: 70, type: "skill", skillId: "holy_light" },
      { percent: 100, type: "master" }
    ]
  },
  wizard: {
    id: "wizard",
    tier: 1,
    xpRequired: 105,
    apReward: 1,
    themes: ["magic", "fire"],
    growth: { HP: 5, MA: 5, MD: 2 },
    skills: ["firebolt", "arcane_focus", "spellblade"],
    milestones: [
      { percent: 30, type: "skill", skillId: "firebolt" },
      { percent: 70, type: "skill", skillId: "arcane_focus" },
      { percent: 90, type: "skill", skillId: "spellblade" },
      { percent: 100, type: "master" }
    ]
  },
  knight: {
    id: "knight",
    tier: 2,
    xpRequired: 150,
    apReward: 1,
    themes: ["physical", "guard", "dragon"],
    requires: { masteredAny: ["warrior"], visitedAny: [] },
    growth: { HP: 14, PA: 2, PD: 5, MD: 2 },
    skills: ["shield_bash", "counterattack", "dragon_strike"],
    milestones: [
      { percent: 35, type: "skill", skillId: "shield_bash" },
      { percent: 75, type: "skill", skillId: "counterattack" },
      { percent: 90, type: "skill", skillId: "dragon_strike" },
      { percent: 100, type: "master" }
    ]
  },
  paladin: {
    id: "paladin",
    tier: 2,
    xpRequired: 180,
    apReward: 1,
    themes: ["holy", "guard", "physical", "melee"],
    requires: { masteredAll: ["warrior", "cleric"], visitedAny: [] },
    growth: { HP: 12, PA: 3, PD: 3, MA: 3, MD: 4 },
    skills: ["smite", "divine_aegis"],
    milestones: [
      { percent: 35, type: "skill", skillId: "smite" },
      { percent: 75, type: "skill", skillId: "divine_aegis" },
      { percent: 100, type: "master" }
    ]
  },
  assassin: {
    id: "assassin",
    tier: 2,
    xpRequired: 165,
    apReward: 1,
    themes: ["poison", "dark", "agile", "critical"],
    requires: { masteredAll: ["archer", "rogue"], visitedAny: [] },
    growth: { HP: 8, PA: 3, SPD: 6, ACC: 4, EVA: 3, CRT: 4 },
    skills: ["poison_dart", "venom_mastery", "shadow_assault"],
    milestones: [
      { percent: 30, type: "skill", skillId: "poison_dart" },
      { percent: 60, type: "skill", skillId: "venom_mastery" },
      { percent: 85, type: "skill", skillId: "shadow_assault" },
      { percent: 100, type: "master" }
    ]
  }
};
