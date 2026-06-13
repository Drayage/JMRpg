import assert from "node:assert/strict";
import { jobs } from "../js/data/jobs.js?v=test";
import { skills } from "../js/data/skills.js?v=test";
import { monsters } from "../js/data/monsters.js?v=test";
import { createInitialState } from "../js/state.js";
import { createBattle, runBattleStep } from "../js/systems/battle.js";
import { finishBattleAction } from "../js/systems/events.js";

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

function makeState(jobId, equippedSkills) {
  const state = createInitialState();
  state.currentJobId = jobId;
  state.player.learnedSkills = ["basic_attack", ...equippedSkills];
  state.player.equippedSkills = ["basic_attack", ...equippedSkills];
  state.player.skillMastery = Object.fromEntries(equippedSkills.map((skillId) => [skillId, 100]));
  state.player.ap = 99;
  return state;
}

const trainingDummy = monsters.training_dummy ?? Object.values(monsters)[0];

{
  const state = makeState("mystic", []);
  const battle = createBattle(state, trainingDummy);
  battle.order = ["player"];
  const action = runBattleStep(state, battle);
  assert.equal(action.skillId, "basic_attack");
}

{
  const state = makeState("mystic", ["mystic_init"]);
  const battle = createBattle(state, trainingDummy);
  battle.order = ["player"];
  const action = runBattleStep(state, battle);
  assert.equal(action.skillId, "mystic_init");
  assert.equal(skills.mystic_init.basicAttackReplacement, true);
}

{
  const state = makeState("destroyer", ["destroyer_init"]);
  const battle = createBattle(state, trainingDummy);
  battle.order = ["player"];
  battle.foe.guard = 10;
  const action = withRandomSequence([0, 0, 0.99], () => runBattleStep(state, battle));
  assert.equal(action.skillId, "destroyer_init");
  assert.equal(action.miss, true);
  assert.equal(battle.skillUses.destroyer_init ?? 0, 0);
}

{
  const state = makeState("warrior", []);
  const battle = createBattle(state, trainingDummy);
  battle.foe.hp = 0;
  battle.finished = true;
  battle.won = true;
  state.battle = battle;
  state.pendingBattleChoice = null;
  state.busy = true;
  finishBattleAction(state);
  assert.equal(state.busy, false);
  assert.equal(state.actionResult?.battle, battle);
  assert.equal(state.actionResult?.bossWon, true);
}

for (const skill of Object.values(skills)) {
  if (skill.system || skill.basicAttackReplacement || skill.maxUses === 1 || skill.condition) {
    continue;
  }
  if (skill.type === "active") {
    assert.ok(skill.chance <= 0.55, `${skill.id} repeat active chance is too high: ${skill.chance}`);
  }
}

for (const job of Object.values(jobs)) {
  const jobSkillIds = [`${job.id}_init`, `${job.id}_core`, `${job.id}_art`].filter((skillId) => skills[skillId]);
  const counts = { active: 0, passive: 0, special: 0 };
  for (const skillId of jobSkillIds) {
    counts[skills[skillId].type] = (counts[skills[skillId].type] ?? 0) + 1;
  }
  assert.ok(counts.active >= 1 && counts.active <= 3, `${job.id} active count out of range: ${counts.active}`);
  assert.ok(counts.passive >= 0 && counts.passive <= 1, `${job.id} passive count out of range: ${counts.passive}`);
  assert.ok(counts.special >= 0 && counts.special <= 1, `${job.id} special count out of range: ${counts.special}`);
}

const passiveCount = Object.values(skills).filter((skill) => !skill.system && skill.type === "passive").length;
assert.ok(passiveCount >= 60, `expected at least 60 passive skills, got ${passiveCount}`);

console.log("combat skill rules ok");
