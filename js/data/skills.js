import { jobs } from "./jobs.js?v=20260607-15";

const damage = (stat, power, extra = {}) => ({ type: "damage", stat, power, ...extra });
const heal = (stat, power, extra = {}) => ({ type: "heal", stat, power, ...extra });
const shield = (amount, stat = null, power = 0) => ({ type: "shield", amount, stat, power });
const status = (id, target, turns, extra = {}) => ({ type: "status", id, target, turns, ...extra });
const typedStatus = (kind, amount, turns = null, extra = {}) => ({ type: "typed_status", kind, amount, turns, ...extra });
const passive = (statMods, extra = {}) => ({ type: "passive", statMods, ...extra });
const poison = (amount) => ({ type: "poison", amount });
const summon = (id, role, count = 1, extra = {}) => ({ type: "summon", summonId: id, role, count, ...extra });
const resource = (key, amount, extra = {}) => ({ type: "resource", key, amount, ...extra });
const rune = (id, trigger, effects, extra = {}) => ({ type: "rune", runeId: id, trigger, effects, ...extra });
const extraAction = (chance = 1, limit = 10) => ({ type: "extra_action", chance, limit });
const sacrifice = (ratio) => ({ type: "sacrifice", ratio });
const consumeResource = (key, power, extra = {}) => ({ type: "consume_resource", key, power, ...extra });
const consumeStatus = (kind, power, extra = {}) => ({ type: "consume_status", kind, power, ...extra });
const clearResource = (key) => ({ type: "clear_resource", key });
const statTradeoff = (statMods, extra = {}) => ({ type: "stat_tradeoff", statMods, ...extra });

const tierCost = (tier, offset = 0) => Math.max(1, Math.min(6, Math.ceil(tier / 2) + offset));
const activeChance = (tier) => Math.max(0.34, 0.5 - tier * 0.02);
const specialChance = (tier) => Math.max(0.42, 0.62 - tier * 0.025);
const scale = (tier, base = 1) => Math.round((base + tier * 0.18) * 100) / 100;
const accScale = (tier, base = 0.08) => Math.round((base + tier * 0.015) * 100) / 100;
const has = (job, tag) => job.themes?.includes(tag);

function coreDamageStat(job) {
  if (has(job, "magic") || has(job, "ma") || has(job, "burn") || has(job, "freeze") || has(job, "shock") || has(job, "decay")) return "MA";
  if (has(job, "pd") || has(job, "shield") || has(job, "absolute")) return "PD";
  if (has(job, "current_hp") || has(job, "max_hp")) return "HP";
  if (has(job, "ranged") || has(job, "acc")) return "ACC";
  if (has(job, "evasion") || has(job, "rhythm")) return "EVA";
  return "PA";
}

function activeEffects(job, tier) {
  const stat = coreDamageStat(job);
  if (has(job, "low_hp")) return [damage("PA", scale(tier, 1.15), { missingHpPower: 1.2 }), sacrifice(0.04)];
  if (has(job, "swordsmanship")) return [damage("PA", scale(tier, 0.95), { swordsmanshipPower: 0.08 }), resource("swordsmanship", 1)];
  if (has(job, "shield_break")) return [damage("PA", scale(tier, 1), { shieldBreak: 14 + tier * 4 }), typedStatus("fracture", 4 + tier, 3)];
  if (has(job, "absolute")) return [damage("PD", scale(tier, 0.9), { absolute: true }), shield(4 + tier * 2, "PD", 0.25)];
  if (has(job, "pd_to_pa")) return [damage("PD", scale(tier, 0.95), { absolute: true, pdToPa: 0.35 }), status("dragon_form", "self", 2, { statMods: { PA: 3 + tier } })];
  if (has(job, "enemy_current_hp")) return [damage("PA", scale(tier, 0.78), { enemyCurrentHpPower: 0.07 + tier * 0.01, critBonus: tier * 2 }), typedStatus("bleed", 3 + tier, 3)];
  if (has(job, "reverse_crit")) return [damage("PA", scale(tier, 1.05), { inverseCrit: true, inverseCritBase: 38 + tier * 4, inverseCritFloor: 8 })];
  if (has(job, "evasion")) return [damage("EVA", scale(tier, 0.9), { evadeBonusPower: 0.12 }), status("flow", "self", 2, { statMods: { EVA: 2 + tier } })];
  if (has(job, "rhythm")) return [damage("EVA", scale(tier, 0.75), { spendEvasion: 2 + tier }), status("rhythm", "self", 2, { statMods: { EVA: 3 + tier } })];
  if (has(job, "predation")) return [damage("ACC", accScale(tier, 0.08), { predation: true, enemyMissingHpPower: 0.1 + tier * 0.015 }), status("aiming", "self", 999, { permanent: true, stack: true, statMods: { ACC: 4 + tier } })];
  if (has(job, "extra_action")) return [damage("ACC", accScale(tier, 0.06)), status("aiming", "self", 999, { permanent: true, stack: true, statMods: { ACC: 4 + tier * 2 } }), extraAction(0.35 + tier * 0.04)];
  if (has(job, "summon")) return [damage(stat, scale(tier, 0.65)), summon(`${job.id}_ally`, has(job, "frontline") || has(job, "bear") ? "tank" : has(job, "legion") ? "legion" : "striker", has(job, "legion") ? Math.min(6, 1 + tier) : 1, { stat, tier })];
  if (has(job, "food")) return [damage("HP", scale(tier, 0.08), { currentHpPower: 0.18, inverseScaleStat: "EVA", inverseScaleBase: 30 + tier * 3, inverseScalePower: 3 + tier }), heal("HP", 0.12, { overheal: true })];
  if (has(job, "heal")) return [heal("MA", scale(tier, 1.35), { maxHpRatio: 0.02, overheal: has(job, "overheal") }), typedStatus("regeneration", 4 + tier * 2, 3, { target: "self" })];
  if (has(job, "decay")) return [damage("MA", scale(tier, 0.9)), typedStatus("decay", 5 + tier * 2, 4)];
  if (has(job, "burn")) return [damage("MA", scale(tier, 0.95), { aoe: true }), typedStatus("burn", 5 + tier * 2, 3)];
  if (has(job, "freeze")) return [damage("MA", scale(tier, 0.85)), typedStatus("freeze", 3 + tier, 3)];
  if (has(job, "shock")) return [damage("MA", scale(tier, 1.05)), typedStatus("shock", 3 + tier, 3)];
  if (has(job, "fracture")) return [damage(stat, scale(tier, 0.9)), typedStatus("fracture", 4 + tier, 4)];
  if (has(job, "poison")) return [damage("ACC", accScale(tier, 0.06)), poison(8 + tier * 5), status("aiming", "self", 999, { permanent: true, stack: true, statMods: { ACC: 3 + tier } })];
  if (has(job, "rune")) return [damage("MA", scale(tier, 0.65)), rune(`${job.id}_attack_rune`, "after_damage", [damage("MA", scale(tier, 0.45))], { maxInstalled: 100 })];
  if (has(job, "life_cost")) return [sacrifice(0.06), damage("MA", scale(tier, 1.25), { lifeSteal: 0.25 })];
  if (has(job, "misfortune") || has(job, "fate")) return [damage("MA", scale(tier, 0.75)), typedStatus("misfortune", 3 + tier, 3)];
  return [damage(stat, scale(tier, 1))];
}

