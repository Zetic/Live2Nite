import { useMemo, useState } from 'react'
import { CODEX_ITEM_CATEGORIES, CODEX_ITEM_ENTRIES, codexCategoryCount, filterCodexItems, type CodexItemCategory, type CodexItemEntry } from '../../core/codex'
import type { ItemType } from '../../core/types'
import '../codex.css'

function ItemDetail({ entry }: { entry: CodexItemEntry }) {
  return <article className="codex-detail" aria-live="polite">
    <div className="codex-detail-heading">
      <div><p className="section-kicker">{entry.categoryLabel}</p><h2>{entry.name}</h2></div>
      <span className="codex-source-chip">{entry.sourceLabel}</span>
    </div>
    <p className="codex-purpose">{entry.purpose}</p>
    <section className="codex-detail-section">
      <h3>Capabilities</h3>
      {entry.capabilities.length ? <div className="codex-chip-list">{entry.capabilities.map((capability)=><span key={capability}>{capability}</span>)}</div> : <p className="empty-state">No structured capabilities are registered for this item.</p>}
    </section>
    <section className="codex-detail-section">
      <h3>Game data</h3>
      {entry.facts.length ? <dl className="codex-facts">{entry.facts.map((fact,index)=><div key={`${fact.label}-${index}`}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl> : <p className="empty-state">This item currently has no additional structured mechanics to display.</p>}
    </section>
  </article>
}

export function CodexView() {
  const [category,setCategory]=useState<CodexItemCategory>('all')
  const [query,setQuery]=useState('')
  const [selected,setSelected]=useState<ItemType>(CODEX_ITEM_ENTRIES[0]?.type)
  const visible=useMemo(()=>filterCodexItems(category,query),[category,query])
  const selectedEntry=CODEX_ITEM_ENTRIES.find((entry)=>entry.type===selected)??visible[0]??CODEX_ITEM_ENTRIES[0]

  return <section className="panel screen-panel codex-screen">
    <div className="panel-heading codex-heading"><div><p className="section-kicker">Reference</p><h2>Codex</h2><p className="section-note">A live reference built from the same item definitions and mechanics used by the game.</p></div><span className="panel-count">{CODEX_ITEM_ENTRIES.length} items</span></div>
    <div className="codex-section-tabs" role="tablist" aria-label="Codex sections"><button type="button" className="active" aria-selected="true"><strong>Items</strong><small>Current Live2Nite catalogue</small></button></div>
    <div className="codex-category-tabs" role="tablist" aria-label="Item categories">
      {CODEX_ITEM_CATEGORIES.map((entry)=><button type="button" key={entry.id} className={category===entry.id?'active':''} aria-selected={category===entry.id} onClick={()=>setCategory(entry.id)}><span>{entry.label}</span><small>{codexCategoryCount(entry.id)}</small></button>)}
    </div>
    <div className="codex-toolbar"><label><span>Search items</span><input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Name, purpose, source, capability…" /></label><strong>{visible.length} shown</strong></div>
    <div className="codex-layout">
      <section className="codex-list-panel" aria-label="Codex items">
        <div className="codex-item-list">
          {visible.map((entry)=><button type="button" key={entry.type} className={`codex-item-row ${selectedEntry?.type===entry.type?'active':''}`} onClick={()=>setSelected(entry.type)}><span><strong>{entry.name}</strong><small>{entry.categoryLabel} · {entry.sourceLabel}</small></span><span className="codex-row-arrow" aria-hidden="true">›</span></button>)}
          {!visible.length&&<p className="empty-state">No items match this category and search.</p>}
        </div>
      </section>
      {selectedEntry?<ItemDetail entry={selectedEntry}/>:<article className="codex-detail"><p className="empty-state">Choose an item to view its codex entry.</p></article>}
    </div>
  </section>
}
