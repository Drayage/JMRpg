import { skills } from "../data/skills.js";
import { getActivationBonus, getPoisonMultiplier, getRelicMultiplier } from "./relics.js";
import { getEffectiveStats, scoreStats } from "./stats.js";

export function estimateWinRate(state, enemy) {
  const playerScore = scoreStats(getEffectiveStats(state)) + state.player.equippedSkills.length * 12 + state.player.relics.length * 8;
  const enemyScore = scoreStats(enemy.stats);
  return Math.max(8, Math.min(92, Math.round((playerScore / (playerScore + enemyScore)) * 100)));
}

export function runBattle(state, enemy, options = {}) {
  const playerStats = getEffectiveStats(state);
  const enemyStats = { ...enemy.stats };
  const player = createFighter(playerStats);
  const foe = createFighter(enemyStats);
  const log = [];
  const enemyTraits = enemy.traits ?? [];
  let turn = 1;

  while (player.hp > 0 && foe.hp > 0 && turn <= 45) {
    const order = player.stats.SPD >= foe.stats.SPD ? ["player", "enemy"] : ["enemy", "player"];
    for (const actor of order) {
      if (player.hp <= 0 || foe.hp <= 0) {
        break;
      }
      if (actor === "player") {
        resolvePlayerTurn(state, player, foe, enemyTraits, log);
      } else {
        resolveEnemyTurn(player, foe, log, enemy.id);
      }
    }
    applyPoison(player, foe, log, enemyTraits);
    turn += 1;
  }

  const won = foe.hp <= 0;
  if (!won && player.hp > 0 && foe.hp > 0) {
    log.push("Battle timed out.");
  }

  state.log.unshift({ type: won ? "win" : "loss", text: `${won ? "Won" : "Lost"} battle against ${enemy.id}.` });
  for (const line of log.slice(-12).reverse()) {
    state.log.unshift({ type: "battle", text: line });
  }

  return { won, log, xp: won ? enemy.xp ?? 0 : Math.round((enemy.xp ?? 0) * 0.25), category: options.category };
}

function createFighter(stats) {
  return {
    stats,
    hp: stats.HP,
    guard: 0,
    poison: { power: 0, turns: 0 }
  };
}

function resolvePlayerTurn(state, player, foe, traits, log) {
  const activeSkills = state.player.equippedSkills.map((id) => skills[id]).filter((skill) => skill && skill.type !== "passive");
  const priority = activeSkills.filter((skill) => skill.priority);

  for (const skill of priority) {
    if (conditionMet(skill, player, foe) && rollSkill(state, skill)) {
      executeSkill(state, skill, player, foe, traits, log);
      return;
    }
  }

  let pool = [...activeSkills.filter((skill) => !skill.priority)];
  while (pool.length > 0) {
    const index = Math.floor(Math.random() * pool.length);
    const skill = pool[index];
    if (conditionMet(skill, player, foe) && rollSkill(state, skill)) {
      executeSkill(state, skill, player, foe, traits, log);
      return;
    }
    pool.splice(index, 1);
  }

  executeSkill(state, skills.basic_attack, player, foe, traits, log);
}

function resolveEnemyTurn(player, foe, log, enemyId) {
  if (Math.random() * 100 > Math.max(12, foe.stats.ACC - player.stats.EVA)) {
    log.push(`${enemyId} missed.`);
    return;
  }
  const raw = foe.stats.PA * (0.9 + Math.random() * 0.35);
  const damage = Math.max(1, Math.round(raw - player.stats.PD * 0.45 - player.guard));
  player.guard = Math.max(0, player.guard - 3);
  player.hp -= damage;
  log.push(`${enemyId} dealt ${damage} damage.`);
}

function executeSkill(state, skill, player, foe, traits, log) {
  if (Math.random() * 100 > Math.max(8, player.stats.ACC - foe.stats.EVA)) {
    log.push(`${skill.id} missed.`);
    return;
  }

  for (const effect of skill.effects ?? []) {
    if (effect.type === "damage") {
      const base = player.stats[effect.stat] * effect.power;
      const tagMultiplier = (skill.tags ?? []).reduce((total, tag) => total * getRelicMultiplier(state, "tag_damage", tag), 1);
      const traitMultiplier = getTraitDamageMultiplier(skill, traits);
      const critChance = player.stats.CRT + (effect.critBonus ?? 0) - (traits.includes("critical_resistance") ? 10 : 0);
      const crit = Math.random() * 100 < Math.max(0, critChance);
      const critMultiplier = crit ? 1 + player.stats.CRD / 100 : 1;
      const defense = skill.tags?.includes("magic") ? foe.stats.MD : foe.stats.PD;
      const damage = Math.max(1, Math.round(base * tagMultiplier * traitMultiplier * critMultiplier - defense * 0.45));
      foe.hp -= damage;
      log.push(`${skill.id} dealt ${damage}${crit ? " critical" : ""} damage.`);
    }
    if (effect.type === "heal") {
      const tagMultiplier = (skill.tags ?? []).reduce((total, tag) => total * getRelicMultiplier(state, "tag_heal", tag), 1);
      const healed = Math.round(player.stats[effect.stat] * effect.power * tagMultiplier);
      player.hp = Math.min(player.stats.HP, player.hp + healed);
      log.push(`${skill.id} healed ${healed} HP.`);
    }
    if (effect.type === "guard") {
      player.guard += effect.amount;
    }
    if (effect.type === "poison" && !traits.includes("poison_immunity")) {
      foe.poison = { power: Math.round(effect.power * getPoisonMultiplier(state)), turns: effect.turns };
      log.push(`${skill.id} applied poison.`);
    }
  }
}

function applyPoison(player, foe, log, traits) {
  if (traits.includes("poison_immunity")) {
    return;
  }
  if (foe.poison.turns > 0) {
    foe.hp -= foe.poison.power;
    foe.poison.turns -= 1;
    log.push(`Poison dealt ${foe.poison.power} damage.`);
  }
}

function rollSkill(state, skill) {
  return Math.random() < Math.min(0.95, (skill.chance ?? 1) + getActivationBonus(state, skill));
}

function conditionMet(skill, player, foe) {
  if (!skill.condition) {
    return true;
  }
  if (skill.condition.type === "hp_below") {
    return player.hp / player.stats.HP <= skill.condition.value;
  }
  if (skill.condition.type === "enemy_hp_above") {
    return foe.hp / foe.stats.HP >= skill.condition.value;
  }
  if (skill.condition.type === "enemy_hp_below") {
    return foe.hp / foe.stats.HP <= skill.condition.value;
  }
  return true;
}

function getTraitDamageMultiplier(skill, traits) {
  let multiplier = 1;
  if (traits.includes("holy_vulnerability") && skill.tags?.includes("holy")) {
    multiplier *= 1.35;
  }
  if (traits.includes("physical_resistance") && skill.tags?.includes("physical")) {
    multiplier *= 0.72;
  }
  if (traits.includes("poison_immunity") && skill.tags?.includes("poison")) {
    multiplier *= 0.65;
  }
  return multiplier;
}