function canUseAbsoluteDamage(job) {
  return has(job, "absolute") && (has(job, "frontline") || has(job, "pd_to_pa") || has(job, "judgment"));
}

function coreEffects(job, tier) {
  if (has(job, "ma_amp")) return [status("ma_amplified", "self", 999, { permanent: true, stack: true, statMods: { MA: 4 + tier }, damageMultiplier: 1.05 })];
  if (has(job, "balance")) return [damage("PA", scale(tier, 0.75), { balancePower: 0.04 }), damage("MA", scale(tier, 0.75), { balancePower: 0.04 })];
  if (has(job, "judgment")) return [heal("MA", scale(tier, 0.8), { maxHpRatio: 0.02 }), resource("judgment", 10 + tier * 5, { fromHeal: true })];
  if (has(job, "self_status")) return [typedStatus("weaken", 2, 2, { target: "self" }), typedStatus("bleed", 3 + tier, 2, { target: "self" }), status("cursed_rage", "self", 999, { permanent: true, stack: true, statMods: { PA: 4 + tier, CRD: 8 + tier * 2 }, damageMultiplier: 1.08 })];
  if (has(job, "shadow_dance")) return [passive({ EVA: 3 + tier, CRT: 3 + tier })];
  if (has(job, "contract")) return [summon(`${job.id}_entity`, has(job, "bear") || has(job, "dragon") ? "tank" : "striker", 1, { contract: true, stat: coreDamageStat(job), tier })];
  if (has(job, "shield") || has(job, "pd")) return [shield(8 + tier * 4, "PD", 0.45), status("guarded", "self", 2, { defenseMultiplier: 1.08 })];
  if (has(job, "swordsmanship")) return [resource("swordsmanship", 2 + tier), status("sword_form", "self", 999, { permanent: true, statMods: { PA: 2 + tier, ACC: 1 + tier } })];
  if (has(job, "rune")) return [rune(`${job.id}_guard_rune`, "on_hit", [shield(6 + tier * 2), damage("MA", scale(tier, 0.35))], { maxInstalled: 100 })];
  if (has(job, "heal")) return [heal("MD", scale(tier, 1.1), { maxHpRatio: 0.03, overheal: true }), typedStatus("regeneration", 6 + tier * 2, 3, { target: "self" })];
  if (has(job, "rhythm")) return [passive({ EVA: 2 + tier, SPD: 1 + tier })];
  return [passive({ [coreDamageStat(job)]: 2 + tier })];
}

function artEffects(job, tier) {
  if (has(job, "judgment")) return [consumeResource("judgment", 0.9, { absolute: true, stat: "MD" })];
  if (has(job, "burn")) return [damage("MA", scale(tier, 1.2), { aoe: true, consumeStatus: "burn", consumeStatusPower: 1.2 }), typedStatus("burn", 6 + tier * 3, 3)];
  if (has(job, "poison")) return [damage("ACC", accScale(tier, 0.1), { poisonPower: 0.6 }), poison(12 + tier * 6), status("aiming", "self", 999, { permanent: true, stack: true, statMods: { ACC: 4 + tier } })];
  if (has(job, "predation") || has(job, "enemy_missing_hp")) return [damage("ACC", accScale(tier, 0.12), { predation: true, enemyMissingHpPower: 0.18 + tier * 0.02 })];
  if (has(job, "extra_action")) return [damage("ACC", accScale(tier, 0.1), { resourceKey: "mark", resourcePower: 0.03 }), status("calibrated_reload", "self", 999, { permanent: true, stack: true, statMods: { ACC: 4 + tier * 2 } }), extraAction(0.35 + tier * 0.03, 5)];
  if (has(job, "enemy_current_hp")) return [damage("PA", scale(tier, 1.0), { enemyCurrentHpPower: 0.14 + tier * 0.015, critBonus: 4 + tier * 2 }), typedStatus("bleed", 5 + tier * 2, 3)];
  if (has(job, "low_hp")) return [damage("PA", scale(tier, 1.45), { missingHpPower: 1.8, lowMaPower: 0.03, statusCountPower: 0.08 }), sacrifice(0.08)];
  if (has(job, "absolute")) return [damage("PD", scale(tier, 1.2), { absolute: true }), shield(12 + tier * 5, "PD", 0.6)];
  if (has(job, "pd_to_pa")) return [damage("PD", scale(tier, 1.25), { absolute: true, pdToPa: 0.75 }), damage("PA", scale(tier, 0.75), { absolute: true })];
  if (has(job, "summon")) return [summon(`${job.id}_elite`, has(job, "legion") ? "legion" : has(job, "bear") ? "tank" : "striker", has(job, "legion") ? Math.min(12, 2 + tier * 2) : 1, { stat: coreDamageStat(job), tier, elite: true }), damage(coreDamageStat(job), scale(tier, 0.85), { aoe: true })];
  if (has(job, "rune")) return [rune(`${job.id}_death_rune`, "on_low_hp", [damage("MA", scale(tier, 1.5)), typedStatus("shock", 4 + tier, 2)], { maxInstalled: 100 })];
  if (has(job, "life_cost")) return [sacrifice(0.12), damage("MA", scale(tier, 1.75), { lifeSteal: 0.35 })];
  if (has(job, "decay")) return [damage("MA", scale(tier, 1)), typedStatus("decay", 8 + tier * 3, 4), typedStatus("silence", 1, 2)];
  if (has(job, "freeze")) return [damage("MA", scale(tier, 1)), typedStatus("freeze", 6 + tier, 3)];
  if (has(job, "shock")) return [damage("MA", scale(tier, 1.25)), typedStatus("shock", 6 + tier, 3)];
  if (has(job, "fracture")) return [damage(coreDamageStat(job), scale(tier, 1.05)), typedStatus("fracture", 8 + tier, 4)];
  if (has(job, "evasion") || has(job, "shadow_dance")) return [damage("EVA", scale(tier, 1.2), { evadeBonusPower: 0.18, critBonus: tier * 2 }), extraAction(0.15 + tier * 0.03)];
  return [damage(coreDamageStat(job), scale(tier, 1.35))];
}

