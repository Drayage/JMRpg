export const eventTemplates = [
  { id: "basic_job_training", type: "training", tier: "basic", xp: 36, weight: 18, tags: ["job"] },
  { id: "advanced_job_training", type: "training", tier: "advanced", xp: 58, weight: 9, tags: ["job"] },
  { id: "hunt", type: "hunt", elite: false, weight: 18, tags: ["hunt"] },
  { id: "elite_hunt", type: "hunt", elite: true, weight: 8, tags: ["hunt"] },
  { id: "relic_event", type: "relic", weight: 8, tags: ["relic"] },
  { id: "stat_growth_event", type: "stats", weight: 10, tags: ["stats"] },
  { id: "holy_shrine", type: "directional", category: "holy", xp: 42, weight: 7, tags: ["holy"] },
  { id: "dragon_nest", type: "directional", category: "dragon", xp: 46, weight: 6, tags: ["dragon"] },
  { id: "dark_library", type: "directional", category: "dark", xp: 40, weight: 7, tags: ["dark"] },
  { id: "poison_marsh", type: "directional", category: "poison", xp: 40, weight: 6, tags: ["poison"] }
];
