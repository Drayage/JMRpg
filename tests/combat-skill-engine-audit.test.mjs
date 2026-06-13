import assert from "node:assert/strict";
import { jobs } from "../js/data/jobs.js?v=audit";
import { skills } from "../js/data/skills.js?v=audit";
import { monsters } from "../js/data/monsters.js?v=audit";
import { createInitialState } from "../js/state.js";
import { createBattle, runBattleStep } from "../js/systems/battle.js";

const allowedSkillTypes = new Set(["active", "special", "passive"]);
const allowedEffectTypes = new Set([
  "damage",
  "heal",
  "guard",
  "shield",
  "poison",
  "status",
  "typed_status",
  "summon",
  "rune",
  "resource",
  "consume_resource",
  "consume_status",
  "clear_resource",
  "stat_tradeoff",
  "passive",
  "extra_action",
  "sacrifice",
  "dispel"
]);
const allowedConditions = new Set([
  "battle_start",
  "hp_below",
  "enemy_hp_above",
  "enemy_hp_below",
  "has_resource",
  "has_summon",
  "target_has_status",
  "target_has_shield",
  "self_has_status"
]);
const allowedStats = new Set(["HP", "PA", "PD", "MA", "MD", "SPD", "ACC", "EVA", "CRT", "CRD"]);
const trainingDummy = monsters.training_dummy ?? Object.values(monsters)[0];

function withRandomSequence(values, fn) {
  const originalRandom = Math.random;
  let index = 0;
  Math.random = () => values[Math.min(index++, values.length - 1)];
  try {
    return fn();
  } finally {
    Math.random = originalRandom;
  }
}

function sourceJobForSkill(skillId) {
  return Object.values(jobs).find((job) => (job.milestones ?? []).some((milestone) => milestone.skillId === skillId));
}

function makeAuditState(skillId) {
  const sourceJob = sourceJobForSkill(skillId);
  const state = createInitialState();
  state.currentJobId = sourceJob?.id ?? "warrior";
  state.player.stats = {
    HP: 420,
    PA: 80,
    PD: 70,
    MA: 80,
    MD: 70,
    SPD: 65,
    ACC: 999,
    EVA: 35,
    CRT: 20,
    CRD: 50
  };
  state.player.ap = 99;
  state.player.currentJobXp = 999999;
  state.player.jobXpByJob[state.currentJobId] = 999999;
  state.player.learnedSkills = ["basic_attack", skillId];
  state.player.equippedSkills = ["basic_attack", skillId];
  state.player.skillMastery = { [skillId]: 100 };
  return state;
}

function prepareCondition(skill, battle) {
  const condition = skill.condition;
  if (!condition) {
    return;
  }
  if (condition.type === "battle_start") {
    battle.turn = Math.min(condition.turn ?? 1, 1);
  } else if (condition.type === "hp_below") {
    battle.player.hp = Math.max(1, Math.floor(battle.player.stats.HP * Math.min(condition.value, 0.45)));
  } else if (condition.type === "enemy_hp_above") {
    battle.foe.hp = Math.ceil(battle.foe.stats.HP * Math.max(condition.value, 0.8));
  } else if (condition.type === "enemy_hp_below") {
    battle.foe.hp = Math.max(1, Math.floor(battle.foe.stats.HP * Math.min(condition.value, 0.35)));
  } else if (condition.type === "has_resource") {
    battle.player.resources[condition.key] = condition.amount ?? 1;
  } else if (condition.type === "target_has_status") {
    battle.foe.typedStatuses[condition.kind] = { amount: 10, turns: 3 };
  } else if (condition.type === "target_has_shield") {
    battle.foe.guard = (condition.amount ?? 0) + 10;
  } else if (condition.type === "self_has_status") {
    battle.player.typedStatuses[condition.kind] = { amount: 10, turns: 3 };
  } else if (condition.type === "has_summon") {
    battle.player.summons.push({ id: "audit_summon", role: "striker", hp: 100, maxHp: 100, stat: "MA", power: 20, cadence: 1, share: 0.3, contract: false });
  }
}

