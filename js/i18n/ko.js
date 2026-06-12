import { jobs } from "../data/jobs.js?v=20260607-15";
import { skills } from "../data/skills.js?v=20260607-15";

const jobNames = {
  warrior: "전사", fighter: "전투가", berserker: "광전사", rage_fighter: "광전투사", rage_lord: "광전군주", rage_god: "광폭신",
  swordsman: "무사", blade_duelist: "검객", blade_master: "검호", sword_saint: "검성",
  destroyer: "파괴자", crusher: "분쇄자", ruiner: "파멸자", collapse_lord: "붕괴군주",
  knight: "기사", guardian_knight: "수호기사", ironwall_knight: "철벽기사", guardian_lord: "수호군주", immortal_guardian: "불멸의 수호자",
  dragon_knight: "용기사", dragonblood_knight: "용혈기사", dragon_king_knight: "용왕기사", sky_dragon_lord: "천룡군주",
  rogue: "도적", assassin: "암살자", cutthroat: "자객", darkshade: "암영", shadow_lord: "암영군주", death_avatar: "죽음의 화신",
  salsoo: "살수", blood_salsoo: "혈살귀", no_shadow_salsoo: "무영살수", end_salsoo: "종언의 살수",
  dancer: "댄서", blade_dancer: "무희", sword_dancer: "검무희", phantom_dancer: "환무희", heaven_dancer: "천무희",
  musician: "음악가", bard: "바드", clear_bard: "명음유시인", grand_bard: "대음유시인", legendary_bard: "전설의 음유시인",
  archer: "궁수", hunter: "사냥꾼", executioner: "처형자", executor: "집행자", death_executor: "사형집행관", terminator: "종결자",
  loader_engineer: "장전공학자", ballistic_engineer: "탄도공학자", tactical_shooter: "전략사수", bullet_overlord: "탄환지배자",
  beast_lord: "야수군주", beast_dominator: "야수지배자", beast_overlord: "야수대군주", king_of_beasts: "만수의 왕",
  cook: "요리사", chef: "주방장", head_chef: "대주방장", gourmet_king: "미식왕", legendary_chef: "전설의 요리사",
  cleric: "성직자", priest: "사제", pure_priest: "순수사제", high_priest: "고위사제", saint: "성자", savior: "구원자",
  dark_priest: "암흑사제", fallen_priest: "타락사제", abyss_priest: "심연사제", calamity_prophet: "재앙의 예언자",
  skeleton: "해골", skeleton_warrior: "해골전사", skeleton_fighter: "해골투사", skeleton_general: "해골장수", skeleton_captain: "해골대장",
  mystic: "마도사", mage: "마법사", elementalist: "원소술사",
  fire_mage: "화염술사", fire_archmage: "화염대마도사", sun_lord: "태양군주",
  frost_mage: "냉기술사", frost_lord: "빙결군주", eternal_winter: "영원의 겨울",
  lightning_mage: "번개술사", storm_lord: "폭풍군주", thunder_emperor: "천둥황제",
  earth_mage: "대지술사", leyline_mage: "지맥술사", world_guardian: "세계수호자",
  rune_mage: "룬술사", great_rune_mage: "대룬술사", rune_lord: "룬군주", eternal_inscriber: "영원한 각인자",
  warlock: "흑마법사", great_warlock: "대흑마법사", demon_lord: "악마군주", abyss_lord: "심연의 군주",
  legion_mage: "군단술사", great_legion_mage: "대군단술사", legion_lord: "군단군주", eternal_legion_commander: "영겁의 군단장",
  shaman: "주술사", fate_weaver: "운명술사", prophet: "예언자", fate_dominator: "운명지배자", heaven_executor: "천명집행자",
  hexer: "저주술사", disaster_mage: "재액술사", calamity_mage: "재앙술사", great_calamity: "대재앙",
  contractor: "계약술사", wolf_contract: "늑대 계약", bear_contract: "곰 계약", fire_spirit_contract: "화염정령 계약", earth_spirit_contract: "대지정령 계약", demon_contract: "악마 계약", dragon_contract: "용 계약", special_contract: "특수 계약",
  paladin: "성기사", crusader: "성전기사", divine_punisher: "신벌기사",
  sage: "현자", great_sage: "대현자", transcendent_sage: "초월현자",
  spellblade: "마검사", spellblade_master: "마검호", spell_saint: "마검성",
  shadow_dancer: "그림자무희", phantom_shadow_dancer: "환영무희", moon_shadow_dancer: "월영무희",
  poison_hunter: "독사냥꾼", venom_hunter: "맹독사냥꾼", plague_hunter: "역병사냥꾼",
  cursed_berserker: "저주광전사", forbidden_warrior: "금기전사", curse_avatar: "저주의 화신",
  sniper: "저격수", death_eye: "죽음의 눈",
  blaze_storm_mage: "폭염술사", lava_mage: "용암술사", stormfrost_mage: "폭풍빙결사", crystal_mage: "결정술사", archmage: "대마법사"
};

