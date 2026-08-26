import { isGodCitizen } from '../../core/debugGod'
import { hasProfession } from '../../core/professions'
import { CITIZEN_STATUS_DEFINITIONS, activeCitizenStatuses, effectiveMaxAp, woundLabel } from '../../core/status'
import { TECHNICIAN_MAX_CP, technicianPoints } from '../../core/technician'
import type { Citizen, CitizenStatusId } from '../../core/types'
import { RucksackStrip } from './InventoryItems'

interface StatusSlot {
  id: CitizenStatusId | 'god'
  icon: string
  label: string
  tone: 'safe' | 'neutral' | 'warning' | 'danger'
  title: string
}

const ICONS: Partial<Record<CitizenStatusId,string>> = {
  exhausted:'⚡',
  satisfied_food:'🍴',
  satisfied_water:'◉',
  thirsty:'💧',
  dehydrated:'💧',
  wounded:'✚',
  infected:'☣',
  terrorized:'!',
  drugged:'◆',
  addicted:'◇',
  drunk:'◌',
  hangover:'☕',
  immune:'◈',
}

function toneFor(id:CitizenStatusId):StatusSlot['tone']{
  const severity=CITIZEN_STATUS_DEFINITIONS[id].severity
  return severity==='danger'?'danger':severity==='warning'?'warning':'neutral'
}
function conditionLabel(citizen:Citizen,id:CitizenStatusId):string{
  return id==='wounded'?`Wounded · ${woundLabel(citizen.status.wound)}`:CITIZEN_STATUS_DEFINITIONS[id].label
}

export function visibleStatusSlots(citizen:Citizen):StatusSlot[]{
  const conditions=activeCitizenStatuses(citizen).map((id):StatusSlot=>({
    id,
    icon:ICONS[id]??'•',
    label:conditionLabel(citizen,id),
    tone:toneFor(id),
    title:CITIZEN_STATUS_DEFINITIONS[id].effect,
  }))
  if(isGodCitizen(citizen))conditions.unshift({id:'god',icon:'∞',label:'God',tone:'safe',title:'Debug God status: infinite AP, immunity to other conditions, and movement through zombie-controlled zones.'})
  return conditions
}

export function CitizenStatusBar({citizen}:{citizen:Citizen}){
  const slots=visibleStatusSlots(citizen),god=isGodCitizen(citizen),cap=effectiveMaxAp(citizen),technician=hasProfession(citizen,'technician')
  return <section className={`citizen-status-hud ${!citizen.alive?'dead':''}`} aria-label={`${citizen.name} rucksack and status`}>
    <div className="citizen-status-ap"><span>AP</span><strong>{god?'∞':citizen.ap}<small>/{god?'∞':cap}</small></strong></div>
    {technician&&<div className="citizen-status-ap"><span>CP</span><strong>{technicianPoints(citizen)}<small>/{TECHNICIAN_MAX_CP}</small></strong></div>}
    <div className="citizen-hud-rack">
      <span className="citizen-hud-section-label">Rucksack</span>
      <RucksackStrip citizen={citizen}/>
    </div>
    <div className="citizen-hud-statuses">
      <span className="citizen-hud-section-label">Statuses</span>
      <div className="citizen-status-slots">{slots.map((slot)=><div key={slot.id} className={`citizen-status-slot active ${slot.tone}`} title={slot.title} aria-label={`${slot.label}. ${slot.title}`}><span className="citizen-status-icon" aria-hidden="true">{slot.icon}</span><span className="citizen-status-slot-label">{slot.label}</span></div>)}</div>
    </div>
    {!citizen.alive&&<strong className="citizen-status-dead">DEAD</strong>}
  </section>
}
