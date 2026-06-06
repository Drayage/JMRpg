import { relics } from "../data/relics.js?v=20260606-17";
import { skills } from "../data/skills.js?v=20260606-17";

export function getRelicsByCategory(category) {
  return Object.values(relics).filter((relic) => relic.category === category);
}

export function getRandomRelic(category = null) {
  const pool = category ? getRelicsByCategory(category) : Object.values(relics);
  return pool[Math.floor(Math.random() * pool.length)]?.id ?? Object.values(relics)[0].id;
}

export function getRandomUnownedRelic(state, category = null) {
  const preferredPool = (category ? getRelicsByCategory(category) : Object.values(relics)).filter((relic) => !isRelicUnavailable(state, relic.id));
  const fallbackPool = Object.values(relics).filter((relic) => !isRelicUnavailable(state, relic.id));
  const pool = preferredPool.length > 0 ? preferredPool : fallbackPool;
  return pool[Math.floor(Math.random() * pool.length)]?.id ?? null;
}

export function addRelic(state, relicId) {
  if (!relicId || hasRelic(state, relicId)) {
    return null;
  }
  state.player.relics.push(relicId);
  for (const rule of relics[relicId]?.rules ?? []) {
    if (rule.type === "extra_ap") {
      state.player.ap += rule.amount;
    }
  }
  return relicId;
}

export function hasRelic(state, relicId) {
  return state.player.relics.includes(relicId);
}

export function rejectRelic(state, relicId) {
  if (!relicId || !relics[relicId] || isRelicUnavailable(state, relicId)) {
    return null;
  }
  state.rejectedRelics.push(relicId);
  return relicId;
}

export function isRelicUnavailable(state, relicId) {
  return hasRelic(state, relicId) || state.rejectedRelics.includes(relicId);
}

export function getRelicRules(state, type = null) {
  return state.player.relics
    .map((relicId) => relics[relicId])
    .flatMap((relic) => (relic?.rules ?? []).map((rule) => ({ relicId: relic.id, relic, rule })))
    .filter((entry) => !type || entry.rule.type === type);
}

export function getJobXpPreserveRatio(state) {
  return getRelicRules(state, "preserve_job_xp").reduce((best, entry) => Math.max(best, entry.rule.ratio), 0);
}

export function getAdvancedEventWeightMultiplier(state) {
  return getRelicRules(state, "advanced_event_weight").reduce((multiplier, entry) => multiplier * entry.rule.multiplier, 1);
}

export function getPositiveEventRewardMultiplier(state) {
  return getRelicRules(state, "double_event_rewards").length > 0 ? 2 : 1;
}

export function getEliteRewardMultiplier(state) {
  return getRelicRules(state, "elite_reward_damage").reduce((multiplier, entry) => multiplier * entry.rule.rewardMultiplier, 1);
}

export function getEliteIncomingDamageMultiplier(state, battle) {
  if (!battle?.elite) {
    return 1;
  }
  return getRelicRules(state, "elite_reward_damage").reduce((multiplier, entry) => multiplier * entry.rule.incomingDamageMultiplier, 1);
}

export function getNormalLossXpMultiplier(state, battle) {
  if (battle?.boss || battle?.final || battle?.elite) {
    return 1;
  }
  return getRelicRules(state, "normal_loss_xp").reduce((multiplier, entry) => multiplier * entry.rule.multiplier, 1);
}

export function getMasteryMultiplier(state, targets) {
  let multiplier = 1;
  const nonMasteredEquipped = Math.max(1, targets.length);

  for (const { rule } of getRelicRules(state, "focused_mastery")) {
    const bonus = Math.max(0, 4 - nonMasteredEquipped) * 0.25;
    multiplier *= 1 + Math.min(rule.maxBonus, bonus);
  }

  const equippedAp = state.player.equippedSkills.reduce((total, skillId) => total + (skills[skillId]?.apCost ?? 0), 0);
  for (const { rule } of getRelicRules(state, "low_ap_mastery")) {
    if (equippedAp <= rule.threshold) {
      multiplier *= rule.multiplier;
    }
  }

  return multiplier;
}

export function getDamageMultiplier(state, context = {}) {
  let multiplier = 1;

  for (const { rule } of getRelicRules(state, "same_job_damage")) {
    multiplier *= 1 + state.actionsSinceJobChange * rule.perAction;
  }
  for (const { rule } of getRelicRules(state, "mastered_job_damage")) {
    multiplier *= 1 + state.masteredJobs.length * rule.perJob;
  }
  for (const { rule } of getRelicRules(state, "visited_job_damage")) {
    multiplier *= 1 + state.visitedJobs.length * rule.perJob;
  }
  for (const { rule } of getRelicRules(state, "mastered_skill_damage")) {
    const masteredSkills = Object.values(state.player.skillMastery).filter((value) => value >= 100).length;
    multiplier *= 1 + masteredSkills * rule.perSkill;
  }
  for (const { rule } of getRelicRules(state, "tag_damage")) {
    if (context.skill?.tags?.includes(rule.tag)) {
      multiplier *= rule.multiplier;
    }
  }
  for (const { rule } of getRelicRules(state, "missing_hp_damage")) {
    const missingRatio = context.player ? 1 - Math.max(0, context.player.hp) / context.player.stats.HP : 0;
    multiplier *= 1 + Math.min(rule.maxBonus, missingRatio * rule.maxBonus);
  }
  for (const { rule } of getRelicRules(state, "boss_damage")) {
    if (context.battle?.boss || context.battle?.final) {
      multiplier *= rule.multiplier;
    }
  }

  return multiplier;
}

