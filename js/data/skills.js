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

export const skills = {
  basic_attack: { id: "basic_attack", type: "active", apCost: 0, chance: 1, priority: false, scalingStat: "PA", tags: ["physical"], effects: [damage("PA", 1)] },
  magic_attack: { id: "magic_attack", type: "active", apCost: 0, chance: 1, priority: false, scalingStat: "MA", tags: ["magic"], effects: [damage("MA", 1)] },
  ...generatedSkills
};