function makeSkill(job, stage) {
  const tier = job.tier;
  const id = `${job.id}_${stage}`;
  if (stage === "init") return { id, type: "active", apCost: tierCost(tier), chance: activeChance(tier), scalingStat: coreDamageStat(job), tags: job.themes, effects: activeEffects(job, tier) };
  if (stage === "core") {
    const maxUses = null;
    const effects = coreEffects(job, tier);
    const type = inferSkillType(stage, effects, { maxUses });
    return { id, type, apCost: tierCost(tier), chance: adjustedSkillChance(specialChance(tier), stage, effects, { maxUses }), maxUses, priority: inferSkillPriority(stage, effects, { maxUses }), scalingStat: coreDamageStat(job), tags: job.themes, effects, passiveStats: type === "passive" ? getPassiveStats(effects[0]) : undefined };
  }
  const effects = artEffects(job, tier);
  const condition = has(job, "predation") || has(job, "enemy_missing_hp") ? { type: "enemy_hp_below", value: 0.45 } : has(job, "enemy_current_hp") ? { type: "enemy_hp_above", value: 0.5 } : has(job, "low_hp") ? { type: "hp_below", value: 0.7 } : null;
  const maxUses = has(job, "predation") ? 1 : null;
  return { id, type: inferSkillType("art", effects, { condition, maxUses }), apCost: tierCost(tier, 1), chance: adjustedSkillChance(specialChance(tier), "art", effects, { condition, maxUses }), maxUses, priority: inferSkillPriority("art", effects, { condition, maxUses }), condition, scalingStat: coreDamageStat(job), tags: job.themes, effects };
}

const generatedSkills = {};
for (const job of Object.values(jobs)) {
  for (const stage of ["init", "core", "art"]) generatedSkills[`${job.id}_${stage}`] = makeSkill(job, stage);
}

const manualJobIds = new Set([
  "paladin", "sage", "spellblade", "shadow_dancer", "poison_hunter", "cursed_berserker",
  "fire_mage", "frost_mage", "lightning_mage", "earth_mage",
  "rage_fighter", "rage_lord", "rage_god",
  "blade_duelist", "blade_master", "sword_saint",
  "crusher", "ruiner", "collapse_lord",
  "ironwall_knight", "guardian_lord", "immortal_guardian",
  "dragonblood_knight", "dragon_king_knight", "sky_dragon_lord",
]);
const manualSkills = {};
for (const job of Object.values(jobs).filter((item) => item.tier <= 3 || manualJobIds.has(item.id))) {
  for (const stage of ["init", "core", "art"]) {
    manualSkills[`${job.id}_${stage}`] = makeManualSkill(job, stage);
  }
}

export const skills = {
  basic_attack: { id: "basic_attack", type: "active", apCost: 0, chance: 1, priority: false, scalingStat: "PA", tags: ["physical"], effects: [damage("PA", 1)], system: true },
  magic_attack: { id: "magic_attack", type: "active", apCost: 0, chance: 1, priority: false, scalingStat: "MA", tags: ["magic"], effects: [damage("MA", 1)], system: true },
  ...generatedSkills,
  ...manualSkills
};

