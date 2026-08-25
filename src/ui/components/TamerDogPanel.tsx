import { hasTamerDog, tamerDogBlockedByCumbersome, tamerDogDruggedToday, tamerDogTransportableItems, tamerDogUsedToday } from '../../core/tamer'
import type { GameCommand, GameState } from '../../core/types'

export function TamerDogPanel({game,citizenId,legalActions,act}:{game:GameState;citizenId:string;legalActions:GameCommand[];act:(command:GameCommand|undefined)=>void}){
  const citizen=game.citizens.find((candidate)=>candidate.id===citizenId)
  if(!citizen||citizen.location.type!=='world'||!hasTamerDog(citizen))return null
  const tired=tamerDogUsedToday(game,citizenId)
  const drugged=tamerDogDruggedToday(game,citizenId)
  const blocked=tamerDogBlockedByCumbersome(game,citizen)
  const transportable=tamerDogTransportableItems(game,citizen)
  const drug=legalActions.find((action):action is Extract<GameCommand,{type:'DRUG_TAMER_DOG'}>=>action.type==='DRUG_TAMER_DOG')
  const bank=legalActions.find((action):action is Extract<GameCommand,{type:'SEND_TAMER_DOG'}>=>action.type==='SEND_TAMER_DOG'&&action.destination==='bank')
  const home=legalActions.find((action):action is Extract<GameCommand,{type:'SEND_TAMER_DOG'}>=>action.type==='SEND_TAMER_DOG'&&action.destination==='home')
  const status=tired?'TIRED':drugged?'STEROID-BOOSTED':'READY'
  const note=tired?'The Three-Legged Maltese has already made today’s trip and will be ready again tomorrow.':citizen.status.terrorized?'Terror prevents you from sending the dog.':drugged&&blocked?'The boosted Maltese can carry only one cumbersome item. Remove any extra cumbersome cargo before sending the whole rucksack.':blocked?'A cumbersome item blocks the whole rucksack shipment. Give the dog Anabolic Steroids if available so it can carry that item with the rest of the cargo.':transportable.length===0?'There is no cargo to send.':`The dog will return the entire rucksack shipment: ${transportable.length} cargo item${transportable.length===1?'':'s'}.`
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
