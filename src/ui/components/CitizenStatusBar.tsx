import { CITIZEN_STATUS_DEFINITIONS, DESERT_STEPS_PER_HYDRATION_STAGE, activeCitizenStatuses } from '../../core/status'
import type { Citizen, CitizenStatusId } from '../../core/types'

interface StatusSlot {
  id: CitizenStatusId | 'hydrated'
  icon: string
  label: string
  active: boolean
  tone: 'safe' | 'neutral' | 'warning' | 'danger'
  title: string
}

function statusSlots(citizen: Citizen): StatusSlot[] {
  const active = new Set(activeCitizenStatuses(citizen))
  const hydration = citizen.status.hydration
  const hydrationId: CitizenStatusId | 'hydrated' = hydration === 'normal' ? 'hydrated' : hydration
  const hydrationTitle = hydration === 'normal'
    ? `Hydrated · ${citizen.status.desertStepsToday}/${DESERT_STEPS_PER_HYDRATION_STAGE} desert movements toward Thirsty.`
    : CITIZEN_STATUS_DEFINITIONS[hydration].effect
  return [
    { id: hydrationId, icon: '💧', label: hydration === 'normal' ? 'Hydrated' : CITIZEN_STATUS_DEFINITIONS[hydration].label, active: hydration !== 'normal', tone: hydration === 'dehydrated' ? 'danger' : hydration === 'thirsty' ? 'warning' : 'safe', title: hydrationTitle },
    { id: 'exhausted', icon: '⚡', label: active.has('exhausted') ? 'Exhausted' : 'Ready', active: active.has('exhausted'), tone: active.has('exhausted') ? 'warning' : 'neutral', title: active.has('exhausted') ? CITIZEN_STATUS_DEFINITIONS.exhausted.effect : 'AP remains available for ordinary actions.' },
    { id: 'satisfied_food', icon: '🍴', label: active.has('satisfied_food') ? 'Fed' : 'Food unused', active: active.has('satisfied_food'), tone: 'neutral', title: active.has('satisfied_food') ? CITIZEN_STATUS_DEFINITIONS.satisfied_food.effect : 'Food can still refresh AP today.' },
    { id: 'satisfied_water', icon: '◉', label: active.has('satisfied_water') ? 'Refreshed' : 'Water unused', active: active.has('satisfied_water'), tone: 'neutral', title: active.has('satisfied_water') ? CITIZEN_STATUS_DEFINITIONS.satisfied_water.effect : 'Water can still refresh AP today if hydration allows it.' },
  ]
}

export function CitizenStatusBar({ citizen }: { citizen: Citizen }) {
  const slots = statusSlots(citizen)
  return <section className={`citizen-status-hud ${!citizen.alive ? 'dead' : ''}`} aria-label={`${citizen.name} status`}>
    <div className="citizen-status-identity"><span>Controlled citizen</span><strong>{citizen.name}</strong></div>
    <div className="citizen-status-ap"><span>AP</span><strong>{citizen.ap}<small>/{citizen.maxAp}</small></strong></div>
    <div className="citizen-status-label">Status</div>
    <div className="citizen-status-slots">
      {slots.map((slot)=><div key={slot.id} className={`citizen-status-slot ${slot.active ? 'active' : ''} ${slot.tone}`} title={slot.title} aria-label={`${slot.label}. ${slot.title}`}>
        <span className="citizen-status-icon" aria-hidden="true">{slot.icon}</span>
        <span className="citizen-status-slot-label">{slot.label}</span>
      </div>)}
    </div>
    {!citizen.alive&&<strong className="citizen-status-dead">DEAD</strong>}
  </section>
}
