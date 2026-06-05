import { relics } from "../data/relics.js";

export function getRelicsByCategory(category) {
  return Object.values(relics).filter((relic) => relic.category === category);
}

export function getRandomRelic(category = null) {
  const pool = category ? getRelicsByCategory(category) : Object.values(relics);
  return pool[Math.floor(Math.random() * pool.length)]?.id ?? Object.values(relics)[0].id;
}

export function addRelic(state, relicId) {
  state.player.relics.push(relicId);
  return relicId;
}

export function getRelicMultiplier(state, type, tag) {
  let multiplier = 1;
  for (const relicId of state.player.relics) {
    const relic = relics[relicId];
    for (const modifier of relic?.modifiers ?? []) {
      if (modifier.type === type && modifier.tag === tag) {
        multiplier *= modifier.multiplier;
      }
    }
  }
  return multiplier;
}

export function getActivationBonus(state, skill) {
  let bonus = 0;
  for (const relicId of state.player.relics) {
    const relic = relics[relicId];
    for (const modifier of relic?.modifiers ?? []) {
      if (modifier.type === "activation" && skill.tags?.includes(modifier.tag)) {
        bonus += modifier.amount;
      }
    }
  }
  return bonus;
}

export function getPoisonMultiplier(state) {
  let multiplier = 1;
  for (const relicId of state.player.relics) {
    const relic = relics[relicId];
    for (const modifier of relic?.modifiers ?? []) {
      if (modifier.type === "poison") {
        multiplier *= modifier.multiplier;
      }
    }
  }
  return multiplier;
}

export function getXpMultiplier(state, tag) {
  let multiplier = 1;
  for (const relicId of state.player.relics) {
    const relic = relics[relicId];
    for (const modifier of relic?.modifiers ?? []) {
      if (modifier.type === "xp" && modifier.tag === tag) {
        multiplier *= modifier.multiplier;
      }
    }
  }
  return multiplier;
}
