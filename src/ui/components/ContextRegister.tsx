import { useEffect, useMemo, useState } from 'react'
import type { GameEvent, GameState } from '../../core/types'
import { describeEvent } from '../eventText'
import '../register.css'

export function ContextRegister({game,title,matches}:{game:GameState;title:string;matches:(event:GameEvent)=>boolean}){
  const [day,setDay]=useState(game.day)
  useEffect(()=>{if(day>game.day)setDay(game.day)},[day,game.day])
  const relevant=useMemo(()=>game.events.filter(matches),[game.events,matches])
  const days=useMemo(()=>Array.from({length:game.day},(_,index)=>game.day-index),[game.day])
  const events=useMemo(()=>relevant.filter((event)=>event.day===day).slice().reverse(),[relevant,day])
  return <section className="context-register">
    <div className="context-register-heading"><div><p className="section-kicker">Area register</p><h3>{title}</h3></div><span className="micro-stat">{events.length} event{events.length===1?'':'s'}</span></div>
    <div className="context-register-scroll" role="log" aria-label={`${title} Day ${day}`}>
      {events.length===0?<p className="context-register-empty">No activity was recorded here on Day {day}.</p>:events.map((event,index)=><div className="context-register-entry" key={`${event.type}-${event.day}-${event.hour??'x'}-${relevant.length-index}`}><time>{event.hour===undefined?'--:--':`${String(event.hour).padStart(2,'0')}:00`}</time><p>{describeEvent(event,game)}</p></div>)}
    </div>
    <div className="context-register-days" role="tablist" aria-label={`${title} day`}>
      {days.map((candidate)=><button type="button" role="tab" aria-selected={day===candidate} className={day===candidate?'active':''} onClick={()=>setDay(candidate)} key={candidate}>Day {candidate}{candidate===game.day?' · Today':''}</button>)}
    </div>
  </section>
}
