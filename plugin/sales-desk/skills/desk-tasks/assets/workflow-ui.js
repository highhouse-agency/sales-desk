// Repairs stay in the desk owner's Review queue, never on the sales dashboard.
// Recognize legacy wording too, before it has been recategorized as data repair.
function isDataRepair(item) {
  const reason=String(item.reason||'').trim().toLowerCase().replace(/[_-]+/g,' ');
  const text=[item.question,item.task].filter(Boolean).join(' ');
  return ['data repair','records mismatch'].includes(reason)||/\b(?:misalign(?:ed|ment)?|broken formulas?|missing receipts?|duplicate rows?|schema (?:mapping|keys?|mismatch)|history rows?|calendar receipts?)\b/i.test(text)||/\b(?:row|column)\s+(?:alignment|mismatch|mapping|repair)\b/i.test(text);
}
const salesOpenQuestions=openQuestions;
openQuestions=()=>salesOpenQuestions().filter(r=>!isDataRepair(r));
function isRepairTask(task) {
  if(isDataRepair(task))return true;
  const opening=records('Interactions').find(r=>r.interaction_id===task.opened_interaction_id);
  // A repair's evidence link may point at a genuine visit or sales task.
  // Only repair-authored work is hidden, never the evidence it references.
  return !!opening&&(isDataRepair({task:opening.summary})||records('Review').some(r=>isDataRepair(r)&&String(opening.source_key||'').startsWith('review:'+r.review_id+':')));
}
function isRepairInteraction(row) {
  return isDataRepair({task:row.summary})||records('Review').some(r=>isDataRepair(r)&&String(row.source_key||'').startsWith('review:'+r.review_id+':'))||records('Tasks').some(t=>isRepairTask(t)&&[t.opened_interaction_id,t.closed_interaction_id].includes(row.interaction_id));
}
const sourceActivityRows=activityRows;
activityRows=()=>sourceActivityRows().filter(r=>!isRepairInteraction(r));
const sourceTaskModel=model, salesTaskModels=new WeakMap();
model=function(){
  const original=sourceTaskModel();
  if(salesTaskModels.has(original))return salesTaskModels.get(original);
  const tasks=original.tasks.filter(t=>!isRepairTask(t)),removed=new Set(original.tasks.filter(isRepairTask));
  const people=Object.fromEntries(Object.entries(original.people).map(([id,p])=>[id,{...p,tasks:p.tasks.filter(t=>!removed.has(t)),...(isDataRepair({task:p.next_step})?{next_step:'',next_step_due:''}:{})}]));
  const sales={...original,tasks,open:tasks.filter(t=>t.status==='open'),people};
  salesTaskModels.set(original,sales);return sales;
};

// Likelihood stays in the existing in-memory model, never the browser cache.
const cachedLikelihoodViews=new WeakSet();
const likelihoodAvailable=()=>!!D&&!cachedLikelihoodViews.has(D)&&['People','Pipeline','Interactions'].every(tab=>D.T[tab]&&!D.errors?.[tab]);
function likelihoodScores() {
  if(!likelihoodAvailable())return null;
  const m=model();
  if(m.likelihood)return m.likelihood;
  const timeZone=tz(),z=zoneParts(timeZone),clock={today:z.date,now:`${z.date}T${z.time}${z.off}`,timeZone},group=(rows,key)=>{
    const out=new Map();for(const row of rows){const id=row[key];if(!out.has(id))out.set(id,[]);out.get(id).push(row);}return out;
  };
  // Resolve corrections before grouping: a correction can change buyer identity.
  const effective=DeskLikelihood.prepare(records('Interactions'),clock),interactions=group(effective,'person_id');
  // Inventory notes intentionally have no buyer. Resolve status before buyer
  // grouping so an investor holding suppresses stale buyer deposit evidence.
  // Only status enters scoring: opening Units must not add hold/deposit signals.
  const statuses=new Map(records('Units').filter(u=>u.unit_id).map(u=>[u.unit_id,{unit_id:u.unit_id,status:u.status}]));
  for(const row of effective)if(row.unit_id&&['available','held','investor held','reserved','promesa signed','sold'].includes(DeskRules.unitStatus({status:row.unit_status})))statuses.set(row.unit_id,{unit_id:row.unit_id,status:row.unit_status});
  const units=[...statuses.values()];
  m.likelihood=new Map(Object.values(m.people).map(p=>{
    const rows=interactions.get(p.person_id)||[],result=DeskLikelihood.compute({person:p,stage:p.stage,interactions:rows,units,...clock,operators:D.operators});
    return [p.person_id,result];
  }));
  return m.likelihood;
}
const likelihoodOf=p=>likelihoodScores()?.get(p.person_id)||null;
function likelihoodMarkup(p,result){
 const override=result.override&&result.overrideReason?`<br><span>${esc(displayText(result.overrideReason))}</span>`:'';
 return `<strong>Likely to buy: ${result.percent}%</strong>${result.reason?'<br><span>'+esc(displayText(result.reason))+'</span>':''}${override}`;
}
function likelihoodLine(p) {
  const result=likelihoodOf(p);
  return `<p class="likelihood" data-likelihood-person="${esc(p.person_id)}" aria-label="Likelihood"${result?'':' hidden'}>${result?likelihoodMarkup(p,result):''}</p>`;
}
function refreshLikelihoodDisplay() {
  document.querySelectorAll?.('[data-likelihood-person]').forEach(node=>{
    const p=model().people[node.dataset.likelihoodPerson],result=p&&likelihoodOf(p);
    node.hidden=!result;
    node.innerHTML=result?likelihoodMarkup(p,result):'';
  });
}
const likelihoodOrder=(a,b)=>(likelihoodOf(b)?.percent||0)-(likelihoodOf(a)?.percent||0)||a.name.localeCompare(b.name);
const nurtureTrackLabel=track=>({unbooked:'Before booking',booked:'After booking','second-home':'Second home',investment:'Investment','long-term':'Long term',general:'General'}[track]||'Emails');
const stageLabel=value=>({'contact and discovery':'Discovery','long-term nurture':'Nurture','unit selection':'Selection'}[value]||cap(value||'No stage'));

