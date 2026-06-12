import { jobs } from "./jobs.js?v=20260607-15";

const damage = (stat, power, extra = {}) => ({ type: "damage", stat, power, ...extra });
const heal = (stat, power, extra = {}) => ({ type: "heal", stat, power, ...extra });
const shield = (amount, stat = null, power = 0) => ({ type: "shield", amount, stat, power });
const status = (id, target, turns, extra = {}) => ({ type: "status", id, target, turns, ...extra });
const typedStatus = (kind, amount, turns = null, extra = {}) => ({ type: "typed_status", kind, amount, turns, ...extra });
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
const activeChance = (tier) => Math.max(0.38, 0.68 - tier * 0.035);
const specialChance = (tier) => Math.max(0.32, 0.62 - tier * 0.03);
const scale = (tier, base = 1) => Math.round((base + tier * 0.18) * 100) / 100;
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
  if (has(job, "enemy_current_hp")) return [damage("SPD", scale(tier, 0.8), { enemyCurrentHpPower: 0.08 + tier * 0.01 }), typedStatus("bleed", 3 + tier, 3)];
  if (has(job, "reverse_crit")) return [damage("PA", scale(tier, 1.05), { inverseCrit: true, inverseCritBase: 38 + tier * 4, inverseCritFloor: 8 })];
  if (has(job, "evasion")) return [damage("EVA", scale(tier, 0.9), { evadeBonusPower: 0.12 }), status("flow", "self", 2, { statMods: { EVA: 2 + tier } })];
  if (has(job, "rhythm")) return [damage("EVA", scale(tier, 0.75), { spendEvasion: 2 + tier }), status("rhythm", "self", 2, { statMods: { EVA: 3 + tier } })];
  if (has(job, "predation")) return [damage("ACC", scale(tier, 0.9), { predation: true, enemyMissingHpPower: 0.1 + tier * 0.015 })];
  if (has(job, "extra_action")) return [damage("ACC", scale(tier, 0.55)), status("aiming", "self", 999, { permanent: true, stack: true, statMods: { ACC: 2 + tier } }), extraAction(0.35 + tier * 0.04)];
  if (has(job, "summon")) return [damage(stat, scale(tier, 0.65)), summon(`${job.id}_ally`, has(job, "frontline") || has(job, "bear") ? "tank" : has(job, "legion") ? "legion" : "striker", has(job, "legion") ? Math.min(6, 1 + tier) : 1, { stat, tier })];
  if (has(job, "food")) return [damage("HP", scale(tier, 0.08), { currentHpPower: 0.18, inverseScaleStat: "EVA", inverseScaleBase: 30 + tier * 3, inverseScalePower: 3 + tier }), heal("HP", 0.12, { overheal: true })];
  if (has(job, "heal")) return [heal("MA", scale(tier, 1.35), { maxHpRatio: 0.02, overheal: has(job, "overheal") }), typedStatus("regeneration", 4 + tier * 2, 3)];
  if (has(job, "decay")) return [damage("MA", scale(tier, 0.9)), typedStatus("decay", 5 + tier * 2, 4)];
  if (has(job, "burn")) return [damage("MA", scale(tier, 0.95), { aoe: true }), typedStatus("burn", 5 + tier * 2, 3)];
  if (has(job, "freeze")) return [damage("MA", scale(tier, 0.85)), typedStatus("freeze", 3 + tier, 3)];
  if (has(job, "shock")) return [damage("MA", scale(tier, 1.05)), typedStatus("shock", 3 + tier, 3)];
  if (has(job, "fracture")) return [damage(stat, scale(tier, 0.9)), typedStatus("fracture", 4 + tier, 4)];
  if (has(job, "poison")) return [damage("ACC", scale(tier, 0.55)), poison(8 + tier * 5)];
  if (has(job, "rune")) return [damage("MA", scale(tier, 0.65)), rune(`${job.id}_attack_rune`, "after_damage", [damage("MA", scale(tier, 0.45))], { maxInstalled: 100 })];
  if (has(job, "life_cost")) return [sacrifice(0.06), damage("MA", scale(tier, 1.25), { lifeSteal: 0.25 })];
  if (has(job, "misfortune") || has(job, "fate")) return [damage("MA", scale(tier, 0.75)), typedStatus("misfortune", 3 + tier, 3)];
  return [damage(stat, scale(tier, 1))];
}

