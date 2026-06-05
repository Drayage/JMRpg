import { bosses } from "./data/bosses.js";
import { createBaseStats } from "./systems/stats.js";

export function createInitialState() {
  const finalBossPool = ["fallen_seraph", "iron_tyrant", "plague_dragon"];
  const finalBossId = finalBossPool[Math.floor(Math.random() * finalBossPool.length)];
  return {
    day: 1,
    actionInDay: 1,
    maxDay: 30,
    finalBossId,
    finalBoss: bosses[finalBossId],
    defeatedBosses: [],
    gameOver: false,
    victory: false,
    currentJobId: "warrior",
    unlockedJobs: ["warrior", "archer", "rogue", "cleric", "wizard"],
    visitedJobs: ["warrior"],
    masteredJobs: [],
    rejectedRelics: [],
    activeJobEvent: null,
    pendingJobXp: 0,
    actionsSinceJobChange: 0,
    actionResult: null,
    battle: null,
    battleSpeed: "fast",
    busy: false,
    changed: {},
    player: {
      stats: createBaseStats(),
      currentJobXp: 0,
      ap: 3,
      learnedSkills: ["basic_attack"],
      equippedSkills: ["basic_attack"],
      skillMastery: {},
      relics: []
    },
    choices: [],
    log: [
      { type: "start", text: `Final boss revealed: ${finalBossId}.` }
    ]
  };
}
