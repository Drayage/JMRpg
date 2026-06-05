import { skills } from "../data/skills.js";
import { getDamageMultiplier, getEliteIncomingDamageMultiplier, getNormalLossXpMultiplier, getPoisonMultiplier } from "./relics.js";
import { getEffectiveActivationChance } from "./skills.js";
import { getEffectiveStats, scoreStats } from "./stats.js";

export function estimateWinRate(state, enemy) {
  const playerScore = scoreStats(getEffectiveStats(state)) + state.player.equippedSkills.length * 12 + state.player.relics.length * 8;
  const enemyScore = scoreStats(enemy.stats);
  return Math.max(8, Math.min(92, Math.round((playerScore / (playerScore + enemyScore)) * 100)));
}

export function createBattle(state, enemy, options = {}) {
  const playerStats = scaleBattleStats(getEffectiveStats(state), 1.75);
  const enemyScale = options.final ? 2.25 : options.boss ? 2 : options.elite ? 1.85 : 1.65;
  const enemyStats = scaleBattleStats(enemy.stats, enemyScale);
  const order = playerStats.SPD >= enemyStats.SPD ? ["player", "enemy"] : ["enemy", "player"];

  return {
    enemyId: enemy.id,
    enemy,
    category: options.category,
    elite: Boolean(options.elite),
    boss: Boolean(options.boss),
    final: Boolean(options.final),
    traits: enemy.traits ?? [],
    turn: 1,
    actorIndex: 0,
    order,
    finished: false,
    won: false,
    player: createFighter(playerStats),
    foe: createFighter(enemyStats),
    lastAction: {
      actor: "system",
      skillId: null,
      text: `Battle started against ${enemy.id}.`,
      damage: 0,
      heal: 0,
      miss: false,
      crit: false,
      block: false,
      status: null
    },
    history: []
  };
}

export function runBattleStep(state, battle) {
  if (battle.finished) {
    return battle.lastAction;
  }

  const actor = battle.order[battle.actorIndex];
  let action;
  if (actor === "player") {
    action = resolvePlayerTurn(state, battle, battle.player, battle.foe, battle.traits);
  } else {
    action = resolveEnemyTurn(state, battle, battle.player, battle.foe, battle.enemyId);
  }

  battle.lastAction = { turn: battle.turn, actor, ...action };
  battle.history.unshift(battle.lastAction);
  battle.history = battle.history.slice(0, 14);
  battle.actorIndex += 1;

  if (battle.player.hp <= 0 || battle.foe.hp <= 0) {
    finishBattle(battle);
    return battle.lastAction;
  }

  if (battle.actorIndex >= battle.order.length) {
    const poisonAction = applyPoison(battle.foe, battle.traits);
    if (poisonAction) {
      battle.lastAction = { turn: battle.turn, actor: "status", ...poisonAction };
      battle.history.unshift(battle.lastAction);
      battle.history = battle.history.slice(0, 14);
    }
    battle.actorIndex = 0;
    battle.turn += 1;
  }

  if (battle.player.hp <= 0 || battle.foe.hp <= 0) {
    finishBattle(battle);
  }

  return battle.lastAction;
}

export function getBattleReward(state, battle) {
  const lossMultiplier = getNormalLossXpMultiplier(state, battle);
  const xp = battle.won ? battle.enemy.xp ?? 0 : Math.round((battle.enemy.xp ?? 0) * 0.25 * lossMultiplier);
  return { won: battle.won, xp, category: battle.category };
}

export function runBattle(state, enemy, options = {}) {
  const battle = createBattle(state, enemy, options);
  let safetySteps = 0;
  while (!battle.finished) {
    runBattleStep(state, battle);
    safetySteps += 1;
    if (safetySteps > 1000) {
      throw new Error(`Battle failed to resolve: ${enemy.id}`);
    }
  }
  const reward = getBattleReward(state, battle);
  state.log.unshift({ type: reward.won ? "win" : "loss", text: `${reward.won ? "Won" : "Lost"} battle against ${enemy.id}.` });
  for (const action of battle.history.slice(0, 12).reverse()) {
    state.log.unshift({ type: "battle", text: action.text });
  }
  return { ...reward, log: battle.history.map((action) => action.text) };
}

function createFighter(stats) {
  return {
    stats,
    hp: stats.HP,
    guard: 0,
    poison: { power: 0, turns: 0 }
  };
}

function scaleBattleStats(stats, hpMultiplier) {
  return { ...stats, HP: Math.round(stats.HP * hpMultiplier) };
}

