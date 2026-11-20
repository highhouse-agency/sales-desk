/* Confirmed journey facts and proposed actions. No writes or implicit authorization. */
const DeskJourney = (() => {
  const rules = typeof module !== 'undefined' && module.exports ? require('./rules.cjs') : DeskRules;
  const fields = {
    qualification:['outcome','reason','conversation'],
    handoff_offered:['handoff_id','from_owner','to_owner','context'],
    handoff_accepted:['handoff_id','accepted_by'],
    tour_requested:['tour_id','owner','next_step','task_owner','due_date'],
    tour_booked:['tour_id','owner','starts_at','preparation'],
    tour_rescheduled:['tour_id','owner','starts_at','preparation'],
    tour_preparation:['tour_id','preparation'],
    tour_cancelled:['tour_id','reason'],
    tour_no_show:['tour_id','reason','occurred_at'],
    tour_completed:['tour_id','occurred_at'],
    tour_recap:['tour_id','recap','next_step','task_owner','due_date','no_next_action','reason']
  };
  const common = ['version','kind','type','event_id','effective_date','confirmed_by'];
  const text = x => typeof x === 'string' && !!x.trim();
  const requireValue = (ok,message) => { if (!ok) throw Error(message); };
  const terminal = s => ['cancelled','no_show','completed'].includes(s);
  const instant = x => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.test(x) && rules.date(x.slice(0,10)) && Number.isFinite(Date.parse(x)) && +x.slice(11,13)<24 && +x.slice(14,16)<60 && (!x.slice(16).startsWith(':') || +x.slice(17,19)<60);

  function localDate(value,timeZone) {
    requireValue(instant(value), 'Supply an actual time with an explicit time-zone offset.');
    requireValue(text(timeZone), 'Confirm the appointment or reporting time zone before recording this outcome.');
    let parts;
    try { parts=new Intl.DateTimeFormat('en-US',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(value)); }
    catch { throw Error('Confirm a valid appointment or reporting time zone before recording this outcome.'); }
    const part=type=>parts.find(p=>p.type===type).value;
    return `${part('year')}-${part('month')}-${part('day')}`;
  }

  function outcomeTiming(v,tour,{now,timeZone,today}={}) {
    requireValue(instant(now), 'Confirm the actual or practice clock time before recording this visit outcome.');
    const currentDay=localDate(now,timeZone), startDay=localDate(tour.starts_at,timeZone);
    requireValue(!today || today===currentDay, 'The reporting date and clock disagree. Refresh the clock and confirmed time zone.');
    requireValue(v.effective_date<=currentDay, 'Choose an outcome date no later than today in the confirmed time zone.');
    requireValue(Date.parse(tour.starts_at)<=Date.parse(now), 'This visit has not started. Confirm an earlier appointment correction first, or record the outcome after the visit.');
    if(v.occurred_at) {
      requireValue(instant(v.occurred_at), 'Add visit outcome time with a time-zone offset.');
      requireValue(localDate(v.occurred_at,timeZone)===v.effective_date, 'The outcome date and actual time must agree in the confirmed time zone.');
      requireValue(Date.parse(v.occurred_at)<=Date.parse(now), 'The actual outcome time cannot be in the future.');
      requireValue(Date.parse(v.occurred_at)>=Date.parse(tour.starts_at), 'Outcome is before booking. Check the earlier appointment in chat.');
    } else {
      requireValue(v.effective_date>=startDay, 'Outcome is before booking. Check the earlier appointment in chat.');
      requireValue(v.effective_date>startDay, 'For an outcome on the appointment day, confirm the actual outcome time with its time-zone offset.');
    }
  }

  function normalize(value, {history=false}={}) {
    requireValue(value && typeof value==='object' && !Array.isArray(value), 'Supply a journey event.');
    requireValue(value.version===1 && value.kind==='journey' && Object.hasOwn(fields,value.type), 'Choose a supported journey event.');
    const allowed = [...common,...fields[value.type]];
    requireValue(Object.keys(value).every(k=>allowed.includes(k)), 'Keep this journey event to its confirmed fields; save buyer owner or stage changes separately.');
    const v=Object.fromEntries(Object.entries(value).map(([k,x])=>[k,typeof x==='string'?x.trim():x]));
    requireValue(text(v.event_id) && rules.date(v.effective_date) && text(v.confirmed_by), 'Supply a stable event reference, valid outcome date and confirmed operator.');
    for(const key of ['recap','reason','context','preparation','next_step']) if(typeof v[key]==='string') requireValue(!(/[\w.+-]+@[\w.-]+\.[a-z]{2,}\b|\bhttps?:\/\/|\bwww\.|\+\d[\d\s().-]{6,}\d|(?:^|[^\d])(?:\(\d{3}\)\s*|\d{3}[-. ])\d{3}[-. ]\d{4}(?!\d)/i.test(v[key])), 'Keep contact details in the buyer record or source; summarize feedback without addresses, links or phone numbers.');
    if (v.type.startsWith('handoff_')) requireValue(text(v.handoff_id), 'Supply the confirmed handoff reference.');
    if (v.type.startsWith('tour_')) requireValue(text(v.tour_id), 'Supply the confirmed visit reference.');
    switch(v.type) {
      case 'qualification':
        requireValue(['ready','needs information','not ready','not a fit'].includes(v.outcome) && text(v.reason), 'Choose a readiness outcome and record its reason.');
        requireValue(v.conversation==null || typeof v.conversation==='boolean', 'Confirm whether an actual buyer conversation happened.');
        v.conversation=v.conversation===true;
        break;
      case 'handoff_offered': requireValue(text(v.from_owner) && text(v.to_owner) && v.from_owner!==v.to_owner && text(v.context), 'Confirm the sender, a different recipient and handoff context.'); break;
      case 'handoff_accepted': requireValue(text(v.accepted_by), 'Confirm who accepted the handoff.'); break;
      case 'tour_requested': requireValue(text(v.owner) && text(v.next_step) && text(v.task_owner) && rules.date(v.due_date), 'Confirm the visit owner and a next step with its owner and date.'); break;
      case 'tour_booked': case 'tour_rescheduled': requireValue(text(v.owner) && instant(v.starts_at), 'Confirm the visit owner and booking time with an explicit time-zone offset.'); requireValue(v.preparation==null || typeof v.preparation==='string', 'Record preparation as confirmed checklist text, or leave it blank.'); v.preparation=v.preparation||''; break;
      case 'tour_cancelled': case 'tour_no_show': requireValue(text(v.reason), 'Record the cancellation or no-show reason.'); break;
      case 'tour_preparation': requireValue(text(v.preparation), 'Record the confirmed visit checklist or context.'); break;
      case 'tour_recap':
        requireValue(text(v.recap), 'Record the supplied visit recap.');
        requireValue(v.no_next_action==null || typeof v.no_next_action==='boolean', 'Confirm whether there is no next action.');
        if(v.no_next_action===true) requireValue(text(v.reason) && !v.next_step && !v.task_owner && !v.due_date, 'Record why no next action is needed, or supply an owned next step instead.');
        else if(!history) requireValue(text(v.next_step) && text(v.task_owner) && rules.date(v.due_date), 'Confirm the next action, its owner and a valid date, or explicitly confirm no next action with a reason.');
        break;
    }
    if(!history && v.occurred_at!=null) requireValue(instant(v.occurred_at), 'Add visit outcome time with a time-zone offset.');
    return v;
  }

  function validate(value, {owners=[],today,actor,state:current,now,timeZone}={}) {
    const v=normalize(value);
    requireValue(owners.includes(actor) && v.confirmed_by===actor, 'The confirmed operator must match your authenticated roster identity.');
    requireValue(!today || (rules.date(today) && v.effective_date<=today), 'Choose an outcome date no later than today.');
    for(const k of ['owner','from_owner','to_owner','accepted_by','task_owner']) if(text(v[k])) requireValue(owners.includes(v[k]), 'Confirm each owner and recipient from the team roster.');
    const tour=current?.tours?.find(t=>t.tour_id===v.tour_id);
    if(v.type==='handoff_accepted') {
      const offer=current?.handoff;
      requireValue(offer?.status==='offered' && offer.handoff_id===v.handoff_id && offer.to_owner===actor && v.accepted_by===actor && v.effective_date>=offer.effective_date, 'Only the recipient can accept the current matching handoff offer.');
    }
    if(v.type==='tour_requested' || v.type==='tour_booked') requireValue(!tour || !terminal(tour.status), 'This visit has ended. Use a new visit reference for another visit.');
    if(v.type==='tour_requested') requireValue(!tour || tour.status==='requested', 'This visit is already booked. Record a reschedule or cancellation instead.');
    if(v.type==='tour_rescheduled') requireValue(tour?.status==='booked', 'Confirm an existing open booking before rescheduling it.');
    if(v.type==='tour_preparation') requireValue(tour?.status==='booked', 'Confirm an existing open booking before updating preparation.');
    if(['tour_cancelled','tour_no_show','tour_completed'].includes(v.type)) requireValue(tour?.status==='booked', 'Confirm an existing open booking before recording this outcome.');
    if(['tour_no_show','tour_completed'].includes(v.type)) outcomeTiming(v,tour,{now,timeZone,today});
    if(v.type==='tour_recap') {
      requireValue(tour?.status==='completed', 'Confirm completion of this booked visit before recording its recap.');
      requireValue(!tour.recap, 'This visit already has a recap. Correct its saved interaction instead of adding it again.');
    }
    if(tour) requireValue(v.effective_date>=tour.effective_date, 'The visit update cannot precede its latest confirmed outcome.');
    return v;
  }

  function state(rows, person_id, {today,now,timeZone,tasks,calendarEnabled=false}={}) {
    const result={qualification:null,handoff:null,tours:[],booked:false,gaps:[]};
    if(!text(person_id)) return result;
    const tours=new Map(), seenEvents=new Set(), seenSources=new Set();
    const days=new Map();
    for(const row of rules.effective(rows.map((r,index)=>({...r,_row:r._row??index}))).filter(r=>r.person_id===person_id)) {
      let v;try { v=normalize(JSON.parse(row.workflow_json||'null'),{history:true}); } catch { continue; }
      if(!days.has(v.effective_date))days.set(v.effective_date,[]);
      days.get(v.effective_date).push({row,v});
    }
    const ordered=[...days.keys()].sort().flatMap(day=>{
      // A date-only fact is not midnight. Keep its original logged position,
      // including through corrections, and order precise facts by actual instant
      // within their slots. This avoids a non-transitive mixed-precision comparator.
      const entries=days.get(day).sort((a,b)=>(instant(a.row.logged_at)&&instant(b.row.logged_at)?Date.parse(a.row.logged_at)-Date.parse(b.row.logged_at):0) || a.row._row-b.row._row);
      const precise=entries.filter(e=>instant(e.row.timestamp)).sort((a,b)=>Date.parse(a.row.timestamp)-Date.parse(b.row.timestamp));
      let index=0;
      return entries.map(e=>instant(e.row.timestamp)?precise[index++]:e);
    });
    for(const {row,v} of ordered) {
      if(today && v.effective_date>today) continue;
      if(seenEvents.has(v.event_id) || (row.source_key && seenSources.has(row.source_key))) continue;
      seenEvents.add(v.event_id); if(row.source_key) seenSources.add(row.source_key);
      const t=tours.get(v.tour_id);
      if(v.type==='qualification') result.qualification={...v};
      else if(v.type==='handoff_offered') result.handoff={...v,status:'offered'};
      else if(v.type==='handoff_accepted') {
        const offer=result.handoff;
        if(offer?.status==='offered' && offer.handoff_id===v.handoff_id && offer.to_owner===v.accepted_by && v.confirmed_by===v.accepted_by && v.effective_date>=offer.effective_date) result.handoff={...offer,status:'accepted',accepted_by:v.accepted_by,accepted_event_id:v.event_id,accepted_at:v.effective_date,accepted_effective_date:v.effective_date};
      } else if(v.type.startsWith('tour_')) {
        if(t && v.effective_date<t.effective_date) continue;
        if(v.type==='tour_requested') {
          if(!t || t.status==='requested') tours.set(v.tour_id,{...v,status:'requested',recap:null,next_action:{task:v.next_step,owner:v.task_owner,due_date:v.due_date}});
        } else if(v.type==='tour_booked' || v.type==='tour_rescheduled') {
          if((!t || !terminal(t.status)) && (v.type!=='tour_rescheduled' || t?.status==='booked')) tours.set(v.tour_id,{...t,...v,status:'booked',recap:null,next_action:null});
        } else if(['tour_cancelled','tour_no_show','tour_completed'].includes(v.type)) {
          if(t?.status==='booked') {
            const outcome={...t,...v,status:v.type.slice(5),next_action:null};
            if(['tour_completed','tour_no_show'].includes(v.type)) {
              // Keep the original recorded outcome visible. Flag unverifiable
              // timing instead of rewriting historical facts or inventing times.
              try { outcomeTiming(v,t,{now,timeZone,today}); }
              catch(error) { outcome.timing_issue=error.message; }
            }
            tours.set(v.tour_id,outcome);
          }
        } else if(v.type==='tour_preparation' && t?.status==='booked') {
          tours.set(v.tour_id,{...t,preparation:v.preparation,preparation_event_id:v.event_id});
        } else if(v.type==='tour_recap' && t?.status==='completed' && !t.recap) {
          tours.set(v.tour_id,{...t,recap:{...v},next_action:v.no_next_action===true?null:{task:v.next_step,owner:v.task_owner,due_date:v.due_date}});
        }
      }
    }
    result.tours=[...tours.values()];
    const legacy=rows.filter(row=>{try{return JSON.parse(row.workflow_json||'null')?.kind!=='journey';}catch{return true;}});
    result.booked=result.tours.some(t=>t.status==='booked') || rules.booked(legacy,person_id,{today});
    if(!result.qualification) result.gaps.push({type:'qualification',label:'Readiness missing.',owner:'',key:`journey:qualification:${person_id}`});
    const offer=result.handoff;
    if(offer?.status==='offered') result.gaps.push({type:'handoff',label:'Handoff not accepted yet.',owner:offer.from_owner,key:`journey:handoff:${offer.handoff_id}`});
    for(const t of result.tours) {
      // Only a fresh Tasks read can establish a missing host. History-only
      // callers retain their existing result when Tasks have not been supplied.
      if(t.status==='booked' && Array.isArray(tasks)) {
        const gap={type:'tour_host',owner:t.owner,tour_id:t.tour_id,key:`journey:host:${t.tour_id}`};
        try {
          const host=linkedHostTask(rows,tasks,person_id,t.tour_id);
          if(!host) result.gaps.push({...gap,label:'Booked visit needs a host task. Check chat.'});
          else if(host.status!=='open') result.gaps.push({...gap,label:'Host task closed. Check chat.'});
          else if(calendarEnabled===true && !text(host.calendar_event_id)) result.gaps.push({type:'tour_calendar',label:'Task saved. Calendar unconfirmed. Check chat.',owner:host.owner,tour_id:t.tour_id,key:`journey:calendar:${t.tour_id}`});
        } catch(error) {
          result.gaps.push({...gap,label:error.message});
        }
      }
      if(t.timing_issue) result.gaps.push({type:'tour_timing',label:'Check visit outcome time: '+t.timing_issue,owner:t.owner,tour_id:t.tour_id,key:`journey:timing:${t.tour_id}`});
      if(t.status!=='completed') continue;
      if(!t.recap) result.gaps.push({type:'tour_recap',label:'Add recap and follow-up.',owner:t.owner,tour_id:t.tour_id,key:`journey:recap:${t.tour_id}`});
      else if(t.recap.no_next_action!==true && (!text(t.next_action?.task) || !text(t.next_action?.owner) || !rules.date(t.next_action?.due_date))) result.gaps.push({type:'tour_next_action',label:'Add a next step with an owner.',owner:t.owner,tour_id:t.tour_id,key:`journey:next:${t.tour_id}`,...(rules.date(t.next_action?.due_date)?{due_date:t.next_action.due_date}:{})});
    }
    return result;
  }

  function suggestions(current, {today,owner}={}) {
    const actions=[];
    const handoff=current.handoff;
    if(handoff?.status==='accepted' && (!owner || owner===handoff.to_owner)) actions.push({key:`journey:response:${handoff.accepted_event_id}`,task:'Respond to the buyer and confirm the next action.',owner:handoff.to_owner,due_date:rules.businessDate(handoff.accepted_effective_date,1)});
    for(const gap of current.gaps||[]) {
      // A broken visit receipt needs reconciliation, not a substitute task.
      if(['tour_host','tour_calendar'].includes(gap.type)) continue;
      if(owner && gap.owner!==owner) continue;
      // A missing date stays missing. Today does not authorize a new deadline.
      actions.push({key:gap.key,task:gap.label,owner:gap.owner||'',due_date:gap.due_date||''});
    }
    for(const t of current.tours||[]) {
      const a=t.next_action;
      if(!a || !text(a.task) || !text(a.owner) || !rules.date(a.due_date) || (owner && a.owner!==owner)) continue;
      actions.push({key:`journey:action:${t.tour_id}:${t.recap?.event_id||t.event_id}`,task:a.task,owner:a.owner,due_date:a.due_date});
    }
    return actions;
  }
  function hostTaskKey(personId,tourId) {
    requireValue(text(personId) && text(tourId), 'Confirm buyer and visit before linking the host task.');
    return `journey-host:${personId}:${tourId}`;
  }

  function linkedHostTask(interactions,tasks,personId,tourId) {
    const key=hostTaskKey(personId,tourId);
    const fail=(message,code='HOST_TASK_AMBIGUOUS',extra={})=>{throw Object.assign(Error(message),{code,...extra});};
    const receipts=rules.effective(interactions).filter(r=>r.source_key===key);
    if(!receipts.length) {
      if(interactions.some(r=>r.source_key===key)) fail('Host task records changed. Check chat.');
      return null;
    }
    if(receipts.length!==1 || receipts[0].event!=='task_opened' || receipts[0].person_id!==personId) fail('Host task records conflict. Check chat.');
    const receipt=receipts[0],aliases=new Map(),counts=new Map();
    for(const r of interactions) counts.set(r.interaction_id,(counts.get(r.interaction_id)||0)+1);
    for(const r of interactions.filter(r=>r.record_type!=='correction')) aliases.set(r.interaction_id,{root:r.interaction_id,ids:new Set([r.interaction_id])});
    const corrections=interactions.filter(r=>r.record_type==='correction').sort((a,b)=>(a.logged_at||a.timestamp||'').localeCompare(b.logged_at||b.timestamp||'') || (a._row||0)-(b._row||0));
    for(const c of corrections) {
      const group=aliases.get(c.corrects_interaction_id); if(!group) continue;
      group.ids.add(c.interaction_id);aliases.set(c.interaction_id,group);
    }
    const group=aliases.get(receipt.interaction_id);
    if(!group || [...group.ids].some(id=>!text(id) || counts.get(id)!==1)) fail('Host task history conflicts. Check chat.');
    const linked=tasks.filter(t=>group.ids.has(t.opened_interaction_id));
    if(!linked.length) fail('Host task saved. Task missing. Restore in chat; do not reopen.','HOST_TASK_MISSING',{receipt,opened_interaction_id:group.root});
    if(linked.length!==1 || linked[0].person_id!==personId || !text(linked[0].task_id) || tasks.filter(t=>t.task_id===linked[0].task_id).length!==1) fail('Host task link unclear. Check chat before updating.');
    return linked[0];
  }
  return {validate,state,suggestions,hostTaskKey,linkedHostTask};
})();
if(typeof module!=='undefined') module.exports=DeskJourney;
