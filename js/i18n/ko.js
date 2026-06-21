import { bosses } from "../data/bosses.js?v=20260621-1";
import { eventTemplates } from "../data/events.js?v=20260621-1";
import { jobs } from "../data/jobs.js?v=20260621-1";
import { monsters } from "../data/monsters.js?v=20260621-1";
import { relics } from "../data/relics.js?v=20260621-1";
import { skills } from "../data/skills.js?v=20260621-1";

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

const skillNameSets = {
  warrior:["힘찬 베기","굳은 손아귀","마무리 일격"],fighter:["전력 타격","전투 호흡","압도"],berserker:["피의 난타","분노 가열","광폭 돌진"],swordsman:["정석 베기","검술 수련","연속 검격"],destroyer:["갑옷 깨기","방패 분쇄","약점 노출"],knight:["방패 치기","수호 맹세","철벽 응징"],guardian_knight:["수호 강타","철벽 태세","절대 반격"],dragon_knight:["용혈 찌르기","용화","용의 심판"],
  rogue:["빠른 찌르기","가벼운 발걸음","그림자 급습"],assassin:["개전 암습","살의 집중","깊은 상처"],cutthroat:["목덜미 베기","급소 노림","피의 낙인"],salsoo:["역날 베기","역치명 자세","뒤집힌 급소"],dancer:["흐름 찌르기","회피 보법","나선 춤"],blade_dancer:["칼날 선율","검무 자세","회전 절단"],musician:["박자 치기","전투 리듬","고조의 일격"],bard:["공명탄","후렴 축적","울림 폭발"],
  archer:["가늠 사격","정조준","표식 화살"],hunter:["추적 사격","사냥 준비","포식"],executioner:["처형 준비","죽음의 표식","마지막 화살"],loader_engineer:["시험 사격","재장전","연발 사격"],beast_lord:["협공 사격","야수 호출","무리 사냥"],cook:["묵직한 던지기","든든한 식사","포만 강타"],chef:["솥뚜껑 강타","진수성찬","만찬 압박"],
  cleric:["응급 치유","작은 기도","빛의 징벌"],priest:["치유의 손길","재생 기도","구원의 빛"],pure_priest:["순백 치유","평온의 서약","대치유"],dark_priest:["타락한 빛","부패 기도","검은 성찬"],skeleton:["뼈 조각 투척","골격 강화","생명 연소"],skeleton_warrior:["뼈칼 베기","골갑 형성","골수 폭발"],
  mystic:["마력탄","마력 집중","압축 마탄"],mage:["비전 화살","주문 집중","마력 파열"],elementalist:["원소탄","원소 조율","원소 균열"],rune_mage:["각인 타격","수호 룬","붕괴 룬"],warlock:["흡혈 탄환","피의 계약","심장 관통"],legion_mage:["군단 호출","지휘 인장","집단 돌격"],shaman:["불길한 빛","주술 집중","운명 비틀기"],fate_weaver:["불운 부여","운명의 실","확률 붕괴"],hexer:["쇠약 저주","불운 저주","침묵 부패"],
  contractor:["계약 호출","계승 준비","계약 해방"],wolf_contract:["늑대 발톱","늑대 계승","질풍 물어뜯기"],bear_contract:["곰 앞발","곰 가죽","육중한 반격"],fire_spirit_contract:["불꽃 계승","화염 각인","불꽃 해방"],earth_spirit_contract:["대지 계승","암석 피부","지맥 파열"],demon_contract:["악마의 대가","금단 계승","지옥 강타"],dragon_contract:["용의 숨결","용린 계승","용혈 해방"],special_contract:["미지의 손길","불명 계승","정체불명 해방"]
};
const fallbackStageNames={init:"기초술",core:"전투술",art:"결전기"};
const statusNames={bleed:"출혈",burn:"화상",freeze:"빙결",shock:"감전",fracture:"균열",poison:"독",decay:"부패",weaken:"쇠약",silence:"침묵",blind:"실명",misfortune:"불운",regeneration:"재생",rage_heat:"분노 가열",trained_edge:"단련된 칼날",guarded:"방어 태세",dragon_shift:"용화",ambush_focus:"암습 집중",reverse_edge:"역날",flow_step:"흐름 보법",dance_guard:"춤의 수비",aiming:"조준",hunter_patience:"사냥 인내",calibrated_reload:"재장전 보정",small_prayer:"작은 기도",mana_focus:"마력 집중",spell_focus:"주문 집중",fate_thread:"운명의 실",blood_pact:"피의 계약"};
const effectNames={damage:"피해",heal:"회복",shield:"보호막",guard:"방어",status:"버프",typed_status:"상태이상",poison:"독",summon:"소환",resource:"자원 축적",consume_resource:"자원 소비",consume_status:"상태 소비",clear_resource:"자원 초기화",rune:"룬 설치",extra_action:"재행동",sacrifice:"HP 소모",stat_tradeoff:"능력치 전환"};
const monsterNames={training_dummy:"훈련용 허수아비",skeleton:"해골",cave_wolf:"동굴 늑대",goblin_hexer:"고블린 주술사",bone_spearman:"해골 창병",swamp_witch:"늪지 마녀",shrine_keeper:"성소 수호자",toxic_slime:"독성 슬라임",mirror_duelist:"거울 결투가",ember_mage:"잿불 마법사",grave_paladin:"무덤 성기사",venom_archer:"맹독 궁수",ogre:"오우거",young_drake:"어린 비룡",abyss_knight:"심연 기사",lich:"리치",chimera:"키메라",seraphic_hound:"성흔 사냥개",void_reaper:"공허 수확자",elder_treant:"고대 나무정령",dragon_priest:"용 사제",arena_champion:"투기장 챔피언",abyss_dragon:"심연룡",silver_wraith:"은빛 망령",clockwork_imp:"태엽 임프",scarlet_assassin:"진홍 암살자",plague_monk:"역병 수도승",runed_golem:"룬 골렘",oathless_saint:"맹세 잃은 성자",coin_mimic:"동전 미믹",grave_summoner:"무덤 소환사",thorn_hydra:"가시 히드라",fallen_oracle:"타락한 예언자",crimson_duelist:"핏빛 결투가",void_dragon:"공허룡"};
const bossNames={fallen_seraph:"타락한 세라프",iron_tyrant:"강철 폭군",plague_dragon:"역병룡",mirror_queen:"거울 여왕",world_serpent:"세계 뱀",oathbreaker:"맹세 파괴자",void_acolyte:"공허 수행자",dragon_herald:"용의 전령"};
const relicNameMap = {
  wanderer_compass: "방랑자의 나침반", hero_oath: "영웅의 맹세", forbidden_tome: "금서", explorer_journal: "탐험가의 일지", ancient_map: "고대 지도", golden_dice: "황금 주사위", berserker_blood: "광전사의 피", dark_contract: "어둠의 계약", ascetic_beads: "수행자의 염주", mirror_shard: "거울 조각", blood_hourglass: "피의 모래시계", sealed_badge: "봉인된 배지", dragon_heart: "용의 심장", holy_grail: "성배", summoner_chalk: "소환사의 분필", black_candle: "검은 양초", cartographers_badge: "지도 제작자의 배지", pilgrim_boots: "순례자의 장화", echo_manual: "메아리 교본", glass_metronome: "유리 메트로놈", empty_socket: "빈 소켓", compact_grimoire: "압축 마도서", martyr_lantern: "순교자의 등불", verdict_scale: "심판의 저울", cursed_heart: "저주받은 심장", void_tithe: "공허 십일조", trophy_brand: "전리품 낙인", drake_scale_map: "비룡 비늘 지도", chorus_bell: "합창 종", puppet_crown: "인형 왕관", loaded_feather: "장전된 깃털", execution_coin: "처형 동전", venom_censer: "맹독 향로", rusted_needle: "녹슨 바늘", shortcut_contract: "지름길 계약서", hungry_purse: "굶주린 주머니", broken_crown: "부서진 왕관"
};
const relicNames=Object.fromEntries(Object.values(relics).map((relic)=>[relic.id,{name:relicNameMap[relic.id] ?? relic.id,desc:`${relic.category} 계열 유물입니다.`}]));
const eventEntries=Object.fromEntries(eventTemplates.map((event)=>{const names={basic_job_training:["기본 직업 훈련","기본 직업 후보 중 하나를 선택해 전직할 수 있습니다."],advanced_job_training:["상위 전직 이벤트","후보 풀에 들어온 상위 직업 중 하나로 전직할 수 있습니다."],hunt:["사냥","세 몬스터 중 하나를 골라 전투합니다."],elite_hunt:["정예 사냥","강한 적을 골라 전투하고 승리 시 유물을 얻습니다."],relic_event:["유물 발견","경험치 없이 유물만 선택합니다."],stat_growth_event:["능력치 단련","직접적인 능력치 성장을 얻습니다."]};const [name,desc]=names[event.id]??[event.id,"이벤트입니다."];return [event.id,{name,desc}];}));
const enemySkillNames={enemy_heavy_swing:"육중한 휘두르기",enemy_guard_break:"방어 파괴",enemy_war_cry:"전투 함성",enemy_quick_rend:"빠른 찢기",enemy_aimed_thrust:"조준 찌르기",enemy_blur_step:"흐릿한 발걸음",enemy_arcane_bolt:"비전 화살",enemy_mana_burn:"마나 연소",enemy_arcane_seal:"비전 봉인",enemy_dark_pulse:"어둠 파동",enemy_life_leech:"생명 흡수",enemy_dread_mark:"공포의 낙인",enemy_toxic_spit:"독액 뱉기",enemy_venom_sting:"맹독 찌르기",enemy_sickening_cloud:"병든 구름",enemy_radiant_smite:"찬란한 강타",enemy_blessed_guard:"축복 방어",enemy_judgment_mark:"심판 낙인",enemy_flame_breath:"화염 숨결",enemy_dragon_claw:"용의 발톱",enemy_scale_harden:"비늘 경화",enemy_root_crush:"뿌리 압착",enemy_spirit_swarm:"정령 떼",enemy_pack_howl:"무리의 울음",enemy_desperation_strike:"필사의 일격"};
function localizedStatus(kind){return statusNames[kind]??kind;}
function effectSummary(skill){const items=[];for(const effect of skill.effects??[]){if(effect.type==="damage"){const parts=[`${effect.stat??skill.scalingStat} 피해`];if(effect.absolute)parts.push("절대대미지");if(effect.enemyCurrentHpPower)parts.push("적 현재 HP 비례");if(effect.enemyMissingHpPower||effect.predation)parts.push("적 잃은 HP 비례");if(effect.missingHpPower)parts.push("잃은 HP 비례");if(effect.swordsmanshipPower)parts.push("검술 스택 강화");if(effect.lowMaPower)parts.push("낮은 MA 보너스");if(effect.inverseCrit)parts.push("역치명");if(effect.targetStatus)parts.push(`${localizedStatus(effect.targetStatus)} 대상 강화`);if(effect.resourceKey)parts.push(`${effect.resourceKey} 자원 사용`);items.push(parts.join(" / "));}else if(effect.type==="heal"){const parts=[`${effect.stat??skill.scalingStat} 회복`];if(effect.maxHpRatio)parts.push("최대 HP 보정");if(effect.overheal)parts.push("초과 회복");items.push(parts.join(" / "));}else if(effect.type==="typed_status")items.push(`${effect.target==="self"?"자신":"적"} ${localizedStatus(effect.kind)} 부여`);else if(effect.type==="status")items.push(effect.target==="self"?"자기 버프":"적 약화");else if(effect.type==="poison")items.push("독 누적");else if(effect.type==="shield")items.push("보호막 생성");else if(effect.type==="summon")items.push("소환수 호출");else if(effect.type==="rune")items.push("룬 설치");else if(effect.type==="extra_action")items.push("재행동");else if(effect.type==="sacrifice")items.push("HP 소모");else if(effect.type==="resource")items.push(`${effect.key} 축적`);else if(effect.type==="consume_resource")items.push(`${effect.key} 소비`);else if(effect.type==="clear_resource")items.push(`${effect.key} 초기화`);else if(effect.type==="stat_tradeoff")items.push("능력치 전환 버프");}return items.length?items.join(", "):"전투 효과";}
const skillEntries=Object.fromEntries(Object.values(skills).map((skill)=>{if(skill.id==="basic_attack")return[skill.id,{name:"기본 공격",desc:"PA 기반 기본 공격입니다."}];if(skill.id==="magic_attack")return[skill.id,{name:"마력탄",desc:"MA 기반 기본 마법 공격입니다."}];if(enemySkillNames[skill.id])return[skill.id,{name:enemySkillNames[skill.id],desc:"적이 사용하는 전투 기술입니다."}];const match=skill.id.match(/^(.*)_(init|core|art)$/);if(!match)return[skill.id,{name:skill.id,desc:"전투 스킬입니다."}];const jobName=jobNames[match[1]]??match[1];const stageIndex=match[2]==="init"?0:match[2]==="core"?1:2;const skillName=skillNameSets[match[1]]?.[stageIndex]??`${jobName} ${fallbackStageNames[match[2]]}`;return[skill.id,{name:skillName,desc:effectSummary(skill)}];}));