const themeDescriptions = {
  low_hp: "잃은 HP가 높을수록 강해집니다.", swordsmanship: "검술 스택과 기본 공격 강화로 싸웁니다.", shield_break: "보호막과 방어 기반을 무너뜨립니다.", shield: "보호막과 PD를 핵심 자원으로 사용합니다.", absolute: "방어를 무시하는 절대대미지를 사용합니다.", pd_to_pa: "PD를 공격력으로 전환합니다.", bleed: "행동 시 피해를 주는 출혈을 활용합니다.", reverse_crit: "낮은 CRT와 높은 CRD를 역치명으로 바꿉니다.", evasion: "EVA로 생존과 피해를 동시에 올립니다.", rhythm: "EVA를 생성하고 소비하는 순환형 직업입니다.", predation: "적 HP가 낮을 때 포식으로 마무리합니다.", extra_action: "ACC와 SPD로 연속 행동을 노립니다.", summon: "소환수와 함께 전투합니다.", food: "현재 HP와 초과 회복으로 버티며 싸웁니다.", heal: "회복과 재생으로 장기전을 만듭니다.", decay: "부패와 회복 방해로 적을 약화합니다.", burn: "화상을 누적하고 폭발시킵니다.", freeze: "빙결로 SPD와 EVA를 낮춥니다.", shock: "감전으로 치명타 기반을 흔듭니다.", fracture: "균열로 MA와 MD를 낮춥니다.", poison: "무기한 누적되는 독으로 압박합니다.", rune: "조건부 룬을 설치하고 발동시킵니다.", life_cost: "HP를 대가로 강한 마법과 흡혈을 얻습니다.", misfortune: "불운으로 확률 기반 능력을 약화합니다.", judgment: "회복량을 심판으로 축적해 절대대미지로 소비합니다.", ma_amp: "MA를 증폭해 마법 효율을 끌어올립니다.", balance: "PA와 MA의 균형이 맞을수록 강합니다.", self_status: "자신에게 상태이상을 걸고 고화력을 얻습니다.", shadow_dance: "EVA와 CRT가 서로를 보정합니다.", contract: "계약체를 지키며 힘을 계승합니다."
};

const jobEntries = Object.fromEntries(Object.values(jobs).map((job) => {
  const name = jobNames[job.id] ?? job.id;
  const desc = job.themes.map((theme) => themeDescriptions[theme]).find(Boolean) ?? `${name} 계열 직업입니다.`;
  return [job.id, { name, desc }];
}));

const stageNames = { init: "입문", core: "핵심", art: "비기" };
const skillEntries = Object.fromEntries(Object.values(skills).map((skill) => {
  if (skill.id === "basic_attack") return [skill.id, { name: "기본 공격", desc: "PA 기반 기본 공격입니다." }];
  if (skill.id === "magic_attack") return [skill.id, { name: "마력탄", desc: "MA 기반 기본 마법 공격입니다." }];
  const match = skill.id.match(/^(.*)_(init|core|art)$/);
  if (!match) return [skill.id, { name: skill.id, desc: "전투 스킬입니다." }];
  const jobName = jobNames[match[1]] ?? match[1];
  const stage = stageNames[match[2]];
  const mechanics = [];
  for (const effect of skill.effects ?? []) {
    if (effect.type === "typed_status") mechanics.push(effect.kind);
    if (["poison", "summon", "rune", "extra_action", "shield", "resource", "consume_resource", "sacrifice"].includes(effect.type)) mechanics.push(effect.type);
    if (effect.type === "damage" && effect.absolute) mechanics.push("absolute damage");
  }
  return [skill.id, { name: `${jobName} ${stage}`, desc: mechanics.length ? `${jobName}의 ${stage} 기술입니다. 효과: ${mechanics.join(", ")}.` : `${jobName}의 ${stage} 기술입니다.` }];
}));

