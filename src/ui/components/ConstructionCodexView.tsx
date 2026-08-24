import { useMemo, useState } from 'react'
import { BLUEPRINT_ACQUISITION_NOTES, CONSTRUCTION_CODEX_BRANCHES, CONSTRUCTION_CODEX_ENTRIES, GENERIC_BLUEPRINT_CLASSES, constructionCodexStatusLabel, filterConstructionCodex, type ConstructionCodexEntry } from '../../core/constructionCodex'
import { blueprintClassLabel, type ConstructionBlueprintClass, type ConstructionBranchId } from '../../core/constructionCatalog'
import type { ConstructionId } from '../../core/constructionIds'

type CatalogMode='branches'|'blueprints'

const ENTRY_BY_ID=new Map(CONSTRUCTION_CODEX_ENTRIES.map((entry)=>[entry.id,entry]))

function StatusChip({entry}:{entry:ConstructionCodexEntry}){
  return <span className={`construction-codex-status ${entry.implementation}`}>{constructionCodexStatusLabel(entry.implementation)}</span>
}

function EntryButton({entry,selected,onSelect,showDepth=true}:{entry:ConstructionCodexEntry;selected:boolean;onSelect:()=>void;showDepth?:boolean}){
  return <button type="button" className={`construction-codex-row ${selected?'active':''} ${entry.implementation}`} onClick={onSelect} style={showDepth?{paddingLeft:`${10+entry.depth*16}px`}:undefined}>
    <span className="construction-codex-row-copy"><strong>{entry.name}</strong><small>{entry.blueprintLabel} · {entry.apCost} AP · {entry.branchLabel}</small></span>
    <StatusChip entry={entry}/>
  </button>
}

function RelationshipButton({id,label,onJump}:{id:ConstructionId;label:string;onJump:(id:ConstructionId)=>void}){
  return <button type="button" className="construction-codex-link" onClick={()=>onJump(id)}>{label}<span aria-hidden="true">›</span></button>
}

function Detail({entry,onJump}:{entry:ConstructionCodexEntry;onJump:(id:ConstructionId)=>void}){
  return <article className="codex-detail construction-codex-detail" aria-live="polite">
    <div className="codex-detail-heading">
      <div><p className="section-kicker">{entry.branchLabel}</p><h2>{entry.name}</h2></div>
      <StatusChip entry={entry}/>
    </div>
    <p className="codex-purpose">{entry.description}</p>
    {entry.implementation==='wip'&&<div className="construction-wip-banner"><strong>Work in progress</strong><span>{entry.wipReason??'The source construction is catalogued, but its gameplay mechanic is not implemented yet.'}</span><small>This site may be discovered by the normal construction/blueprint rules, but cannot accept construction work yet.</small></div>}
    {entry.implementation==='partial'&&<div className="construction-partial-banner"><strong>Partial implementation</strong><span>The core behavior is available, but at least one source mechanic still requires a fidelity pass.</span></div>}
    <section className="codex-detail-section">
      <h3>Construction data</h3>
      <dl className="codex-facts">
        <div><dt>Blueprint</dt><dd>{entry.blueprintLabel}</dd></div>
        <div><dt>Labor</dt><dd>{entry.apCost} AP</dd></div>
        <div><dt>Defense</dt><dd>{entry.defense>0?`+${entry.defense}`:'None'}</dd></div>
        <div><dt>Condition</dt><dd>{entry.maxHp} HP · {entry.breakable?'breakable':'not breakable'}</dd></div>
        <div><dt>Lifecycle</dt><dd>{entry.temporary?'Temporary · expires after the attack':'Permanent'}</dd></div>
        <div><dt>Upgrades</dt><dd>{entry.hasUpgrade?'Has building-level upgrades':'No building-level upgrade track'}</dd></div>
      </dl>
    </section>
    <section className="codex-detail-section">
      <h3>Source construction cost</h3>
      {entry.resources.length?<div className="construction-codex-materials">{entry.resources.map((resource)=><span key={resource.name}><strong>{resource.amount}</strong>{resource.name}</span>)}</div>:<p className="empty-state">Labor only.</p>}
    </section>
    <section className="codex-detail-section">
      <h3>Branch relationships</h3>
      <div className="construction-codex-relations">
        {entry.parentId?<div><span>Parent</span><RelationshipButton id={entry.parentId} label={entry.parentName??entry.parentId} onJump={onJump}/></div>:<div><span>Parent</span><strong>Branch root</strong></div>}
        <div><span>Children</span>{entry.childIds.length?<div className="construction-codex-child-links">{entry.childIds.map((id)=><RelationshipButton key={id} id={id} label={ENTRY_BY_ID.get(id)?.name??id} onJump={onJump}/>)}</div>:<strong>None</strong>}</div>
      </div>
    </section>
    <section className="codex-detail-section">
      <h3>Acquisition</h3>
      <p className="codex-purpose construction-acquisition-note">{BLUEPRINT_ACQUISITION_NOTES[entry.blueprintClass]}</p>
    </section>
  </article>
}