function makeManualSkill(job, stage) {
  const base = {
    id: `${job.id}_${stage}`,
    type: "active",
    apCost: manualApCost(job, stage),
    chance: manualBaseChance(job, stage),
    priority: stage !== "init",
    condition: null,
    scalingStat: coreDamageStat(job),
    tags: job.themes ?? [],
    effects: []
  };
  if (job.tier === 1) return makeTierOneSkill(job, stage, base);

  // ── Tier 3 warrior line ────────────────────────────────────────────────
  if (job.id === "berserker") return skillFromSet(base, stage, [
    [damage("PA", 1.1, { missingHpPower: 0.65 })],
    [passive({ PA: 8, HP: 15, MA: -3 })],
    [sacrifice(0.07), status("rage_surge", "self", 2, { damageMultiplier: 1.4 })]
  ], { art: { maxUses: 1 } });

  if (job.id === "swordsman") return skillFromSet(base, stage, [
    [damage("PA", 1.0)],
    [passive({ PA: 6, ACC: 8 })],
    [damage("PA", 1.0), damage("PA", 1.0)]
  ], {
    init: { apCost: 0, chance: 1, priority: false, basicAttackReplacement: true, hitBonus: 25 },
    art: { maxUses: 1, hitBonus: 25 }
  });

  if (job.id === "destroyer") return skillFromSet(base, stage, [
    [damage("PA", 0.95, { shieldBreak: 20 })],
    [passive({ PA: 8, ACC: 6 })],
    [status("defense_break", "foe", 999, { permanent: true, statMods: { PD: -18 } })]
  ], { art: { maxUses: 1 } });

  if (job.id === "guardian_knight") return skillFromSet(base, stage, [
    [damage("PA", 0.9)],
    [passive({ PD: 10, HP: 18, CRT: -4 })],
    [shield(30, "PD", 0.55)]
  ]);

  if (job.id === "dragon_knight") return skillFromSet(base, stage, [
    [damage("PA", 1.0)],
    [passive({ PD: 8, PA: 5 })],
    [statTradeoff({ PD: -10, PA: 12 }, { id: "dragon_form", turns: 3, permanent: false })]
  ], { art: { maxUses: 1 } });

  // ── Tier 3 rogue line ──────────────────────────────────────────────────
  if (job.id === "salsoo") return skillFromSet(base, stage, [
    [damage("PA", 1.0, { inverseCrit: true, inverseCritBase: 44, inverseCritFloor: 8 })],
    [passive({ CRD: 18, CRT: -8 })],
    [status("sharp_focus", "self", 999, { permanent: true, statMods: { CRT: -8, CRD: 28 } })]
  ], { art: { maxUses: 1 } });

  if (job.id === "blade_dancer") return skillFromSet(base, stage, [
    [damage("PA", 0.78, { evadeBonusPower: 0.18 })],
    [passive({ EVA: 8, SPD: 5 })],
    [status("phantom_step", "self", 1, { statMods: { EVA: 50 } })]
  ], { art: { maxUses: 1 } });

  if (job.id === "bard") return skillFromSet(base, stage, [
    [damage("EVA", 0.7), status("melody_drain", "self", 1, { statMods: { EVA: -5 } })],
    [passive({ EVA: 7, SPD: 4 })],
    [status("harmony", "self", 3, { statMods: { EVA: 15 } })]
  ]);

  if (job.id === "cutthroat") return skillFromSet(base, stage, [
    [damage("PA", 0.9, { enemyCurrentHpPower: 0.09, critBonus: 6 })],
    [passive({ PA: 5, CRT: 8 })],
    [damage("PA", 1.08, { enemyCurrentHpPower: 0.13, critBonus: 10 }), typedStatus("bleed", 5, 3)]
  ], {
    init: { maxUses: 1, chance: 1.0, condition: { type: "enemy_hp_above", value: 0.75 } },
    art: { condition: { type: "enemy_hp_above", value: 0.5 } }
  });

  // ── Tier 3 archer line ─────────────────────────────────────────────────
  if (job.id === "executioner") return skillFromSet(base, stage, [
    [damage("PA", 0.9, { enemyMissingHpPower: 0.12 })],
    [passive({ ACC: 8, CRD: 12 })],
    [damage("PA", 1.15, { guaranteedHit: true, enemyMissingHpPower: 0.25 })]
  ], { art: { maxUses: 1 } });

  if (job.id === "loader_engineer") return skillFromSet(base, stage, [
    [damage("ACC", 0.08), status("rapid_fire", "self", 999, { permanent: true, stack: true, statMods: { ACC: 6 } }), extraAction(0.3, 3)],
    [passive({ ACC: 10, SPD: 4 })],
    [status("reload_boost", "self", 999, { permanent: true, statMods: { ACC: 22 } }), extraAction(1.0, 1)]
  ], { art: { maxUses: 1 } });

  if (job.id === "beast_lord") return skillFromSet(base, stage, [
    [summon("beast_lord_beast", "striker", 1, { stat: "ACC", elite: true })],
    [passive({ ACC: 8, SPD: 5 })],
    [damage("ACC", 0.14, { enemyMissingHpPower: 0.18 })]
  ], {
    init: { maxUses: 1 },
    art: { condition: { type: "has_summon" } }
  });

  // ── Cook line (tier 2 & 3) ─────────────────────────────────────────────
  if (job.id === "cook") return skillFromSet(base, stage, [
    [damage("PA", 0.7, { currentHpPower: 0.12 })],
    [passive({ HP: 20, PD: 4, EVA: -3 })],
    [heal("HP", 0.18, { overheal: true })]
  ]);

  if (job.id === "chef") return skillFromSet(base, stage, [
    [damage("PA", 0.78, { currentHpPower: 0.14 })],
    [passive({ HP: 26, PD: 5, EVA: -4 })],
    [heal("HP", 0.22, { overheal: true })]
  ]);

  // ── Tier 3 cleric line ─────────────────────────────────────────────────
  if (job.id === "pure_priest") return skillFromSet(base, stage, [
    [heal("MA", 2.2, { maxHpRatio: 0.06 })],
    [passive({ MA: 7, MD: 8 })],
    [typedStatus("regeneration", 12, 5, { target: "self" })]
  ], { init: { condition: { type: "hp_below", value: 0.55 }, minChance: 0.1, repeatChancePenalty: 0.08 } });

  if (job.id === "dark_priest") return skillFromSet(base, stage, [
    [status("corruption_aura", "self", 999, { permanent: true, statMods: { MA: 5 }, damageMultiplier: 1.22 }), resource("corruption", 1)],
    [passive({ MA: 10 })],
    [damage("MA", 1.1, { lifeSteal: 0.15 }), typedStatus("decay", 8, 4)]
  ], {
    init: { maxUses: 1 },
    art: { condition: { type: "has_resource", key: "corruption", amount: 1 } }
  });

  if (job.id === "skeleton") return skillFromSet(base, stage, [
    [damage("MA", 0.85)],
    [passive({ HP: 18, MA: 5 })],
    [sacrifice(0.12), damage("HP", 0.0, { maxHpPower: 0.15 })]
  ]);

  if (job.id === "skeleton_warrior") return skillFromSet(base, stage, [
    [damage("MA", 0.9)],
    [passive({ HP: 28, MA: 5 })],
    [sacrifice(0.14), damage("HP", 0.0, { maxHpPower: 0.18 })]
  ]);

  // ── Tier 3 mage line ───────────────────────────────────────────────────
  if (job.id === "elementalist") return skillFromSet(base, stage, [
    [damage("MA", 0.85), typedStatus("element_random", 5, 3)],
    [passive({ MA: 8, MD: 6 })],
    [damage("MA", 1.2, { elementResonancePower: 0.15 })]
  ]);

  if (job.id === "rune_mage") return skillFromSet(base, stage, [
    [rune("rune_mage_inscription", "after_damage", [damage("MA", 0.5)])],
    [passive({ MA: 8, HP: 12 })],
    [damage("MA", 1.0, { runeCountPower: 0.08 })]
  ]);

  if (job.id === "warlock") return skillFromSet(base, stage, [
    [sacrifice(0.05), damage("MA", 1.35)],
    [passive({ MA: 10, HP: 12 })],
    [damage("MA", 0.95, { lifeSteal: 0.35 })]
  ]);

  if (job.id === "fate_weaver") return skillFromSet(base, stage, [
    [damage("MA", 0.75), typedStatus("misfortune", 5, 3)],
    [passive({ CRT: 7, EVA: 6 })],
    [status("fate_reversal", "self", 2, { statMods: { CRD: 40 } })]
  ], { art: { maxUses: 1 } });

  if (job.id === "hexer") return skillFromSet(base, stage, [
    [damage("MA", 0.78), typedStatus("decay", 6, 4)],
    [passive({ MA: 8, SPD: 5 })],
    [status("grand_curse", "foe", 999, { permanent: true, defenseMultiplier: 0.78 })]
  ], { art: { maxUses: 1 } });

  if (job.id === "legion_mage") return skillFromSet(base, stage, [
    [summon("legion_mage_unit", "legion", 1, { stat: "MA" })],
    [passive({ MA: 7, HP: 12 })],
    [status("guardian_order", "self", 3, { statMods: { PD: 10, MD: 8 } })]
  ]);

  // ── Tier 3 contract jobs ───────────────────────────────────────────────
  if (job.id === "wolf_contract") return skillFromSet(base, stage, [
    [summon("wolf_contract_wolf", "striker", 1, { stat: "SPD", contract: true })],
    [passive({ SPD: 8, EVA: 6 })],
    [status("wolf_speed", "self", 2, { statMods: { SPD: 14 } }), extraAction(0.7, 2)]
  ]);

  if (job.id === "bear_contract") return skillFromSet(base, stage, [
    [summon("bear_contract_bear", "tank", 1, { stat: "HP", contract: true })],
    [passive({ HP: 26, PD: 7 })],
    [status("bear_stance", "self", 2, { statMods: { PD: 16 }, defenseMultiplier: 1.2 })]
  ]);

  if (job.id === "fire_spirit_contract") return skillFromSet(base, stage, [
    [summon("fire_spirit_contract_spirit", "striker", 1, { stat: "MA", contract: true })],
    [passive({ MA: 12 })],
    [damage("MA", 1.0), typedStatus("burn", 8, 3)]
  ]);

  if (job.id === "earth_spirit_contract") return skillFromSet(base, stage, [
    [summon("earth_spirit_contract_spirit", "tank", 1, { stat: "MA", contract: true })],
    [passive({ PD: 8, MA: 7 })],
    [damage("MA", 0.85), typedStatus("fracture", 7, 3), status("earth_pact", "self", 2, { statMods: { PD: 12 } })]
  ]);

  if (job.id === "demon_contract") return skillFromSet(base, stage, [
    [summon("demon_contract_demon", "striker", 1, { stat: "MA", contract: true })],
    [passive({ MA: 12, HP: 16 })],
    [sacrifice(0.1), damage("MA", 1.3, { lifeSteal: 0.3 })]
  ]);

  if (job.id === "dragon_contract") return skillFromSet(base, stage, [
    [summon("dragon_contract_dragon", "tank", 1, { stat: "PD", contract: true })],
    [passive({ PA: 6, MA: 8 })],
    [damage("PA", 0.75), damage("MA", 0.75)]
  ]);

  if (job.id === "special_contract") return skillFromSet(base, stage, [
    [summon("special_contract_entity", "striker", 1, { stat: "MA", contract: true })],
    [passive({ MA: 5, CRT: 5, SPD: 5 })],
    [damage("MA", 1.0, { critBonus: 12 }), typedStatus("misfortune", 3, 2)]
  ]);

  // ── Tier 4 combo jobs ─────────────────────────────────────────────────
  if (job.id === "paladin") return skillFromSet(base, stage, [
    [damage("PD", 1.0, { absolute: true })],
    [heal("MA", 2.2, { maxHpRatio: 0.03 }), resource("judgment", 55, { fromHeal: true })],
    [consumeResource("judgment", 1.0, { absolute: true, stat: "MD" })]
  ], { art: { condition: { type: "has_resource", key: "judgment", amount: 30 } } });

  if (job.id === "sage") return skillFromSet(base, stage, [
    [heal("MA", 2.2, { maxHpRatio: 0.04 }), typedStatus("regeneration", 12, 3, { target: "self" })],
    [passive({ MA: 7, MD: 8 })],
    [status("amplified_wisdom", "self", 999, { permanent: true, stack: true, statMods: { MA: 6 }, damageMultiplier: 1.07 })]
  ]);

  if (job.id === "spellblade") return skillFromSet(base, stage, [
    [damage("PA", 0.72, { balancePower: 0.045 }), damage("MA", 0.72, { balancePower: 0.045 })],
    [passive({ PA: 7, MA: 7 })],
    [status("equilibrium", "self", 3, { statMods: { PA: 8, MA: 8 } })]
  ], { art: { maxUses: 1 } });

  if (job.id === "shadow_dancer") return skillFromSet(base, stage, [
    [damage("EVA", 0.9, { evadeBonusPower: 0.16, critBonus: 8 })],
    [passive({ EVA: 7, CRT: 7 })],
    [status("shadow_veil", "self", 1, { guaranteedDodge: true })]
  ], { art: { maxUses: 1 } });

  if (job.id === "poison_hunter") return skillFromSet(base, stage, [
    [damage("ACC", 0.08), poison(14)],
    [passive({ ACC: 8, SPD: 5 })],
    [damage("ACC", 0.12, { poisonPower: 0.7 }), poison(18)]
  ], { art: { maxUses: 1 } });

  if (job.id === "cursed_berserker") return skillFromSet(base, stage, [
    [damage("PA", 1.1, { missingHpPower: 0.4 }), typedStatus("bleed", 5, 2, { target: "self" })],
    [passive({ PA: 10, HP: 18 })],
    [sacrifice(0.12), damage("PA", 1.5)]
  ], { art: { maxUses: 1 } });

  // ── Tier 4 elemental specialists ──────────────────────────────────────
  if (job.id === "fire_mage") return skillFromSet(base, stage, [
    [damage("MA", 0.95, { aoe: true }), typedStatus("burn", 6, 3)],
    [passive({ MA: 7, CRT: 4 })],
    [damage("MA", 1.2, { aoe: true, consumeStatus: "burn", consumeStatusPower: 1.2 }), typedStatus("burn", 7, 3)]
  ]);

  if (job.id === "frost_mage") return skillFromSet(base, stage, [
    [damage("MA", 0.88), typedStatus("freeze", 4, 3)],
    [passive({ MA: 7, MD: 5 })],
    [damage("MA", 1.05), typedStatus("freeze", 7, 3)]
  ]);

  if (job.id === "lightning_mage") return skillFromSet(base, stage, [
    [damage("MA", 1.05), typedStatus("shock", 4, 3)],
    [passive({ MA: 8, SPD: 4 })],
    [damage("MA", 1.25), typedStatus("shock", 7, 3)]
  ]);

  if (job.id === "earth_mage") return skillFromSet(base, stage, [
    [damage("MA", 0.9), typedStatus("fracture", 5, 4)],
    [passive({ MA: 7, PD: 4 })],
    [damage("MA", 1.05), typedStatus("fracture", 9, 4)]
  ]);

  // ── Tier 4-6 Warrior: Rage lineage ───────────────────────────────────
  if (job.id === "rage_fighter") return skillFromSet(base, stage, [
    [damage("PA", 1.2, { missingHpPower: 0.85 })],
    [passive({ PA: 9, HP: 16, MA: -3 })],
    [status("undying_rage", "self", 1, { statMods: { PD: 22, MD: 12 }, defenseMultiplier: 1.4 })]
  ], { art: { maxUses: 1 } });

  if (job.id === "rage_lord") return skillFromSet(base, stage, [
    [damage("PA", 1.3, { missingHpPower: 1.0, statusCountPower: 0.1 })],
    [passive({ PA: 11, CRT: 9, MA: -4 })],
    [damage("PA", 1.4, { missingHpPower: 1.2, lifeSteal: 0.4 })]
  ], { art: { maxUses: 1, condition: { type: "hp_below", value: 0.5 } } });

  if (job.id === "rage_god") return skillFromSet(base, stage, [
    [damage("PA", 1.5, { missingHpPower: 1.4, statusCountPower: 0.12 })],
    [passive({ PA: 14, HP: 20, CRT: 12 })],
    [status("divine_wrath", "self", 4, { statMods: { PA: 22, CRT: 18, CRD: 24, PD: -15 }, damageMultiplier: 1.6 })]
  ], { art: { maxUses: 1, condition: { type: "hp_below", value: 0.25 } } });

  // ── Tier 4-6 Warrior: Swordsman lineage ──────────────────────────────
  if (job.id === "blade_duelist") return skillFromSet(base, stage, [
    [damage("PA", 1.0), resource("swordsmanship", 1)],
    [passive({ PA: 7, SPD: 5 })],
    [status("ki_flow", "self", 3, { statMods: { PA: 7, ACC: 4 }, damageMultiplier: 1.15 })]
  ], {
    init: { apCost: 0, chance: 1, priority: false, basicAttackReplacement: true, hitBonus: 25 },
    art: { maxUses: 3 }
  });

  if (job.id === "blade_master") return skillFromSet(base, stage, [
    [damage("PA", 1.0), resource("swordsmanship", 1)],
    [passive({ PA: 9, ACC: 8 })],
    [damage("PA", 1.5, { guaranteedHit: true })]
  ], {
    init: { apCost: 0, chance: 1, priority: false, basicAttackReplacement: true, hitBonus: 25 },
    art: { maxUses: 1, condition: { type: "has_resource", key: "swordsmanship", amount: 3 } }
  });

  if (job.id === "sword_saint") return skillFromSet(base, stage, [
    [damage("PA", 1.0), resource("swordsmanship", 1)],
    [passive({ PA: 12, SPD: 7, ACC: 6 })],
    [damage("PA", 1.0), damage("PA", 1.0), damage("PA", 1.0), damage("PA", 1.0), damage("PA", 1.0), damage("PA", 1.0), damage("PA", 1.0)]
  ], {
    init: { apCost: 0, chance: 1, priority: false, basicAttackReplacement: true, hitBonus: 25 },
    art: { maxUses: 1, condition: { type: "has_resource", key: "swordsmanship", amount: 5 } }
  });

  // ── Tier 4-6 Warrior: Destroyer lineage ──────────────────────────────
  if (job.id === "crusher") return skillFromSet(base, stage, [
    [damage("PA", 1.05, { shieldBreak: 26 })],
    [passive({ PA: 9, ACC: 7 })],
    [status("weakness_open", "foe", 999, { permanent: true, statMods: { PD: -22 } })]
  ], { art: { maxUses: 1 } });

  if (job.id === "ruiner") return skillFromSet(base, stage, [
    [damage("PA", 1.15, { shieldBreak: 32, shieldPower: 0.4 })],
    [passive({ PA: 11, PD: 6 })],
    [damage("PA", 1.5, { shieldBreak: 50, guaranteedHit: true }), status("ruin_mark", "foe", 999, { permanent: true, statMods: { PD: -18 } })]
  ], { art: { maxUses: 1 } });

  if (job.id === "collapse_lord") return skillFromSet(base, stage, [
    [damage("PA", 1.3, { shieldBreak: 44, shieldPower: 0.5 })],
    [passive({ PA: 14, ACC: 8, PD: 6 })],
    [status("total_ruin", "foe", 999, { permanent: true, statMods: { PD: -32, MD: -20 } }), damage("PA", 2.0, { absolute: true, guaranteedHit: true })]
  ], { art: { maxUses: 1 } });

  // ── Tier 4-6 Warrior: Guardian Knight lineage ────────────────────────
  if (job.id === "ironwall_knight") return skillFromSet(base, stage, [
    [damage("PD", 0.8, { absolute: true }), shield(10, "PD", 0.22)],
    [passive({ PD: 12, HP: 22, CRT: -5 })],
    [shield(40, "PD", 0.6), status("iron_wall", "self", 2, { statMods: { PD: 12 }, defenseMultiplier: 1.2 })]
  ], { art: { maxUses: 1 } });

  if (job.id === "guardian_lord") return skillFromSet(base, stage, [
    [damage("PD", 1.1, { absolute: true, shieldPower: 0.3 })],
    [passive({ PD: 15, MD: 6, CRT: -7 })],
    [status("immovable_fortress", "self", 3, { statMods: { PD: 28, MD: 14 } })]
  ], { art: { maxUses: 1 } });

  if (job.id === "immortal_guardian") return skillFromSet(base, stage, [
    [damage("PD", 1.3, { absolute: true, shieldPower: 0.45 })],
    [passive({ PD: 19, HP: 30, MD: 8, CRT: -8 })],
    [shield(80, "HP", 0.7), status("immortal_aegis", "self", 4, { statMods: { PD: 22, MD: 14 }, defenseMultiplier: 1.35 })]
  ], { art: { maxUses: 1, condition: { type: "hp_below", value: 0.5 } } });

  // ── Tier 4-6 Warrior: Dragon Knight lineage ──────────────────────────
  if (job.id === "dragonblood_knight") return skillFromSet(base, stage, [
    [damage("PA", 1.05, { absolute: true })],
    [passive({ PD: 10, PA: 6 })],
    [statTradeoff({ PD: -14, PA: 18 }, { id: "dragon_form", turns: 4 })]
  ], { art: { maxUses: 1 } });

  if (job.id === "dragon_king_knight") return skillFromSet(base, stage, [
    [damage("PA", 1.3, { absolute: true, guaranteedHit: true })],
    [passive({ PD: 13, PA: 8, HP: 12 })],
    [damage("PA", 1.8, { absolute: true, guaranteedHit: true }), statTradeoff({ PD: -10, PA: 14 }, { id: "dragon_form", turns: 3 })]
  ], { art: { maxUses: 1 } });

  if (job.id === "sky_dragon_lord") return skillFromSet(base, stage, [
    [damage("PA", 1.5, { absolute: true })],
    [passive({ PD: 16, PA: 11, MD: 6 })],
    [statTradeoff({ PD: -22, PA: 32 }, { id: "eternal_dragon_form", turns: 999 }), damage("PA", 2.2, { absolute: true, guaranteedHit: true })]
  ], { art: { maxUses: 1 } });

  // ── Tier 2 specific overrides ──────────────────────────────────────────
  if (job.id === "assassin") return skillFromSet(base, stage, [
    [damage("PA", 0.88, { enemyCurrentHpPower: 0.1, critBonus: 8 })],
    [passive({ PA: 5, CRT: 7 })],
    [damage("PA", 1.0, { enemyCurrentHpPower: 0.12, critBonus: 6 }), typedStatus("bleed", 5, 3)]
  ], {
    init: { maxUses: 1, chance: 1.0, condition: { type: "enemy_hp_above", value: 0.8 } },
    art: { condition: { type: "enemy_hp_above", value: 0.5 } }
  });

  if (job.id === "dancer") return skillFromSet(base, stage, [
    [damage("EVA", 0.72)],
    [passive({ EVA: 6, SPD: 4 })],
    [status("flow_step", "self", 2, { statMods: { EVA: 10 } }), extraAction(0.32, 2)]
  ]);

  // ── Theme-based fallback for remaining tier 2 jobs ─────────────────────
  if (has(job, "absolute") || has(job, "shield") || has(job, "pd")) return skillFromSet(base, stage, [
    [damage("PD", 0.78, { absolute: canUseAbsoluteDamage(job) }), shield(4 + job.tier, "PD", 0.28)],
    [shield(8 + job.tier * 2, "PD", 0.5), statTradeoff({ CRT: -4, PD: 5, PA: 1 }, { id: `${job.id}_guard_oath` })],
    [damage("PD", 1.1, { absolute: canUseAbsoluteDamage(job), shieldPower: 0.45 }), shield(6 + job.tier, "PD", 0.3)]
  ]);
  if (has(job, "rhythm")) return skillFromSet(base, stage, [
    [damage("EVA", 0.65), resource("rhythm", 1)],
    [resource("rhythm", 3), status("chorus", "self", 999, { permanent: true, stack: true, statMods: { EVA: 2, ACC: 1 } })],
    [damage("EVA", 1.05, { resourceKey: "rhythm", resourcePower: 0.08 }), clearResource("rhythm")]
  ], { art: { condition: { type: "has_resource", key: "rhythm", amount: 3 } } });
  if (has(job, "predation") || has(job, "enemy_missing_hp")) return skillFromSet(base, stage, [
    [damage("ACC", 0.1), resource("mark", 1), status("aiming", "self", 999, { permanent: true, stack: true, statMods: { ACC: 8 } })],
    [resource("mark", 2), status("hunter_patience", "self", 999, { permanent: true, statMods: { ACC: 10, SPD: 2 } })],
    [damage("ACC", 0.16, { enemyMissingHpPower: 0.2, resourceKey: "mark", resourcePower: 0.03 }), clearResource("mark")]
  ], { art: { maxUses: 1, condition: { type: "enemy_hp_below", value: 0.45 } } });
  if (has(job, "summon")) return makeSummonSkill(job, stage, base);
  if (has(job, "heal")) return makeHealSkill(job, stage, base);
  if (has(job, "decay") || has(job, "curse") || has(job, "weaken")) return makeCurseSkill(job, stage, base);
  if (has(job, "magic") || has(job, "element")) return makeMagicSkill(job, stage, base);
  return skillFromSet(base, stage, [
    [damage(coreDamageStat(job), 0.92)],
    [status(`${job.id}_focus`, "self", 999, { permanent: true, statMods: { [coreDamageStat(job)]: 4 } })],
    [damage(coreDamageStat(job), 1.12)]
  ]);
}

