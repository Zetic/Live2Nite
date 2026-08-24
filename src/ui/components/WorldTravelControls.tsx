import type { Direction, GameCommand } from '../../core/types'

const DIRECTIONS:readonly {direction:Direction;arrow:string;label:string;className:string}[]=[
  {direction:'NORTH',arrow:'↑',label:'North',className:'north'},
  {direction:'WEST',arrow:'←',label:'West',className:'west'},
  {direction:'EAST',arrow:'→',label:'East',className:'east'},
  {direction:'SOUTH',arrow:'↓',label:'South',className:'south'},
]

export function WorldTravelControls({legalActions,move}:{legalActions:GameCommand[];move:(direction:Direction)=>void}){
  const canMove=(direction:Direction)=>legalActions.some((action)=>action.type==='MOVE'&&action.direction===direction)
  return <section className="map-travel-controls" aria-label="World travel controls">
    <div className="map-travel-heading"><div><p className="section-kicker">Navigation</p><h3>Travel</h3></div><span>1 AP / move</span></div>
    <div className="direction-pad">
      {DIRECTIONS.map(({direction,arrow,label,className})=><button type="button" key={direction} className={`direction-button ${className}`} disabled={!canMove(direction)} onClick={()=>move(direction)} aria-label={`Travel ${label.toLowerCase()}`} title={`Travel ${label.toLowerCase()} · 1 AP`}><strong>{arrow}</strong><small>{label}</small></button>)}
      <div className="direction-pad-center" aria-hidden="true"><strong>1 AP</strong><small>per tile</small></div>
    </div>
  </section>
}

export function WorldTownReturn({action,act}:{action:GameCommand|undefined;act:(command:GameCommand|undefined)=>void}){
  if(!action||action.type!=='ENTER_TOWN')return null
  return <section className="world-town-return" aria-label="Return to town">
    <div><p className="section-kicker">Town entrance</p><strong>The gate is within reach.</strong><span>Returning to town is a location transition, separate from directional travel.</span></div>
    <button type="button" className="primary" onClick={()=>act(action)}>Return to town <small>0 AP</small></button>
  </section>
}