function resolvePlayerTurn(state, battle, player, foe, traits) {
  const activeSkills = state.player.equippedSkills.map((id) => skills[id]).filter((skill) => skill && skill.type !== "passive");
  const priority = activeSkills.filter((skill) => skill.priority);

  for (const skill of priority) {
    if (conditionMet(skill, player, foe) && rollSkill(state, skill)) {
      return executeSkill(state, battle, skill, player, foe, traits);
    }
  }

  let pool = [...activeSkills.filter((skill) => !skill.priority)];
  while (pool.length > 0) {
    const index = Math.floor(Math.random() * pool.length);
    const skill = pool[index];
    if (conditionMet(skill, player, foe) && rollSkill(state, skill)) {
      return executeSkill(state, battle, skill, player, foe, traits);
    }
    pool.splice(index, 1);
  }

  return executeSkill(state, battle, skills.basic_attack, player, foe, traits);
}

function resolveEnemyTurn(state, battle, player, foe, enemyId) {
  if (Math.random() * 100 > Math.max(12, foe.stats.ACC - player.stats.EVA)) {
    return { skillId: null, text: `${enemyId} missed.`, damage: 0, heal: 0, miss: true, crit: false, block: false, status: null };
  }
  const raw = foe.stats.PA * (0.55 + Math.random() * 0.24) * getEliteIncomingDamageMultiplier(state, battle) * getStalemateDamageMultiplier(battle);
  const blocked = player.guard > 0;
  const damage = Math.max(1, Math.round(raw - player.stats.PD * 0.38 - player.guard));
  player.guard = Math.max(0, player.guard - 4);
  player.hp = Math.max(0, player.hp - damage);
  return {
    skillId: null,
    text: `${enemyId} dealt ${damage} damage${blocked ? " after block" : ""}.`,
    damage,
    heal: 0,
    miss: false,
    crit: false,
    block: blocked,
    status: null
  };
}

function executeSkill(state, battle, skill, player, foe, traits) {
  if (Math.random() * 100 > Math.max(8, player.stats.ACC - foe.stats.EVA)) {
    return { skillId: skill.id, text: `${skill.id} missed.`, damage: 0, heal: 0, miss: true, crit: false, block: false, status: null };
  }

  const action = { skillId: skill.id, text: "", damage: 0, heal: 0, miss: false, crit: false, block: false, status: null };
  const lines = [];

  for (const effect of skill.effects ?? []) {
    if (effect.type === "damage") {
      const base = player.stats[effect.stat] * effect.power * 0.64;
      const relicMultiplier = getDamageMultiplier(state, { player, battle, skill });
      const stalemateMultiplier = getStalemateDamageMultiplier(battle);
      const traitMultiplier = getTraitDamageMultiplier(skill, traits);
      const critChance = player.stats.CRT + (effect.critBonus ?? 0) - (traits.includes("critical_resistance") ? 10 : 0);
      const crit = Math.random() * 100 < Math.max(0, critChance);
      const critMultiplier = crit ? 1 + player.stats.CRD / 100 : 1;
      const defense = skill.tags?.includes("magic") ? foe.stats.MD : foe.stats.PD;
      const damage = Math.max(1, Math.round(base * relicMultiplier * stalemateMultiplier * traitMultiplier * critMultiplier - defense * 0.34));
      foe.hp = Math.max(0, foe.hp - damage);
      action.damage += damage;
      action.crit = action.crit || crit;
      lines.push(`${skill.id} dealt ${damage}${crit ? " critical" : ""} damage`);
    }
    if (effect.type === "heal") {
      const healed = Math.round(player.stats[effect.stat] * effect.power * 0.72);
      player.hp = Math.min(player.stats.HP, player.hp + healed);
      action.heal += healed;
      lines.push(`${skill.id} healed ${healed} HP`);
    }
    if (effect.type === "guard") {
      player.guard += effect.amount;
      action.block = true;
      lines.push(`${skill.id} gained ${effect.amount} block`);
    }
    if (effect.type === "poison" && !traits.includes("poison_immunity")) {
      foe.poison = { power: Math.round(effect.power * getPoisonMultiplier(state)), turns: effect.turns };
      action.status = "poison";
      lines.push(`${skill.id} applied poison`);
    }
  }

  action.text = `${lines.join(". ")}.`;
  return action;
}

function applyPoison(foe, traits) {
  if (traits.includes("poison_immunity") || foe.poison.turns <= 0) {
    return null;
  }
  foe.hp = Math.max(0, foe.hp - foe.poison.power);
  foe.poison.turns -= 1;
  return {
    skillId: null,
    text: `Poison dealt ${foe.poison.power} damage.`,
    damage: foe.poison.power,
    heal: 0,
    miss: false,
    crit: false,
    block: false,
    status: "poison"
  };
}

function finishBattle(battle) {
  battle.finished = true;
  battle.won = battle.foe.hp <= 0;
}

function rollSkill(state, skill) {
  return Math.random() < getEffectiveActivationChance(state, skill.id);
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

export function getStalemateDamageMultiplier(battle) {
  if (battle.turn <= 50) {
    return 1;
  }
  if (battle.turn <= 75) {
    return 1 + (battle.turn - 50) * 0.04;
  }
  return 2 + (battle.turn - 75) * 0.08;
}
