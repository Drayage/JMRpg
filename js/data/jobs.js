const baseMilestones = (firstSkill, secondSkill, thirdSkill = null) => [
  { percent: 30, type: "skill", skillId: firstSkill },
  { percent: 70, type: "skill", skillId: secondSkill },
  ...(thirdSkill ? [{ percent: 90, type: "skill", skillId: thirdSkill }] : []),
  { percent: 100, type: "master" }
];

export const jobs = {
  warrior: {
    id: "warrior",
    tier: 1,
    xpRequired: 100,
    apReward: 1,
    themes: ["physical", "weapon", "frontline"],
    growth: { HP: 12, PA: 4, PD: 2 },
    milestones: baseMilestones("power_slash", "battle_focus")
  },
  archer: {
    id: "archer",
    tier: 1,
    xpRequired: 95,
    apReward: 1,
    themes: ["physical", "ranged", "critical"],
    growth: { HP: 7, PA: 2, SPD: 2, ACC: 4 },
    milestones: baseMilestones("precise_shot", "eagle_eye")
  },
  rogue: {
    id: "rogue",
    tier: 1,
    xpRequired: 90,
    apReward: 1,
    themes: ["physical", "speed", "critical", "poison"],
    growth: { HP: 6, PA: 2, SPD: 4, EVA: 4, CRT: 2 },
    milestones: baseMilestones("evasive_strike", "backstab")
  },
  cleric: {
    id: "cleric",
    tier: 1,
    xpRequired: 100,
    apReward: 1,
    themes: ["holy", "support", "magic"],
    growth: { HP: 8, MA: 3, MD: 4 },
    milestones: baseMilestones("healing_prayer", "holy_light")
  },
  wizard: {
    id: "wizard",
    tier: 1,
    xpRequired: 105,
    apReward: 1,
    themes: ["magic", "arcane", "fire"],
    growth: { HP: 5, MA: 5, MD: 2 },
    milestones: baseMilestones("firebolt", "arcane_focus", "arcane_blast")
  },
  knight: {
    id: "knight",
    tier: 2,
    xpRequired: 185,
    apReward: 1,
    themes: ["physical", "weapon", "frontline", "defensive"],
    requires: { masteredAny: ["warrior"], requiredTags: ["frontline"] },
    revealHints: ["Warrior lineage", "Frontline tag"],
    growth: { HP: 14, PA: 2, PD: 5, MD: 2 },
    milestones: baseMilestones("shield_bash", "counter_attack")
  },
  berserker: {
    id: "berserker",
    tier: 2,
    xpRequired: 180,
    apReward: 1,
    themes: ["physical", "weapon", "bleed", "risk"],
    requires: { visitedAny: ["warrior"], statThresholds: { PA: 18 } },
    revealHints: ["Warrior lineage", "High PA"],
    growth: { HP: 10, PA: 6, PD: 1, CRT: 2 },
    milestones: baseMilestones("berserk", "bloodlust")
  },
  hunter: {
    id: "hunter",
    tier: 2,
    xpRequired: 175,
    apReward: 1,
    themes: ["physical", "ranged", "beast", "critical"],
    requires: { visitedAny: ["archer"], statThresholds: { ACC: 20 } },
    revealHints: ["Archer lineage", "High ACC"],
    growth: { HP: 8, PA: 3, ACC: 5, SPD: 2 },
    milestones: baseMilestones("marked_shot", "trap_mastery")
  },
  assassin: {
    id: "assassin",
    tier: 2,
    xpRequired: 190,
    apReward: 1,
    themes: ["physical", "speed", "critical", "poison"],
    requires: { visitedAll: ["archer", "rogue"] },
    revealHints: ["Archer lineage", "Rogue lineage"],
    growth: { HP: 8, PA: 3, SPD: 6, ACC: 4, EVA: 3, CRT: 4 },
    milestones: baseMilestones("poison_dart", "venom_mastery", "shadow_assault")
  },
  priest: {
    id: "priest",
    tier: 2,
    xpRequired: 180,
    apReward: 1,
    themes: ["holy", "support", "magic"],
    requires: { masteredAny: ["cleric"] },
    revealHints: ["Cleric lineage"],
    growth: { HP: 7, MA: 4, MD: 5 },
    milestones: baseMilestones("holy_burst", "sanctuary")
  },
  dark_acolyte: {
    id: "dark_acolyte",
    tier: 2,
    xpRequired: 180,
    apReward: 1,
    themes: ["dark", "magic", "risk"],
    requires: { visitedAny: ["cleric", "wizard"], statThresholds: { MA: 18 } },
    revealHints: ["Cleric or Wizard lineage", "High MA"],
    growth: { HP: 6, MA: 5, MD: 2, CRT: 2 },
    milestones: baseMilestones("dark_bolt", "life_drain")
  },
  elementalist: {
    id: "elementalist",
    tier: 2,
    xpRequired: 185,
    apReward: 1,
    themes: ["magic", "fire", "ice", "lightning"],
    requires: { masteredAny: ["wizard"] },
    revealHints: ["Wizard lineage"],
    growth: { HP: 5, MA: 6, MD: 3 },
    milestones: baseMilestones("ice_lance", "chain_lightning", "meteor")
  },
  summoner: {
    id: "summoner",
    tier: 2,
    xpRequired: 185,
    apReward: 1,
    themes: ["magic", "summon", "beast"],
    requires: { visitedAny: ["wizard", "cleric"], statThresholds: { MD: 15 } },
    revealHints: ["Wizard or Cleric lineage", "High MD"],
    growth: { HP: 7, MA: 4, MD: 4 },
    milestones: baseMilestones("summon_wolf", "summon_skeleton")
  },
  paladin: {
    id: "paladin",
    tier: 3,
    xpRequired: 250,
    apReward: 1,
    themes: ["holy", "frontline", "physical", "defensive"],
    requires: { masteredAll: ["knight"], visitedAll: ["cleric"] },
    revealHints: ["Knight mastered", "Cleric visited"],
    growth: { HP: 12, PA: 3, PD: 3, MA: 3, MD: 4 },
    milestones: baseMilestones("smite", "divine_aegis", "judgment")
  },
  magic_knight: {
    id: "magic_knight",
    tier: 3,
    xpRequired: 240,
    apReward: 1,
    themes: ["physical", "magic", "weapon", "arcane"],
    requires: { visitedAll: ["warrior", "wizard"] },
    revealHints: ["Warrior visited", "Wizard visited"],
    growth: { HP: 10, PA: 3, PD: 2, MA: 4, MD: 2 },
    milestones: baseMilestones("spellblade", "mana_guard")
  },
  shadow_hunter: {
    id: "shadow_hunter",
    tier: 3,
    xpRequired: 255,
    apReward: 1,
    themes: ["speed", "critical", "ranged", "dark"],
    requires: { masteredAll: ["hunter", "rogue"] },
    revealHints: ["Hunter mastered", "Rogue mastered"],
    growth: { HP: 8, PA: 4, SPD: 5, ACC: 4, CRT: 5 },
    milestones: baseMilestones("shadow_step", "marked_execution")
  },
  necromancer: {
    id: "necromancer",
    tier: 3,
    xpRequired: 265,
    apReward: 1,
    themes: ["dark", "magic", "summon"],
    requires: { masteredAll: ["wizard", "dark_acolyte"] },
    revealHints: ["Wizard mastered", "Dark lineage mastered"],
    growth: { HP: 7, MA: 6, MD: 4 },
    milestones: baseMilestones("summon_skeleton", "corpse_bloom", "bone_armor")
  },
  battle_priest: {
    id: "battle_priest",
    tier: 3,
    xpRequired: 240,
    apReward: 1,
    themes: ["holy", "physical", "support", "frontline"],
    requires: { visitedAll: ["warrior"], masteredAll: ["priest"] },
    revealHints: ["Warrior visited", "Priest mastered"],
    growth: { HP: 11, PA: 3, MA: 3, MD: 4 },
    milestones: baseMilestones("war_prayer", "radiant_strike")
  },
  dragon_slayer: {
    id: "dragon_slayer",
    tier: 3,
    xpRequired: 265,
    apReward: 1,
    themes: ["physical", "weapon", "dragon", "bleed"],
    requires: { masteredAll: ["berserker", "knight"] },
    revealHints: ["Berserker mastered", "Knight mastered"],
    growth: { HP: 13, PA: 6, PD: 3, CRT: 3 },
    milestones: baseMilestones("dragon_roar", "dragon_strike")
  },
  beast_lord: {
    id: "beast_lord",
    tier: 3,
    xpRequired: 250,
    apReward: 1,
    themes: ["summon", "beast", "physical"],
    requires: { masteredAll: ["hunter"], visitedAll: ["summoner"] },
    revealHints: ["Hunter mastered", "Summoner visited"],
    growth: { HP: 10, PA: 3, MA: 3, ACC: 4 },
    milestones: baseMilestones("summon_bear", "pack_tactics")
  },
  arcane_assassin: {
    id: "arcane_assassin",
    tier: 3,
    xpRequired: 255,
    apReward: 1,
    themes: ["magic", "speed", "critical", "arcane"],
    requires: { masteredAll: ["assassin"], visitedAll: ["wizard"] },
    revealHints: ["Assassin mastered", "Wizard visited"],
    growth: { HP: 7, MA: 4, SPD: 5, EVA: 4, CRT: 5 },
    milestones: baseMilestones("phase_cut", "arcane_blast")
  },
  holy_executor: {
    id: "holy_executor",
    tier: 4,
    xpRequired: 330,
    apReward: 0,
    themes: ["holy", "frontline", "critical"],
    requires: { masteredAll: ["paladin"], skillMasteredAll: ["judgment"], requiredTags: ["holy", "frontline"] },
    revealHints: ["Holy lineage", "Frontline tag", "Judgment mastered"],
    growth: { HP: 12, PA: 5, MA: 5, CRT: 4 },
    milestones: baseMilestones("execution_rite", "final_verdict")
  },
  death_knight: {
    id: "death_knight",
    tier: 4,
    xpRequired: 315,
    apReward: 0,
    themes: ["dark", "frontline", "defensive"],
    requires: { masteredAll: ["dark_acolyte", "knight"] },
    revealHints: ["Dark lineage mastered", "Knight mastered"],
    growth: { HP: 14, PA: 4, PD: 4, MA: 3 },
    milestones: baseMilestones("grave_guard", "death_cleave")
  },
  blood_berserker: {
    id: "blood_berserker",
    tier: 4,
    xpRequired: 315,
    apReward: 0,
    themes: ["physical", "bleed", "risk"],
    requires: { masteredAll: ["berserker"], skillMasteredAll: ["life_drain"] },
    revealHints: ["Berserker mastered", "Lifesteal mastered"],
    growth: { HP: 10, PA: 8, CRT: 5, CRD: 10 },
    milestones: baseMilestones("hemorrhage", "red_frenzy")
  },
  dragon_knight: {
    id: "dragon_knight",
    tier: 4,
    xpRequired: 340,
    apReward: 0,
    themes: ["dragon", "frontline", "physical"],
    requires: { masteredAll: ["dragon_slayer"], relicCategoriesAny: ["dragon"] },
    revealHints: ["Dragon Slayer mastered", "Dragon relic obtained"],
    growth: { HP: 16, PA: 6, PD: 5, MA: 2 },
    milestones: baseMilestones("dragon_heart_art", "wyrm_guard")
  },
  lich: {
    id: "lich",
    tier: 4,
    xpRequired: 340,
    apReward: 0,
    themes: ["dark", "magic", "summon"],
    requires: { masteredAll: ["necromancer"], relicCategoriesAny: ["dark"] },
    revealHints: ["Necromancer mastered", "Dark relic obtained"],
    growth: { HP: 8, MA: 8, MD: 6 },
    milestones: baseMilestones("soul_archive", "death_pact")
  },
  sage: {
    id: "sage",
    tier: 4,
    xpRequired: 330,
    apReward: 0,
    themes: ["magic", "holy", "support"],
    requires: { masteredAll: ["elementalist", "priest"] },
    revealHints: ["Elementalist mastered", "Priest mastered"],
    growth: { HP: 8, MA: 6, MD: 6 },
    milestones: baseMilestones("grand_theory", "miracle")
  },
  shadow_emperor: {
    id: "shadow_emperor",
    tier: 4,
    xpRequired: 350,
    apReward: 0,
    themes: ["dark", "speed", "critical"],
    requires: { masteredAll: ["assassin", "shadow_hunter"] },
    revealHints: ["Assassin mastered", "Shadow Hunter mastered"],
    growth: { HP: 9, PA: 5, SPD: 8, EVA: 5, CRT: 6 },
    milestones: baseMilestones("eclipse_step", "imperial_backstab")
  },
  grand_summoner: {
    id: "grand_summoner",
    tier: 4,
    xpRequired: 350,
    apReward: 0,
    themes: ["summon", "magic", "beast"],
    requires: { masteredAll: ["summoner", "beast_lord"] },
    revealHints: ["Summoner mastered", "Beast Lord mastered"],
    growth: { HP: 10, MA: 6, MD: 5, ACC: 3 },
    milestones: baseMilestones("summon_drake", "legion_call")
  }
};
