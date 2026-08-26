import { createCitizenCampingState } from './camping'
import { createGameClock, DAY_START_HOUR } from './clock'
import { createConstructionState } from './construction'
import './constructionCurrent'
import { createDailyState, createStarterHome } from './home'
import { resolveNightAttack } from './night'
import { assignBotProfessions, createCitizenEquipment, type ProfessionId } from './professions'
import { startingScoutPoints } from './scout'
import { createCitizenStatusState } from './status'
import type { Citizen, GameState } from './types'
import { createUpgradeProjectsState } from './upgradeProjectsState'
import { startingWellWater } from './well'
import { createWorld } from './world'
import { applyInitialWorldZombiePopulation } from './worldEvolution'
const DEFAULT_AP=6;const DEFAULT_INVENTORY_CAPACITY=5;const BOT_NAMES=['Mara','Grant','Erin','Lewis','Nora','Cal','June','Rook','Iris','Miles','Tess','Owen','Vera','Ash','Drew','Mae','Gale','Rin','Cole','Ada','Finn','Skye','Noel','Bram','Lena','Jude','Wren','Eli','Sage','Remy','Nell','Beck','Lane','Mika','Kit','Sol','Pax','Reed','Cleo']
function makeCitizens(count:number,seed:number,playerProfession:ProfessionId):Citizen[]{const botProfessions=assignBotProfessions(seed,Math.max(0,count-1));return Array.from({length:count},(_,index)=>{const id=`c${String(index+1).padStart(2,'0')}`;const profession=index===0?playerProfession:botProfessions[index-1]??'scavenger';return{id,name:index===0?'You':BOT_NAMES[(index-1)%BOT_NAMES.length],controller:index===0?'human':'basic-bot',alive:true,ap:DEFAULT_AP,maxAp:DEFAULT_AP,scoutPoints:startingScoutPoints(profession),scoutPointBonusNextDay:0,location:{type:'town'},inventory:[],inventoryCapacity:DEFAULT_INVENTORY_CAPACITY,equipment:createCitizenEquipment(id,profession),home:createStarterHome(id),corpseDisposition:null,daily:createDailyState(),status:createCitizenStatusState(),camping:createCitizenCampingState(),temporaryControl:null,relativeControl:null}})}
/** The profession argument defaults only to keep deterministic simulation fixtures concise. The player-facing new-town flow always supplies an explicit selection. */
export function createInitialGame(seed:number,citizenCount=40,playerProfession:ProfessionId='scavenger'):GameState{const normalizedSeed=seed>>>0||1;const generated=createWorld(normalizedSeed);const world=applyInitialWorldZombiePopulation(generated.world,normalizedSeed);return{schemaVersion:19,gameId:`local-${normalizedSeed}`,seed:normalizedSeed,rngState:generated.rngState,nextItemId:1,day:1,clock:createGameClock(),citizens:makeCitizens(citizenCount,normalizedSeed,playerProfession),botMissions:{},coordination:{commitments:[]},town:{gateOpen:false,defense:40,bank:[],construction:createConstructionState(),well:{water:startingWellWater(normalizedSeed)},upgradeProjects:createUpgradeProjectsState()},world,lastNight:null,events:[{type:'DAY_STARTED',day:1,hour:DAY_START_HOUR}]}}
export function resolveNight(state:GameState):GameState{return resolveNightAttack(state)}