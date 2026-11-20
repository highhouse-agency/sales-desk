/* Shared deterministic rules. No network, credentials or implicit authorization. */
const DeskRules = (() => {
  const stages = ['lead','contact and discovery','presentation','tour','unit selection','reservation','under contract','closed','on hold','long-term nurture','lost'];
  const tracks = ['unbooked','booked','second-home','investment','long-term','agent-network','general'];
  const transactionStages = ['reservation','under contract','closed'];
  const date = x => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x) && !Number.isNaN(Date.parse(x)) && new Date(x+'T12:00:00Z').toISOString().slice(0,10) === x;
  const requireValue = (ok, message) => { if (!ok) throw new Error(message); };
  function businessDate(d, n=2) {
    requireValue(date(d), 'A valid due date is required.');
    let t = new Date(d+'T12:00:00Z');
    while (n>0) { t.setUTCDate(t.getUTCDate()+1); if (![0,6].includes(t.getUTCDay())) n--; }
    return t.toISOString().slice(0,10);
  }
  function buyer(v, {owners=[], today, previousStage='', transactionVerified=false, confirmedDueDate=''}={}) {
    requireValue(stages.includes(v.stage), 'Choose a current stage.');
    requireValue(owners.includes(v.owner), 'Confirm the buyer owner.');
    requireValue(date(v.effective_date) && (!today || v.effective_date <= today), 'Choose an outcome or start date no later than today.');
    requireValue(!transactionStages.includes(v.stage) || v.stage === previousStage || transactionVerified, 'This stage needs a verified transaction from the unit status reporter. Use the desk chat to confirm its evidence.');
    if (['on hold','long-term nurture','lost'].includes(v.stage)) requireValue(v.reason?.trim(), 'Add a reason, or explicitly say Reason not provided for a lost buyer.');
    if (['on hold','long-term nurture'].includes(v.stage)) {
      requireValue(date(v.review_date) && v.review_date >= v.effective_date && (!today || v.review_date >= today), 'Choose a review date on or after the start date and today.');
      requireValue(v.resume_condition?.trim(), 'Say what would move this buyer forward.');
    }
    requireValue(v.no_next_action==null || typeof v.no_next_action==='boolean', 'Confirm whether there is no next action.');
    if (v.no_next_action===true) requireValue(v.reason?.trim() && !v.next_step && !v.task_owner && !v.due_date, 'Record why no next action is needed, or supply an owned next step instead.');
    if (v.no_next_action!==true && (!['lost','closed'].includes(v.stage) || v.next_step || v.task_owner || v.due_date)) {
      requireValue(v.next_step?.trim() && owners.includes(v.task_owner), 'Confirm a next step and its owner.');
      requireValue(date(v.due_date), 'Choose a valid next-step date.');
      requireValue(!today || v.due_date >= today || (date(confirmedDueDate) && v.due_date===confirmedDueDate), 'Choose today or a later next-step date.');
      if (['on hold','long-term nurture'].includes(v.stage)) requireValue(v.due_date <= v.review_date, 'The next step must be due by the review date.');
    }
    return {...v};
  }
  // Pure chat helpers. The caller authenticates the operator, confirms Save and
  // persists/read-backs the returned row. Overrides never establish unit facts.
  // Pass the verified Settings.operators roster explicitly for each desk.
  // Omitted options retain the OCN compatibility default.
  const operatorNames = (operators=['Freddie','Alix']) => (Array.isArray(operators)?operators:typeof operators==='string'?operators.split(';'):[]).filter(v=>typeof v==='string').map(v=>v.trim()).filter(Boolean);
  function overrideAttribution(reason, {operators}={}) {
    if (typeof reason !== 'string') return null;
    const match=reason.match(/^Set by ([^:\n]+): (\S[\s\S]*)$/);
    if (!match || !operatorNames(operators).includes(match[1]) || !/[\p{L}\p{N}]/u.test(match[2])) return null;
    return {operator:match[1],reason:match[2].trim()};
  }
  function likelihoodOverride(record={}, {operators}={}) {
    const value=record.likelihood_override;
    if (value==null || typeof value==='string' && !value.trim()) return null;
    if (!['number','string'].includes(typeof value) || typeof value==='string' && !/^\d+(?:\.\d+)?$/.test(value.trim())) return null;
    const percent=Number(value),attribution=overrideAttribution(record.override_reason,{operators});
    return Number.isFinite(percent) && percent>=0 && percent<=100 && attribution ? {percent,...attribution} : null;
  }
  function setOverride(record={}, {metric,value,operator,reason,operators}={}) {
    requireValue(['stage','likelihood'].includes(metric), 'Choose stage or likelihood.');
    const name=typeof operator==='string'?operator.trim().toLowerCase():'';
    const canonical=operatorNames(operators).find(value=>value.toLowerCase()===name);
    requireValue(canonical, 'Only a confirmed desk operator can set an override.');
    const field=metric+'_override',reasonField=metric==='stage'?'stage_override_reason':'override_reason',next={...record};
    if (value==null || typeof value==='string' && !value.trim()) {
      next[field]='';
      next[reasonField]='';
      return next;
    }
    requireValue(typeof reason==='string' && /[\p{L}\p{N}]/u.test(reason.trim()), 'Give a reason for the override.');
    next[reasonField]='Set by '+canonical+': '+reason.trim();
    if (metric==='stage') {
      requireValue(stages.includes(value), 'Choose a current stage.');
      next[field]=value;
    } else {
      next[field]=value;
      requireValue(likelihoodOverride(next,{operators}), 'Choose a likelihood from 0 to 100.');
      next[field]=Number(value);
    }
    return next;
  }
  function advanceOverrides(record={}, {loggedEvent=false,event,before={},after={}}={}) {
    const next={...record};
    // before/after must come from confirmed facts without the override. A late
    // event or ordinary note that leaves that computed metric unchanged keeps it.
    if (!loggedEvent || !event?.interaction_id || !record.person_id || event.person_id!==record.person_id) return next;
    if (stages.includes(before.stage) && stages.includes(after.stage) && before.stage!==after.stage) {next.stage_override='';next.stage_override_reason='';}
    if ([before.likelihood,after.likelihood].every(v=>typeof v==='number' && Number.isFinite(v) && v>=0 && v<=100) && before.likelihood!==after.likelihood) {next.likelihood_override='';next.override_reason='';}
    return next;
  }
  function interactionColumnIssues(row={}, {operators=[]}={}) {
    const issues=[],text=value=>typeof value==='string'?value.trim():'';
    if (text(row.source_link) && !(row.record_type==='correction' && text(row.source_link)==='clear')) {
      try { const url=new URL(row.source_link); if (!['http:','https:'].includes(url.protocol) || !url.hostname) issues.push('source_link'); }
      catch { issues.push('source_link'); }
    }
    if (operators.length && text(row.logged_by) && !operators.includes(text(row.logged_by))) issues.push('logged_by');
    const readableStages=[...stages,'inquiry','qualified','reservation deposit','promesa signed'];
    if (text(row.stage) && !(row.record_type==='correction' && text(row.stage)==='clear') && !readableStages.includes(text(row.stage).toLowerCase())) issues.push('stage');
    // Unknown source keys/events are permitted. An exact stage name here is a
    // clear column-placement error, not a reason to guess its intended field.
    for (const key of ['source_key','event']) {
      const value=text(row[key]).toLowerCase();
      if (stages.includes(value) && !(key==='event' && ['closed','lost'].includes(value))) issues.push(key);
    }
    return issues;
  }
  const unitStatus = unit => String(unit?.status||'').trim().toLowerCase();
  const unitSoldToBuyer = unit => unitStatus(unit)==='sold' && typeof unit.holder_person_id==='string' && !!unit.holder_person_id.trim();
  function unitAreas(unit={}) {
    const positive=value=>{const n=typeof value==='number'?value:typeof value==='string'&&/^\d+(?:\.\d+)?$/.test(value.trim().replace(/,/g,''))?Number(value.trim().replace(/,/g,'')):NaN;return Number.isFinite(n)&&n>0?n:null;};
    let m2=positive(unit.size_m2),ft2=positive(unit.size_ft2??unit.square_footage);
    const legacy=positive(unit.size??unit.Size),label=String(unit.size_unit??unit['Size unit']??'').trim().toLowerCase();
    if(m2==null&&ft2==null&&legacy!=null){
      if(['m2','m²','sqm','sq m','square meters','square metres'].includes(label))m2=legacy;
      if(['ft2','ft²','sqft','sq ft','square feet'].includes(label))ft2=legacy;
    }
    // Preserve supplied measurements and derive only a missing counterpart.
    if(m2!=null&&ft2==null)ft2=Math.round(m2*10.7639);
    else if(m2==null&&ft2!=null){m2=Math.round(ft2/10.7639);}
    return {size_m2:m2,size_ft2:ft2};
  }
  function inventoryReviewProposals(units=[],reviews=[],{reporter='Jorge'}={}) {
    const seen=new Set(),out=[];
    for(const unit of units){
      const id=String(unit.unit_id||'').trim(),question=`Was ${id} sold to a buyer or held by an investor?`;
      if(!id||seen.has(id)||unitStatus(unit)!=='sold'||unitSoldToBuyer(unit))continue;
      seen.add(id);
      if(reviews.some(r=>String(r.status||'').trim().toLowerCase()==='open' && (r.reason==='status confirmation' && (r.unit_id===id || String(r.candidate_ids||'').split(/[;,]/).map(v=>v.trim()).includes(id)))))continue;
      out.push({unit_id:id,reason:'status confirmation',question,owner:reporter,status:'open'});
    }
    return out;
  }
  function safeLink(value) {
    value=String(value||'').trim();
    if(!value||/[;|]/.test(value))return '';
    try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)&&u.hostname?value:'';}catch{return '';}
  }
  function dashboardLink(settings={}) { return safeLink(settings.dashboard_link); }
  function villa(v, {unit, reporter, owners=[], now}={}) {
    requireValue(['requested','accepted','release'].includes(v.status), 'Choose request, acceptance or release.');
    requireValue(v.person_id && v.unit_id && v.reason?.trim(), 'Name the buyer, villa and reason.');
    if (v.status === 'requested') return {...v};
    requireValue(reporter && v.accepted_by === reporter && v.evidence?.trim(), 'The unit status reporter must confirm the evidence.');
    requireValue(unit && unit.unit_id === v.unit_id, 'Read the current villa before changing it.');
    if (v.status === 'release') {
      requireValue(unit.status === 'held' && unit.holder_person_id === v.person_id, 'Only this buyer’s accepted hold can be released.');
      return {...v};
    }
    requireValue(unit.status === 'available' || (unit.status === 'held' && unit.holder_person_id === v.person_id), 'This villa is already committed. Resolve availability first.');
    const instant = x => typeof x === 'string' && /T\d\d:\d\d.*(?:Z|[+-]\d\d:\d\d)$/.test(x) && Number.isFinite(Date.parse(x));
    requireValue(instant(v.starts_at) && instant(v.expires_at) && Date.parse(v.expires_at)>Date.parse(v.starts_at), 'Supply a start and later expiry, both with a time-zone offset.');
    requireValue(!now || Date.parse(v.expires_at)>Date.parse(now), 'The hold expiry must still be in the future.');
    requireValue(v.terms?.trim() && v.next_step?.trim() && owners.includes(v.task_owner) && date(v.due_date) && v.due_date <= v.expires_at.slice(0,10), 'Add terms and a confirmed next step due by expiry.');
    return {...v};
  }
  function effective(rows) {
    const order=(a,b)=>(a.timestamp||'').localeCompare(b.timestamp||'') || (a.logged_at||'').localeCompare(b.logged_at||'') || (a._row||0)-(b._row||0);
    const originals=rows.filter(r=>r.record_type!=='correction');
    const aliases=new Map(originals.map(r=>[r.interaction_id,{...r}]));
    for(const c of rows.filter(r=>r.record_type==='correction').sort((a,b)=>(a.logged_at||a.timestamp||'').localeCompare(b.logged_at||b.timestamp||'') || (a._row||0)-(b._row||0))) {
      const prior=aliases.get(c.corrects_interaction_id); if(!prior) continue;
      const merged={...prior,interaction_id:c.interaction_id};
      // Logging a correction does not change when the original fact occurred.
      // Its own logged_at and row stay on the raw audit row; preserve original
      // tie ordering when dashboard outcomes share a date-only timestamp.
      for(const [key,value] of Object.entries(c)) if(!['record_type','corrects_interaction_id','interaction_id','logged_at','_row'].includes(key) && value!=='' && value!=null) merged[key]=value==='clear'?'':value;
      for(const [key,value] of aliases) if(value===prior) aliases.set(key,merged);
      aliases.set(c.interaction_id,merged);
    }
    return [...new Set(originals.map(r=>aliases.get(r.interaction_id)))].sort(order);
  }

  function workflows(rows, kind, person) {
    return effective(rows).filter(r=>!person || r.person_id===person).flatMap(r=> {
      try { const v=JSON.parse(r.workflow_json||'null'); return v?.version===1 && v.kind===kind ? [{...v, interaction_id:r.interaction_id, person_id:r.person_id, at:r.timestamp, source_key:r.source_key}] : []; } catch { return []; }
    });
  }
  function booked(rows, person, {today}={}) {
    const bookings=new Map(), events=new Set(), sources=new Set();
    const text=x=>typeof x==='string' && !!x.trim();
    for(const r of effective(rows).filter(r=>r.person_id===person)) {
      if(today && r.timestamp?.slice(0,10)>today) continue;
      let v=null;
      try { v=JSON.parse(r.workflow_json||'null'); } catch { continue; }
      let key,status,eventId,at;
      if(v?.version===1 && v.kind==='journey') {
        if(!text(v.event_id) || !text(v.tour_id) || !text(v.confirmed_by) || !date(v.effective_date) || (today && v.effective_date>today)) continue;
        const allowed=['version','kind','type','event_id','effective_date','confirmed_by','tour_id',...(['tour_booked','tour_rescheduled'].includes(v.type)?['owner','starts_at','preparation']:['tour_cancelled','tour_no_show'].includes(v.type)?['reason']:[]),...(['tour_completed','tour_no_show'].includes(v.type)?['occurred_at']:[])];
        if(Object.keys(v).some(k=>!allowed.includes(k))) continue;
        if(['preparation','reason'].some(k=>typeof v[k]==='string' && /[\w.+-]+@[\w.-]+\.[a-z]{2,}\b|\bhttps?:\/\/|\bwww\.|\+\d[\d\s().-]{6,}\d|(?:^|[^\d])(?:\(\d{3}\)\s*|\d{3}[-. ])\d{3}[-. ]\d{4}(?!\d)/i.test(v[k]))) continue;
        if(['tour_booked','tour_rescheduled'].includes(v.type)) {
          if(!text(v.owner) || (v.preparation!=null && typeof v.preparation!=='string') || typeof v.starts_at!=='string' || !date(v.starts_at.slice(0,10)) || !/^\d{4}-\d{2}-\d{2}T\d\d:\d\d(?::\d\d(?:\.\d+)?)?(?:Z|[+-]\d\d:\d\d)$/.test(v.starts_at) || !Number.isFinite(Date.parse(v.starts_at)) || +v.starts_at.slice(11,13)>23 || +v.starts_at.slice(14,16)>59 || (v.starts_at.slice(16).startsWith(':') && +v.starts_at.slice(17,19)>59)) continue;
          status='booked';
        } else if(['tour_cancelled','tour_completed','tour_no_show'].includes(v.type)) {
          if(v.type!=='tour_completed' && !text(v.reason)) continue;
          if(v.occurred_at!=null && (typeof v.occurred_at!=='string' || !date(v.occurred_at.slice(0,10)) || !/^\d{4}-\d{2}-\d{2}T\d\d:\d\d(?::\d\d(?:\.\d+)?)?(?:Z|[+-]\d\d:\d\d)$/.test(v.occurred_at) || !Number.isFinite(Date.parse(v.occurred_at)) || +v.occurred_at.slice(11,13)>23 || +v.occurred_at.slice(14,16)>59 || (v.occurred_at.slice(16).startsWith(':') && +v.occurred_at.slice(17,19)>59))) continue;
          status='ended';
        } else continue;
        key=`journey:${v.tour_id}`; eventId=v.event_id; at=v.effective_date;
        if(v.type==='tour_rescheduled' && bookings.get(key)?.status!=='booked') continue;
        if(status==='ended' && bookings.get(key)?.status!=='booked') continue;
        // A terminal visit cannot be reopened by an old booking or reschedule.
        if(bookings.get(key)?.status==='ended') continue;
      } else if(v?.version===1 && v.kind==='booking') {
        if(!['booked','cancelled','completed'].includes(v.status)) continue;
        key=`booking:${v.booking_id || v.provider_event_id || 'legacy'}`;
        status=v.status==='booked'?'booked':'ended';
      } else if(!v && ['tour_booked','tour_cancelled','tour_completed'].includes(r.event)) {
        key=`tour:${r.tour_id || r.booking_id || 'legacy'}`;
        status=r.event==='tour_booked'?'booked':'ended';
      } else continue;
      if((eventId && events.has(eventId)) || (r.source_key && sources.has(r.source_key))) continue;
      if(at && bookings.get(key)?.at>at) continue;
      if(eventId) events.add(eventId); if(r.source_key) sources.add(r.source_key);
      bookings.set(key,{status,at});
    }
    return [...bookings.values()].some(b=>b.status==='booked');
  }
  function alert(task, day, events=[]) {
    if (!date(day) || !task || task.status!=='open' || !date(task.due_date) || day<businessDate(task.due_date)) return null;
    if ([0,6].includes(new Date(day+'T12:00:00Z').getUTCDay())) return null;
    const key = `followup:${task.task_id}:${task.due_date}`;
    const attempts = events.filter(e=>e.key===key);
    // A prepared/uncertain attempt is reconciled against the sender, never blindly retried.
    if (attempts.some(e=>e.status==='sent') || ['prepared','unknown','suppressed'].includes(attempts.at(-1)?.status)) return null;
    return {key, eligible_on:businessDate(task.due_date), task_id:task.task_id, due_date:task.due_date, owner:task.owner};
  }
  function enrollment(v, {permission, booked, approved, owner, optedOut=false, targetType='buyer'}={}) {
    requireValue(permission==='yes' && !optedOut, 'Marketing permission is required; an opt-out blocks enrollment.');
    requireValue(owner, 'Confirm the buyer owner first.');
    requireValue(tracks.includes(v.track), 'Choose an approved track.');
    requireValue(v.track!=='agent-network' || targetType==='partner', 'Agent campaigns need a confirmed partner and partner marketing permission.');
    requireValue(approved?.status==='approved' && approved.track===v.track && approved.version===v.content_version && approved.provider_sequence && approved.approved_by && approved.approved_at, 'This content version and cadence need approval and a connected provider sequence.');
    requireValue(!(booked && v.track==='unbooked') && (booked || v.track!=='booked'), 'Use the booked preparation path only after a confirmed booking; do not send another invitation.');
    requireValue(v.confirmed_by, 'An operator must confirm enrollment.');
    return {...v, status:'pending', provider_sequence:approved.provider_sequence};
  }
  function nurture(state={}, event) {
    requireValue(event?.id && event.type, 'Provider events need a stable event ID and type.');
    if ((state.processed||[]).includes(event.id)) return state;
    const s={...state, processed:[...(state.processed||[]), event.id]};
    const stop = ['reply','booking','takeover','opt_out','stage_change','bounce'].includes(event.type);
    if (stop) {
      s.status=event.type==='opt_out' ? 'opted out' : event.type==='bounce' ? 'needs attention' : 'paused';
      s.reason=event.type; s.cancel_required=true;
      if (event.type==='opt_out') s.opted_out=true;
      if (['reply','booking','takeover'].includes(event.type) && !s.handoff_key) s.handoff_key=`handoff:${s.enrollment_id}`;
    } else if (event.type==='cancel_confirmed') { s.cancel_required=false; }
    else if (event.type==='enrolled' && !s.cancel_required && !s.opted_out && (!s.status || s.status==='pending')) s.status='active';
    else if (event.type==='delivery_failed' && !s.opted_out) {s.status='needs attention';s.reason='delivery_failed';}
    else if (event.type==='delivered') s.last_delivery=event.at;
    if (s.opted_out) s.status='opted out';
    return s;
  }
  return {stages, tracks, date, businessDate, buyer, overrideAttribution, likelihoodOverride, setOverride, advanceOverrides, interactionColumnIssues, unitStatus, unitSoldToBuyer, unitAreas, inventoryReviewProposals, safeLink, dashboardLink, villa, effective, workflows, booked, alert, enrollment, nurture};
})();
if (typeof module !== 'undefined') module.exports = DeskRules;
