import { PROFESSION_DEFINITIONS, PROFESSION_IDS } from '../../core/professions'
import type { ProfessionId } from '../../core/types'
import '../profession.css'

export function LandingScreen({selected,onSelect,onStart}:{selected:ProfessionId|null;onSelect:(profession:ProfessionId)=>void;onStart:()=>void}){
  return <main className="profession-landing">
    <section className="profession-landing-card">
      <div className="profession-brand"><p className="eyebrow">Distant town survival</p><h1>Live<span>2</span>Nite</h1><p>Choose the profession equipment that will define this citizen for the new town.</p></div>
      <div className="profession-choice-heading"><span>Profession selection</span><strong>Choose one profession</strong><small>The profession item occupies a permanent rucksack equipment slot. Profession abilities will be implemented in dedicated follow-up passes.</small></div>
      <div className="profession-grid" role="radiogroup" aria-label="Choose profession">
        {PROFESSION_IDS.map((id)=>{const definition=PROFESSION_DEFINITIONS[id];const active=selected===id;return <button key={id} type="button" role="radio" aria-checked={active} className={`profession-card ${active?'selected':''}`} onClick={()=>onSelect(id)}><span className="profession-card-name">{definition.name}</span><span className="profession-card-role">{definition.summary}</span><span className="profession-card-item">Profession item · {definition.itemName}</span></button>})}
      </div>
      <button type="button" className="profession-new-town" disabled={!selected} onClick={onStart}>New Town</button>
    </section>
  </main>
}
