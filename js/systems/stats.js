import { skills } from "../data/skills.js";
import { relics } from "../data/relics.js";

export const statKeys = ["HP", "PA", "PD", "MA", "MD", "SPD", "ACC", "EVA", "CRT", "CRD"];

export function createBaseStats() {
  return {
    HP: 120,
    PA: 12,
    PD: 6,
    MA: 8,
    MD: 6,
    SPD: 8,
    ACC: 82,
    EVA: 6,
    CRT: 5,
    CRD: 35
  };
}

export function addStats(target, growth, multiplier = 1) {
  for (const [key, value] of Object.entries(growth)) {
    target[key] = Math.round((target[key] ?? 0) + value * multiplier);
  }
}

export function getEffectiveStats(state) {
  const effective = { ...state.player.stats };

  for (const skillId of state.player.equippedSkills) {
    const skill = skills[skillId];
    if (skill?.type === "passive") {
      addStats(effective, skill.passiveStats ?? {});
    }
  }

  for (const relicId of state.player.relics) {
    const relic = relics[relicId];
    for (const modifier of relic?.modifiers ?? []) {
      if (modifier.type === "stat") {
        effective[modifier.stat] = (effective[modifier.stat] ?? 0) + modifier.amount;
      }
    }
  }

  return effective;
}

export function clampPercent(value) {
  return Math.max(0, Math.min(100, value));
}

export function scoreStats(stats) {
  return stats.HP * 0.18 + stats.PA * 2.1 + stats.PD * 1.5 + stats.MA * 2 + stats.MD * 1.35 + stats.SPD * 1.25 + stats.ACC * 0.45 + stats.EVA * 1.2 + stats.CRT * 0.9 + stats.CRD * 0.35;
}
