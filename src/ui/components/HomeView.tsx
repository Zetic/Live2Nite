import { useState } from 'react'
import { homeContributionRatio, homeDefenseBonus } from '../../core/construction'
import { HOME_IMPROVEMENTS, HOME_LEVEL_ORDER, HOME_LEVELS, contributableHomeDefense, homeImprovementDefense, homeName, personalDefense } from '../../core/home'
import { ITEMS, itemName, itemPurpose } from '../../core/items'
import type { GameCommand, GameState, HomeImprovementId, ItemInstance, ItemType } from '../../core/types'

type HomeTab='inventory'|'upgrades'|'improvements'

function commandFor(actions: GameCommand[], type: GameCommand['type'], itemId: string): GameCommand | undefined {
  return actions.find((action) => action.type === type && 'itemId' in action && action.itemId === itemId)
}
function improvementCommand(actions:GameCommand[],id:HomeImprovementId):GameCommand|undefined{return actions.find((action)=>action.type==='BUILD_HOME_IMPROVEMENT'&&action.improvementId===id)}
function resourceText(resources:Partial<Record<ItemType,number>>):string{
  const entries=Object.entries(resources) as Array<[ItemType,number|undefined]>
  return entries.length?entries.map(([type,count])=>`${itemName(type)} × ${count??0}`).join(' · '):'No materials'
}

function ItemCard({ item, location, actions, act }: {item:ItemInstance;location:'home'|'inventory';actions:GameCommand[];act:(command:GameCommand|undefined)=>void}) {
  const open = commandFor(actions, 'OPEN_CONTAINER', item.id)
  const eat = commandFor(actions, 'EAT_ITEM', item.id)
  const drink = commandFor(actions, 'DRINK_ITEM', item.id)
  const transfer = commandFor(actions, location === 'home' ? 'MOVE_ITEM_TO_RUCKSACK' : 'MOVE_ITEM_TO_HOME', item.id)
  const definition = ITEMS[item.type]
  return <article className={`storage-item category-${definition.category}`}>
    <div className="storage-item-copy"><div className="item-title-row"><strong>{itemName(item.type)}</strong>{location === 'home' && definition.homeDefense ? <span className="home-defense-chip">+{definition.homeDefense} PERSONAL DEF</span> : null}</div><small>{itemPurpose(item.type)}</small></div>
    <div className="storage-item-actions">{open&&<button onClick={()=>act(open)}>Open</button>}{eat&&<button className="supply-action" onClick={()=>act(eat)}>Eat · refill AP</button>}{drink&&<button className="supply-action" onClick={()=>act(drink)}>Drink · refill AP</button>}<button disabled={!transfer} onClick={()=>act(transfer)}>{location==='home'?'Pack':'Store'}</button></div>
  </article>
}

