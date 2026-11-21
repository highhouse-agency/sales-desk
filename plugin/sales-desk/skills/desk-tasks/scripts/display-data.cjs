if(typeof module !== 'undefined') var {sanitizeFreeText}=require('../../desk-report/scripts/lib/sanitize.cjs');
const KEEP = {
  People: ["person_id","name","lead_temperature","owner","referring_partner_id","first_channel","first_touch_date","interest_type","purchase_timing","preferred_channel"],
  Pipeline: ["person_id","stage","stage_override","last_touch","next_step","next_step_due"],
  Tasks: ["task_id","person_id","partner_id","task","owner","due_date","due_time","status","calendar_event_id","property_id","opened_interaction_id","closed_interaction_id","created_by","closed_by","closed_at"],
  Units: ["unit_id","type","size","size_unit","size_m2","size_ft2","list_price","currency","status","holder_person_id","property_id","deposit_date"],
  Review: ["review_id","reason","question","status","candidate_ids","unit_id"],
  Interactions: ["interaction_id","timestamp","logged_at","record_type","corrects_interaction_id","person_id","partner_id","summary","logged_by","event","next_step","stage","campaign_id"],
  Partners: ["partner_id","name"],
  Campaigns: ["campaign_id","campaign_name","week_start","week_end","spend","currency","platform_lead_count","property_id"],
  Properties: ["property_id","name"]
};
const FREE_TEXT={Interactions:['summary','next_step'],Tasks:['task'],Pipeline:['next_step'],Review:['question']};
const SETTINGS_KEEP = ['mode','reporting_timezone','operators','task_owners','developer','unit_status_reporter_name','report_artifact','dashboard_link'];
function prunedText(value) {
 return String(value ?? '').replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'').replace(/(?:\+?\d[\d ().-]{7,}\d)/g,match => match.replace(/\D/g,'').length>=10 ? '' : match);
}
function prune(raw) {
 const out = {};
 const schema=(raw.Schema||[]).slice(1).map(r=>({tab:r[0],key:r[1],header:r[2]}));
 if(raw.Schema) out.Schema=raw.Schema;
 if(raw.Settings) out.Settings=[raw.Settings[0],...raw.Settings.slice(1).filter(r=>SETTINGS_KEEP.includes(r[0])).map(r=>[r[0],prunedText(r[1])])];
 for(const [tab,keep] of Object.entries(KEEP)) {
  const values=raw[tab];if(!Array.isArray(values))continue;
  if(!values.length){out[tab]=[];continue;}
  const rows=schema.filter(r=>r.tab===tab);
  const columns=values[0].map((h,i)=>({h,i,key:rows.length?rows.find(r=>r.header===String(h).trim())?.key:String(h).trim()})).filter(c=>keep.includes(c.key));
  const allowed=new Set(columns.map(c=>c.i)),textColumns=new Set(columns.filter(c=>(FREE_TEXT[tab]||[]).includes(c.key)).map(c=>c.i));
  out[tab]=[values[0],...values.slice(1).map(row=>values[0].map((_,i)=>allowed.has(i)?(textColumns.has(i)?sanitizeFreeText(row[i]):prunedText(row[i])):''))];
 }
 return out;
}
if(typeof module !== 'undefined') module.exports={KEEP,SETTINGS_KEEP,prune};
