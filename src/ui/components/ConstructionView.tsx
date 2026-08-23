import { useState } from 'react'
import { bankCount } from '../../core/bank'
import { CONSTRUCTION_CATEGORIES, CONSTRUCTION_ORDER, CONSTRUCTIONS, constructionDepth, constructionFlatDefenseForProject, constructionUnlocked, missingMaterials, type ConstructionCategory } from '../../core/construction'
import { itemName } from '../../core/items'
import type { ConstructionId, GameCommand, GameEvent, GameState, ItemType } from '../../core/types'
import '../construction.css'
import { ContextRegister } from './ContextRegister'

function constructionCommand(actions:GameCommand[],projectId:ConstructionId){return actions.find((action):action is Extract<GameCommand,{type:'CONTRIBUTE_CONSTRUCTION'}>=>action.type==='CONTRIBUTE_CONSTRUCTION'&&action.projectId===projectId)}
function resourceEntries(resources:Partial<Record<ItemType,number>>){return Object.entries(resources) as [ItemType,number][]}
function categoryLabel(category:ConstructionCategory):string{return CONSTRUCTION_CATEGORIES.find((entry)=>entry.id===category)?.label??category}
function constructionEvent(event:GameEvent):boolean{return['CONSTRUCTION_AP_CONTRIBUTED','CONSTRUCTION_COMPLETED','CONSTRUCTION_EXPIRED','CONSTRUCTION_GENERATED_ITEM'].includes(event.type)}

export function ConstructionView({game,legalActions,act}:{game:GameState;legalActions:GameCommand[];act:(command:GameCommand|undefined)=>void}){
  const[category,setCategory]=useState<ConstructionCategory|'all'>('all')
  const[expanded,setExpanded]=useState<ConstructionId|null>(null)
  const completed=CONSTRUCTION_ORDER.filter((id)=>game.town.construction[id]?.completed).length
  const visible=CONSTRUCTION_ORDER.filter((id)=>category==='all'||CONSTRUCTIONS[id].category===category)
  return <section className="panel screen-panel construction-screen">
    <div className="panel-heading"><div><p className="section-kicker">Shared town projects</p><h2>Construction Sites</h2><p className="section-note">Choose a branch, then invest shared materials and AP. Completed projects keep their original material recipe visible without mixing it with today's Bank stock.</p></div><span className="panel-count">{completed}/{CONSTRUCTION_ORDER.length} built</span></div>
    <div className="construction-tabs" role="tablist" aria-label="Construction categories">{CONSTRUCTION_CATEGORIES.map((entry)=><button key={entry.id} type="button" role="tab" aria-selected={category===entry.id} className={category===entry.id?'active':''} onClick={()=>setCategory(entry.id)}>{entry.label}</button>)}</div>
    <div className="construction-table" role="table" aria-label="Town construction projects">
      <div className="construction-row construction-header" role="row"><span>Project</span><span>Effect</span><span>Labor</span><span>Materials</span><span>Status</span></div>
      {visible.map((projectId)=>{const definition=CONSTRUCTIONS[projectId];const project=game.town.construction[projectId];const unlocked=constructionUnlocked(game,projectId);const missing=missingMaterials(game,projectId);const command=constructionCommand(legalActions,projectId);const prerequisites=definition.prerequisites.map((id)=>CONSTRUCTIONS[id].name);const flatDefense=constructionFlatDefenseForProject(projectId);const isExpanded=expanded===projectId;const status=project.completed?'BUILT':!unlocked?'LOCKED':command?'BUILD':'WAITING';const resourceSummary=resourceEntries(definition.resources);return <div className={`construction-entry ${project.completed?'built':''} ${!unlocked?'locked':''}`} key={projectId}>
        <div className="construction-row" role="row"><button className="construction-name" type="button" onClick={()=>setExpanded(isExpanded?null:projectId)} style={{paddingLeft:`${10+constructionDepth(projectId)*18}px`}}><span className="tree-mark">{constructionDepth(projectId)>0?'└':'◆'}</span><span><strong>{definition.name}</strong><small>{categoryLabel(definition.category)}{definition.expiresAfterAttack?' · one night':''}</small></span></button><span className="construction-effect">{flatDefense>0?<strong>+{flatDefense} DEF</strong>:<strong>UTILITY</strong>}<small>{definition.effectLabel??'Unlocks branch progression'}</small></span><span className="construction-labor"><strong>{project.apContributed}/{definition.apCost}</strong><small>AP</small><span className="mini-progress"><i style={{width:`${Math.min(100,(project.apContributed/definition.apCost)*100)}%`}}/></span></span><span className="construction-resources">{resourceSummary.length?resourceSummary.map(([type,required])=>{if(project.completed)return <small className="spent" key={type}>{itemName(type)} <strong>{required}</strong></small>;const current=bankCount(game,type);return <small className={current>=required?'ready':'missing'} key={type}>{itemName(type)} <strong>{current}/{required}</strong></small>}):<small>Labor only</small>}</span><span className="construction-status">{project.completed?<strong className="built-label">BUILT</strong>:<button type="button" disabled={!command} onClick={()=>act(command)}>{command?'Contribute':status}<small>{command?'1 AP':!unlocked&&prerequisites.length?`Needs ${prerequisites.join(' + ')}`:Object.keys(missing).length?'Materials required':'No AP'}</small></button>}</span></div>
        {isExpanded&&<div className="construction-details"><p>{definition.description}</p><div><span><strong>Effect</strong>{definition.effectLabel??'Branch prerequisite'}</span><span><strong>Source</strong>{definition.source.replaceAll('_',' ')}</span><span><strong>Costs</strong>{definition.historicalCostConfidence==='confirmed'?'Recovered/confirmed':'Live2Nite-adapted material mix'}</span>{prerequisites.length>0&&<span><strong>Requires</strong>{prerequisites.join(' + ')}</span>}</div></div>}
      </div>})}
    </div>
    <ContextRegister game={game} title="Construction Register" matches={constructionEvent}/>
  </section>
}