// Roles select the information shown.
let homeRole = '', homeActor='', homeSelected=false;
const roleForViewer = name => /^Jorge\b/i.test(name||'')?'jorge':/^Jackson\b/i.test(name||'')?'leadership':/^Freddie\b/i.test(name||'')?'freddie':'alix';
function initializeHomeRole(){$('home-role').innerHTML=options([['freddie','Freddie'],['alix','Alix'],['leadership','Jackson'],...(roster().some(name=>/^Jorge\b/i.test(name))?[['jorge','Jorge']]:[])],homeRole);if(!homeSelected&&(!homeRole||homeActor!==me)){homeRole=roleForViewer(me);homeActor=me;}$('home-role').value=homeRole;}
const leadershipView = () => ['leadership','jorge'].includes(homeRole);
const temperatureLabel = value => ({cold:'Cold',warm:'Warm',hot:'Hot','not a fit':'Not a fit'}[value] || 'Unrated');
const unitStatus = DeskRules.unitStatus;
const unitDisplayStatus = u => unitStatus(u)==='held'?'On hold':unitStatus(u)==='promesa signed'?'Under contract':cap(unitStatus(u)||'No status');
const villaSize = u => {
  const areas=DeskRules.unitAreas(u),number=n=>new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(n);
  return areas.size_m2!=null?`${number(areas.size_m2)} m² · ${number(areas.size_ft2)} ft²`:(u.size||u.Size)?`${u.size||u.Size} ${u.size_unit||u['Size unit']||''}`.trim():'No size';
};
const villaPrice = u => {
  if(!u.list_price)return 'No price';
  const amount=Number(String(u.list_price).replace(/[$,]/g,''));
  if(!Number.isFinite(amount))return displayText(u.list_price);
  const currency=String(u.currency||'USD').toUpperCase();
  return new Intl.NumberFormat('en-US',{style:'currency',currency,currencyDisplay:'narrowSymbol',maximumFractionDigits:2,minimumFractionDigits:0}).format(amount);
};
let privateValuesMemo=null;
function privateDisplayValues(){
  if(privateValuesMemo?.data===D)return privateValuesMemo.values;
  const values=new Set();
  for(const tab of ['People','Interactions','Partners'])for(const row of records(tab))for(const key of ['email','phone','instagram_handle'])for(const value of (key==='email'||key==='phone'?String(row[key]||'').split(';'):[String(row[key]||'')])){const text=value.trim();if(key==='email'&&/^[\w.+-]+@[\w.-]+\.[a-z]{2,}$/i.test(text)||key==='phone'&&/^\+?[\d .()-]{8,}$/.test(text)||key==='instagram_handle'&&/^@?[a-z0-9_.]{3,}$/i.test(text)&&!roster().some(name=>name.toLowerCase()===text.replace(/^@/,'').toLowerCase()))values.add(text);}
  privateValuesMemo={data:D,values:[...values].sort((a,b)=>b.length-a.length)};
  return privateValuesMemo.values;
}
function displayText(value) {
  let text=noIds(String(value||''));
  for(const privateValue of privateDisplayValues())text=text.replace(new RegExp(escRe(privateValue),'gi'),/^[\w.+-]+@[\w.-]+\.[a-z]{2,}$/i.test(privateValue)?'the email address on file':'[private detail]');
  text=text.replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi,'the email address on file')
    .replace(/\bliteral\s+[^,;.!]*?\btag\b/gi,'source')
    .replace(/\bcampaign_id\b/gi,'campaign').replace(/\bC\d+\b\??/g,'')
    .replace(/\bscheduled job\b/gi,'Desk').replace(/\bchat note\b/gi,'Chat');
  text=({'ad lead':'Ad','web form':'Website','chat transcript':'Chat','chat voice note':'Chat','email':'Email','whatsapp':'WhatsApp'}[text.toLowerCase()]||text);
  if(text==='Buyer name missing')text='Name missing';
  text=text.replace(/https?:\/\/[^\s<>]+|[\w.+-]+@[\w.-]+\.[a-z]{2,}|@[a-z0-9_.]{2,}/gi,'[private detail]');
  // Dates and appointment times are not phone numbers. Currency amounts stay readable.
  text=text.replace(/\+\d[\d .()-]{6,}\d|\(?\d{3}\)?[ .-]\d{3}[ .-]\d{4}|\b\d{10,15}\b/g,(match,index,full)=>{
    const before=full.slice(Math.max(0,index-12),index),after=full.slice(index+match.length,index+match.length+12);
    if(/(?:[$€£]|USD|MXN|EUR|GBP)\s*$/i.test(before)||/^\s*(?:USD|MXN|EUR|GBP)\b/i.test(after))return match;
    return '[private detail]';
  });
  return text.replace(/\s*\(\s*\)/g,'').replace(/ {2,}/g,' ').trim();
}
let detailRequest=0;
function openBuyer(id,ready=false) {
  const needed=['People','Pipeline','Tasks','Interactions'];
  if(mcp&&!previewMode&&!ready){
    const request=++detailRequest;
    ensureTabs(needed).then(ok=>{if(ok&&request===detailRequest)openBuyer(id,true);});
    return;
  }

  const p=model().people[id];if(!p)return;
  const statuses=activityStatuses(id),next=p.tasks[0],nextText=next?.task||(p.next_step&&p.next_step!=='clear'?p.next_step:'No task'),nextDate=next?.due_date||p.next_step_due;
  const history=DeskRules.effective(records('Interactions')).filter(i=>i.person_id===id&&!isRepairInteraction(i)).map(i=>({at:i.timestamp||i.logged_at||'',by:i.logged_by||'',status:statuses.get(i.interaction_id),text:[displayText(i.summary)||cap((i.event||'Update').replace(/_/g,' ')),i.stage?'Sales stage: '+cap(i.stage):''].filter(Boolean).join(' / ')}));
  for(const t of records('Tasks').filter(t=>t.person_id===id&&!isRepairTask(t)&&t.status==='done'&&!history.some(h=>h.at===(t.closed_at||'')&&h.text.includes(displayText(t.task))))) {
    if(!records('Interactions').some(i=>i.interaction_id===t.closed_interaction_id))history.push({at:t.closed_at||'',text:'Task done: '+displayText(t.task)});
  }
  history.sort((a,b)=>(Date.parse(a.at)||0)-(Date.parse(b.at)||0));
  const tours=journeyOf(id).tours.filter(t=>t.status==='booked');
  showDetail(displayText(p.name),`<div class="profile-header"><div class="profile-meta">${p.lead_temperature?`<span class="temperature ${esc(['cold','warm','hot'].includes(p.lead_temperature)?p.lead_temperature:'neutral')}">${esc(temperatureLabel(p.lead_temperature))}</span>`:''}${salesStagePill(p.stage)}<span>${esc(displayText(p.owner||'Unassigned'))}</span></div><p class="next-step">${esc(displayText(nextText))}${isDate(nextDate)?`<br><time>${esc(fmtDay(nextDate))}</time>`:''}</p></div>
  ${likelihoodLine(p)}

  <details class="profile-section profile-details"><summary>Details</summary>${p.lead_id?`<p class="note">${esc(p.lead_id)}</p>`:''}<section class="profile-section"><h3>Temperature</h3><p>Cold: Early interest</p><p>Warm: Engaged</p><p>Hot: Sales ready</p><p>Not a fit: Outside the offering</p></section>${p.stage_override&&p.stage_override_reason?`<p>${esc(displayText('Stage set by '+p.stage_override_reason.replace(/^(?:Stage set by|Set by)\s+/i,'')))}</p>`:''}<section class="profile-section"><h3>Profile</h3><dl>${[['Source',p.source],['Channel',p.first_channel],...(campaignForBuyer(id)?[['Campaign',campaignForBuyer(id)]]:[]),['Interest',p.interest_type],['Timing',p.purchase_timing],['Contact preference',p.preferred_channel]].map(([label,value])=>`<dt>${label}</dt><dd>${esc(displayText(value)||'Not recorded')}</dd>`).join('')}</dl></section><section class="profile-section"><h3>Tasks</h3>${p.tasks.map(t=>`<p>${esc(displayText(t.task))}<br><span class="note">${esc(displayText(t.owner||'Unassigned'))} / ${esc(t.due_date?fmtDay(t.due_date):'No date')}</span></p>`).join('')||'<p class="note">None open.</p>'}</section>
  <section class="profile-section"><h3>Tours</h3>${tours.map(t=>`<p>${statusPill(tourStatusLabel(t),t.preparation?'tour_preparation':'tour_booked')} / ${esc(journeyTime(t.starts_at))} / ${esc(displayText(t.owner||'Unassigned'))}</p>`).join('')||'<p class="note">None booked.</p>'}</section>
  <section class="profile-section"><h3>Activity History</h3><ol class="timeline">${history.map(h=>`<li><time>${esc(h.at?fmtDay(h.at):'No date')}${h.by?' / '+esc(displayText(h.by)):''}</time>${h.status?`${esc(h.status.text)}<details><summary>Note</summary><p>${esc(h.text)}</p></details>`:esc(h.text)}</li>`).join('')||'<li>No activity.</li>'}</ol></section></details>`);
}
function openVilla(id) {

  const u=records('Units').find(u=>u.unit_id===id);if(!u)return;
  const property=records('Properties').find(p=>p.property_id===u.property_id);
  showDetail('Villa '+id,`<p class="lede">${esc(unitDisplayStatus(u))}</p><dl>${[...(property?[['Property',property.name]]:[]),['Type',u.type||'Not recorded'],['Size',villaSize(u)],['Price',villaPrice(u)],['Held by',u.holder_person_id?personName(u.holder_person_id):'No buyer']].map(([k,v])=>`<dt>${k}</dt><dd>${esc(displayText(v))}</dd>`).join('')}</dl>`);
}
function campaignIdForBuyer(id) {
  const ids=[...new Set(DeskRules.effective(records('Interactions')).filter(i=>i.person_id===id&&i.campaign_id).map(i=>i.campaign_id))];
  if(ids.length!==1)return '';
  const names=[...new Set(records('Campaigns').filter(c=>c.campaign_id===ids[0]).map(c=>c.campaign_name).filter(Boolean))];return names.length===1?ids[0]:'';
}
function campaignForBuyer(id) {const key=campaignIdForBuyer(id);return key?records('Campaigns').find(c=>c.campaign_id===key)?.campaign_name||'':'';}
function campaignOverview() {
  if(!D.T.Campaigns)return '';
  const rows=records('Campaigns'),groups=[...new Set(rows.map(c=>c.campaign_id).filter(Boolean))];
  return `<section class="profile-section"><h2>Campaigns</h2>${groups.length?`<div class="campaign-table"><table><thead><tr><th>Campaign</th><th>Spend</th><th>Ad leads</th><th>Buyers</th></tr></thead><tbody>${groups.map(id=>{const all=rows.filter(c=>c.campaign_id===id),unique=new Set(all.map(c=>c.week_start+'|'+c.week_end)),currencies=[...new Set(all.map(c=>c.currency))],valid=unique.size===all.length&&currencies.length===1,number=k=>valid&&all.every(c=>String(c[k]).trim()!==''&&Number.isFinite(Number(c[k])))?all.reduce((n,c)=>n+Number(c[k]),0):'Unknown',names=[...new Set(all.map(c=>c.campaign_name))],name=names.length===1?names[0]:'Check campaign',buyers=Object.values(model().people).filter(p=>campaignIdForBuyer(p.person_id)===id).sort((a,b)=>temperatureRank(buyerTemperature(a))-temperatureRank(buyerTemperature(b)));return `<tr><td>${esc(displayText(name))}<br><span class="note">${esc(all.map(c=>c.week_start+' to '+c.week_end).join(', '))}</span></td><td>${esc(String(number('spend')))} ${valid?esc(displayText(currencies[0]||'')):''}</td><td>${esc(String(number('platform_lead_count')))}</td><td>${buyers.length}${buyers.map(p=>`<p><button class="link" data-act="buyer" data-person="${esc(p.person_id)}">${esc(displayText(p.name))} ${esc(temperatureLabel(buyerTemperature(p)))}</button><br><span class="note">${esc(displayText(stageLabel(p.stage)))}</span></p>`).join('')}</td></tr>`;}).join('')}</tbody></table></div>`:'<p class="note">No campaigns.</p>'}</section>`;
}
function pricingSignals(people){
 const counts=new Map();
 for(const p of people)if(p.budget_flag){
   const types=['Casita','Nativo','Ola'];
   const interest=types.filter(type=>new RegExp('\\b'+type+'\\b','i').test(p.interest_type||''));
   const mismatch=/^below\s+(Casita|Nativo|Ola)\b|^(Casita|Nativo|Ola)\s+starts\b|\bbelow\s+(Casita|Nativo|Ola)\b/i.exec(p.budget_flag);
   const type=interest.length===1?interest[0]:types.find(type=>type.toLowerCase()===(mismatch?.[1]||mismatch?.[2]||mismatch?.[3]||'').toLowerCase());
   if(!type)continue;
   counts.set(type,(counts.get(type)||0)+1);
 }
 return counts.size?`<details><summary>Pricing</summary>${[...counts].map(([type,count])=>`<p>${esc(displayText(type))}: ${count}</p>`).join('')}</details>`:'';
}
function renderRoleHome() {
  initializeHomeRole();
  $('who').hidden=leadershipView();
  const people=Object.values(model().people),units=records('Units'),tasks=model().open;
  const stat=(label,value)=>`<div class="stat"><strong>${value}</strong>${esc(label)}</div>`;
  if(leadershipView()){$('role-home').innerHTML=`<h2>Overview</h2><div class="home-stats">${stat('Active buyers',people.filter(model().active).length)}${D.T.Units?stat('Held villas',units.filter(u=>unitStatus(u)==='held').length)+stat('Deposits',units.filter(u=>unitStatus(u)!=='investor held'&&DeskRules.date(u.deposit_date)).length):''}${stat('Claude’s questions',openQuestions().length)}${stat('Overdue tasks',tasks.filter(t=>t.due_date&&t.due_date<today()).length)}</div>${pricingSignals(people)}<h3>Stages</h3>${pipelineGroups(people).map(g=>`<p><button class="link" data-act="stage-filter" data-stage="${esc(g.s)}">${esc(stageLabel(g.s))}: ${g.list.length}</button></p>`).join('')}<h3>Temperature</h3>${['cold','warm','hot','not a fit'].map(t=>`<p>${temperatureLabel(t)}: ${people.filter(p=>p.lead_temperature===t).length}</p>`).join('')}<p>Unrated: ${people.filter(p=>!['cold','warm','hot','not a fit'].includes(p.lead_temperature)).length}</p><h3>Claude’s questions</h3>${openQuestions().map(q=>`<p>${esc(questionText(q))}</p>`).join('')||'<p class="note">No questions.</p>'}`;return;}
  const tours=people.flatMap(p=>journeyOf(p.person_id).tours.filter(t=>t.status==='booked').map(t=>({p,t}))).filter(({t})=>homeRole==='alix'||/^Freddie\b/i.test(t.owner||''));
  $('role-home').innerHTML=`<h2>${homeRole==='alix'?'Team':'Freddie’s day'}</h2>${homeRole==='alix'?`<div class="home-stats">${stat('Tasks',tasks.length)}${stat('Unassigned',noOwnerList().length)}${stat('Claude’s questions',openQuestions().length)}${D.T.Partners?stat('Partners',records('Partners').length):''}</div><div class="btns"><button class="chip" data-view="noowner">Unassigned</button><button class="chip" data-view="questions">Claude’s questions</button></div>${D.T.Partners?`<details><summary>Partners</summary><div id="partner-list">${partnerList()}</div></details>`:''}`:''}<h3>Tours</h3>${tours.map(({p,t})=>`<p><button class="link" data-act="buyer" data-person="${esc(p.person_id)}">${esc(p.name)}</button> / ${esc(journeyTime(t.starts_at))} / ${esc(t.owner||'Unassigned')}</p>`).join('')||'<p class="note">None booked.</p>'}${pricingSignals(people)}`;
}
let searchRequest=0,searchTimer=null;
function renderGlobalSearch(value,ready=false) {
  const q=value.trim().toLowerCase(),box=$('search-results');box.hidden=!q;
  if(!ready){searchRequest++;clearTimeout(searchTimer);}
  if(!q){box.innerHTML='';return;}
  const needed=['People','Tasks'];
  if(mcp&&!previewMode&&!ready&&needed.some(tab=>!D.T[tab]||D.errors?.[tab])){
    const request=searchRequest;box.innerHTML='<p>Searching</p>';
    searchTimer=setTimeout(()=>{ensureTabs(needed).then(ok=>{if(ok&&request===searchRequest)renderGlobalSearch(value,true);});},200);
    return;
  }
  const buyers=Object.values(model().people).filter(p=>searchMatches(q,p.name)),units=records('Units').filter(u=>searchMatches(q,u.unit_id,u.type,unitStatus(u),records('Properties').find(p=>p.property_id===u.property_id)?.name)),tasks=model().tasks.filter(t=>searchMatches(q,t.task,buyerOf(t),t.owner));
  const matches=[...buyers.map(p=>({kind:'buyer',record:p})),...units.map(u=>({kind:'unit',record:u})),...tasks.map(t=>({kind:'task',record:t}))];
  box.innerHTML=`<h2>Search results</h2>${matches.slice(0,20).map(({kind,record:r})=>kind==='buyer'?`<p>Buyer / <button class="link" data-act="buyer" data-person="${esc(r.person_id)}">${esc(displayText(r.name))}</button>${r.lead_temperature?' / '+esc(temperatureLabel(r.lead_temperature)):''}</p>`:kind==='unit'?`<p>Villa / <button class="link" data-act="villa" data-unit="${esc(r.unit_id)}">${esc(displayText(r.unit_id))}</button> / ${esc(displayText(cap(unitStatus(r))))}</p>`:`<p>Task / ${r.person_id?`<button class="link" data-act="buyer" data-person="${esc(r.person_id)}">${esc(displayText(r.task))}</button>`:esc(displayText(r.task))} / ${esc(displayText(r.owner||'Unassigned'))}</p>`).join('')}${matches.length?'':'<p>No matches.</p>'}`;
}
// Source for the inline dashboard workflow UI. Run scripts/sync-dashboard.mjs after editing.
const buyerView = {search:'', owner:'all', stage:'all', mode:'board', unit:'', temperature:'all', sort:'current',preset:''};
const records = tab => D.T[tab]?.rows || [];
const workflowRows = (kind, person) => DeskRules.workflows(records('Interactions'), kind, person);
const lastWorkflow = (kind, person) => workflowRows(kind, person).at(-1) || {};
function buyerFilterMatch(p,v=buyerView) {
 return p.name&&savedListMatches(p,v.preset)&&searchMatches(v.search,p.name)&&
  (v.temperature==='all'||buyerTemperature(p)===v.temperature)&&
  (v.owner==='all'||(p.owner||'')===v.owner)&&
  (v.stage==='all'||p.stage===v.stage||(v.stage==='needs a stage'&&!DeskRules.stages.includes(p.stage)));
}
function filteredBuyers() {return Object.values(model().people).filter(p=>buyerFilterMatch(p));}
const options = (list, value) => list.map(([v,l])=>`<option value="${esc(v)}"${v===value?' selected':''}>${esc(l)}</option>`).join('');
function renderBuyerFilters() {
  renderSavedLists('pipeline');
  const owner=$('buyer-owner'), stage=$('buyer-stage');
  if (!owner || !stage) return;
  owner.innerHTML=options([['all','Everyone'],['','Unassigned'],...roster().map(n=>[n,n])],buyerView.owner);
  stage.innerHTML=options([['all','All stages'],...DeskRules.stages.map(n=>[n,stageLabel(n)]),['needs a stage','No stage']],buyerView.stage);
  if(!likelihoodAvailable())buyerView.sort='current';
  $('buyer-sort').innerHTML=options([['current','Current order'],...(likelihoodAvailable()?[['likelihood','Likelihood']]:[])],buyerView.sort);
  $('buyer-temperature').innerHTML=options([['all','All ratings'],...['cold','warm','hot','not a fit'].map(t=>[t,temperatureLabel(t)])],buyerView.temperature);
}
function questionPerson(r) {
  const linked=records('Interactions').find(i=>i.interaction_id===r.interaction_id);
  if (linked?.person_id && model().people[linked.person_id]) return linked.person_id;
  const ids=(r.candidate_ids||'').split(';').map(x=>x.trim()).filter(x=>model().people[x]);
  return ids.length===1 ? ids[0] : '';
}
function showDetail(title, body) {
  const box=$('detail');
  $('detail-content').innerHTML=`<div class="head"><h2 id="detail-title">${esc(title)}</h2><button class="btn quiet" data-act="detail-close">Close</button></div>${body}`;
  if (!box.open) box.showModal();

}
// Shared matching keeps tab search consistent with the global search.
const searchMatches=(query,...values)=>values.join(' ').toLowerCase().includes(query.trim().toLowerCase());
const tabViews={marketing:{search:'',temperature:'all',nurture:'all',preset:''},units:{search:'',status:'all',type:'all'},changes:{search:'',buyer:'all',team:'all',kind:'all'}};
const buyerTemperature=p=>['hot','warm','cold','not a fit'].includes(p.lead_temperature)?p.lead_temperature:'unrated';
const temperatureRank=value=>({hot:0,warm:1,cold:2}[value]??3);
const nurtureStatus=s=>s.status||'not enrolled';
const savedLists=[['quiet','Going cold'],['toured','Toured, quiet'],['unassigned','Unassigned'],['stage','Needs a stage']];
const savedListPrevious=new Map();
let savedListMemo=null;
function savedListFacts() {
 const z=zoneParts(tz()),clock={today:z.date,now:`${z.date}T${z.time}${z.off}`,timeZone:tz()};
 if(savedListMemo?.data===D&&savedListMemo.now===clock.now)return savedListMemo.facts;
 const rows=DeskLikelihood.prepare(records('Interactions'),clock),byPerson=new Map(),facts=new Map();
 for(const row of rows){if(!byPerson.has(row.person_id))byPerson.set(row.person_id,[]);byPerson.get(row.person_id).push(row);}
 for(const p of Object.values(model().people)){
  const history=byPerson.get(p.person_id)||[],touches=history.filter(r=>r.record_type==='touch');
  const last=touches.map(r=>r.timestamp).sort((a,b)=>Date.parse(a)-Date.parse(b)).at(-1)||(!D.T.Interactions?p.last_touch:'');
  const age=DeskRules.date(last)?(Date.parse(clock.today)-Date.parse(last))/86400000:(Date.parse(clock.now)-Date.parse(last))/86400000;
  facts.set(p.person_id,{quiet:Number.isFinite(age)&&age>=7});
 }
 savedListMemo={data:D,now:clock.now,facts};return facts;
}
function savedListMatches(p,preset) {
 if(!preset)return true;
 if(preset==='unassigned')return !p.owner?.trim();
 if(preset==='stage')return !DeskRules.stages.includes(p.stage);
 const fact=savedListFacts().get(p.person_id);
 return !!fact?.quiet&&(preset==='quiet'?(STAGES.slice(0,STAGES.indexOf('reservation')).includes(p.stage)&&!['not a fit','not suitable'].includes(p.lead_temperature)&&(p.lead_temperature==='hot'||(likelihoodOf(p)?.percent??0)>=60)):preset==='toured'?['tour','unit selection'].includes(p.stage):false);
}
function savedListSelection(state,tab,key) {
 return {...state,preset:key,temperature:'all',...(tab==='pipeline'?{owner:key==='unassigned'?'':'all',stage:key==='stage'?'needs a stage':'all'}:{})};
}
function renderSavedLists(tab) {
 const state=tab==='pipeline'?buyerView:tabViews.marketing,people=Object.values(model().people).filter(p=>p.name);
 $(''+(tab==='pipeline'?'p-presets':'m-presets')).innerHTML=savedLists.map(([key,label])=>{
  const selection=savedListSelection(state,tab,key),count=people.filter(p=>tab==='pipeline'?buyerFilterMatch(p,selection):marketingMatch({p,s:lastWorkflow('nurture',p.person_id)},'',selection)).length;
  return `<button class="chip" data-act="saved-list" data-tab="${tab}" data-preset="${key}" aria-pressed="${state.preset===key}">${label} (${count})</button>`;
 }).join('');
}
function applySavedList(tab,key) {
 if(!['pipeline','marketing'].includes(tab)||!savedLists.some(([value])=>value===key))return;
 const state=tab==='pipeline'?buyerView:tabViews.marketing,fields=tab==='pipeline'?['owner','stage','temperature']:['temperature'];
 if(state.preset===key){Object.assign(state,savedListPrevious.get(tab)||{});state.preset='';savedListPrevious.delete(tab);}
 else {
  if(!state.preset)savedListPrevious.set(tab,Object.fromEntries(fields.map(field=>[field,state[field]])));
  Object.assign(state,savedListSelection(state,tab,key));
 }
 if(tab==='pipeline')renderPipeline();else renderMarketing();
}

