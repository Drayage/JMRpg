import { jobs } from "../data/jobs.js?v=20260606-29";
import { relics } from "../data/relics.js?v=20260606-29";
import { createBaseStats, statKeys } from "./stats.js";
import { addSkillMasteryFromXp, learnSkill, pruneUnavailableEquippedSkills } from "./skills.js";

export function isJobUnlocked(state, jobId) {
  return isJobActuallyAvailable(state, jobId);
}

export function isJobDiscovered(state, jobId) {
  return state.discoveredJobs.includes(jobId) || isJobUnlocked(state, jobId);
}

export function getJobState(state, jobId) {
  if (state.masteredJobs.includes(jobId)) {
    return "MASTERED";
  }
  if (state.visitedJobs.includes(jobId)) {
    return "VISITED";
  }
  if (isJobActuallyAvailable(state, jobId)) {
    return "AVAILABLE";
  }
  if (isJobDiscovered(state, jobId)) {
    return "DISCOVERED";
  }
  return "UNKNOWN";
}

export function getAvailableJobs(state) {
  sanitizeUnlockedJobs(state);
  return state.unlockedJobs.filter((jobId) => jobs[jobId]);
}

export function getAvailableBasicJobs(state) {
  sanitizeUnlockedJobs(state);
  return state.unlockedJobs.filter((jobId) => jobs[jobId]?.tier === 1 && jobId !== state.currentJobId);
}

export function getAvailableAdvancedJobs(state) {
  sanitizeUnlockedJobs(state);
  return state.unlockedJobs.filter((jobId) => jobs[jobId]?.tier > 1 && jobId !== state.currentJobId && areJobConditionsMet(state, jobs[jobId]));
}

export function changeJob(state, jobId) {
  if (!canChangeJobFromActiveEvent(state, jobId)) {
    return false;
  }

  state.player.jobXpByJob = state.player.jobXpByJob ?? {};
  state.player.jobXpByJob[state.currentJobId] = state.player.currentJobXp;
  const previousJobId = state.currentJobId;
  state.currentJobId = jobId;
  if (state.advancedJobOfferFatigue?.[previousJobId]) {
    delete state.advancedJobOfferFatigue[previousJobId];
  }
  state.player.currentJobXp = state.player.jobXpByJob[jobId] ?? 0;
  state.actionsSinceJobChange = 0;
  if (!state.visitedJobs.includes(jobId)) {
    state.visitedJobs.push(jobId);
  }
  pruneUnavailableEquippedSkills(state);
  updateJobDiscovery(state);
  state.activeJobEvent = null;
  state.log.unshift({ type: "job", text: `Changed job to ${jobId}. Restored ${state.player.currentJobXp} job XP.` });
  if (state.pendingJobXp > 0) {
    const pendingXp = state.pendingJobXp;
    state.pendingJobXp = 0;
    grantJobXp(state, pendingXp);
  }
  return true;
}

export function getCurrentJobProgress(state) {
  const job = jobs[state.currentJobId];
  return Math.min(100, Math.floor((state.player.currentJobXp / getEffectiveJobXpRequired(job)) * 100));
}

export function getEffectiveJobXpRequired(job) {
  const multipliers = {
    1: 1.25,
    2: 1.4,
    3: 1.55,
    4: 1.7
  };
  return Math.round(job.xpRequired * (multipliers[job.tier] ?? 1.5));
}

