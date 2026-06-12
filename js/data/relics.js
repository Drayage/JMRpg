export const relics = {
  wanderer_compass: {
    id: "wanderer_compass",
    category: "job",
    tags: ["job", "cycling"],
    rules: [{ type: "advanced_event_weight", multiplier: 1.25 }, { type: "visited_job_damage", perJob: 0.02 }]
  },
  hero_oath: {
    id: "hero_oath",
    category: "holy",
    tags: ["focus", "damage"],
    rules: [{ type: "same_job_damage", perAction: 0.05 }]
  },
  forbidden_tome: {
    id: "forbidden_tome",
    category: "mastery",
    tags: ["mastery", "risk"],
    rules: [{ type: "focused_mastery", maxBonus: 1.5 }]
  },
  explorer_journal: {
    id: "explorer_journal",
    category: "job",
    tags: ["mastery", "cycling"],
    rules: [{ type: "mastered_job_damage", perJob: 0.04 }, { type: "mastered_job_event_xp", perJob: 0.03 }]
  },
  ancient_map: {
    id: "ancient_map",
    category: "job",
    tags: ["event", "advanced"],
    rules: [{ type: "advanced_event_weight", multiplier: 2.2 }]
  },
  golden_dice: {
    id: "golden_dice",
    category: "risk",
    tags: ["event", "risk"],
    rules: [{ type: "double_event_rewards" }]
  },
  berserker_blood: {
    id: "berserker_blood",
    category: "risk",
    tags: ["risk", "damage"],
    rules: [{ type: "missing_hp_damage", maxBonus: 0.6 }]
  },
  dark_contract: {
    id: "dark_contract",
    category: "dark",
    tags: ["boss", "risk"],
    rules: [{ type: "boss_damage", multiplier: 1.55 }, { type: "normal_incoming_damage", multiplier: 1.18 }]
  },
  ascetic_beads: {
    id: "ascetic_beads",
    category: "mastery",
    tags: ["ap", "focus"],
    rules: [{ type: "low_ap_mastery", threshold: 5, multiplier: 1.35 }]
  },
  mirror_shard: {
    id: "mirror_shard",
    category: "ap",
    tags: ["hybrid", "activation"],
    rules: [{ type: "off_theme_activation_bonus", amount: 0.04 }]
  },
  blood_hourglass: {
    id: "blood_hourglass",
    category: "dragon",
    tags: ["tempo", "risk"],
    rules: [{ type: "elite_reward_damage", rewardMultiplier: 1.35, incomingDamageMultiplier: 1.18 }]
  },
  sealed_badge: {
    id: "sealed_badge",
    category: "ap",
    tags: ["ap", "mastery"],
    rules: [{ type: "extra_ap", amount: 1 }, { type: "low_ap_mastery", threshold: 6, multiplier: 1.12 }]
  },
  dragon_heart: {
    id: "dragon_heart",
    category: "dragon",
    tags: ["dragon", "boss", "risk"],
    rules: [{ type: "boss_damage", multiplier: 1.25 }, { type: "elite_reward_damage", rewardMultiplier: 1.2, incomingDamageMultiplier: 1.1 }]
  },
  holy_grail: {
    id: "holy_grail",
    category: "holy",
    tags: ["holy", "support", "focus"],
    rules: [{ type: "low_ap_mastery", threshold: 6, multiplier: 1.25 }]
  },
  summoner_chalk: {
    id: "summoner_chalk",
    category: "summon",
    tags: ["summon", "activation"],
    rules: [{ type: "off_theme_activation_bonus", amount: 0.03 }]
  },
  black_candle: {
    id: "black_candle",
    category: "mastery",
    tags: ["dark", "mastery", "risk"],
    rules: [{ type: "focused_mastery", maxBonus: 1.2 }, { type: "normal_incoming_damage", multiplier: 1.08 }]
  },
  cartographers_badge: {
    id: "cartographers_badge",
    category: "job",
    tags: ["job", "discovery", "cycling"],
    rules: [{ type: "advanced_event_weight", multiplier: 1.45 }, { type: "visited_job_damage", perJob: 0.015 }]
  },
  pilgrim_boots: {
    id: "pilgrim_boots",
    category: "job",
    tags: ["job", "cycling"],
    rules: [{ type: "visited_job_damage", perJob: 0.025 }]
  },
  echo_manual: {
    id: "echo_manual",
    category: "mastery",
    tags: ["mastery", "collection"],
    rules: [{ type: "mastered_skill_damage", perSkill: 0.012 }]
  },
  glass_metronome: {
    id: "glass_metronome",
    category: "mastery",
    tags: ["mastery", "focus"],
    rules: [{ type: "focused_mastery", maxBonus: 1.0 }, { type: "off_theme_activation_bonus", amount: -0.02 }]
  },
  empty_socket: {
    id: "empty_socket",
    category: "ap",
    tags: ["ap", "loadout"],
    rules: [{ type: "extra_ap", amount: 1 }]
  },
  compact_grimoire: {
    id: "compact_grimoire",
    category: "ap",
    tags: ["ap", "mastery"],
    rules: [{ type: "extra_ap", amount: 1 }, { type: "focused_mastery", maxBonus: 0.75 }]
  },
  martyr_lantern: {
    id: "martyr_lantern",
    category: "holy",
    tags: ["holy", "survival"],
    rules: [{ type: "tag_activation_bonus", tag: "holy", amount: 0.06 }, { type: "low_ap_mastery", threshold: 6, multiplier: 1.12 }]
  },
  verdict_scale: {
    id: "verdict_scale",
    category: "holy",
    tags: ["holy", "boss"],
    rules: [{ type: "tag_damage", tag: "holy", multiplier: 1.18 }, { type: "boss_damage", multiplier: 1.12 }]
  },
  cursed_heart: {
    id: "cursed_heart",
    category: "dark",
    tags: ["dark", "risk"],
    rules: [{ type: "tag_damage", tag: "dark", multiplier: 1.26 }, { type: "normal_incoming_damage", multiplier: 1.14 }]
  },
  void_tithe: {
    id: "void_tithe",
    category: "dark",
    tags: ["dark", "boss", "risk"],
    rules: [{ type: "boss_damage", multiplier: 1.35 }, { type: "elite_reward_damage", rewardMultiplier: 1.1, incomingDamageMultiplier: 1.12 }]
  },
  trophy_brand: {
    id: "trophy_brand",
    category: "dragon",
    tags: ["dragon", "elite"],
    rules: [{ type: "elite_reward_damage", rewardMultiplier: 1.45, incomingDamageMultiplier: 1.08 }]
  },
  drake_scale_map: {
    id: "drake_scale_map",
    category: "dragon",
    tags: ["dragon", "job"],
    rules: [{ type: "advanced_event_weight", multiplier: 1.35 }, { type: "tag_damage", tag: "dragon", multiplier: 1.14 }]
  },
  chorus_bell: {
    id: "chorus_bell",
    category: "summon",
    tags: ["summon", "activation"],
    rules: [{ type: "tag_activation_bonus", tag: "summon", amount: 0.08 }]
  },
  puppet_crown: {
    id: "puppet_crown",
    category: "summon",
    tags: ["summon", "risk"],
    rules: [{ type: "tag_damage", tag: "summon", multiplier: 1.24 }, { type: "tag_activation_bonus", tag: "summon", amount: 0.04 }, { type: "normal_incoming_damage", multiplier: 1.1 }]
  },
  loaded_feather: {
    id: "loaded_feather",
    category: "critical",
    tags: ["critical", "highroll"],
    rules: [{ type: "tag_activation_bonus", tag: "critical", amount: 0.08 }]
  },
  execution_coin: {
    id: "execution_coin",
    category: "critical",
    tags: ["critical", "risk"],
    rules: [{ type: "tag_damage", tag: "critical", multiplier: 1.3 }, { type: "off_theme_activation_bonus", amount: -0.03 }]
  },
  venom_censer: {
    id: "venom_censer",
    category: "poison",
    tags: ["poison", "long_battle"],
    rules: [{ type: "poison_multiplier", multiplier: 1.55 }]
  },
  rusted_needle: {
    id: "rusted_needle",
    category: "bleed",
    tags: ["bleed", "poison"],
    rules: [{ type: "tag_damage", tag: "bleed", multiplier: 1.2 }, { type: "poison_multiplier", multiplier: 1.2 }]
  },
  shortcut_contract: {
    id: "shortcut_contract",
    category: "risk",
    tags: ["risk", "greed"],
    rules: [{ type: "double_event_rewards" }, { type: "elite_reward_damage", rewardMultiplier: 1.2, incomingDamageMultiplier: 1.25 }]
  },
  hungry_purse: {
    id: "hungry_purse",
    category: "risk",
    tags: ["risk", "ap"],
    rules: [{ type: "extra_ap", amount: 1 }, { type: "normal_incoming_damage", multiplier: 1.12 }]
  },
  broken_crown: {
    id: "broken_crown",
    category: "job",
    tags: ["advanced", "job"],
    rules: [{ type: "advanced_event_weight", multiplier: 1.6 }]
  }
};