export function HomeView({ game, citizenId, legalActions, act }: {game:GameState;citizenId:string;legalActions:GameCommand[];act:(command:GameCommand|undefined)=>void}) {
  const [tab,setTab]=useState<HomeTab>('inventory')
  const player = game.citizens.find((citizen) => citizen.id === citizenId) ?? game.citizens[0]
  const upgrade = legalActions.find((action) => action.type === 'UPGRADE_HOME')
  const currentDefense = personalDefense(player,game)
  const structuralDefense = HOME_LEVELS[player.home.level].defense
  const installedDefense=homeImprovementDefense(player)
  const townReinforcement=homeDefenseBonus(game)
  const eligibleDefense=contributableHomeDefense(player,game)
  const objectDefense=currentDefense-eligibleDefense
  const ratio=homeContributionRatio(game)
  const currentIndex=HOME_LEVEL_ORDER.indexOf(player.home.level)
  const nextLevel=currentIndex<HOME_LEVEL_ORDER.length-1?HOME_LEVEL_ORDER[currentIndex+1]:null
  const nextDefinition=nextLevel?HOME_LEVELS[nextLevel]:null

  return <section className="panel screen-panel home-screen">
    <div className="panel-heading"><div><p className="section-kicker">{player.controller==='human'?'Your private space':`${player.name} · controlled citizen`}</p><h2>{homeName(player.home.level)}</h2><p className="section-note">Personal housing protects this citizen during a breach. Eligible structural defense also supports the town at {Math.round(ratio*100)}%.</p></div><div className="home-summary"><span>Personal defense <strong>{currentDefense}</strong></span><span>Town-eligible <strong>{eligibleDefense}</strong></span><span>Chest <strong>{player.home.storage.length}/{player.home.storageCapacity}</strong></span></div></div>

    <div className="home-tabs" role="tablist" aria-label="Home view">
      <button className={tab==='inventory'?'active':''} aria-selected={tab==='inventory'} onClick={()=>setTab('inventory')}><strong>Inventory & Actions</strong><small>Supplies and storage</small></button>
      <button className={tab==='upgrades'?'active':''} aria-selected={tab==='upgrades'} onClick={()=>setTab('upgrades')}><strong>Building Upgrades</strong><small>Permanent home level</small></button>
      <button className={tab==='improvements'?'active':''} aria-selected={tab==='improvements'} onClick={()=>setTab('improvements')}><strong>Home Improvements</strong><small>Defense and storage works</small></button>
    </div>

    {tab==='inventory'&&<>
      <section className="home-defense-panel"><div><p className="section-kicker">Defense breakdown</p><h3>{currentDefense} personal defense</h3><p>Loose defensive objects in the private chest protect this home only. They do not enter the town's 40%/80% home contribution.</p></div><div className="home-defense-breakdown"><span>Structure <strong>{structuralDefense}</strong></span><span>Installed improvements <strong>{installedDefense}</strong></span><span>Town reinforcement <strong>{townReinforcement}</strong></span><span>Chest objects <strong>{objectDefense}</strong></span><span>Eligible for town share <strong>{eligibleDefense}</strong></span></div></section>
      <div className="daily-supplies"><article className={player.daily.ate?'done':''}><span>Food refresh</span><strong>{player.daily.ate?'USED':'AVAILABLE'}</strong><small>Food can refill AP to {player.maxAp} once each day.</small></article><article className={player.daily.drank?'done':''}><span>Water refresh</span><strong>{player.daily.drank?'USED':'AVAILABLE'}</strong><small>Water can independently refill AP to {player.maxAp} once each day.</small></article><article className={player.daily.waterTaken?'done':''}><span>Well ration</span><strong>{player.daily.waterTaken?'CLAIMED':'UNCLAIMED'}</strong><small>Completed water infrastructure can increase daily Well withdrawals.</small></article></div>
      <div className="storage-columns"><section className="storage-zone"><div className="section-heading-row"><div><h3>Home Chest</h3><p>Private storage. Defensive objects here protect this resident during a breach.</p></div><span className="micro-stat">{player.home.storage.length}/{player.home.storageCapacity}</span></div><div className="storage-list">{player.home.storage.length===0?<p className="empty-state">This chest is empty.</p>:player.home.storage.map((item)=><ItemCard key={item.id} item={item} location="home" actions={legalActions} act={act}/>)}</div></section><section className="storage-zone"><div className="section-heading-row"><div><h3>Rucksack</h3><p>Only carried items travel with this citizen into the World Beyond.</p></div><span className="micro-stat">{player.inventory.length}/{player.inventoryCapacity}</span></div><div className="storage-list">{player.inventory.length===0?<p className="empty-state">Nothing carried.</p>:player.inventory.map((item)=><ItemCard key={item.id} item={item} location="inventory" actions={legalActions} act={act}/>)}</div></section></div>
    </>}

    {tab==='upgrades'&&<div className="home-upgrade-layout">
      <section className="home-upgrade-next"><p className="section-kicker">Current level {currentIndex}</p><h3>{homeName(player.home.level)}</h3>{nextDefinition?<><p>Next: <strong>{nextDefinition.name}</strong> · defense {structuralDefense} → {nextDefinition.defense}</p><div className="upgrade-cost"><span>{nextDefinition.apCost} AP</span><span>{resourceText(nextDefinition.resources)}</span></div>{!nextDefinition.historicalMaterials&&<p className="adaptation-note">The level/AP/defense follow the Season-16 progression. Some mature material types are not modeled yet, so this tier uses explicit Live2Nite substitutions.</p>}{nextDefinition.apCost>player.maxAp&&<p className="adaptation-note">This historical tier costs more than the ordinary 6 AP cap. It remains visible now, but completing it will require future AP-boosting consumables/status mechanics.</p>}<button className="primary" disabled={!upgrade} onClick={()=>act(upgrade)}>Upgrade to {nextDefinition.name}<small>{nextDefinition.apCost} AP</small></button>{player.home.upgradedDay===game.day&&<small className="home-upgrade-limit">A home may only be upgraded once per day.</small>}</>:<p className="empty-state">This home has reached Castle, the top structural tier.</p>}</section>
      <section className="home-level-table"><div className="home-level-row header"><span>Level</span><span>Home</span><span>Defense</span><span>AP</span></div>{HOME_LEVEL_ORDER.map((level,index)=>{const def=HOME_LEVELS[level];return <div key={level} className={`home-level-row ${index===currentIndex?'current':''} ${index<currentIndex?'complete':''}`}><span>{index}</span><strong>{def.name}</strong><span>{def.defense}</span><span>{def.apCost||'—'}</span></div>})}</section>
    </div>}

    {tab==='improvements'&&<div className="home-improvements-list">
      <p className="adaptation-note">Fence, Reinforcements and More Storage are reconstructed from historical Home/Hero improvements. Until the Hero system is implemented, Live2Nite temporarily exposes these supported works to ordinary citizens; that access rule is an explicit adaptation.</p>
      {(Object.keys(HOME_IMPROVEMENTS) as HomeImprovementId[]).map((id)=>{const def=HOME_IMPROVEMENTS[id];const level=player.home.improvements[id]??0;const next=level<def.maxLevel?level+1:null;const action=improvementCommand(legalActions,id);return <article className="home-improvement-card" key={id}><div><p className="section-kicker">Level {level}/{def.maxLevel}</p><h3>{def.name}</h3><p>{def.description}</p>{next!==null&&<small>{def.apCost(next)} AP · {resourceText(def.resources(next))}</small>}</div><div className="home-improvement-effect"><strong>{def.defensePerLevel?`+${def.defensePerLevel} defense / level`:`+${def.storagePerLevel} chest slot / level`}</strong>{next!==null?<button disabled={!action} onClick={()=>act(action)}>Build level {next}</button>:<span className="facility-status online">MAX</span>}</div></article>})}
    </div>}
  </section>
}