function coreEffects(job, tier) {
  if (has(job, "ma_amp")) return [status("ma_amplified", "self", 999, { permanent: true, stack: true, statMods: { MA: 4 + tier }, damageMultiplier: 1.05 })];
  if (has(job, "balance")) return [damage("PA", scale(tier, 0.75), { balancePower: 0.04 }), damage("MA", scale(tier, 0.75), { balancePower: 0.04 })];
  if (has(job, "judgment")) return [heal("MA", scale(tier, 0.8), { maxHpRatio: 0.02 }), resource("judgment", 10 + tier * 5, { fromHeal: true })];
  if (has(job, "self_status")) return [typedStatus("weaken", 2, 2, { target: "self" }), typedStatus("bleed", 3 + tier, 2, { target: "self" }), status("cursed_rage", "self", 999, { permanent: true, stack: true, statMods: { PA: 4 + tier, CRD: 8 + tier * 2 }, damageMultiplier: 1.08 })];
  if (has(job, "shadow_dance")) return [status("shadow_dance", "self", 999, { permanent: true, statMods: { EVA: 3 + tier, CRT: 3 + tier } })];
  if (has(job, "contract")) return [summon(`${job.id}_entity`, has(job, "bear") || has(job, "dragon") ? "tank" : "striker", 1, { contract: true, stat: coreDamageStat(job), tier })];
  if (has(job, "shield") || has(job, "pd")) return [shield(8 + tier * 4, "PD", 0.45), status("guarded", "self", 2, { defenseMultiplier: 1.08 })];
  if (has(job, "swordsmanship")) return [resource("swordsmanship", 2 + tier), status("sword_form", "self", 999, { permanent: true, statMods: { PA: 2 + tier, ACC: 1 + tier } })];
  if (has(job, "rune")) return [rune(`${job.id}_guard_rune`, "on_hit", [shield(6 + tier * 2), damage("MA", scale(tier, 0.35))], { maxInstalled: 100 })];
  if (has(job, "heal")) return [heal("MD", scale(tier, 1.1), { maxHpRatio: 0.03, overheal: true }), typedStatus("regeneration", 6 + tier * 2, 3)];
  if (has(job, "rhythm")) return [status("tempo", "self", 999, { permanent: true, stack: true, statMods: { EVA: 2 + tier, SPD: 1 + tier } })];
  return [status(`${job.id}_stance`, "self", 999, { permanent: true, stack: true, statMods: { [coreDamageStat(job)]: 2 + tier } })];
}

function artEffects(job, tier) {
  if (has(job, "judgment")) return [consumeResource("judgment", 0.9, { absolute: true, stat: "MD" })];
  if (has(job, "burn")) return [damage("MA", scale(tier, 1.2), { aoe: true, consumeStatus: "burn", consumeStatusPower: 1.2 }), typedStatus("burn", 6 + tier * 3, 3)];
  if (has(job, "poison")) return [damage("ACC", scale(tier, 0.85), { poisonPower: 0.6 }), poison(12 + tier * 6)];
  if (has(job, "predation") || has(job, "enemy_missing_hp")) return [damage("ACC", scale(tier, 1.15), { predation: true, enemyMissingHpPower: 0.18 + tier * 0.02, absolute: has(job, "enemy_missing_hp") })];
  if (has(job, "enemy_current_hp")) return [damage("SPD", scale(tier, 1.05), { enemyCurrentHpPower: 0.16 + tier * 0.015 }), typedStatus("bleed", 5 + tier * 2, 3)];
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
  if (stage === "core") return { id, type: "special", apCost: tierCost(tier), chance: specialChance(tier), maxUses: has(job, "rune") || has(job, "contract") ? null : 1, priority: true, scalingStat: coreDamageStat(job), tags: job.themes, effects: coreEffects(job, tier) };
  return { id, type: "special", apCost: tierCost(tier, 1), chance: specialChance(tier), maxUses: has(job, "predation") ? 1 : null, priority: has(job, "predation") || has(job, "low_hp") || has(job, "judgment"), condition: has(job, "predation") || has(job, "enemy_missing_hp") ? { type: "enemy_hp_below", value: 0.45 } : has(job, "enemy_current_hp") ? { type: "enemy_hp_above", value: 0.5 } : has(job, "low_hp") ? { type: "hp_below", value: 0.7 } : null, scalingStat: coreDamageStat(job), tags: job.themes, effects: artEffects(job, tier) };
}