function facetOptions(rows,key,selected,label=cap,preferred=[],domain=rows) {
 const values=[...new Set([...domain.map(key),...(selected!=='all'?[selected]:[])])],ordered=[...preferred.filter(v=>values.includes(v)),...values.filter(v=>!preferred.includes(v)).sort()];
 return options([['all',`All (${rows.length})`],...ordered.map(v=>[v,`${label(v)} (${rows.filter(r=>key(r)===v).length})`])],selected);
}
function tabFilter(id,label,rows,key,selected,words=cap,preferred=[],domain=rows) {
 $(id).innerHTML=`<label class="field">${label}<select class="input" data-tab-filter="${id}">${facetOptions(rows,key,selected,words,preferred,domain)}</select></label>`;
}
function marketingRows() {
 return Object.values(model().people).map(p=>({p,s:lastWorkflow('nurture',p.person_id)})).sort((a,b)=>temperatureRank(buyerTemperature(a.p))-temperatureRank(buyerTemperature(b.p)));
}
function marketingMatch({p,s},skip='',v=tabViews.marketing) {
 const partner=records('Partners').find(r=>r.partner_id===p.referring_partner_id);
 return savedListMatches(p,v.preset)&&searchMatches(v.search,p.name,p.owner,partner?.name,campaignForBuyer(p.person_id),...DeskRules.effective(records('Interactions')).filter(r=>r.person_id===p.person_id).flatMap(r=>[r.summary,r.unit_id]),...records('Units').filter(u=>u.holder_person_id===p.person_id).map(u=>u.unit_id))&&
  (skip==='temperature'||v.temperature==='all'||buyerTemperature(p)===v.temperature)&&
  (skip==='nurture'||v.nurture==='all'||nurtureStatus(s)===v.nurture);
}
function renderMarketing() {
 renderSavedLists('marketing');
 const all=marketingRows(),v=tabViews.marketing,list=all.filter(x=>marketingMatch(x)),enrolled=all.some(({s})=>s.enrollment_id||s.status);
 tabFilter('m-temperature','Temperature',all.filter(x=>marketingMatch(x,'temperature')),x=>buyerTemperature(x.p),v.temperature,temperatureLabel,['hot','warm','cold']);
 tabFilter('m-nurture','Nurture',all.filter(x=>marketingMatch(x,'nurture')),x=>nurtureStatus(x.s),v.nurture,cap,['active','paused','pending','needs attention','opted out','not enrolled']);
 $('m-body').innerHTML=campaignOverview()+`<div class="list">${list.map(({p,s})=>`<div class="row"><div><button class="link" data-act="buyer" data-person="${esc(p.person_id)}">${esc(displayText(p.name))} <span class="temperature">${esc(temperatureLabel(buyerTemperature(p)))}</span></button>${enrolled?`<div class="why">${esc(s.track?nurtureTrackLabel(s.track):'No track')} / ${esc(cap(nurtureStatus(s)))} / ${esc(displayText(p.owner||'Unassigned'))}</div>`:''}</div></div>`).join('')||'<p>No buyers.</p>'}</div>`;
}
const journeyActionLabels = {qualification:'Readiness',handoff_offered:'Handoff offered',handoff_accepted:'Handoff accepted',tour_requested:'Tour requested',tour_booked:'Tour booked',tour_rescheduled:'Tour rescheduled',tour_preparation:'Prep done',tour_cancelled:'Cancelled',tour_no_show:'No-show',tour_completed:'Toured',tour_recap:'Recap done'};
const readinessLabels={ready:'Tour ready','needs information':'Needs information','not ready':'Not ready','not a fit':'Not suitable'};
const holdStatusLabels={requested:'Hold requested',accepted:'On hold',release:'Hold released'};
const tourStatusLabel = tour => tour.recap?'Recap done':tour.status==='booked'&&tour.preparation?'Prep done':({requested:'Tour requested',booked:'Tour booked',completed:'Toured',cancelled:'Cancelled',no_show:'No-show'}[tour.status]||'No status');
const statusPill = (label,key='neutral') => `<span class="status-pill status-${esc(key)}">${esc(label)}</span>`;
const salesStagePill = (stage,compact=false) => `<span class="status-pill sales-stage" aria-label="Sales stage: ${esc(stageLabel(stage))}">${compact?'':'Sales stage: '}${esc(stageLabel(stage))}</span>`;
function activityStatuses(id){
  const effective=DeskRules.effective(records('Interactions')).filter(r=>r.person_id===id),prefix=[],labels=new Map(),priorByTour=new Map(),seenEvents=new Set();
  const text=value=>typeof value==='string'&&value.trim();
  for(const row of effective){
    prefix.push(row);let v;try{v=JSON.parse(row.workflow_json||'null');}catch{continue;}
    if(v?.kind==='villa'){
      const day=String(row.timestamp||row.logged_at||'').slice(0,10),expected={requested:'hold_requested',accepted:'hold_accepted',release:'hold_released'}[v.status];
      const receipt=v.version===1&&expected&&row.event===expected&&v.unit_id&&row.unit_id===v.unit_id&&v.person_id===id&&text(v.reason)&&DeskRules.date(day)&&day<=today();
      const confirmed=v.status==='requested'||text(v.accepted_by)&&text(v.evidence)&&row.unit_status===(v.status==='accepted'?'held':'available');
      if(receipt&&confirmed)labels.set(row.interaction_id,{label:holdStatusLabels[v.status],text:'Status: '+holdStatusLabels[v.status]});
      continue;
    }
    if(v?.kind!=='journey'||v.version!==1||!text(v.event_id)||typeof v.type!=='string'||!Object.prototype.hasOwnProperty.call(journeyActionLabels,v.type)||seenEvents.has(v.event_id))continue;
    const state=DeskJourney.state(prefix,id,{today:today(),now:nowIso(),timeZone:tz()}),tour=state.tours.find(t=>t.tour_id===v.tour_id);
    const accepted=v.type==='qualification'?!!state.qualification&&state.qualification.event_id===v.event_id:v.type==='handoff_offered'?!!state.handoff&&state.handoff.event_id===v.event_id:v.type==='handoff_accepted'?!!state.handoff&&state.handoff.accepted_event_id===v.event_id:v.type==='tour_preparation'?!!tour&&tour.preparation_event_id===v.event_id:v.type==='tour_recap'?!!tour?.recap&&tour.recap.event_id===v.event_id:!!tour&&tour.event_id===v.event_id;
    if(accepted){seenEvents.add(v.event_id);const label=v.type==='qualification'?readinessLabels[state.qualification.outcome]||'Readiness':journeyActionLabels[v.type],prior=v.type.startsWith('tour_')?priorByTour.get(v.tour_id):'';labels.set(row.interaction_id,{label,text:prior&&prior!==label?`Status changed from ${prior} to ${label}`:'Status: '+label});if(v.type.startsWith('tour_'))priorByTour.set(v.tour_id,label);}
  }
  return labels;
}
function journeyTime(value) {
  if(!value)return 'No time';
  const offset=String(value).match(/(Z|[+-]\d{2}:\d{2})$/)?.[1];
  return `${fmtDay(String(value).slice(0,10))}, ${fmtTime(String(value).slice(11,16))}${offset?' (UTC'+(offset==='Z'?'':offset)+')':''}`;
}