function makeTierOneSkill(job, stage, base) {
  if (job.id === "cleric") {
    return skillFromSet(base, stage, [
      [heal("MA", 2.1, { maxHpRatio: 0.06 })],
      [shield(4, "MD", 0.25), status("small_prayer", "self", 999, { permanent: true, statMods: { MD: 3 } })],
      [damage("MA", 0.72)]
    ], { init: { condition: { type: "hp_below", value: 0.5 }, minChance: 0.05, repeatChancePenalty: 0.15 } });
  }
  if (job.id === "archer") {
    return skillFromSet(base, stage, [
      [damage("ACC", 0.1), status("aiming", "self", 999, { permanent: true, stack: true, statMods: { ACC: 8 } })],
      [status("steady_aim", "self", 999, { permanent: true, statMods: { ACC: 10 } })],
      [damage("ACC", 0.14), resource("mark", 1), status("aiming", "self", 999, { permanent: true, stack: true, statMods: { ACC: 5 } })]
    ]);
  }
  if (job.id === "rogue") {
    return skillFromSet(base, stage, [
      [damage("PA", 0.86, { critBonus: 3 })],
      [passive({ CRT: 3, SPD: 2, EVA: 1 })],
      [damage("PA", 1.02, { critBonus: 6, enemyCurrentHpPower: 0.06 })]
    ]);
  }
  if (job.id === "mystic") {
    return skillFromSet(base, stage, [
      [damage("MA", 0.86)],
      [status("mana_focus", "self", 999, { permanent: true, statMods: { MA: 3 } })],
      [damage("MA", 1.02)]
    ], { init: { apCost: 0, chance: 1, priority: false, basicAttackReplacement: true } });
  }
  return skillFromSet(base, stage, [
    [damage("PA", 0.92)],
    [status("steady_grip", "self", 999, { permanent: true, statMods: { PA: 2, PD: 1 } })],
    [damage("PA", 1.12, { enemyMissingHpPower: 0.04 })]
  ]);
}

