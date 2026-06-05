import { bosses } from "./data/bosses.js";
import { createBaseStats } from "./systems/stats.js";

export function createInitialState() {
  const finalBossPool = ["fallen_seraph", "iron_tyrant", "plague_dragon", "mirror_queen", "world_serpent"];
  const basicJobPool = ["warrior", "archer", "rogue", "cleric", "wizard"];
  const finalBossId = finalBossPool[Math.floor(Math.random() * finalBossPool.length)];
  const startingJobId = basicJobPool[Math.floor(Math.random() * basicJobPool.length)];
  return {
    day: 1,
    actionInDay: 1,
    maxDay: 30,
    finalBossId,
    finalBoss: bosses[finalBossId],
    defeatedBosses: [],
    gameOver: false,
    victory: false,
    currentJobId: startingJobId,
    unlockedJobs: [...basicJobPool],
    discoveredJobs: [...basicJobPool],
    visitedJobs: [startingJobId],
    masteredJobs: [],
    rejectedRelics: [],
    activeJobEvent: null,
    activeHuntEvent: null,
    pendingJobXp: 0,
    actionsSinceJobChange: 0,
    actionResult: null,
    showBattleLog: false,
    battle: null,
    battleSpeed: "fast",
    busy: false,
    changed: {},
    player: {
      stats: createBaseStats(),
      currentJobXp: 0,
      ap: 4,
      learnedSkills: ["basic_attack"],
      equippedSkills: ["basic_attack"],
      skillMastery: {},
      relics: []
    },
    choices: [],
    log: [
      { type: "start", text: `Starting job selected: ${startingJobId}.` },
      { type: "start", text: `Final boss revealed: ${finalBossId}.` }
    ]
  };
}