function assertSkillShape(skill) {
  assert.equal(typeof skill.id, "string", "skill id must be string");
  assert.ok(allowedSkillTypes.has(skill.type), `${skill.id} has unsupported type ${skill.type}`);
  assert.ok(Number.isFinite(skill.apCost) && skill.apCost >= 0, `${skill.id} has invalid AP cost`);
  assert.ok(Number.isFinite(skill.chance) && skill.chance >= 0 && skill.chance <= 1, `${skill.id} has invalid chance`);
  assert.ok(Array.isArray(skill.effects), `${skill.id} effects must be an array`);
  if (skill.condition) {
    assert.ok(allowedConditions.has(skill.condition.type), `${skill.id} has unsupported condition ${skill.condition.type}`);
  }
  if (skill.scalingStat) {
    assert.ok(allowedStats.has(skill.scalingStat), `${skill.id} has unsupported scaling stat ${skill.scalingStat}`);
  }
  for (const effect of skill.effects) {
    assert.ok(allowedEffectTypes.has(effect.type), `${skill.id} has unsupported effect type ${effect.type}`);
    if (effect.stat) {
      assert.ok(allowedStats.has(effect.stat), `${skill.id} effect has unsupported stat ${effect.stat}`);
    }
    if (effect.statMods) {
      for (const key of Object.keys(effect.statMods)) {
        assert.ok(allowedStats.has(key), `${skill.id} effect has unsupported stat mod ${key}`);
      }
    }
    if (effect.type === "typed_status") {
      assert.equal(typeof effect.kind, "string", `${skill.id} typed_status needs kind`);
      assert.ok(effect.target === undefined || effect.target === "self" || effect.target === "foe", `${skill.id} typed_status has invalid target`);
    }
    if (effect.type === "status") {
      assert.equal(typeof effect.id, "string", `${skill.id} status needs id`);
      assert.ok(effect.target === "self" || effect.target === "foe", `${skill.id} status has invalid target`);
    }
    if (effect.type === "passive") {
      assert.ok(effect.statMods && Object.keys(effect.statMods).length > 0, `${skill.id} passive needs statMods`);
      assert.deepEqual(skill.passiveStats ?? {}, effect.statMods, `${skill.id} passiveStats must match passive effect`);
    }
    if (effect.type === "resource" || effect.type === "consume_resource" || effect.type === "clear_resource") {
      assert.equal(typeof effect.key, "string", `${skill.id} resource effect needs key`);
    }
  }
}

function assertSkillCanExecute(skill) {
  if (skill.system || skill.type === "passive") {
    return;
  }
  const state = makeAuditState(skill.id);
  const battle = createBattle(state, trainingDummy);
  battle.order = ["player"];
  battle.foe.stats.HP = Math.max(battle.foe.stats.HP, 320);
  battle.foe.hp = battle.foe.stats.HP;
  prepareCondition(skill, battle);
  withRandomSequence([0, 0, 0, 0, 0, 0], () => runBattleStep(state, battle));
  const skillAction = battle.history.find((action) => action.skillId === skill.id);
  assert.ok(skillAction, `${skill.id} did not execute`);
  assert.equal(skillAction.miss, false, `${skill.id} unexpectedly missed in audit`);
  assert.equal(typeof skillAction.text, "string", `${skill.id} did not return action text`);
}

for (const job of Object.values(jobs)) {
  for (const milestone of job.milestones ?? []) {
    if (milestone.type === "skill") {
      assert.ok(skills[milestone.skillId], `${job.id} milestone references missing skill ${milestone.skillId}`);
    }
  }
}

for (const skill of Object.values(skills)) {
  assertSkillShape(skill);
  assertSkillCanExecute(skill);
}

console.log(`combat skill engine audit ok: ${Object.keys(skills).length} skills`);
