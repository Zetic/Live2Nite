import { useState } from 'react'
import { homeLabDailyUseLimit, homeLabSuccessChance, homeLabUsesToday } from '../../core/drugLab'
import { HOME_IMPROVEMENTS, HOME_LEVEL_ORDER, HOME_LEVELS, foreignHomeStorageVisible, homeImprovementLevel, homeName, homePreventsTheft, personalDefense, siestaChancePercent, siestaUsedToday } from '../../core/home'
import { itemName } from '../../core/items'
import type { GameCommand, GameEvent, GameState, HomeImprovementId, ItemInstance, ItemType } from '../../core/types'
import { ContextRegister } from './ContextRegister'
import { CombinationActionMenu, ItemActionMenu, ItemStrip, RucksackStrip } from './InventoryItems'

type HomeTab='inventory'|'structure'|'works'
function commandFor(actions:GameCommand[],type:GameCommand['type'],itemId:string):GameCommand|undefined{return actions.find((action)=>action.type===type&&'itemId'in action&&action.itemId===itemId)}
function improvementCommand(actions:GameCommand[],id:HomeImprovementId):GameCommand|undefined{return actions.find((action)=>action.type==='BUILD_HOME_IMPROVEMENT'&&action.improvementId===id)}
function corpseCommand(actions:GameCommand[],type:'DISPOSE_CORPSE_OUTSIDE'|'DISPOSE_CORPSE_WATER',targetCitizenId:string):GameCommand|undefined{return actions.find((action)=>action.type===type&&'targetCitizenId'in action&&action.targetCitizenId===targetCitizenId)}
function foreignItemCommand(actions:GameCommand[],type:'DEPOSIT_HOME_ITEM'|'STEAL_HOME_ITEM'|'PILLAGE_HOME_ITEM',targetCitizenId:string,itemId:string):GameCommand|undefined{return actions.find((action)=>action.type===type&&action.targetCitizenId===targetCitizenId&&action.itemId===itemId)}
function intrusionCommand(actions:GameCommand[],targetCitizenId:string):GameCommand|undefined{return actions.find((action)=>action.type==='INTRUDE_HOME'&&action.targetCitizenId===targetCitizenId)}
function resourceText(resources:Partial<Record<ItemType,number>>):string{const entries=Object.entries(resources) as Array<[ItemType,number|undefined]>;return entries.length?entries.map(([type,count])=>`${itemName(type)} × ${count??0}`).join(' · '):'No mapped materials'}
function blockerText(blockers:readonly string[]):string{return blockers.length?blockers.join(' · '):''}
function homeRegisterEvent(event:GameEvent,citizenId:string):boolean{
  if('targetCitizenId'in event&&event.targetCitizenId===citizenId&&['HOME_ITEM_DEPOSITED','HOME_INTRUSION_ATTEMPTED','HOME_ITEM_STOLEN','HOME_ITEM_PILLAGED','CORPSE_DISPOSED'].includes(event.type))return true
  if(!('citizenId'in event)||event.citizenId!==citizenId)return false
  return['ITEM_MOVED_TO_HOME','ITEM_MOVED_TO_RUCKSACK','CONTAINER_OPENED','ITEM_CONSUMED','ITEMS_COMBINED','HOME_UPGRADED','HOME_IMPROVEMENT_BUILT','HOME_SIESTA_USED','HOME_LAB_USED'].includes(event.type)
}
function foreignHomeRegisterEvent(event:GameEvent,citizenId:string):boolean{return homeRegisterEvent(event,citizenId)||(event.type==='CORPSE_REANIMATED'&&event.corpseCitizenId===citizenId)||(event.type==='CITIZEN_DIED'&&event.citizenId===citizenId)}
function statusLabel(status:'implemented'|'partial'|'wip'):string{return status==='implemented'?'IMPLEMENTED':status==='partial'?'PARTIAL':'WIP'}