const journeyOf = id => DeskJourney.state(records('Interactions'),id,{today:today(),now:nowIso(),timeZone:tz(),tasks:D.T.Tasks?.rows});
let partnerTemperature='all';
function filteredPartners() {
  return records('Partners').filter(partner=>partnerTemperature==='all'||(partner.lead_temperature||partner.temperature ? (partner.lead_temperature||partner.temperature)===partnerTemperature : Object.values(model().people).some(p=>p.referring_partner_id===partner.partner_id&&p.lead_temperature===partnerTemperature))).slice().sort((a,b)=>a.name.localeCompare(b.name));
}
function partnerList(){
  return `<div class="btns">${['all','hot','warm','cold'].map(t=>`<button class="chip" data-act="partner-filter" data-temperature="${t}" aria-pressed="${partnerTemperature===t}">${cap(t)}</button>`).join('')}</div>${filteredPartners().map(p=>`<details><summary>${esc(displayText(p.name))}</summary>${Object.values(model().people).filter(b=>b.referring_partner_id===p.partner_id).map(b=>`<p><button class="link" data-act="buyer" data-person="${esc(b.person_id)}">${esc(displayText(b.name))}</button></p>`).join('')||'<p>No buyers.</p>'}</details>`).join('')||'<p>No partners.</p>'}`;
}
function questionText(r){
 const person=questionPerson(r),name=person&&model().people[person]?.name;
 return displayText(name?String(r.question||'').replace(/\bthis buyer\b/gi,()=>name):r.question);
}
function questionCard(r) {
  return `<div class="row" role="listitem"><details><summary>${esc(questionText(r))}</summary><p>${esc(displayText(r.reason==='status confirmation'?'Sold or investor?':cap(r.reason)))}${r.owner?' / '+esc(displayText(r.owner)):''}</p>${questionPerson(r)?`<button class="link" data-act="buyer" data-person="${esc(questionPerson(r))}">${esc(displayText(personName(questionPerson(r))))}</button>`:''}</details></div>`;
}
function renderPriorityQuestions(){const q=openQuestions();$('today-questions').innerHTML=q.length?`<h2 class="section-title">Claude’s questions</h2><div class="list">${q.map(questionCard).join('')}</div>`:'';}
function handleWorkflowClick(act,b){
 switch(act){
 case 'theme':{const theme=document.documentElement.dataset.theme,dark=theme==='dark'||!theme&&window.matchMedia?.('(prefers-color-scheme: dark)').matches;document.documentElement.dataset.theme=dark?'light':'dark';break;}
 case 'buyer':openBuyer(b.dataset.person);break;
 case 'villa':openVilla(b.dataset.unit);break;
 case 'detail-close':detailRequest++;$('detail').close();break;
 case 'saved-list':applySavedList(b.dataset.tab,b.dataset.preset);break;
 case 'board':case 'list':buyerView.mode=act;$('p-body').dataset.sig='';renderPipeline();break;
 case 'clear-filters':savedListPrevious.delete('pipeline');Object.assign(buyerView,{owner:'all',stage:'all',search:'',temperature:'all',sort:'current',preset:''});renderPipeline();break;
 case 'stage-filter':buyerView.stage=b.dataset.stage;buyerView.mode='list';switchView('pipeline');break;
 case 'unit-filter':tabViews.units.status=b.dataset.status||'all';renderUnits();break;
 case 'nurture-filter':tabViews.marketing.nurture=b.dataset.status||'all';renderMarketing();break;
 case 'partner-filter':partnerTemperature=b.dataset.temperature;$('partner-list').innerHTML=partnerList();break;
 default:return false;
 }return true;
}
const tabRenders={marketing:()=>renderMarketing(),units:()=>renderUnits(),changes:()=>renderChanges()};
const tabControls={'m-temperature':['marketing','temperature'],'m-nurture':['marketing','nurture'],'u-status':['units','status'],'u-type':['units','type'],'c-buyer':['changes','buyer'],'c-team':['changes','team'],'c-kind':['changes','kind']};
document.addEventListener('input',e=>{
 if(e.target.id==='global-search')renderGlobalSearch(e.target.value);
 const tab={'m-search':'marketing','u-search':'units','c-search':'changes'}[e.target.id];
 if(tab){tabViews[tab].search=e.target.value;tabRenders[tab]();}
});
document.addEventListener('change',e=>{
 const filter=tabControls[e.target.dataset?.tabFilter];if(filter){const [tab,key]=filter;tabViews[tab][key]=e.target.value;tabRenders[tab]();}
 if(e.target.id==='home-role'){homeRole=e.target.value;homeSelected=true;S.open=null;$('detail').close();renderAll();}
 const key={'buyer-sort':'sort','buyer-temperature':'temperature','buyer-owner':'owner','buyer-stage':'stage'}[e.target.id];
 if(key){buyerView[key]=e.target.value;renderPipeline();}
});

const personName = id => model().people[id]?.name || 'No buyer';

// Remember disclosure choices when a search changes a person's visible entries.
document.addEventListener('toggle',e=>{const key=e.target.dataset?.activityGroup;if(key)activityDisclosure.set(key,e.target.open);},true);
