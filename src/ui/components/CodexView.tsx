import { useMemo, useState } from 'react'
import { CODEX_ITEM_CATEGORIES, CODEX_ITEM_ENTRIES, codexCategoryCount, filterCodexItems, type CodexItemCategory, type CodexItemEntry, type CodexRelationshipGroup } from '../../core/codex'
import { STATUS_CODEX_ENTRIES, filterCodexStatuses, type CodexStatusEntry } from '../../core/statusCodex'
import type { CitizenStatusId, ItemType } from '../../core/types'
import '../codex.css'

type CodexSection='items'|'statuses'

function RelationshipGroups({title,groups,empty}:{title:string;groups:CodexRelationshipGroup[];empty:string}){
  return <section className="codex-detail-section">
    <h3>{title}</h3>
    {groups.length?<div className="codex-relation-groups">{groups.map((group)=><section className="codex-relation-group" key={group.id}>
      <h4>{group.label}</h4>
      <div className="codex-relation-list">{group.entries.map((relation,index)=><div className="codex-relation-row" key={`${relation.label}-${index}`}>
        <span className="codex-relation-copy"><strong>{relation.label}</strong><small>{relation.detail}</small></span>
        {relation.badge&&<span className="codex-relation-badge">{relation.badge}</span>}
      </div>)}</div>
    </section>)}</div>:<p className="empty-state">{empty}</p>}
  </section>
}

