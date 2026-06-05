import { jobs } from "../data/jobs.js";
import { addStats } from "./stats.js";
import { addSkillMasteryFromXp, learnSkill } from "./skills.js";

export function isJobUnlocked(state, jobId) {
  return state.unlockedJobs.includes(jobId);
}

export function getAvailableJobs(state) {
  return state.unlockedJobs.filter((jobId) => jobs[jobId]);
}

export function getAvailableBasicJobs(state) {
  return state.unlockedJobs.filter((jobId) => jobs[jobId]?.tier === 1 && jobId !== state.currentJobId);
}

export function getAvailableAdvancedJobs(state) {
  return state.unlockedJobs.filter((jobId) => jobs[jobId]?.tier > 1 && jobId !== state.currentJobId);
}

export function changeJob(state, jobId) {
  if (!canChangeJobFromActiveEvent(state, jobId)) {
    return false;
  }

  state.currentJobId = jobId;
  state.player.currentJobXp = 0;
  if (!state.visitedJobs.includes(jobId)) {
    state.visitedJobs.push(jobId);
  }
  state.activeJobEvent = null;
  state.log.unshift({ type: "job", text: `Changed job to ${jobId}. Unfinished job XP was reset.` });
  if (state.pendingJobXp > 0) {
    const pendingXp = state.pendingJobXp;
    state.pendingJobXp = 0;
    grantJobXp(state, pendingXp);
  }
  return true;
}

export function getCurrentJobProgress(state) {
  const job = jobs[state.currentJobId];
  return Math.min(100, Math.floor((state.player.currentJobXp / job.xpRequired) * 100));
}

export function grantJobXp(state, xp, tag = null) {
  let remaining = Math.max(0, Math.round(xp));
  const messages = [];

  while (remaining > 0) {
    const job = jobs[state.currentJobId];
    const beforePercent = getCurrentJobProgress(state);
    const needed = job.xpRequired - state.player.currentJobXp;
    if (needed <= 0) {
      remaining = 0;
      messages.push(`${job.id} is already mastered. Job XP was not applied.`);
      break;
    }
    const applied = Math.min(remaining, needed);
    state.player.currentJobXp += applied;
    remaining -= applied;

    const growthRatio = applied / job.xpRequired;
    addStats(state.player.stats, job.growth, growthRatio);

    for (const masteredSkillId of addSkillMasteryFromXp(state, applied)) {
      messages.push(`Mastered skill ${masteredSkillId}.`);
    }

    const afterPercent = getCurrentJobProgress(state);
    for (const milestone of job.milestones) {
      if (beforePercent < milestone.percent && afterPercent >= milestone.percent) {
        if (milestone.type === "skill") {
          learnSkill(state, milestone.skillId);
          messages.push(`Unlocked skill ${milestone.skillId}.`);
        }
      }
    }

    if (state.player.currentJobXp >= job.xpRequired) {
      masterCurrentJob(state, messages);
      if (remaining > 0) {
        state.pendingJobXp += remaining;
        messages.push(`${remaining} job XP will carry over to the next selected job.`);
        remaining = 0;
      }
    }
  }

  state.log.unshift({ type: "xp", text: `Gained ${Math.round(xp)} job XP.` });
  for (const message of messages.reverse()) {
    state.log.unshift({ type: "reward", text: message });
  }
}

function masterCurrentJob(state, messages) {
  const job = jobs[state.currentJobId];
  if (!state.masteredJobs.includes(job.id)) {
    state.masteredJobs.push(job.id);
    state.player.ap += job.apReward;
    messages.push(`Mastered ${job.id}. AP +${job.apReward}.`);
  }
  for (const unlockedJobId of getJobsUnlockedByConditions(state)) {
    if (!state.unlockedJobs.includes(unlockedJobId)) {
      state.unlockedJobs.push(unlockedJobId);
      messages.push(`Added ${unlockedJobId} to the job candidate pool.`);
    }
  }
  state.player.currentJobXp = job.xpRequired;
}

function getJobsUnlockedByConditions(state) {
  return Object.values(jobs)
    .filter((job) => job.tier > 1)
    .filter((job) => !state.unlockedJobs.includes(job.id))
    .filter((job) => areJobConditionsMet(state, job))
    .map((job) => job.id);
}

function areJobConditionsMet(state, job) {
  const requires = job.requires ?? {};
  if (requires.masteredAll?.length && !requires.masteredAll.every((id) => state.masteredJobs.includes(id))) {
    return false;
  }
  if (requires.masteredAny?.length && !requires.masteredAny.some((id) => state.masteredJobs.includes(id))) {
    return false;
  }
  if (requires.visitedAny?.length && !requires.visitedAny.some((id) => state.visitedJobs.includes(id))) {
    return false;
  }
  return true;
}

function canChangeJobFromActiveEvent(state, jobId) {
  const job = jobs[jobId];
  const event = state.activeJobEvent;
  if (!job || !event || !event.jobOptions.includes(jobId) || jobId === state.currentJobId) {
    return false;
  }
  if (event.jobTier === "basic") {
    return job.tier === 1 && isJobUnlocked(state, jobId);
  }
  if (event.jobTier === "advanced") {
    return job.tier > 1 && isJobUnlocked(state, jobId);
  }
  return false;
}