function makeHealSkill(job, stage, base) {
  return skillFromSet(base, stage, [
    [heal("MA", 2.0, { maxHpRatio: 0.08 }), typedStatus("regeneration", 5, 3, { target: "self" })],
    [typedStatus("regeneration", 8, 4, { target: "self" }), status(`${job.id}_vow`, "self", 999, { permanent: true, statMods: { MD: 5, MA: 2 } })],
    [heal("MA", 2.6, { maxHpRatio: 0.14, overheal: true })]
  ], {
    init: { condition: { type: "hp_below", value: 0.58 }, minChance: 0.1, repeatChancePenalty: 0.1 },
    art: { condition: { type: "hp_below", value: 0.42 }, maxUses: 1 }
  });
}

function makeMagicSkill(job, stage, base) {
  if (has(job, "burn")) return skillFromSet(base, stage, [[damage("MA", 0.82), typedStatus("burn", 4, 3)], [status("fire_focus", "self", 999, { permanent: true, statMods: { MA: 5 } })], [damage("MA", 1.0, { targetStatus: "burn", targetStatusPower: 1.6 }), typedStatus("burn", 7, 3)]]);
  if (has(job, "freeze")) return skillFromSet(base, stage, [[damage("MA", 0.76), typedStatus("freeze", 3, 3)], [status("frost_focus", "self", 999, { permanent: true, statMods: { MD: 4, MA: 2 } })], [damage("MA", 0.95, { targetStatus: "freeze", targetStatusPower: 1.4 }), typedStatus("freeze", 6, 3)]]);
  if (has(job, "shock")) return skillFromSet(base, stage, [[damage("MA", 0.9), typedStatus("shock", 3, 3)], [status("storm_focus", "self", 999, { permanent: true, statMods: { MA: 4, CRT: 3 } })], [damage("MA", 1.14, { targetStatus: "shock", targetStatusPower: 1.2 }), typedStatus("shock", 6, 3)]]);
  if (has(job, "fracture")) return skillFromSet(base, stage, [[damage("MA", 0.78), typedStatus("fracture", 4, 3)], [shield(6, "MD", 0.3), status("earth_focus", "self", 999, { permanent: true, statMods: { MD: 4 } })], [damage("MA", 0.98, { targetStatus: "fracture", targetStatusPower: 1.6 }), typedStatus("fracture", 6, 3)]]);
  return skillFromSet(base, stage, [
    [damage("MA", 0.92)],
    [status("spell_focus", "self", 999, { permanent: true, statMods: { MA: 5, MD: 2 } })],
    [damage("MA", 0.9), typedStatus("fracture", 3, 3)]
  ]);
}