export function grantJobXp(state, xp, tag = null) {
  let remaining = Math.max(0, Math.round(xp));
  const messages = [];
  const summary = {
    jobId: state.currentJobId,
    xpGained: Math.round(xp),
    jobXpBefore: state.player.currentJobXp,
    jobXpAfter: state.player.currentJobXp,
    statChanges: {},
    skillMasteryChanges: {},
    skillsUnlocked: [],
    skillsMastered: [],
    jobsUnlocked: [],
    jobMastered: null,
    apGained: 0,
    pendingJobXp: 0
  };
  const beforeStats = { ...state.player.stats };
  const beforeMastery = { ...state.player.skillMastery };

  while (remaining > 0) {
    const job = jobs[state.currentJobId];
    const beforePercent = getCurrentJobProgress(state);
    const xpRequired = getEffectiveJobXpRequired(job);
    const needed = xpRequired - state.player.currentJobXp;
    if (needed <= 0) {
      for (const masteredSkillId of addSkillMasteryFromXp(state, remaining)) {
        if (!summary.skillsMastered.includes(masteredSkillId)) {
          summary.skillsMastered.push(masteredSkillId);
        }
        messages.push(`Mastered skill ${masteredSkillId}.`);
      }
      updateJobDiscovery(state, messages, summary);
      remaining = 0;
      messages.push(`${job.id} is already mastered. Job XP was not applied, but skill mastery progressed.`);
      break;
    }
    const applied = Math.min(remaining, needed, getXpToNextMilestone(job, xpRequired, state.player.currentJobXp));
    state.player.currentJobXp += applied;
    state.player.jobXpByJob = state.player.jobXpByJob ?? {};
    state.player.jobXpByJob[job.id] = state.player.currentJobXp;
    remaining -= applied;

    const growthRatio = applied / xpRequired;
    addPermanentStatGrowth(state, job.growth, growthRatio);

    for (const masteredSkillId of addSkillMasteryFromXp(state, applied)) {
      summary.skillsMastered.push(masteredSkillId);
      messages.push(`Mastered skill ${masteredSkillId}.`);
    }
    updateJobDiscovery(state, messages, summary);

    const afterPercent = getCurrentJobProgress(state);
    for (const milestone of job.milestones) {
      if (beforePercent < milestone.percent && afterPercent >= milestone.percent) {
        if (milestone.type === "skill") {
          learnSkill(state, milestone.skillId);
          if (!summary.skillsUnlocked.includes(milestone.skillId)) {
            summary.skillsUnlocked.push(milestone.skillId);
          }
          messages.push(`Unlocked skill ${milestone.skillId}.`);
        }
      }
    }

    if (state.player.currentJobXp >= xpRequired) {
      masterCurrentJob(state, messages, summary);
      if (remaining > 0) {
        state.pendingJobXp += remaining;
        summary.pendingJobXp += remaining;
        messages.push(`${remaining} job XP will carry over to the next selected job.`);
        remaining = 0;
      }
    }
  }

  summary.jobXpAfter = state.player.currentJobXp;
  state.player.jobXpByJob = state.player.jobXpByJob ?? {};
  state.player.jobXpByJob[state.currentJobId] = state.player.currentJobXp;
  for (const key of statKeys) {
    const diff = Math.round((state.player.stats[key] ?? 0) - (beforeStats[key] ?? 0));
    if (diff !== 0) {
      summary.statChanges[key] = diff;
    }
  }
  for (const [skillId, after] of Object.entries(state.player.skillMastery)) {
    const diff = Math.round(after - (beforeMastery[skillId] ?? 0));
    if (diff !== 0) {
      summary.skillMasteryChanges[skillId] = diff;
    }
  }

  state.log.unshift({ type: "xp", text: `Gained ${Math.round(xp)} job XP.` });
  for (const message of messages.reverse()) {
    state.log.unshift({ type: "reward", text: message });
  }
  markChanges(state, summary);
  return summary;
}

function getXpToNextMilestone(job, xpRequired, currentXp) {
  const nextXp = job.milestones
    .map((milestone) => Math.min(xpRequired, Math.ceil((xpRequired * milestone.percent) / 100)))
    .filter((xp) => xp > currentXp)
    .sort((a, b) => a - b)[0];
  return Math.max(1, (nextXp ?? xpRequired) - currentXp);
}

function masterCurrentJob(state, messages, summary = null) {
  const job = jobs[state.currentJobId];
  const xpRequired = getEffectiveJobXpRequired(job);
  if (!state.masteredJobs.includes(job.id)) {
    state.masteredJobs.push(job.id);
    state.player.ap += job.apReward;
    if (summary) {
      summary.jobMastered = job.id;
      summary.apGained += job.apReward;
    }
    messages.push(`Mastered ${job.id}. AP +${job.apReward}.`);
  }
  for (const unlockedJobId of getJobsUnlockedByConditions(state)) {
    if (!state.unlockedJobs.includes(unlockedJobId)) {
      state.unlockedJobs.push(unlockedJobId);
      if (summary) {
        summary.jobsUnlocked.push(unlockedJobId);
      }
      messages.push(`Added ${unlockedJobId} to the job candidate pool.`);
    }
  }
  updateJobDiscovery(state, messages, summary);
  state.player.currentJobXp = xpRequired;
  state.player.jobXpByJob = state.player.jobXpByJob ?? {};
  state.player.jobXpByJob[job.id] = xpRequired;
}

function addPermanentStatGrowth(state, growth, multiplier) {
  state.player.statGrowthRemainder = state.player.statGrowthRemainder ?? {};
  for (const [key, value] of Object.entries(growth)) {
    const rawGrowth = (state.player.statGrowthRemainder[key] ?? 0) + value * multiplier;
    const wholeGrowth = Math.floor(rawGrowth);
    state.player.statGrowthRemainder[key] = rawGrowth - wholeGrowth;
    if (wholeGrowth > 0) {
      state.player.stats[key] = (state.player.stats[key] ?? 0) + wholeGrowth;
    }
  }
}

export function updateJobDiscovery(state, messages = [], summary = null) {
  sanitizeUnlockedJobs(state);
  state.discoveredJobs = state.discoveredJobs ?? [];
  for (const job of Object.values(jobs)) {
    if (job.tier === 1) {
      addDiscoveredJob(state, job.id);
      continue;
    }
    if (areJobConditionsMet(state, job)) {
      addDiscoveredJob(state, job.id);
      if (!state.unlockedJobs.includes(job.id)) {
        state.unlockedJobs.push(job.id);
        if (summary && !summary.jobsUnlocked.includes(job.id)) {
          summary.jobsUnlocked.push(job.id);
        }
        messages.push(`Added ${job.id} to the job candidate pool.`);
      }
      continue;
    }
    if (shouldRevealJob(state, job)) {
      addDiscoveredJob(state, job.id);
    }
  }
}