export const ko = {
  ui: {
    title: "30일 로그라이크 자동 RPG", bossReveal: "최종 보스 공개", day: "일차", action: "행동", actionsLeft: "남은 행동", stats: "능력치", currentJob: "현재 직업", jobProgress: "직업 진행도", ap: "AP", equippedSkills: "장착 스킬", learnedSkills: "습득 스킬", relics: "유물", jobOptions: "직업 선택", eventChoices: "이벤트 선택", battleLog: "전투 로그", changeJob: "전직", equip: "장착", unequip: "해제", mastered: "마스터", locked: "잠김", available: "가능", winRate: "예상 승률", xpReward: "XP 보상", relicCategory: "유물 계열", choose: "선택", gameOver: "게임 종료", victory: "승리", defeat: "패배", finalBattle: "최종전", noRelics: "획득한 유물이 없습니다.", noSkills: "습득한 스킬이 없습니다.", noChoices: "선택지가 없습니다.", continue: "계속", eventResult: "이벤트 결과", battle: "전투", turn: "턴", actor: "행동 주체", player: "플레이어", enemy: "적", skillUsed: "사용 기술", damage: "피해", heal: "회복", miss: "빗나감", crit: "치명타", block: "보호막", statusEffect: "상태", speed: "속도", normal: "보통", fast: "빠름", instant: "즉시", jobXp: "직업 XP", skillMastery: "스킬 숙련", statChanges: "능력치 변화", unlocked: "해금", gained: "획득", survived: "생존", enemyDamageType: "적 피해 유형", enemyDefenseProfile: "적 방어 성향", physical: "물리", magic: "마법", highPhysicalDefense: "물리 방어 높음", highMagicDefense: "마법 방어 높음", possibleMilestone: "도달 가능 보상", jobChanged: "전직 완료", skipJobChange: "전직 안하기", noJobChange: "전직하지 않음", skipped: "건너뜀", pendingRelic: "유물 선택", acceptRelic: "유물 받기", declineRelic: "유물 안 얻기", declinedRelic: "거절한 유물", easyHunt: "쉬움", normalHunt: "보통", dangerousHunt: "위험", noBattleRewards: "패배 보상 없음", viewBattleLog: "전투 로그 보기", closeBattleLog: "닫기", currentJobOnly: "현재 직업", basicAttackReplacement: "기본공격 대체", prioritySkill: "우선 발동", conditionalSkill: "조건부", repeatChancePenalty: "반복 발동 감소", minChance: "최소", oncePerBattle: "전투당 제한", battleLong: "전투 종료까지", preparation: "준비"
  },
  stats: { HP: "HP", PA: "물리 공격", PD: "물리 방어", MA: "마법 공격", MD: "마법 방어", SPD: "속도", ACC: "명중", EVA: "회피", CRT: "치명률", CRD: "치명 피해" },
  jobs: jobEntries,
  skills: skillEntries,
  relics: relicNames, monsters: Object.fromEntries(Object.values(monsters).map((monster)=>[monster.id,{name:monsterNames[monster.id]??monster.id,desc:"전투 대상입니다."}])), bosses: Object.fromEntries(Object.values(bosses).map((boss)=>[boss.id,{name:bossNames[boss.id]??boss.id,desc:"보스입니다."}])), events: eventEntries,
  categories: { job: "직업", mastery: "숙련", ap: "AP", holy: "신성", dark: "어둠", dragon: "용", summon: "소환", critical: "치명", poison: "독", bleed: "출혈", risk: "위험", magic: "마법" },
  traits: { physical_weakness: "물리 약점", holy_vulnerability: "신성 취약", poison_immunity: "독 면역", physical_resistance: "물리 저항", summon_resistance: "소환 저항", critical_resistance: "치명 저항", dark_resistance: "어둠 저항", critical_weakness: "치명 취약", holy_weakness: "신성 약점", magic_weakness: "마법 약점", fire_weakness: "화염 약점", poison_resistance: "독 저항", dark_weakness: "어둠 약점", fire_damage: "화염 피해", high_physical_damage: "높은 물리 피해", poison_damage: "독 피해", physical_fire: "물리+화염", dragon_magic: "용 마법", high_physical_defense: "높은 물리 방어", dragon: "용", magic_resistance: "마법 저항", poison_vulnerability: "독 취약", dragon_resistance: "용 저항", summon_weakness: "소환 취약", critical_damage: "치명 피해", low_speed: "낮은 속도", greed: "탐욕", bleed_damage: "출혈 피해" }, statuses: statusNames, effects: effectNames, enemySkills: enemySkillNames
};