function makeCurseSkill(job, stage, base) {
  if (has(job, "fate") || has(job, "misfortune")) {
    return skillFromSet(base, stage, [
      [damage("MA", 0.68), typedStatus("misfortune", 4, 3)],
      [status("fate_thread", "self", 999, { permanent: true, statMods: { CRT: 4, EVA: 2 }, skillChanceMultiplier: 1.04 })],
      [damage("MA", 1.0, { targetStatus: "misfortune", targetStatusPower: 1.5 }), typedStatus("blind", 2, 2)]
    ], { art: { condition: { type: "target_has_status", kind: "misfortune" } } });
  }
  return skillFromSet(base, stage, [
    [damage("MA", 0.72), typedStatus("weaken", 3, 3)],
    [typedStatus("weaken", 5, 3), typedStatus("misfortune", 4, 3)],
    [damage("MA", 1.05, { targetStatus: "decay", targetStatusPower: 1.7 }), typedStatus("decay", 6, 4), typedStatus("silence", 1, 2)]
  ]);
}

function makeSummonSkill(job, stage, base) {
  if (has(job, "contract")) {
    const summonStat = has(job, "bear") ? "HP" : has(job, "dragon") ? "PD" : has(job, "wolf") ? "SPD" : "MA";
    const role = has(job, "bear") || has(job, "dragon") || has(job, "earth") ? "tank" : "striker";
    return skillFromSet(base, stage, [
      [damage(summonStat, has(job, "bear") ? 0.055 : 0.72), summon(`${job.id}_entity`, role, 1, { contract: true, stat: summonStat })],
      [resource(`${job.id}_contract`, 1), status(`${job.id}_inheritance`, "self", 999, { permanent: true, statMods: contractStatMods(job) })],
      [damage(summonStat, has(job, "dragon") ? 1.1 : 1.0, contractDamageExtra(job)), clearResource(`${job.id}_contract`)]
    ], { art: { condition: { type: "has_resource", key: `${job.id}_contract`, amount: 1 } } });
  }
  const count = has(job, "legion") ? 3 : 1;
  const role = has(job, "frontline") || has(job, "bear") ? "tank" : has(job, "legion") ? "legion" : "striker";
  return skillFromSet(base, stage, [
    [damage(coreDamageStat(job), 0.55), summon(`${job.id}_ally`, role, count, { stat: coreDamageStat(job) })],
    [summon(`${job.id}_guard`, "tank", 1, { stat: "HP" }), status(`${job.id}_command`, "self", 999, { permanent: true, statMods: { [coreDamageStat(job)]: 3 } })],
    [summon(`${job.id}_pack`, role, count + 1, { stat: coreDamageStat(job) }), damage(coreDamageStat(job), 0.74, { aoe: true })]
  ]);
}