function sanitizeUnlockedJobs(state) {
  state.unlockedJobs = [...new Set(state.unlockedJobs)].filter((jobId) => isJobActuallyAvailable(state, jobId));
}

function isJobActuallyAvailable(state, jobId) {
  const job = jobs[jobId];
  if (!job) {
    return false;
  }
  if (job.tier === 1) {
    return state.unlockedJobs.includes(jobId);
  }
  return state.unlockedJobs.includes(jobId) && areJobConditionsMet(state, job);
}

function addDiscoveredJob(state, jobId) {
  if (!state.discoveredJobs.includes(jobId)) {
    state.discoveredJobs.push(jobId);
  }
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
  if (requires.visitedAll?.length && !requires.visitedAll.every((id) => state.visitedJobs.includes(id))) {
    return false;
  }
  if (requires.masteredAny?.length && !requires.masteredAny.some((id) => state.masteredJobs.includes(id))) {
    return false;
  }
  if (requires.visitedAny?.length && !requires.visitedAny.some((id) => state.visitedJobs.includes(id))) {
    return false;
  }
  if (requires.skillMasteredAll?.length && !requires.skillMasteredAll.every((id) => (state.player.skillMastery[id] ?? 0) >= 100)) {
    return false;
  }
  if (requires.requiredTags?.length && !requires.requiredTags.every((tag) => getPlayerJobTags(state).includes(tag))) {
    return false;
  }
  if (requires.statThresholds && !Object.entries(requires.statThresholds).every(([key, value]) => (state.player.stats[key] ?? 0) >= value)) {
    return false;
  }
  if (requires.relicCategoriesAny?.length && !state.player.relics.some((relicId) => requires.relicCategoriesAny.includes(getRelicCategory(relicId)))) {
    return false;
  }
  if (requires.relicTagsAny?.length && !state.player.relics.some((relicId) => getRelicTags(relicId).some((tag) => requires.relicTagsAny.includes(tag)))) {
    return false;
  }
  return true;
}

function shouldRevealJob(state, job) {
  const requires = job.requires ?? {};
  const baseStats = createBaseStats();
  const jobSignals = [
    ...(requires.masteredAll ?? []),
    ...(requires.masteredAny ?? []),
    ...(requires.visitedAll ?? []),
    ...(requires.visitedAny ?? [])
  ];
  if (jobSignals.length > 0) {
    return jobSignals.some((id) => state.visitedJobs.includes(id) || state.masteredJobs.includes(id));
  }
  if ((requires.requiredTags ?? []).some((tag) => getPlayerJobTags(state).includes(tag))) {
    return true;
  }
  if (requires.statThresholds && Object.entries(requires.statThresholds).some(([key, value]) => (state.player.stats[key] ?? 0) > (baseStats[key] ?? 0) && (state.player.stats[key] ?? 0) >= value * 0.9)) {
    return true;
  }
  if ((requires.skillMasteredAll ?? []).some((id) => state.player.learnedSkills.includes(id) || (state.player.skillMastery[id] ?? 0) > 0)) {
    return true;
  }
  if ((requires.relicCategoriesAny ?? []).some((category) => state.player.relics.some((relicId) => getRelicCategory(relicId) === category))) {
    return true;
  }
  return false;
}

export function getPlayerJobTags(state) {
  const jobIds = [...new Set([...state.visitedJobs, ...state.masteredJobs])];
  return [...new Set(jobIds.flatMap((jobId) => jobs[jobId]?.themes ?? []))];
}

export function getJobRequirementHints(job) {
  return job.revealHints ?? [];
}

function getRelicCategory(relicId) {
  return relics[relicId]?.category ?? null;
}

function getRelicTags(relicId) {
  return relics[relicId]?.tags ?? [];
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

function markChanges(state, summary) {
  state.changed = {
    ...state.changed,
    jobXp: true,
    stats: { ...(state.changed.stats ?? {}) },
    skills: { ...(state.changed.skills ?? {}) },
    relics: { ...(state.changed.relics ?? {}) },
    jobs: { ...(state.changed.jobs ?? {}) },
    ap: summary.apGained > 0 || state.changed.ap === true
  };
  for (const key of Object.keys(summary.statChanges)) {
    state.changed.stats[key] = true;
  }
  for (const skillId of [...Object.keys(summary.skillMasteryChanges), ...summary.skillsUnlocked, ...summary.skillsMastered]) {
    state.changed.skills[skillId] = true;
  }
  for (const jobId of [...summary.jobsUnlocked, summary.jobMastered].filter(Boolean)) {
    state.changed.jobs[jobId] = true;
  }
}
