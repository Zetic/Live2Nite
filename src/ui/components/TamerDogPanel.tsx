import { isCumbersomeItem } from '../../core/inventory'
import { hasTamerDog, tamerDogDruggedToday, tamerDogTransportableItems, tamerDogUsedToday } from '../../core/tamer'
import type { GameCommand, GameState } from '../../core/types'

export function TamerDogPanel({game,citizenId,legalActions,act}:{game:GameState;citizenId:string;legalActions:GameCommand[];act:(command:GameCommand|undefined)=>void}){
  const citizen=game.citizens.find((candidate)=>candidate.id===citizenId)
  if(!citizen||citizen.location.type!=='world'||!hasTamerDog(citizen))return null
  const tired=tamerDogUsedToday(game,citizenId)
  const drugged=tamerDogDruggedToday(game,citizenId)
  const transportable=tamerDogTransportableItems(game,citizen)
  const heavy=transportable.filter(isCumbersomeItem).length
  const blockedHeavy=citizen.inventory.filter(isCumbersomeItem).length-heavy
  const drug=legalActions.find((action):action is Extract<GameCommand,{type:'DRUG_TAMER_DOG'}>=>action.type==='DRUG_TAMER_DOG')
  const bank=legalActions.find((action):action is Extract<GameCommand,{type:'SEND_TAMER_DOG'}>=>action.type==='SEND_TAMER_DOG'&&action.destination==='bank')
  const home=legalActions.find((action):action is Extract<GameCommand,{type:'SEND_TAMER_DOG'}>=>action.type==='SEND_TAMER_DOG'&&action.destination==='home')
  const status=tired?'TIRED':drugged?'STEROID-BOOSTED':'READY'
  const note=tired?'The Three-Legged Maltese has already made today’s trip and will be ready again tomorrow.':citizen.status.terrorized?'Terror prevents you from sending the dog.':transportable.length===0&&blockedHeavy>0?'Only cumbersome cargo remains. Give the dog Anabolic Steroids if available to let it carry one cumbersome item.':`The dog can carry ${transportable.length} current cargo item${transportable.length===1?'':'s'}${blockedHeavy>0?`; ${blockedHeavy} cumbersome item remains too heavy`:''}.`
  return <section className="town-feature facility-hero-card tamer-dog-card">
    <div className="feature-icon">D</div>
    <div className="feature-copy"><span>Tamer · Three-Legged Maltese</span><strong>{status}</strong><p>{note}</p></div>
    <div className="feature-actions">
      {drug&&<button onClick={()=>act(drug)}>Give Anabolic Steroids <small>0 AP</small></button>}
      {home&&<button onClick={()=>act(home)}>Send to Home Chest <small>0 AP</small></button>}
      {bank&&<button className="primary" onClick={()=>act(bank)}>Send to Bank <small>0 AP</small></button>}
    </div>
  </section>
}