function contractStatMods(job) {
  if (has(job, "wolf")) return { SPD: 5, EVA: 3 };
  if (has(job, "bear")) return { HP: 10, PD: 4 };
  if (has(job, "fire")) return { MA: 5 };
  if (has(job, "earth")) return { MD: 5, PD: 3 };
  if (has(job, "demon")) return { MA: 7, MD: -3 };
  if (has(job, "dragon")) return { PD: 5, PA: 4 };
  return { MA: 3, EVA: 3, CRT: 3 };
}

function contractDamageExtra(job) {
  if (has(job, "dragon")) return { pdToPa: 0.8, resourceKey: `${job.id}_contract`, resourcePower: 0.1 };
  if (has(job, "fire")) return { targetStatus: "burn", targetStatusPower: 1.6, resourceKey: `${job.id}_contract`, resourcePower: 0.08 };
  if (has(job, "earth")) return { targetStatus: "fracture", targetStatusPower: 1.6, resourceKey: `${job.id}_contract`, resourcePower: 0.08 };
  if (has(job, "demon")) return { lifeSteal: 0.35, resourceKey: `${job.id}_contract`, resourcePower: 0.1 };
  return { resourceKey: `${job.id}_contract`, resourcePower: 0.08 };
}

function skillFromSet(base, stage, effectsByStage, overrides = {}) {
  const stageIndex = stage === "init" ? 0 : stage === "core" ? 1 : 2;
  const override = overrides[stage] ?? {};
  const effects = effectsByStage[stageIndex];
  const type = override.type ?? inferSkillType(stage, effects, override);
  const passiveStats = type === "passive" ? getPassiveStats(effects[0]) : undefined;
  return {
    ...base,
    ...override,
    type,
    priority: override.priority ?? inferSkillPriority(stage, effects, override),
    chance: override.chance ?? adjustedSkillChance(base.chance, stage, effects, override),
    effects,
    passiveStats,
    maxUses: override.maxUses ?? null
  };
}

function manualBaseChance(job, stage) {
  if (stage === "init") {
    return Math.max(0.38, 0.52 - job.tier * 0.03);
  }
  if (stage === "core") {
    return 0.5;
  }
  return Math.max(0.36, 0.46 - job.tier * 0.02);
}

function adjustedSkillChance(baseChance, stage, effects, options = {}) {
  if (options.basicAttackReplacement) {
    return 1;
  }
  if (options.maxUses === 1) {
    return Math.max(baseChance, 0.66);
  }
  return baseChance;
}

function inferSkillType(stage, effects, options = {}) {
  if (stage === "init") {
    return "active";
  }
  if (isPassiveEffectSet(effects, options)) {
    return "passive";
  }
  return "active";
}

function inferSkillPriority(stage, effects, options = {}) {
  if (isPassiveEffectSet(effects, options)) {
    return false;
  }
  return options.maxUses === 1;
}

function isPassiveEffectSet(effects, options = {}) {
  if (options.type || options.condition || options.maxUses || options.basicAttackReplacement) {
    return false;
  }
  return effects.length === 1 && effects[0]?.type === "passive" && effects[0].statMods;
}

function getPassiveStats(effect) {
  if (effect?.type === "passive") {
    return effect.statMods ?? {};
  }
  return {};
}

function manualApCost(job, stage) {
  if (job.tier === 1) return 1;
  if (stage === "init") return job.tier === 2 ? 1 : 2;
  if (stage === "core") return job.tier === 2 ? 1 : 2;
  return job.tier === 2 ? 2 : 3;
}
