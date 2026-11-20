/* Read-only estimates from confirmed sheet facts. No persistence. Overrides require an authorized attribution. */
const DeskLikelihood = (() => {
  const LIKELIHOOD_RULES = {
    bases:{lead:5,'contact and discovery':15,presentation:25,tour:40,'unit selection':55,reservation:75,'under contract':90,closed:100,lost:0,'on hold':5,'long-term nurture':3},
    caps:{reservation:89,'on hold':15,'long-term nurture':10}, min:1,max:99,unknownBase:5,
    weights:{deposit:20,held:18,tour:12,budget:6,timing:6,pricing:7,contract:10,second:9,reply:5,silence:-12,cancel:-10,pause:-15},
    recentDays:7,silentDays:14,reasonCount:2
  };
  const rules=typeof module!=='undefined'&&module.exports?require('./rules.cjs'):DeskRules;
  const journey=typeof module!=='undefined'&&module.exports?require('./journey.cjs'):DeskJourney;
  const labels={deposit:'Deposit paid',held:'Villa held',tour:'Tour completed',budget:'Budget confirmed',timing:'Timing confirmed',pricing:'Pricing requested',contract:'Contract requested',second:'Return visit requested',reply:'Recent reply',silence:'No reply',cancel:'Visit setback',pause:'Buying paused'};
  // A phrase is evidence only in a factual clause. Never scan raw source text,
  // next steps, task requests or manual notes. Conservative exclusions avoid
  // credit for plans, questions, negation and hypothetical language.
  const factual=text=>String(text||'').replace(/\b(?:will|may)\b/g,'might').toLowerCase().split(/[.!?;\n]+/).filter(s=>!(/\b(?:not|no|never|without|hasn['’]t|haven['’]t|didn['’]t|doesn['’]t|don['’]t|isn['’]t|wasn['’]t|if|would|could|might|maybe|plan(?:s|ned)?|hope(?:s)?|should)\b/.test(s)));
  const says=(text,re)=>factual(text).some(s=>re.test(s));
  const paused=text=>{
    const clean=String(text||'').replace(/\b(?:will|may)\b/g,'might').toLowerCase();
    return clean.split(/[.!?;\n]+/).some(s=>{
      if(/\b(?:if|would|could|might|maybe|never)\b/.test(s))return false;
      if(/\b(?:campaigns?|marketing|emails?|calls?|ads|outreach|automation|messages?|follow[ -]?ups?)\b/.test(s)&&!/\b(?:buying|purchase|purchasing)\b/.test(s))return false;
      if(/\b(?:not buying|won['’]t buy) (?:until|before) next year\b/.test(s)||/\bnot until next year\b/.test(s))return true;
      return !/\b(?:not|no|isn['’]t|aren['’]t|don['’]t)\b/.test(s)&&/\b(?:pausing|on pause|waiting until next year|buying next year|just looking)\b/.test(s);
    });
  };
  const instant=value=>{
    if(typeof value!=='string'||!rules.date(value.slice(0,10)))return NaN;
    if(value.length===10)return Date.parse(value+'T00:00:00Z');
    if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)||+value.slice(11,13)>23||+value.slice(14,16)>59||(/^:/.test(value.slice(16))&&+value.slice(17,19)>59))return NaN;
    return Date.parse(value);
  };
  function prepare(interactions,{now,today}={}) {
    const clock=instant(now),day=rules.date(today)?today:Number.isFinite(clock)?new Date(clock).toISOString().slice(0,10):'';
    const valid=value=>{const n=instant(value);return Number.isFinite(n)&&!!day&&(value.length===10?value<=day:Number.isFinite(clock)&&n<=clock);};
    const safe=(Array.isArray(interactions)?interactions:[]).filter(r=>r&&typeof r==='object'&&(!r.logged_at||valid(r.logged_at))&&(r.record_type==='correction'&&!r.timestamp?valid(r.logged_at):valid(r.timestamp)));
    return rules.effective(safe).filter(r=>valid(r.timestamp));
  }
  function compute(input={}) {
    let {person={},stage='',interactions=[],units=[],now,today,timeZone='UTC',budgetFlag=false,operators}=input||{};
    person=person&&typeof person==='object'?person:{};
    units=(Array.isArray(units)?units:[]).filter(u=>u&&typeof u==='object');
    const c=LIKELIHOOD_RULES;
    const budgetReason=!['closed','lost'].includes(stage) && (budgetFlag===true || person.budget_flag===true || typeof person.budget_flag==='string' && !!person.budget_flag.trim()) ? 'budget below the villas they want' : '';
    const withBudget=reason=>budgetReason || reason.trim().split(/\s+/).slice(0,7).join(' ');
    const override=rules.likelihoodOverride(person,{operators});
    const result = computed => ({...computed,percent:override?override.percent:computed.percent,
      override:!!override,overrideReason:override?person.override_reason:''});
    if(stage==='closed')return result({percent:100,reason:'',signals:[]});
    if(stage==='lost')return result({percent:0,reason:'',signals:[]});
    const clock=typeof now==='string'?Date.parse(now):NaN;
    const day=rules.date(today)?today:Number.isFinite(clock)?new Date(clock).toISOString().slice(0,10):'';
    const validAt=value=>{const n=instant(value);return Number.isFinite(n)&&!!day&&(value.length===10?value<=day:Number.isFinite(clock)&&n<=clock);};
    const rows=prepare(interactions,{now,today:day}).filter(r=>r.person_id&&r.person_id===person.person_id);
    const found=new Set(),add=key=>found.add(key);
    let cancelReason='Visit cancelled';
    const personName=typeof person.name==='string'?person.name.trim().toLowerCase():'';
    const subjects=['buyer','they','she','he',personName,personName.split(/\s+/)[0]].filter(Boolean);
    const buyerClause=clause=>{
      const clean=clause.trim(),subject=subjects.find(name=>clean.startsWith(name+' '));
      return subject?clean.slice(subject.length+1):'';
    };
    const known=value=>typeof value==='string'&&!!value.trim()&&!/\b(?:unknown|unconfirmed|not|unsure|undecided|tbd|clear|maybe|if|would|could)\b/i.test(value);
    if(known(person.budget_range))add('budget');
    const timing=typeof person.purchase_timing==='string'?person.purchase_timing:'';
    // The buyer's own timing field is stronger evidence than a passing next-year
    // mention in a summary. Only explicit nearer dates override that delay.
    const nextYear=/\bnext year\b/i.test(timing),year=Number(day.slice(0,4));
    const months=['january','february','march','april','may','june','july','august','september','october','november','december'];
    const nearerDate=[...timing.matchAll(/\b(\d{4}-\d{2}-\d{2})\b/g)].some(match=>rules.date(match[1])&&match[1]>=day&&Number(match[1].slice(0,4))===year);
    const nearerMonth=[...timing.toLowerCase().matchAll(/\b([a-z]+) (\d{4})\b/g)].some(match=>Number(match[2])===year&&months.indexOf(match[1])+1>=Number(day.slice(5,7))&&months.includes(match[1]));
    const nearer=nextYear&&(nearerDate||nearerMonth);
    if(nextYear&&!nearer || !nearer&&paused(timing))add('pause');
    else if(known(timing))add('timing');
    let lastReply=-Infinity;
    for(const row of rows) {
      const text=row.summary||'';
      const intent=factual(text).filter(clause=>/^(?:asked for|requested)\b/.test(buyerClause(clause)) || row.record_type==='touch'&&/^\s*(?:asked for|requested)\b/.test(clause)).join('.');
      // A touch means an actual conversation in this sheet's schema.
      if(row.record_type==='touch')lastReply=Math.max(lastReply,instant(row.timestamp));
      if(row.record_type==='touch'||row.record_type==='decision') {
        if(/\b(?:buyer |they |she |he )?(?:asked for|requested) (?:the |a )?(?:prices?|pricing|price list)\b/.test(intent))add('pricing');
        if(/\b(?:asked for|requested) (?:the |a )?contract\b/.test(intent))add('contract');
        if(/\b(?:asked for|requested)\b.*\b(?:second|return|another) (?:visit|tour)\b/.test(intent))add('second');
        if(String(text).split(/[.!?;\n]+/).some(clause=>/^(?:(?:is|are) )?(?:pausing|on pause|waiting until next year|buying next year|not buying|won['’]t buy|not until next year|just looking)\b/.test(buyerClause(clause.toLowerCase()))&&paused(clause)))add('pause');
        if(row.event==='tour_completed'&&!row.workflow_json&&(!text||factual(text).length))add('tour');
        if(['tour_cancelled','tour_no_show'].includes(row.event)&&!row.workflow_json){add('cancel');cancelReason=row.event==='tour_no_show'?'Visit missed':'Visit cancelled';}
      }
      if(row.unit_id&&validAt(row.deposit_date)&&!units.some(u=>u.unit_id===row.unit_id&&rules.unitStatus(u)==='investor held'))add('deposit');
    }
    const reference=Number.isFinite(clock)?clock:instant(day);
    if(lastReply!==-Infinity&&(reference-lastReply)/86400000<=c.recentDays)add('reply');
    // Only actual conversation timestamps establish recency or silence.
    if(lastReply!==-Infinity&&(reference-lastReply)/86400000>=c.silentDays)add('silence');
    const journeyRows=rows.filter(row=>{if(!row.workflow_json)return false;try{return JSON.parse(row.workflow_json)?.kind==='journey';}catch{return false;}});
    const state=journeyRows.length?journey.state(journeyRows,person.person_id,{today:day,now,timeZone}):{tours:[]};
    if(state.tours.some(t=>t.status==='completed'&&!t.timing_issue))add('tour');
    for(const tour of state.tours.filter(t=>['cancelled','no_show'].includes(t.status)&&!t.timing_issue)){add('cancel');cancelReason=tour.status==='no_show'?'Visit missed':'Visit cancelled';}
    for(const unit of units.filter(u=>person.person_id&&u.holder_person_id===person.person_id&&rules.unitStatus(u)!=='investor held')) {
      if(validAt(unit.deposit_date))add('deposit');
      if(String(unit.status).toLowerCase()!=='held')continue;
      const holds=rules.workflows(rows,'villa',person.person_id).filter(v=>v.unit_id===unit.unit_id&&v.status!=='requested');
      const hold=holds.at(-1);
      // Legacy current held status is a confirmed fact. If a receipt exists,
      // it must still be accepted and within its actual validity window.
      if(!hold || hold.status==='accepted'&&validAt(hold.starts_at)&&Number.isFinite(instant(hold.expires_at))&&instant(hold.expires_at)>reference)add('held');
    }
    const signals=[...found].sort((a,b)=>Math.abs(c.weights[b])-Math.abs(c.weights[a])||Object.keys(c.weights).indexOf(a)-Object.keys(c.weights).indexOf(b));
    const percent=Math.max(c.min,Math.min(c.caps[stage]??c.max,(c.bases[stage]??c.unknownBase)+signals.reduce((n,s)=>n+c.weights[s],0)));
    const base=Math.max(c.min,Math.min(c.caps[stage]??c.max,c.bases[stage]??c.unknownBase));
    return result({percent,reason:withBudget(percent===base?'':signals.slice(0,c.reasonCount).map(s=>s==='cancel'?cancelReason:labels[s]).join(', ')),signals});
  }
  return {compute,prepare,LIKELIHOOD_RULES};
})();
if(typeof module!=='undefined') module.exports=DeskLikelihood;
