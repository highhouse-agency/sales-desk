// One-time owner chat authorization. This module validates state and writes nothing.
const {TRAINING_SHEET,sourceManifest}=require('./publication-target.cjs');
const {assertLiveTarget}=require('./live-target.cjs');
const REPORT_FILES=['index.html','demand-and-ads.html','partner-network.html','unit-interest.html','owner-brief.html','status.json','source.json'];
const {isDeepStrictEqual}=require('node:util');
const key=value=>String(value||'').normalize('NFC').trim().toLowerCase();
function authorizeBootstrap({context,actor,desk_owner,decision,proposal,current,verified_page,provenance,build,existing,existing_status,metadata_read}){
 if(context!=='owner-chat'||!actor?.authenticated||!desk_owner||key(actor.identity)!==key(desk_owner))throw Error('Only the authenticated desk owner can upgrade a saved page in chat.');
 if(decision!=='Save'||proposal?.refresh!==true)throw Error('Save must explicitly approve the fresh data refresh and first metadata.');
 if(!['dashboard','reports'].includes(proposal.kind)||!['training','live'].includes(proposal.mode)||!proposal.sheet_id)throw Error('Confirm page kind, mode and sheet.');
 if(!/^https:\/\/claude\.ai\/artifact\/[A-Za-z0-9_-]+$/.test(proposal.url||'')||current?.url!==proposal.url||current.mode!==proposal.mode||current.sheet_id!==proposal.sheet_id||current.kind!==proposal.kind)throw Error('Saved URL, mode or sheet changed; show a new preview and Save.');
 if(!verified_page?.read_ok||verified_page.url!==proposal.url||!verified_page.title||verified_page.title!==proposal.title)throw Error('Read and confirm the exact saved page title and URL first.');
 if(!metadata_read?.verified||metadata_read.url!==proposal.url||!['missing','partial'].includes(metadata_read.state)||metadata_read.state==='partial'&&(!existing||!Object.keys(existing).length)||metadata_read.state==='missing'&&existing&&Object.keys(existing).length)throw Error('Verify missing or partial metadata with a successful same-page read; access errors are not missing files.');
 if(existing&&(existing.mode&&existing.mode!==proposal.mode||existing.sheet_id&&existing.sheet_id!==proposal.sheet_id))throw Error('Existing page belongs to another mode or sheet; owner confirmation cannot override it.');
 if(existing?.mode&&existing?.sheet_id&&existing?.run_id&&Number.isFinite(Date.parse(existing.as_of))&&(existing.schema_version==='desk-dashboard-snapshot-v1'||existing_status?.run_id===existing.run_id&&existing_status?.as_of===existing.as_of))throw Error('Source metadata is already established; use the normal refresh procedure.');
 if(proposal.read_at!==provenance?.retrieved_at||provenance?.kind!=='sheet'||provenance.origin!=='google-sheets'||provenance.status!=='ok'||provenance.mode!==proposal.mode||provenance.sheet_id!==proposal.sheet_id||!Number.isFinite(Date.parse(provenance.retrieved_at)))throw Error('A verified completed source receipt is required.');
 if(proposal.mode==='training'&&proposal.sheet_id!==TRAINING_SHEET)throw Error('Training upgrade must use the exact configured training sheet.');
 if(proposal.mode==='live')assertLiveTarget({mode:'live',target:proposal,provenance,content:{}});
 const files=proposal.kind==='reports'?REPORT_FILES:['snapshot.json',...(proposal.asset_update===true?['index.html']:[])];
 const payloads=new Map((build?.files||[]).map(file=>[String(file.path||'').replace(/^public\//,''),file.content]));
 if(!Array.isArray(build?.files)||build.files.length!==files.length||!Array.isArray(proposal.files)||proposal.files.length!==files.length||new Set(proposal.files).size!==files.length||files.some(file=>!proposal.files.includes(file))||payloads.size!==files.length||files.some(file=>typeof payloads.get(file)!=='string'||!payloads.get(file).trim()))throw Error('Approve the exact complete fresh file payloads, never metadata alone.');
 const parse=file=>{try{return JSON.parse(payloads.get(file));}catch{throw Error('Fresh build metadata is missing or invalid.');}};
 const snapshot=proposal.kind==='dashboard'?parse('snapshot.json'):null;
 const source=sourceManifest(snapshot||parse('source.json'));
 if(source.mode!==proposal.mode||source.sheet_id!==proposal.sheet_id||source.run_id!==proposal.run_id||source.as_of!==proposal.as_of||proposal.mode==='live'&&source.as_of!==provenance.retrieved_at)throw Error('Approve the exact fresh build and its time; never label unknown old content.');
 if(proposal.kind==='reports'){
  const status=parse('status.json');if(!isDeepStrictEqual(parse('source.json'),source)||!isDeepStrictEqual(Object.keys(status).sort(),['as_of','run_id']))throw Error('Source and status files must contain only their fixed metadata.');if(status.run_id!==source.run_id||status.as_of!==source.as_of)throw Error('Fresh reports need coherent status.json and source.json.');
  for(const file of REPORT_FILES.filter(name=>name.endsWith('.html'))){
   const html=payloads.get(file),match=html.match(/<script type="application\/json" id="report-data">([\s\S]*?)<\/script>/);
   if(!/<!doctype html>/i.test(html)||!/<main[ >]/i.test(html)||!match)throw Error('All five freshly rebuilt report pages are required.');
   let data;try{data=JSON.parse(match[1]);}catch{throw Error('Report page build data is invalid.');}
   if(data.meta?.run_id!==source.run_id||data.meta?.as_of!==source.as_of||data.meta?.mode!==source.mode||data.meta?.sheet_id!==source.sheet_id)throw Error('Every report page must match the approved fresh source and run.');
  }
 }else{
  const path=require('node:path'),fs=require('node:fs');
  const packaged=path.join(__dirname,'../../../desk-tasks/scripts/snapshot.cjs'),canonical=path.join(__dirname,'../../plugin/sales-desk/skills/desk-tasks/scripts/snapshot.cjs');
  const makeSnapshot=require(fs.existsSync(packaged)?packaged:canonical).snapshot;
  const expected=makeSnapshot({...snapshot,target:{mode:source.mode,sheet_id:source.sheet_id},provenance});
  if(!isDeepStrictEqual(expected,snapshot))throw Error('Dashboard payload must be the full privacy-pruned fresh snapshot.');
  if(proposal.asset_update){
   const html=payloads.get('index.html'),match=html.match(/const CONFIG = (\{[^\r\n]*\});/);let config;
   try{config=JSON.parse(match?.[1]);}catch{
    // The maintained training asset has unquoted keys and JSON string values.
    const literal=source.mode==='training'&&match?.[1].match(/^\{\s*sheetId\s*:\s*("(?:[^"\\]|\\.)*")\s*,\s*deskName\s*:\s*("(?:[^"\\]|\\.)*")\s*\}$/);
    if(!literal)throw Error('Use the configured generated dashboard page.');
    try{config={sheetId:JSON.parse(literal[1]),deskName:JSON.parse(literal[2])};}catch{throw Error('Use the configured generated dashboard page.');}
   }
   if(!/<script>/i.test(html)||!/<main[ >]/i.test(html)||config.sheetId!==source.sheet_id||source.mode==='live'&&config.mode!=='live')throw Error('Dashboard page must match the approved source.');
  }
 }
 return {url:proposal.url,files,source};
}
module.exports={authorizeBootstrap,REPORT_FILES};
if(require.main===module){const fs=require('node:fs'),input=process.argv[2];if(!input)throw Error('Usage: node legacy-bootstrap.cjs approved-state.json');process.stdout.write(JSON.stringify(authorizeBootstrap(JSON.parse(fs.readFileSync(input,'utf8'))))+'\n');}