export function HomeView({game,citizenId,ownerCitizenId,legalActions,act,onReturnHome}:{game:GameState;citizenId:string;ownerCitizenId?:string;legalActions:GameCommand[];act:(command:GameCommand|undefined)=>void;onReturnHome?:()=>void}){
  const[tab,setTab]=useState<HomeTab>('inventory')
  const actor=game.citizens.find((citizen)=>citizen.id===citizenId)??game.citizens[0]
  const owner=game.citizens.find((citizen)=>citizen.id===(ownerCitizenId??citizenId))??actor
  const visiting=owner.id!==actor.id
  const currentDefense=personalDefense(owner,game)
  const structuralDefense=HOME_LEVELS[owner.home.level].defense
  const currentIndex=HOME_LEVEL_ORDER.indexOf(owner.home.level)
  const defenseTooltip=`Total defense protecting this home during a breach. Structure: ${structuralDefense}. Defensive objects and installed works are included.`

  if(visiting){
    const drag=corpseCommand(legalActions,'DISPOSE_CORPSE_OUTSIDE',owner.id)
    const water=corpseCommand(legalActions,'DISPOSE_CORPSE_WATER',owner.id)
    const intrude=intrusionCommand(legalActions,owner.id)
    const chestVisible=foreignHomeStorageVisible(game,actor.id,owner)
    const protectedHome=owner.alive&&homePreventsTheft(owner)
    const disposition=owner.corpseDisposition==='dragged_out'?'The body was dragged outside town.':owner.corpseDisposition==='watered'?'The body was destroyed with a Water Ration.':owner.home.corpseAttacked?'The corpse already reanimated during a nightly internal attack.':'No body is present in this home.'
    return <section className="panel screen-panel home-screen">
      <div className="panel-heading compact"><div><p className="section-kicker">Citizen home · {owner.alive?'living':'deceased'}</p><h2>{owner.name} · {homeName(owner.home.level)}</h2></div><div className="home-summary"><span>Defense <strong>{currentDefense}</strong></span><span>Structure <strong>{structuralDefense}</strong></span></div></div>
      <div className="foreign-home-grid">
        <section className="home-compact-card">
          <div className="home-card-title"><div><p className="section-kicker">Resident</p><h3>{owner.name}</h3></div><span className={`home-state-chip ${owner.alive?'alive':'dead'}`}>{owner.alive?'ALIVE':'DEAD'}</span></div>
          <p>{owner.alive?owner.location.type==='world'?(protectedHome?'The resident is outside town, but this home is protected against ordinary deposits, intrusion and theft.':'The resident is outside town. Foreign-home transfer rules can apply while the home is unattended.'):'The resident is currently in town; deposits and ordinary theft are unavailable.':owner.home.holdsBody?(owner.home.corpseAttacked?'The body remains here, but it already reanimated and will not attack again.':'The body remains in the home and can reanimate during a nightly attack.'):disposition}</p>
          <div className="home-mini-stats"><span>Chest <strong>{chestVisible?`${owner.home.storage.length}/${owner.home.storageCapacity}`:'HIDDEN'}</strong></span><span>Theft protection <strong>{protectedHome?'YES':'NO'}</strong></span><span>Curtain <strong>{homeImprovementLevel(owner,'curtain')>0?'YES':'NO'}</strong></span><span>Alarm <strong>{homeImprovementLevel(owner,'alarm')>0?'YES':'NO'}</strong></span></div>
          {onReturnHome&&<button className="secondary home-return-button" onClick={onReturnHome}>Return to my home</button>}
        </section>

        <section className="home-compact-card">
          <div className="home-card-title"><div><p className="section-kicker">Interactions</p><h3>{owner.alive?'Visit & belongings':'Pillage & corpse'}</h3></div></div>
          {owner.alive&&<>
            <p className="home-action-note">Deposit, theft and pillage share one foreign-home item transfer per citizen per day outside Chaos. A deposit requires the resident to be outside and the home to be unprotected; there is a 10% chance the depositor is identified.</p>
            <div className="foreign-item-list">{actor.inventory.length===0?<p className="empty-state">No carried items available to deposit.</p>:actor.inventory.map((item)=>{const action=foreignItemCommand(legalActions,'DEPOSIT_HOME_ITEM',owner.id,item.id);return <button key={`deposit-${item.id}`} className="foreign-item-action" disabled={!action} onClick={()=>act(action)}><span>{itemName(item.type)}</span><small>Deposit</small></button>})}</div>
            {!chestVisible&&<button className="home-intrude-button" disabled={!intrude} onClick={()=>act(intrude)}><strong>{protectedHome?'Home protected':'Intrude into home'}</strong><small>{protectedHome?'Fenced House+ or a Lock blocks ordinary intrusion.':'Reveal chest contents for this visit/day.'}</small></button>}
            {chestVisible&&<div className="foreign-item-list">{owner.home.storage.length===0?<p className="empty-state">The chest is empty.</p>:owner.home.storage.map((item)=>{const action=foreignItemCommand(legalActions,'STEAL_HOME_ITEM',owner.id,item.id);return <button key={`steal-${item.id}`} className="foreign-item-action danger" disabled={!action} onClick={()=>act(action)}><span>{itemName(item.type)}</span><small>{action?'Steal':'Unavailable'}</small></button>})}</div>}
            <p className="home-action-note">Theft requires the resident to be outside and the home to be unprotected. Ordinary theft has a 50% identification chance; a Rudimentary Alarm guarantees identification.</p>
          </>}
          {!owner.alive&&<>
            <div className="foreign-item-list">{owner.home.storage.length===0?<p className="empty-state">Nothing remains in this home to pillage.</p>:owner.home.storage.map((item)=>{const action=foreignItemCommand(legalActions,'PILLAGE_HOME_ITEM',owner.id,item.id);return <button key={`pillage-${item.id}`} className="foreign-item-action danger" disabled={!action} onClick={()=>act(action)}><span>{itemName(item.type)}</span><small>{action?'Pillage':'Unavailable'}</small></button>})}</div>
            <p className="home-action-note">Pillage uses the same once-per-day foreign-home transfer allowance as deposit and theft. Pillaging an abandoned home is always identified.</p>
            {owner.home.holdsBody&&<div className="corpse-actions"><button disabled={!drag} onClick={()=>act(drag)}><strong>Drag body outside</strong><small>2 AP</small></button><button disabled={!water} onClick={()=>act(water)}><strong>Destroy with water</strong><small>1 Water Ration</small></button></div>}
          </>}
        </section>
      </div>
      <ContextRegister game={game} title={`${owner.name}'s Home Register`} matches={(event)=>foreignHomeRegisterEvent(event,owner.id)}/>
    </section>
  }

  const upgrade=legalActions.find((action)=>action.type==='UPGRADE_HOME')
  const nextLevel=currentIndex<HOME_LEVEL_ORDER.length-1?HOME_LEVEL_ORDER[currentIndex+1]:null
  const nextDefinition=nextLevel?HOME_LEVELS[nextLevel]:null
  const toHome=(itemId:string)=>commandFor(legalActions,'MOVE_ITEM_TO_HOME',itemId)
  const toRucksack=(itemId:string)=>commandFor(legalActions,'MOVE_ITEM_TO_RUCKSACK',itemId)
  const actionableItems=[...owner.inventory,...owner.home.storage]
  const itemSource=(item:ItemInstance)=>owner.home.storage.some((stored)=>stored.id===item.id)?'Chest':'Rucksack'
  const siesta=legalActions.find((action)=>action.type==='USE_HOME_SIESTA')
  const labAction=legalActions.find((action)=>action.type==='USE_HOME_LAB')
  const labUses=homeLabUsesToday(game,owner.id)
  const labLimit=homeLabDailyUseLimit(game,owner)
  const labChance=homeLabSuccessChance(owner)
  const personalPharma=actionableItems.filter((item)=>item.type==='pharmaceutical_products').length
  const centralLab=game.town.construction.central_laboratory?.completed===true

  return <section className="panel screen-panel home-screen">
    <div className="panel-heading compact"><div><p className="section-kicker">{owner.controller==='human'?'Your home':owner.name}</p><h2>{homeName(owner.home.level)}</h2></div><div className="home-summary"><span>Defense <strong>{currentDefense}</strong></span><span>Chest <strong>{owner.home.storage.length}/{owner.home.storageCapacity}</strong></span></div></div>
    <div className="home-tabs" role="tablist" aria-label="Home view">
      <button className={tab==='inventory'?'active':''} aria-selected={tab==='inventory'} onClick={()=>setTab('inventory')}>Inventory</button>
      <button className={tab==='structure'?'active':''} aria-selected={tab==='structure'} onClick={()=>setTab('structure')}>Structure</button>
      <button className={tab==='works'?'active':''} aria-selected={tab==='works'} onClick={()=>setTab('works')}>Works</button>
    </div>

    {tab==='inventory'&&<><div className="compact-home-inventory"><section className="inventory-surface"><div className="inventory-heading"><h3>Rucksack</h3><span className="micro-stat">{owner.inventory.length}/{owner.inventoryCapacity} cargo · +2 equipment</span></div><RucksackStrip citizen={owner} disabledForItem={(item)=>!toHome(item.id)} onItemClick={(item)=>act(toHome(item.id))} extraTooltip={(item)=>toHome(item.id)?'Store in your chest.':'Chest is full or this item cannot be stored.'}/></section><section className="inventory-surface"><div className="inventory-heading"><h3>Home Chest</h3><span className="micro-stat">{owner.home.storage.length}/{owner.home.storageCapacity}</span></div><ItemStrip items={owner.home.storage} capacity={owner.home.storageCapacity} disabledForItem={(item)=>!toRucksack(item.id)} onItemClick={(item)=>act(toRucksack(item.id))} extraTooltip={(item)=>toRucksack(item.id)?'Pack into your rucksack.':'Rucksack is full or this item cannot be packed.'}/></section></div><section className="inventory-actions-block"><div className="inventory-heading"><h3>Item Actions</h3><span className="micro-stat">rucksack cargo + chest</span></div><ItemActionMenu items={actionableItems} actions={legalActions} act={act} sourceForItem={itemSource}/><CombinationActionMenu actions={legalActions} act={act}/></section></>}

    {tab==='structure'&&<div className="home-structure-grid">
      <section className="home-compact-card home-next-tier"><div className="home-card-title"><div><p className="section-kicker">Level {currentIndex}</p><h3>{homeName(owner.home.level)}</h3></div><span className="home-defense-chip" title={defenseTooltip}>{currentDefense} DEF</span></div>
        {nextDefinition?<><div className="home-next-line"><span>Next</span><strong>{nextDefinition.name}</strong><span>{structuralDefense} → {nextDefinition.defense} DEF</span></div><div className="home-cost-row"><span>{nextDefinition.apCost} AP</span><span>{resourceText(nextDefinition.resources)}</span>{nextDefinition.unmodeledResources.length>0&&<span className="blocked">Missing model: {blockerText(nextDefinition.unmodeledResources)}</span>}</div>{nextDefinition.unmodeledResources.length>0&&<p className="adaptation-note">This tier stays visible but fails closed. No substitute materials are used for source items that do not yet have a Live2Nite runtime mechanic.</p>}<button className="primary home-build-button" disabled={!upgrade} onClick={()=>act(upgrade)}>Upgrade to {nextDefinition.name}</button>{owner.home.upgradedDay===game.day&&<small className="home-upgrade-limit">Structural upgrade already used today.</small>}</>:<p className="empty-state">Castle is the highest structural tier.</p>}
      </section>
      <section className="home-level-table compact"><div className="home-level-row header"><span>#</span><span>Home</span><span>DEF</span><span>AP</span></div>{HOME_LEVEL_ORDER.map((level,index)=>{const def=HOME_LEVELS[level];return <div key={level} className={`home-level-row ${index===currentIndex?'current':''} ${index<currentIndex?'complete':''}`}><span>{index}</span><strong>{def.name}</strong><span>{def.defense}</span><span>{def.apCost||'—'}</span></div>})}</section>
    </div>}

    {tab==='works'&&<div className="home-works-grid">{(Object.keys(HOME_IMPROVEMENTS) as HomeImprovementId[]).map((id)=>{const def=HOME_IMPROVEMENTS[id];const level=homeImprovementLevel(owner,id);const next=level<def.maxLevel?level+1:null;const action=improvementCommand(legalActions,id);const mapped=next===null?{}:def.resources(next);const blockers=next===null?[]:def.unmodeledResources(next);const effect=def.defensePerLevel?`+${def.defensePerLevel} DEF / level`:def.storagePerLevel?`+${def.storagePerLevel} chest slot / level`:id==='siesta'?`${siestaChancePercent(owner)}% current recovery chance`:id==='laboratory'?(level>0?`${labChance}% Twinoid · ${labUses}/${labLimit} uses today`:'25% Twinoid chance at L1'):id==='lock'?'Blocks ordinary theft':id==='curtain'?'Hides chest contents':id==='alarm'?'Logs intrusion':'Dependency pending';return <article className={`home-work-row status-${def.status}`} key={id}><div className="home-work-copy"><div className="home-work-title"><h3>{def.name}</h3><span className={`work-status ${def.status}`}>{statusLabel(def.status)}</span><span className="work-level">{level}/{def.maxLevel}</span></div><p>{def.description}</p><small>{effect}</small></div><div className="home-work-action">{next!==null?<><div className="home-work-cost"><span>{def.apCost(next)} AP</span>{Object.keys(mapped).length>0&&<span>{resourceText(mapped)}</span>}{blockers.length>0&&<span className="blocked">{blockerText(blockers)}</span>}{!def.effectReady&&<span className="blocked">Effect dependency not implemented</span>}</div><button disabled={!action} onClick={()=>act(action)}>Build L{next}</button></>:<span className="facility-status online">MAX</span>}{id==='siesta'&&level>0&&<button className="supply-action" disabled={!siesta} onClick={()=>act(siesta)}>{siestaUsedToday(game,owner.id)?'Siesta used today':owner.ap>=owner.maxAp?'Spend AP before Siesta':`Try Siesta · ${siestaChancePercent(owner)}%`}</button>}{id==='laboratory'&&level>0&&<><button className="supply-action" disabled={!labAction} onClick={()=>act(labAction)}>{labUses>=labLimit?`Lab limit reached · ${labUses}/${labLimit}`:personalPharma<2?'Need 2 Pharmaceutical Products':`Experiment · 0 AP · ${labChance}% Twinoid`}</button><small className="home-upgrade-limit">{centralLab?`Central Laboratory active · ${labLimit} uses/day`:`${labLimit} use${labLimit===1?'':'s'}/day · Central Laboratory adds 5`}</small></>}</div></article>})}</div>}
    <ContextRegister game={game} title={`${owner.name}'s Home Register`} matches={(event)=>homeRegisterEvent(event,owner.id)}/>
  </section>
}