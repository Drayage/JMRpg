import { jobs } from "../data/jobs.js";
import { skills } from "../data/skills.js";
import { getApDiscountFromRelics, getMasteryMultiplier, getRelicActivationBonus } from "./relics.js";
import { getEffectiveStats } from "./stats.js";

export const skillSlotLimits = {
  active: 4,
  special: 2,
  passive: 3
};

const skillMasteryRate = 1.7;

export function getSkillType(skillId) {
  return skills[skillId]?.type ?? "active";
}

export function getEquippedApCost(state) {
  return state.player.equippedSkills
    .filter((skillId) => canUseSkill(state, skillId))
    .reduce((total, skillId) => total + getEffectiveApCost(state, skillId), 0);
}

export function getEquippedSlotCount(state, type) {
  return state.player.equippedSkills.filter((skillId) => skillId !== "basic_attack" && canUseSkill(state, skillId) && getSkillType(skillId) === type).length;
}

export function getEffectiveApCost(state, skillId) {
  const skill = skills[skillId];
  if (!skill) {
    return 0;
  }
  const base = skill.apCost ?? 0;
  const jobDiscount = isSkillOnTheme(state, skill) && jobs[state.currentJobId]?.tier > 1 ? 1 : 0;
  const relicDiscount = getApDiscountFromRelics(state, skill);
  return Math.max(skill.id === "basic_attack" ? 0 : 1, base - jobDiscount - relicDiscount);
}

export function getEffectiveActivationChance(state, skillId) {
  const skill = skills[skillId];
  if (!skill) {
    return 0;
  }
  const base = skill.chance ?? 1;
  const onTheme = isSkillOnTheme(state, skill);
  const jobBonus = onTheme ? 0.07 : -0.04;
  const relicBonus = getRelicActivationBonus(state, skill, { offTheme: !onTheme });
  return Math.max(0.05, Math.min(0.95, base + jobBonus + relicBonus));
}

export function canEquipSkill(state, skillId) {
  const skill = skills[skillId];
  if (!skill || !canUseSkill(state, skillId) || state.player.equippedSkills.includes(skillId)) {
    return false;
  }
  const type = skill.type;
  if (getEquippedSlotCount(state, type) >= skillSlotLimits[type]) {
    return false;
  }
  return getEquippedApCost(state) + getEffectiveApCost(state, skillId) <= state.player.ap;
}

export function equipSkill(state, skillId) {
  if (!canEquipSkill(state, skillId)) {
    return false;
  }
  state.player.equippedSkills.push(skillId);
  return true;
}

export function unequipSkill(state, skillId) {
  state.player.equippedSkills = state.player.equippedSkills.filter((id) => id !== skillId);
  return true;
}

export function canUseSkill(state, skillId) {
  if (skillId === "basic_attack") {
    return true;
  }
  if (!skills[skillId] || !state.player.learnedSkills.includes(skillId)) {
    return false;
  }
  if ((state.player.skillMastery[skillId] ?? 0) >= 100) {
    return true;
  }
  return isCurrentJobSkillUnlocked(state, skillId);
}

export function pruneUnavailableEquippedSkills(state) {
  state.player.equippedSkills = [
    "basic_attack",
    ...state.player.equippedSkills.filter((skillId) => skillId !== "basic_attack" && canUseSkill(state, skillId))
  ];
}

export function learnSkill(state, skillId) {
  if (!state.player.learnedSkills.includes(skillId)) {
    state.player.learnedSkills.push(skillId);
    state.player.skillMastery[skillId] = state.player.skillMastery[skillId] ?? 0;
  }
}

export function addSkillMasteryFromXp(state, xp) {
  const targets = state.player.equippedSkills.filter((skillId) => {
    const skill = skills[skillId];
    return skill && canUseSkill(state, skillId) && skill.id !== "basic_attack" && (state.player.skillMastery[skillId] ?? 0) < 100;
  });

  if (targets.length === 0) {
    return [];
  }

  const gained = [];
  const split = (xp / targets.length) * getMasteryMultiplier(state, targets);
  for (const skillId of targets) {
    const current = state.player.skillMastery[skillId] ?? 0;
    const next = Math.min(100, current + split * skillMasteryRate);
    state.player.skillMastery[skillId] = Math.round(next);
    if (current < 100 && next >= 100) {
      gained.push(skillId);
    }
  }
  return gained;
}

function isCurrentJobSkillUnlocked(state, skillId) {
  const job = jobs[state.currentJobId];
  if (!job) {
    return false;
  }
  const progress = Math.min(100, Math.floor((state.player.currentJobXp / getEffectiveJobXpRequired(job)) * 100));
  return job.milestones.some((milestone) => milestone.type === "skill" && milestone.skillId === skillId && progress >= milestone.percent);
}

function getEffectiveJobXpRequired(job) {
  const multipliers = {
    1: 1.25,
    2: 1.4,
    3: 1.55,
    4: 1.7
  };
  return Math.round(job.xpRequired * (multipliers[job.tier] ?? 1.5));
}

export function isSkillOnTheme(state, skill) {
  const themes = jobs[state.currentJobId]?.themes ?? [];
  return skill.tags?.some((tag) => themes.includes(tag)) ?? false;
}

export function getSkillEstimate(state, skillId) {
  const skill = skills[skillId];
  const stats = getEffectiveStats(state);
  if (!skill) {
    return null;
  }
  const effect = skill.effects?.find((item) => item.type === "damage" || item.type === "heal");
  const stat = effect?.stat ?? skill.scalingStat;
  const power = effect?.power ?? 0;
  const baseValue = stat ? Math.round((stats[stat] ?? 0) * power) : 0;
  const combatFactor = effect?.type === "damage" ? 0.64 : effect?.type === "heal" ? 0.72 : 1;
  const finalValue = Math.round(baseValue * combatFactor * (isSkillOnTheme(state, skill) ? 1.08 : 0.96));
  return {
    type: skill.type,
    effectType: effect?.type ?? null,
    tags: skill.tags ?? [],
    apCost: getEffectiveApCost(state, skillId),
    baseApCost: skill.apCost ?? 0,
    activationChance: getEffectiveActivationChance(state, skillId),
    baseActivationChance: skill.chance ?? 1,
    condition: skill.condition ?? null,
    scalingStat: stat,
    scalingValue: stat ? stats[stat] ?? 0 : 0,
    power,
    baseValue,
    finalValue,
    onTheme: isSkillOnTheme(state, skill),
    mastery: state.player.skillMastery[skillId] ?? 0,
    mastered: (state.player.skillMastery[skillId] ?? 0) >= 100
  };
}
