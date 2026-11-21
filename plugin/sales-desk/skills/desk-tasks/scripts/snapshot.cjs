#!/usr/bin/env node
// Input: this run's completed full-tab reads. Never read or write a live desk.
const {prune}=require('./display-data.cjs');
const {TRAINING_SHEET}=require('../../desk-report/scripts/lib/publication-target.cjs');
const {assertLiveTarget}=require('../../desk-report/scripts/lib/live-target.cjs');
function snapshot({raw,run_id,as_of,mode,target,provenance},inputPaths=[]) {
 if(!raw?.Settings||!raw?.Schema||!run_id||!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(as_of||'')||!Number.isFinite(Date.parse(as_of))||!['training','live'].includes(mode))throw Error('Supply completed reads, run_id, offset as_of and mode.');
 const settingsMode=raw.Settings.slice(1).find(row=>row[0]==='mode')?.[1];
 if(settingsMode!==mode)throw Error('Mode must match the completed Settings read.');
 assertLiveTarget({mode,target,provenance,settingsMode,content:raw,paths:inputPaths});
 if(mode==='training'&&provenance&&(provenance.mode!=='training'||provenance.sheet_id!==TRAINING_SHEET||provenance.status!=='ok'||provenance.origin!=='google-sheets'||as_of!==provenance.retrieved_at))throw Error('Training source receipt does not match the training sheet and read time.');
 if(mode==='live'&&as_of!==provenance.retrieved_at)throw Error('Live as_of must match completed sheet reads.');
 for(const tab of ['People','Pipeline','Tasks','Units','Review','Interactions','Partners','Properties','Campaigns'])if(!Array.isArray(raw[tab]))throw Error(`Missing completed read: ${tab}`);
 return {schema_version:'desk-dashboard-snapshot-v1',run_id,as_of,mode,...(provenance?{sheet_id:provenance.sheet_id}:{}),raw:prune(raw)};
}
module.exports={snapshot};
if(require.main===module){
 const fs=require('node:fs'),[input,output]=process.argv.slice(2);
 if(!input||!output)throw Error('Usage: node snapshot.cjs completed-reads.json snapshot.json');
 fs.writeFileSync(output,JSON.stringify(snapshot(JSON.parse(fs.readFileSync(input,'utf8')),[input]))+'\n');
}