export function getEventXpMultiplier(state, category = null, options = {}) {
  let multiplier = getPositiveEventRewardMultiplier(state);
  if (options.elite) {
    multiplier *= getEliteRewardMultiplier(state);
  }
  for (const { rule } of getRelicRules(state, "mastered_job_event_xp")) {
    multiplier *= 1 + state.masteredJobs.length * rule.perJob;
  }
  return multiplier;
}

export function getApDiscountFromRelics(state, skill) {
  let discount = 0;
  for (const { rule } of getRelicRules(state, "mastered_skill_ap_discount")) {
    if ((state.player.skillMastery[skill.id] ?? 0) >= 100 && skill.apCost > rule.minimumCost) {
      discount += rule.amount;
    }
  }
  return discount;
}

export function getRelicActivationBonus(state, skill, context = {}) {
  let bonus = 0;
  for (const { rule } of getRelicRules(state, "off_theme_activation_bonus")) {
    if (context.offTheme) {
      bonus += rule.amount;
    }
  }
  for (const { rule } of getRelicRules(state, "tag_activation_bonus")) {
    if (skill.tags?.includes(rule.tag)) {
      bonus += rule.amount;
    }
  }
  return bonus;
}

export function getPoisonMultiplier(state) {
  return getRelicRules(state, "poison_multiplier").reduce((multiplier, entry) => multiplier * entry.rule.multiplier, 1);
}

export function getRelicCurrentValue(state, relicId) {
  const relic = relics[relicId];
  const lines = [];
  for (const rule of relic?.rules ?? []) {
    if (rule.type === "preserve_job_xp") {
      const currentXp = state.player.currentJobXp;
      lines.push(`Current Job XP: ${currentXp}`);
      lines.push(`Preserved XP: ${Math.floor(currentXp * rule.ratio)}`);
    }
    if (rule.type === "same_job_damage") {
      lines.push(`Current Actions: ${state.actionsSinceJobChange}`);
      lines.push(`Current Bonus: +${Math.round(state.actionsSinceJobChange * rule.perAction * 100)}% damage`);
      lines.push("Changing jobs resets this bonus.");
    }
    if (rule.type === "focused_mastery") {
      const targets = state.player.equippedSkills.filter((skillId) => (state.player.skillMastery[skillId] ?? 0) < 100 && skillId !== "basic_attack");
      lines.push(`Non-mastered equipped skills: ${targets.length}`);
      lines.push(`Current Mastery Multiplier: x${getMasteryMultiplier(state, targets).toFixed(2)}`);
    }
    if (rule.type === "mastered_job_damage") {
      lines.push(`Mastered Jobs: ${state.masteredJobs.length}`);
      lines.push(`Current Damage Bonus: +${Math.round(state.masteredJobs.length * rule.perJob * 100)}%`);
    }
    if (rule.type === "visited_job_damage") {
      lines.push(`Visited Jobs: ${state.visitedJobs.length}`);
      lines.push(`Current Damage Bonus: +${Math.round(state.visitedJobs.length * rule.perJob * 100)}%`);
    }
    if (rule.type === "mastered_skill_damage") {
      const masteredSkills = Object.values(state.player.skillMastery).filter((value) => value >= 100).length;
      lines.push(`Mastered Skills: ${masteredSkills}`);
      lines.push(`Current Damage Bonus: +${Math.round(masteredSkills * rule.perSkill * 100)}%`);
    }
    if (rule.type === "tag_damage") {
      lines.push(`${rule.tag} skill damage: x${rule.multiplier}`);
    }
    if (rule.type === "tag_activation_bonus") {
      lines.push(`${rule.tag} skill activation: +${Math.round(rule.amount * 100)}%`);
    }
    if (rule.type === "poison_multiplier") {
      lines.push(`Poison power multiplier: x${rule.multiplier}`);
    }
    if (rule.type === "extra_ap") {
      lines.push(`AP gained on pickup: +${rule.amount}`);
    }
    if (rule.type === "advanced_event_weight") {
      lines.push(`Advanced Job Event Weight: x${rule.multiplier}`);
    }
    if (rule.type === "double_event_rewards") {
      lines.push("Positive event XP and stat rewards: x2");
      lines.push("Future negative penalties will also be doubled.");
    }
    if (rule.type === "missing_hp_damage") {
      lines.push(`Maximum Damage Bonus at low HP: +${Math.round(rule.maxBonus * 100)}%`);
    }
    if (rule.type === "boss_damage") {
      lines.push(`Boss Damage Multiplier: x${rule.multiplier}`);
      lines.push("Normal battle failures award no XP.");
    }
    if (rule.type === "low_ap_mastery") {
      const equippedAp = state.player.equippedSkills.reduce((total, skillId) => total + (skills[skillId]?.apCost ?? 0), 0);
      lines.push(`Equipped AP: ${equippedAp}/${rule.threshold}`);
      lines.push(`Current Bonus Active: ${equippedAp <= rule.threshold ? "yes" : "no"}`);
    }
    if (rule.type === "off_theme_activation_bonus") {
      lines.push(`Off-theme activation bonus: +${Math.round(rule.amount * 100)}%`);
    }
    if (rule.type === "elite_reward_damage") {
      lines.push(`Elite rewards: x${rule.rewardMultiplier}`);
      lines.push(`Elite incoming damage: x${rule.incomingDamageMultiplier}`);
    }
    if (rule.type === "mastered_skill_ap_discount") {
      const masteredEquipped = state.player.equippedSkills.filter((skillId) => (state.player.skillMastery[skillId] ?? 0) >= 100).length;
      lines.push(`Mastered equipped skills: ${masteredEquipped}`);
      lines.push(`AP discount: -${rule.amount}, minimum cost ${rule.minimumCost}`);
    }
  }
  return lines;
}