function ItemDetail({entry}:{entry:CodexItemEntry}){
  return <article className="codex-detail" aria-live="polite">
    <div className="codex-detail-heading">
      <div><p className="section-kicker">{entry.categoryLabel}</p><h2>{entry.name}</h2></div>
      <span className="codex-source-chip">{entry.sourceLabel}</span>
    </div>
    <p className="codex-purpose">{entry.purpose}</p>
    <section className="codex-detail-section">
      <h3>Capabilities</h3>
      {entry.capabilities.length?<div className="codex-chip-list">{entry.capabilities.map((capability)=><span key={capability}>{capability}</span>)}</div>:<p className="empty-state">No structured capabilities are registered for this item.</p>}
    </section>
    <RelationshipGroups title="Used in" groups={entry.usedIn} empty="No structured downstream use is registered in the current game systems."/>
    <RelationshipGroups title="Obtained from" groups={entry.obtainedFrom} empty="No active acquisition route is represented by the current runtime definitions."/>
    <section className="codex-detail-section">
      <h3>Game data</h3>
      {entry.facts.length?<dl className="codex-facts">{entry.facts.map((fact,index)=><div key={`${fact.label}-${index}`}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>:<p className="empty-state">This item currently has no additional structured mechanics to display.</p>}
    </section>
  </article>
}

function StatusDetail({entry}:{entry:CodexStatusEntry}){
  const progression:CodexRelationshipGroup[]=entry.progression.length?[{id:'progression',label:'Nightly / state progression',entries:entry.progression.map((relation)=>({label:relation.label,detail:relation.detail}))}]:[]
  return <article className="codex-detail codex-status-detail" aria-live="polite">
    <div className="codex-detail-heading">
      <div><p className="section-kicker">{entry.family}</p><h2>{entry.label}</h2></div>
      <span className={`codex-severity-chip ${entry.severity}`}>{entry.severity}</span>
    </div>
    <p className="codex-purpose">{entry.effect}</p>
    <section className="codex-detail-section">
      <h3>Effects</h3>
      {entry.mechanics.length?<div className="codex-mechanics-list">{entry.mechanics.map((mechanic,index)=><p key={index}>{mechanic}</p>)}</div>:<p className="empty-state">The primary runtime effect is described above.</p>}
    </section>
    <RelationshipGroups title="Obtained from" groups={entry.obtainedFrom} empty="No active acquisition route is represented by the current runtime systems."/>
    <RelationshipGroups title="Treatment / clearing" groups={entry.clearedBy} empty="No active treatment or automatic clearing route is represented."/>
    <RelationshipGroups title="Progression" groups={progression} empty="This status has no additional structured progression."/>
    {entry.variants.length>0&&<section className="codex-detail-section">
      <h3>Variants</h3>
      <div className="codex-relation-group"><div className="codex-relation-list">{entry.variants.map((variant)=><div className="codex-relation-row" key={variant.id}>
        <span className="codex-relation-copy"><strong>{variant.label}</strong><small>{variant.detail}</small></span>
        <span className={`codex-relation-badge ${variant.active?'active-mechanic':'tracked-mechanic'}`}>{variant.active?'Active':'Tracked only'}</span>
      </div>)}</div></div>
    </section>}
  </article>
}

export function CodexView(){
  const [section,setSection]=useState<CodexSection>('items')
  const [category,setCategory]=useState<CodexItemCategory>('all')
  const [query,setQuery]=useState('')
  const [selectedItem,setSelectedItem]=useState<ItemType|null>(CODEX_ITEM_ENTRIES[0]?.type??null)
  const [selectedStatus,setSelectedStatus]=useState<CitizenStatusId|null>(STATUS_CODEX_ENTRIES[0]?.id??null)

  const visibleItems=useMemo(()=>filterCodexItems(category,query),[category,query])
  const visibleStatuses=useMemo(()=>filterCodexStatuses(query),[query])
  const itemEntry=(selectedItem?visibleItems.find((entry)=>entry.type===selectedItem):undefined)??visibleItems[0]??null
  const statusEntry=(selectedStatus?visibleStatuses.find((entry)=>entry.id===selectedStatus):undefined)??visibleStatuses[0]??null
  const shown=section==='items'?visibleItems.length:visibleStatuses.length

  return <section className="panel screen-panel codex-screen">
    <div className="panel-heading codex-heading"><div><p className="section-kicker">Reference</p><h2>Codex</h2><p className="section-note">A live reference generated from the same item, condition, action, recipe, construction and acquisition definitions used by gameplay.</p></div><span className="panel-count">{section==='items'?`${CODEX_ITEM_ENTRIES.length} items`:`${STATUS_CODEX_ENTRIES.length} statuses`}</span></div>
    <div className="codex-section-tabs" role="tablist" aria-label="Codex sections">
      <button type="button" className={section==='items'?'active':''} aria-selected={section==='items'} onClick={()=>setSection('items')}><strong>Items</strong><small>Current Live2Nite catalogue</small></button>
      <button type="button" className={section==='statuses'?'active':''} aria-selected={section==='statuses'} onClick={()=>setSection('statuses')}><strong>Status Effects</strong><small>Runtime citizen conditions</small></button>
    </div>
    {section==='items'&&<div className="codex-category-tabs" role="tablist" aria-label="Item categories">
      {CODEX_ITEM_CATEGORIES.map((entry)=><button type="button" key={entry.id} className={category===entry.id?'active':''} aria-selected={category===entry.id} onClick={()=>setCategory(entry.id)}><span>{entry.label}</span><small>{codexCategoryCount(entry.id)}</small></button>)}
    </div>}
    <div className="codex-toolbar"><label><span>{section==='items'?'Search items':'Search status effects'}</span><input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder={section==='items'?'Name, purpose, source, recipe, location…':'Status, source, treatment, progression, effect…'}/></label><strong>{shown} shown</strong></div>
    <div className="codex-layout">
      <section className="codex-list-panel" aria-label={section==='items'?'Codex items':'Codex status effects'}>
        <div className="codex-item-list">
          {section==='items'?visibleItems.map((entry)=><button type="button" key={entry.type} className={`codex-item-row ${itemEntry?.type===entry.type?'active':''}`} onClick={()=>setSelectedItem(entry.type)}><span><strong>{entry.name}</strong><small>{entry.categoryLabel} · {entry.sourceLabel}</small></span><span className="codex-row-arrow" aria-hidden="true">›</span></button>):visibleStatuses.map((entry)=><button type="button" key={entry.id} className={`codex-item-row status-${entry.severity} ${statusEntry?.id===entry.id?'active':''}`} onClick={()=>setSelectedStatus(entry.id)}><span><strong>{entry.label}</strong><small>{entry.family} · {entry.severity}</small></span><span className="codex-row-arrow" aria-hidden="true">›</span></button>)}
          {shown===0&&<p className="empty-state">No {section==='items'?'items':'status effects'} match this search.</p>}
        </div>
      </section>
      {section==='items'?(itemEntry?<ItemDetail entry={itemEntry}/>:<article className="codex-detail"><p className="empty-state">No item is available for the current filter.</p></article>):(statusEntry?<StatusDetail entry={statusEntry}/>:<article className="codex-detail"><p className="empty-state">No status effect is available for this search.</p></article>)}
    </div>
  </section>
}
