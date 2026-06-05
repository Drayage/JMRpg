export const relics = {
  wanderer_compass: {
    id: "wanderer_compass",
    category: "melee",
    tags: ["job", "cycling"],
    rules: [{ type: "preserve_job_xp", ratio: 0.3 }]
  },
  hero_oath: {
    id: "hero_oath",
    category: "holy",
    tags: ["focus", "damage"],
    rules: [{ type: "same_job_damage", perAction: 0.05 }]
  },
  forbidden_tome: {
    id: "forbidden_tome",
    category: "magic",
    tags: ["mastery", "risk"],
    rules: [{ type: "focused_mastery", maxBonus: 1.5 }]
  },
  explorer_journal: {
    id: "explorer_journal",
    category: "dragon",
    tags: ["mastery", "cycling"],
    rules: [{ type: "mastered_job_damage", perJob: 0.04 }, { type: "mastered_job_event_xp", perJob: 0.03 }]
  },
  ancient_map: {
    id: "ancient_map",
    category: "dragon",
    tags: ["event", "advanced"],
    rules: [{ type: "advanced_event_weight", multiplier: 2.2 }]
  },
  golden_dice: {
    id: "golden_dice",
    category: "magic",
    tags: ["event", "risk"],
    rules: [{ type: "double_event_rewards" }]
  },
  berserker_blood: {
    id: "berserker_blood",
    category: "melee",
    tags: ["risk", "damage"],
    rules: [{ type: "missing_hp_damage", maxBonus: 0.6 }]
  },
  dark_contract: {
    id: "dark_contract",
    category: "dark",
    tags: ["boss", "risk"],
    rules: [{ type: "boss_damage", multiplier: 1.55 }, { type: "normal_loss_xp", multiplier: 0 }]
  },
  ascetic_beads: {
    id: "ascetic_beads",
    category: "holy",
    tags: ["ap", "focus"],
    rules: [{ type: "low_ap_mastery", threshold: 5, multiplier: 1.35 }]
  },
  mirror_shard: {
    id: "mirror_shard",
    category: "dark",
    tags: ["hybrid", "activation"],
    rules: [{ type: "off_theme_activation_bonus", amount: 0.04 }]
  },
  blood_hourglass: {
    id: "blood_hourglass",
    category: "poison",
    tags: ["tempo", "risk"],
    rules: [{ type: "elite_reward_damage", rewardMultiplier: 1.35, incomingDamageMultiplier: 1.18 }]
  },
  sealed_badge: {
    id: "sealed_badge",
    category: "holy",
    tags: ["ap", "mastery"],
    rules: [{ type: "mastered_skill_ap_discount", amount: 1, minimumCost: 1 }]
  }
};
