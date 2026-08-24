import { createCitizenCampingState } from './camping'
import { createGameClock, DAY_START_HOUR } from './clock'
import { createConstructionState } from './construction'
import './constructionCurrent'
import { createDailyState, createStarterHome } from './home'
import { resolveNightAttack } from './night'
import { createCitizenStatusState } from './status'
import type { Citizen, GameState } from './types'
import { startingWellWater } from './well'
import { createWorld } from './world'
const DEFAULT_AP=6;const DEFAULT_INVENTORY_CAPACITY=4;const BOT_NAMES=['Mara','Grant','Erin','Lewis','Nora','Cal','June','Rook','Iris','Miles','Tess','Owen','Vera','Ash','Drew','Mae','Gale','Rin','Cole','Ada','Finn','Skye','Noel','Bram','Lena','Jude','Wren','Eli','Sage','Remy','Nell','Beck','Lane','Mika','Kit','Sol','Pax','Reed','Cleo']
function makeCitizens(count:number):Citizen[]{return Array.from({length:count},(_,index)=>{const id=`c${String(index+1).padStart(2,'0')}`;return{id,name:index===0?'You':BOT_NAMES[(index-1)%BOT_NAMES.length],controller:index===0?'human':'basic-bot',alive:true,ap:DEFAULT_AP,maxAp:DEFAULT_AP,location:{type:'town'},inventory:[],inventoryCapacity:DEFAULT_INVENTORY_CAPACITY,home:createStarterHome(id),corpseDisposition:null,daily:createDailyState(),status:createCitizenStatusState(),camping:createCitizenCampingState(),temporaryControl:null,relativeControl:null}})}
export function createInitialGame(seed:number,citizenCount=40):GameState{const normalizedSeed=seed>>>0||1;const generated=createWorld(normalizedSeed);return{schemaVersion:18,gameId:`local-${normalizedSeed}`,seed:normalizedSeed,rngState:generated.rngState,nextItemId:1,day:1,clock:createGameClock(),citizens:makeCitizens(citizenCount),botMissions:{},coordination:{commitments:[]},town:{gateOpen:false,defense:40,bank:[],construction:createConstructionState(),well:{water:startingWellWater(normalizedSeed)}},world:generated.world,lastNight:null,events:[{type:'DAY_STARTED',day:1,hour:DAY_START_HOUR}]}}
export function resolveNight(state:GameState):GameState{return resolveNightAttack(state)}