export function ConstructionCodexView(){
  const[mode,setMode]=useState<CatalogMode>('branches')
  const[branch,setBranch]=useState<'all'|ConstructionBranchId>('all')
  const[query,setQuery]=useState('')
  const[selected,setSelected]=useState<ConstructionId>(CONSTRUCTION_CODEX_ENTRIES[0].id)

  const visible=useMemo(()=>filterConstructionCodex(query,branch,mode==='blueprints'),[query,branch,mode])
  const selectedEntry=visible.find((entry)=>entry.id===selected)??visible[0]??null

  const branchGroups=useMemo(()=>CONSTRUCTION_CODEX_BRANCHES.filter((candidate)=>candidate.id!=='all'&&(branch==='all'||candidate.id===branch)).map((candidate)=>({
    id:candidate.id,
    label:candidate.label,
    entries:visible.filter((entry)=>entry.branchId===candidate.id),
  })).filter((group)=>group.entries.length>0),[visible,branch])

  const blueprintGroups=useMemo(()=>{
    const generic=GENERIC_BLUEPRINT_CLASSES.map((value)=>({id:`bp-${value}`,label:`${blueprintClassLabel(value)} Blueprint`,blueprintClass:value,entries:visible.filter((entry)=>entry.blueprintClass===value)})).filter((group)=>group.entries.length>0)
    const special=visible.filter((entry)=>entry.blueprintClass>=5)
    return special.length?[...generic,{id:'special',label:'Special / non-generic unlocks',blueprintClass:5 as ConstructionBlueprintClass,entries:special}]:generic
  },[visible])

  const jump=(id:ConstructionId)=>{const entry=ENTRY_BY_ID.get(id);if(!entry)return;setMode('branches');setBranch(entry.branchId);setSelected(id)}

  return <>
    <div className="construction-codex-mode-tabs" role="tablist" aria-label="Construction Codex views">
      <button type="button" className={mode==='branches'?'active':''} aria-selected={mode==='branches'} onClick={()=>setMode('branches')}><strong>Construction branches</strong><small>Complete parent/child trees</small></button>
      <button type="button" className={mode==='blueprints'?'active':''} aria-selected={mode==='blueprints'} onClick={()=>setMode('blueprints')}><strong>Blueprint unlocks</strong><small>Grouped by rarity</small></button>
    </div>
    {mode==='branches'&&<div className="construction-codex-branch-tabs" role="tablist" aria-label="Construction branches">{CONSTRUCTION_CODEX_BRANCHES.map((entry)=><button type="button" key={entry.id} className={branch===entry.id?'active':''} aria-selected={branch===entry.id} onClick={()=>setBranch(entry.id)}><span>{entry.label}</span><small>{entry.count}</small></button>)}</div>}
    <div className="codex-toolbar"><label><span>Search constructions</span><input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Name, branch, blueprint, material, mechanic…"/></label><strong>{visible.length} shown · 166 total</strong></div>
    <div className="codex-layout construction-codex-layout">
      <section className="codex-list-panel construction-codex-list" aria-label="Construction Codex entries">
        {mode==='branches'?branchGroups.map((group)=><section className="construction-codex-group" key={group.id}><h3>{group.label}<small>{group.entries.length}</small></h3>{group.entries.map((entry)=><EntryButton key={entry.id} entry={entry} selected={selectedEntry?.id===entry.id} onSelect={()=>setSelected(entry.id)}/>)}</section>):blueprintGroups.map((group)=><section className="construction-codex-group blueprint-group" key={group.id}><h3>{group.label}<small>{group.entries.length}</small></h3><p>{group.id==='special'?'These constructions use special/manual unlock rules rather than generic blueprint items.':BLUEPRINT_ACQUISITION_NOTES[group.blueprintClass]}</p>{group.entries.map((entry)=><EntryButton key={entry.id} entry={entry} selected={selectedEntry?.id===entry.id} onSelect={()=>setSelected(entry.id)} showDepth={false}/>)}</section>)}
        {!visible.length&&<p className="empty-state">No constructions match this view.</p>}
      </section>
      {selectedEntry?<Detail entry={selectedEntry} onJump={jump}/>:<article className="codex-detail"><p className="empty-state">No construction is available for the current filter.</p></article>}
    </div>
  </>
}