const generatedSkills = {};
for (const job of Object.values(jobs)) {
  for (const stage of ["init", "core", "art"]) generatedSkills[`${job.id}_${stage}`] = makeSkill(job, stage);
}

const manualSkills = {};
for (const job of Object.values(jobs).filter((item) => item.tier <= 3)) {
  for (const stage of ["init", "core", "art"]) {
    manualSkills[`${job.id}_${stage}`] = makeManualSkill(job, stage);
  }
}

export const skills = {
  basic_attack: { id: "basic_attack", type: "active", apCost: 0, chance: 1, priority: false, scalingStat: "PA", tags: ["physical"], effects: [damage("PA", 1)] },
  magic_attack: { id: "magic_attack", type: "active", apCost: 0, chance: 1, priority: false, scalingStat: "MA", tags: ["magic"], effects: [damage("MA", 1)] },
  ...generatedSkills,
  ...manualSkills
};

function makeManualSkill(job, stage) {
  const base = {
    id: `${job.id}_${stage}`,
    type: stage === "init" ? "active" : "special",
    apCost: manualApCost(job, stage),
    chance: stage === "init" ? 0.68 : stage === "core" ? 0.5 : 0.46,
    priority: stage !== "init",
    condition: null,
    scalingStat: coreDamageStat(job),
    tags: job.themes ?? [],
    effects: []
  };
  if (job.tier === 1) return makeTierOneSkill(job, stage, base);
  if (has(job, "low_hp")) return skillFromSet(base, stage, [
    [damage("PA", 1.08, { missingHpPower: 0.75 }), sacrifice(0.03)],
    [status("rage_heat", "self", 999, { permanent: true, statMods: { PA: 5, MA: -2 }, damageMultiplier: 1.08 })],
    [damage("PA", 1.35, { missingHpPower: 1.55, lowMaPower: 0.015 }), sacrifice(0.06)]
  ], { art: { condition: { type: "hp_below", value: 0.58 } } });
  if (has(job, "swordsmanship")) return skillFromSet(base, stage, [
    [damage("PA", 0.86, { swordsmanshipPower: 0.05 }), resource("swordsmanship", 1)],
    [resource("swordsmanship", 3), status("trained_edge", "self", 999, { permanent: true, statMods: { ACC: 3, PA: 1 } })],
    [damage("PA", 1.0, { swordsmanshipPower: 0.12 })]
  ]);
  if (has(job, "shield_break")) return skillFromSet(base, stage, [
    [damage("PA", 0.9, { shieldBreak: 16, shieldPower: 0.4 })],
    [damage("PA", 1.05, { shieldBreak: 28, shieldPower: 0.8 }), typedStatus("fracture", 5, 3)],
    [damage("PA", 1.06, { targetStatus: "fracture", targetStatusPower: 1.5 }), typedStatus("fracture", 4, 3)]
  ], { core: { condition: { type: "target_has_shield", amount: 0 } } });
  if (has(job, "absolute") && has(job, "pd_to_pa")) return skillFromSet(base, stage, [
    [damage("PD", 0.86, { absolute: true, pdToPa: 0.25 })],
    [status("dragon_shift", "self", 3, { statMods: { PA: 6, PD: -2 }, damageMultiplier: 1.08 })],
    [damage("PD", 1.08, { absolute: true, pdToPa: 0.75 }), damage("PA", 0.55, { absolute: true })]
  ]);
  if (has(job, "absolute") || has(job, "shield") || has(job, "pd")) return skillFromSet(base, stage, [
    [damage("PD", 0.78, { absolute: has(job, "absolute") }), shield(4 + job.tier, "PD", 0.28)],
    [shield(8 + job.tier * 2, "PD", 0.5), statTradeoff({ CRT: -4, PD: 5, PA: 1 }, { id: `${job.id}_guard_oath` })],
    [damage("PD", 1.1, { absolute: true, shieldPower: 0.45 }), shield(6 + job.tier, "PD", 0.3)]
  ]);
  if (has(job, "enemy_current_hp")) return skillFromSet(base, stage, [
    [damage("SPD", 0.86, { enemyCurrentHpPower: 0.08 }), typedStatus("bleed", 4, 3)],
    [status("ambush_focus", "self", 3, { statMods: { CRT: 8, SPD: 3 } })],
    [damage("SPD", 1.05, { enemyCurrentHpPower: 0.16, critBonus: 8 }), typedStatus("bleed", 6, 3)]
  ], { init: { condition: { type: "enemy_hp_above", value: 0.5 } }, art: { condition: { type: "target_has_status", kind: "bleed" } } });
  if (has(job, "reverse_crit")) return skillFromSet(base, stage, [
    [damage("PA", 0.98, { inverseCrit: true, inverseCritBase: 42, inverseCritFloor: 8 }), typedStatus("bleed", 3, 2)],
    [statTradeoff({ CRT: -8, CRD: 22, PA: 2 }, { id: "reverse_edge" })],
    [damage("PA", 1.25, { inverseCrit: true, inverseCritBase: 55, inverseCritFloor: 12, critBonus: 6 })]
  ]);
  if (has(job, "rhythm")) return skillFromSet(base, stage, [
    [damage("EVA", 0.65), resource("rhythm", 1)],
    [resource("rhythm", 3), status("chorus", "self", 999, { permanent: true, stack: true, statMods: { EVA: 2, ACC: 1 } })],
    [damage("EVA", 1.05, { resourceKey: "rhythm", resourcePower: 0.08 }), clearResource("rhythm")]
  ], { art: { condition: { type: "has_resource", key: "rhythm", amount: 3 } } });
  if (has(job, "evasion")) return skillFromSet(base, stage, [
    [damage("EVA", 0.82), status("flow_step", "self", 2, { statMods: { EVA: 2 } })],
    [status("dance_guard", "self", 999, { permanent: true, statMods: { EVA: 5, PA: 2 } })],
    [damage("EVA", 1.16, { critBonus: 8 }), extraAction(0.22, 3)]
  ]);
  if (has(job, "predation") || has(job, "enemy_missing_hp")) return skillFromSet(base, stage, [
    [damage("ACC", 0.62), resource("mark", 1), status("aiming", "self", 999, { permanent: true, stack: true, statMods: { ACC: 2 } })],
    [resource("mark", 2), status("hunter_patience", "self", 999, { permanent: true, statMods: { ACC: 4, SPD: 2 } })],
    [damage("ACC", 1.0, { enemyMissingHpPower: 0.18, resourceKey: "mark", resourcePower: 0.04 }), clearResource("mark")]
  ], { art: { maxUses: 1, condition: { type: "enemy_hp_below", value: 0.45 } } });
  if (has(job, "extra_action")) return skillFromSet(base, stage, [
    [damage("ACC", 0.48), status("calibrated_reload", "self", 999, { permanent: true, stack: true, statMods: { ACC: 3 } })],
    [damage("ACC", 0.42), extraAction(0.42, 5)],
    [damage("ACC", 0.72, { resourceKey: "mark", resourcePower: 0.08 }), extraAction(0.35, 5)]
  ]);
  if (has(job, "summon")) return makeSummonSkill(job, stage, base);
  if (has(job, "food")) return skillFromSet(base, stage, [
    [damage("HP", 0.055, { currentHpPower: 0.12, lowEvaPower: 1.4 }), heal("HP", 0.06, { overheal: true })],
    [heal("HP", 0.14, { overheal: true }), statTradeoff({ EVA: -3, HP: 6, PD: 2 }, { id: `${job.id}_full_stomach` })],
    [damage("HP", 0.085, { currentHpPower: 0.2, lowEvaPower: 2.5 })]
  ]);
  if (has(job, "heal")) return makeHealSkill(job, stage, base);
  if (has(job, "max_hp") || has(job, "hp_cost")) return skillFromSet(base, stage, [
    [damage("HP", 0.06, { currentHpPower: 0.12 }), sacrifice(0.02)],
    [statTradeoff({ HP: 10, PA: 2, EVA: -2 }, { id: `${job.id}_bone_frame` })],
    [damage("HP", 0.095, { currentHpPower: 0.2, absolute: true }), sacrifice(0.05)]
  ], { art: { condition: { type: "hp_below", value: 0.75 } } });
  if (has(job, "decay") || has(job, "curse") || has(job, "weaken")) return makeCurseSkill(job, stage, base);
  if (has(job, "rune")) return skillFromSet(base, stage, [
    [damage("MA", 0.65), rune(`${job.id}_spark_rune`, "after_damage", [damage("MA", 0.4)], { maxInstalled: 100 })],
    [rune(`${job.id}_ward_rune`, "on_hit", [shield(6, "MA", 0.2)], { maxInstalled: 100 })],
    [rune(`${job.id}_collapse_rune`, "turn_end", [damage("MA", 0.75), typedStatus("shock", 3, 2)], { maxInstalled: 100 })]
  ]);
  if (has(job, "life_cost")) return skillFromSet(base, stage, [
    [sacrifice(0.04), damage("MA", 1.05, { lifeSteal: 0.18 })],
    [status("blood_pact", "self", 999, { permanent: true, statMods: { MA: 6, HP: -4 }, damageMultiplier: 1.08 })],
    [sacrifice(0.08), damage("MA", 1.35, { lifeSteal: 0.35 })]
  ], { art: { condition: { type: "hp_below", value: 0.8 } } });
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
      [damage("MA", 0.72, { absolute: true })]
    ], { init: { type: "special", condition: { type: "hp_below", value: 0.5 }, minChance: 0.1, repeatChancePenalty: 0.12 } });
  }
  if (job.id === "archer") {
    return skillFromSet(base, stage, [
      [damage("ACC", 0.52), status("aiming", "self", 999, { permanent: true, stack: true, statMods: { ACC: 2 } })],
      [status("steady_aim", "self", 999, { permanent: true, statMods: { ACC: 5 } })],
      [damage("ACC", 0.72), resource("mark", 1)]
    ]);
  }
  if (job.id === "rogue") {
    return skillFromSet(base, stage, [
      [damage("SPD", 0.82)],
      [status("light_step", "self", 999, { permanent: true, statMods: { EVA: 3, CRT: 1 } })],
      [damage("EVA", 0.95, { critBonus: 4 })]
    ]);
  }
  if (job.id === "mystic") {
    return skillFromSet(base, stage, [
      [damage("MA", 0.86)],
      [status("mana_focus", "self", 999, { permanent: true, statMods: { MA: 3 } })],
      [damage("MA", 1.02)]
    ]);
  }
  return skillFromSet(base, stage, [
    [damage("PA", 0.92)],
    [status("steady_grip", "self", 999, { permanent: true, statMods: { PA: 2, PD: 1 } })],
    [damage("PA", 1.12, { enemyMissingHpPower: 0.04 })]
  ]);
}