export const ko = {
  ui: {
    title: "30일 로그라이크 자동 RPG", bossReveal: "최종 보스 공개", day: "일차", action: "행동", actionsLeft: "남은 행동", stats: "능력치", currentJob: "현재 직업", jobProgress: "직업 진행도", ap: "AP", equippedSkills: "장착 스킬", learnedSkills: "습득 스킬", relics: "유물", jobOptions: "직업 선택", eventChoices: "이벤트 선택", battleLog: "전투 로그", changeJob: "전직", equip: "장착", unequip: "해제", mastered: "마스터", locked: "잠김", available: "가능", winRate: "예상 승률", xpReward: "XP 보상", relicCategory: "유물 계열", choose: "선택", gameOver: "게임 종료", victory: "승리", defeat: "패배", finalBattle: "최종전", noRelics: "획득한 유물이 없습니다.", noSkills: "습득한 스킬이 없습니다.", noChoices: "선택지가 없습니다.", continue: "계속", eventResult: "이벤트 결과", battle: "전투", turn: "턴", actor: "행동 주체", player: "플레이어", enemy: "적", skillUsed: "사용 기술", damage: "피해", heal: "회복", miss: "빗나감", crit: "치명타", block: "보호막", statusEffect: "상태", speed: "속도", normal: "보통", fast: "빠름", instant: "즉시", jobXp: "직업 XP", skillMastery: "스킬 숙련", statChanges: "능력치 변화", unlocked: "해금", gained: "획득", survived: "생존", enemyDamageType: "적 피해 유형", enemyDefenseProfile: "적 방어 성향", physical: "물리", magic: "마법", highPhysicalDefense: "물리 방어 높음", highMagicDefense: "마법 방어 높음", possibleMilestone: "도달 가능 보상", jobChanged: "전직 완료", skipJobChange: "전직 안하기", noJobChange: "전직하지 않음", skipped: "건너뜀", pendingRelic: "유물 선택", acceptRelic: "유물 받기", declineRelic: "유물 안 얻기", declinedRelic: "거절한 유물", easyHunt: "쉬움", normalHunt: "보통", dangerousHunt: "위험", noBattleRewards: "패배 보상 없음", viewBattleLog: "전투 로그 보기", closeBattleLog: "닫기", currentJobOnly: "현재 직업", basicAttackReplacement: "기본공격 대체", prioritySkill: "우선 발동", conditionalSkill: "조건부", repeatChancePenalty: "반복 발동 감소", minChance: "최소", oncePerBattle: "전투당 제한", battleLong: "전투 종료까지"
  },
  stats: { HP: "HP", PA: "물리 공격", PD: "물리 방어", MA: "마법 공격", MD: "마법 방어", SPD: "속도", ACC: "명중", EVA: "회피", CRT: "치명률", CRD: "치명 피해" },
  jobs: jobEntries,
  skills: skillEntries,
  relics: {}, monsters: {}, bosses: {}, events: {},
  categories: { job: "직업", mastery: "숙련", ap: "AP", holy: "신성", dark: "어둠", dragon: "용", summon: "소환", critical: "치명", poison: "독", bleed: "출혈", risk: "위험", magic: "마법" },
  traits: { holy_vulnerability: "신성 취약", poison_immunity: "독 면역", physical_resistance: "물리 저항", summon_resistance: "소환 저항", critical_resistance: "치명 저항", dark_resistance: "어둠 저항", critical_weakness: "치명 취약", holy_weakness: "신성 약점", magic_weakness: "마법 약점", fire_weakness: "화염 약점" }
};
