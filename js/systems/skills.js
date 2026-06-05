import { skills } from "../data/skills.js";

export function getEquippedApCost(state) {
  return state.player.equippedSkills.reduce((total, skillId) => total + (skills[skillId]?.apCost ?? 0), 0);
}

export function canEquipSkill(state, skillId) {
  const skill = skills[skillId];
  if (!skill || !state.player.learnedSkills.includes(skillId) || state.player.equippedSkills.includes(skillId)) {
    return false;
  }
  return getEquippedApCost(state) + skill.apCost <= state.player.ap;
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

export function learnSkill(state, skillId) {
  if (!state.player.learnedSkills.includes(skillId)) {
    state.player.learnedSkills.push(skillId);
    state.player.skillMastery[skillId] = state.player.skillMastery[skillId] ?? 0;
  }
}

export function addSkillMasteryFromXp(state, xp) {
  const targets = state.player.equippedSkills.filter((skillId) => {
    const skill = skills[skillId];
    return skill && skill.id !== "basic_attack" && (state.player.skillMastery[skillId] ?? 0) < 100;
  });

  if (targets.length === 0) {
    return [];
  }

  const gained = [];
  const split = xp / targets.length;
  for (const skillId of targets) {
    const current = state.player.skillMastery[skillId] ?? 0;
    const next = Math.min(100, current + split * 0.7);
    state.player.skillMastery[skillId] = Math.round(next);
    if (current < 100 && next >= 100) {
      gained.push(skillId);
    }
  }
  return gained;
}