function makeHealSkill(job, stage, base) {
  return skillFromSet(base, stage, [
    [heal("MA", 2.0, { maxHpRatio: 0.08 }), typedStatus("regeneration", 5, 3)],
    [typedStatus("regeneration", 8, 4), status(`${job.id}_vow`, "self", 999, { permanent: true, statMods: { MD: 5, MA: 2 } })],
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
  if (has(job, "dragon")) return { absolute: true, pdToPa: 0.8, resourceKey: `${job.id}_contract`, resourcePower: 0.1 };
  if (has(job, "fire")) return { targetStatus: "burn", targetStatusPower: 1.6, resourceKey: `${job.id}_contract`, resourcePower: 0.08 };
  if (has(job, "earth")) return { targetStatus: "fracture", targetStatusPower: 1.6, resourceKey: `${job.id}_contract`, resourcePower: 0.08 };
  if (has(job, "demon")) return { lifeSteal: 0.35, resourceKey: `${job.id}_contract`, resourcePower: 0.1 };
  return { resourceKey: `${job.id}_contract`, resourcePower: 0.08 };
}

function skillFromSet(base, stage, effectsByStage, overrides = {}) {
  const stageIndex = stage === "init" ? 0 : stage === "core" ? 1 : 2;
  const override = overrides[stage] ?? {};
  return {
    ...base,
    ...override,
    effects: effectsByStage[stageIndex],
    maxUses: override.maxUses ?? (stage === "core" ? 1 : null)
  };
}

function manualApCost(job, stage) {
  if (job.tier === 1) return 1;
  if (stage === "init") return job.tier === 2 ? 1 : 2;
  if (stage === "core") return job.tier === 2 ? 1 : 2;
  return job.tier === 2 ? 2 : 3;
}
