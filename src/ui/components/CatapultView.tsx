import { useMemo, useState } from 'react'
import { canUseCatapult, catapultActionCost, catapultEligibleItems, catapultMissChancePercent, catapultProfile, fireCatapult, provisionalCatapultOperator } from '../../core/catapult'
import { itemName } from '../../core/items'
import type { GameState } from '../../core/types'
import { zoneKey } from '../../core/world'

function impactLabel(type:Parameters<typeof catapultProfile>[0]):string{
  const profile=catapultProfile(type);if(!profile)return'not verified'
  const landing=profile.landing==='intact'?'arrives intact':profile.landing==='broken'?'breaks on impact':profile.landing==='debris'?'becomes debris':profile.landing==='scrap'?'becomes Scrap Metal':profile.landing==='moldy'?'becomes mouldy food':'destroyed on impact'
  if(!profile.damage)return landing
  const tier=profile.damage==='ridiculous'?'0–3':profile.damage==='low'?'4–10':profile.damage==='high'?'11–20':'21–30'
  const area=profile.shape==='square3x3'?'3×3 area':profile.shape==='cross'?'target + cardinal neighbors':'target zone'
  return`${landing} · ${tier} zombies · ${area}`
}

export function CatapultView({game,citizenId,onChange}:{game:GameState;citizenId:string;onChange:(state:GameState)=>void}){
  const citizen=game.citizens.find((candidate)=>candidate.id===citizenId)
  const operator=provisionalCatapultOperator(game)
  const payloads=citizen?catapultEligibleItems(citizen):[]
  const [itemId,setItemId]=useState<string>('')
  const [target,setTarget]=useState<{x:number;y:number}|null>(null)
  const [message,setMessage]=useState<string|null>(null)
  const selected=payloads.find((item)=>item.id===itemId)??null
  const rows=useMemo(()=>{const result:Array<Array<{x:number;y:number;zombies:number;known:boolean}>>=[];for(let y=game.world.maxY;y>=game.world.minY;y-=1){const row=[];for(let x=game.world.minX;x<=game.world.maxX;x+=1){const zone=game.world.zones[zoneKey(x,y)];row.push({x,y,zombies:zone.zombies,known:zone.discovered})}result.push(row)}return result},[game.world])
  if(!citizen)return null
  const usable=canUseCatapult(game,citizenId)
  const fire=()=>{if(!selected||!target)return;try{const result=fireCatapult(game,citizenId,selected.id,target.x,target.y);onChange(result.state);setItemId('');setTarget(null);setMessage(`${itemName(result.log.itemType)} landed at [${result.log.landed.x},${result.log.landed.y}]${result.log.missed?' after missing the intended zone':''}. ${result.log.kills} zombie${result.log.kills===1?'':'s'} killed.`)}catch(error){setMessage(error instanceof Error?error.message:'Catapult action failed.')}}
  return <section className="panel screen-panel">
    <div className="panel-heading"><div><p className="section-kicker">Built facility</p><h2>Catapult</h2><p className="section-note">Launch a carried item to a World Beyond zone. Supplies can support expeditions; dangerous payloads can clear zombies remotely.</p></div><span className="facility-status online">ONLINE</span></div>
    <div className="watchtower-grid">
      <article className="forecast-card"><span>Shot cost</span><strong>{catapultActionCost(game)} AP</strong><small>{game.town.construction.upgraded_catapult?.completed?'Upgraded Catapult active':'base Catapult'}</small></article>
      <article className="forecast-card"><span>Miss chance</span><strong>{catapultMissChancePercent(game)}%</strong><small>a miss scatters to a cardinal neighbor</small></article>
      <article className="forecast-card"><span>Operator</span><strong>{operator?.name??'None'}</strong><small>provisional until town-role voting is implemented</small></article>
    </div>
    <section className="watchtower-note"><h3>1. Select payload</h3>{payloads.length===0?<p>No verified Catapult payload is currently in the operator's rucksack.</p>:<div className="construction-actions">{payloads.map((item)=><button type="button" className={item.id===itemId?'primary':''} key={item.id} onClick={()=>setItemId(item.id)}>{itemName(item.type)} <small>{impactLabel(item.type)}{catapultProfile(item.type)?.requiresSmallTrebuchet?' · Small Trebuchet':''}</small></button>)}</div>}</section>
    <section className="watchtower-note"><h3>2. Select target zone</h3><p>Town [0,0] cannot be targeted. Undiscovered zones remain valid targets, matching the Catapult's map-wide coordinate targeting.</p><div className="catapult-map" style={{overflow:'auto'}}>{rows.map((row,index)=><div className="map-row" key={index}>{row.map((zone)=>{const town=zone.x===0&&zone.y===0;const active=target?.x===zone.x&&target?.y===zone.y;return <button type="button" key={zoneKey(zone.x,zone.y)} disabled={town} className={`map-cell ${active?'player':''}`} title={`[${zone.x},${zone.y}]${zone.known?` · ${zone.zombies} zombies`:' · unexplored'}`} onClick={()=>setTarget({x:zone.x,y:zone.y})}>{town?'T':active?'X':''}</button>})}</div>)}</div></section>
    <section className="watchtower-note"><h3>3. Fire</h3><p>{selected?itemName(selected.type):'No payload selected'} · {target?`target [${target.x},${target.y}]`:'no target selected'}.</p><button type="button" className="primary" disabled={!usable||!selected||!target||(selected&&catapultProfile(selected.type)?.requiresSmallTrebuchet&&!game.town.construction.small_trebuchet?.completed)} onClick={fire}>Launch payload · {catapultActionCost(game)} AP</button>{!usable&&<p>The current citizen must be the provisional Catapult operator, alive in town, with enough AP.</p>}{selected&&catapultProfile(selected.type)?.requiresSmallTrebuchet&&!game.town.construction.small_trebuchet?.completed&&<p>Small Trebuchet is required before animals can be launched.</p>}{message&&<p><strong>{message}</strong></p>}</section>
    <section className="watchtower-note"><h3>Catapult Register</h3>{(game.town.catapultLog??[]).length===0?<p>No Catapult shots have been recorded.</p>:<div className="records-list">{[...(game.town.catapultLog??[])].reverse().slice(0,30).map((entry,index)=><div className="record-line" key={`${entry.day}-${entry.hour}-${index}`}><strong>Day {entry.day} · {String(entry.hour).padStart(2,'0')}:00</strong><span>{itemName(entry.itemType)} → [{entry.landed.x},{entry.landed.y}]{entry.missed?' (miss)':''} · {entry.kills} killed</span></div>)}</div>}</section>
  </section>
}
