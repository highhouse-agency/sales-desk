// Run immediately before updating an existing private page, using files read from it.
const TRAINING_SHEET='1DocaVV3FnDcWIaE958shbgrsClCTZ-pNm_7j6GER4uo';
function assertPublicationTarget({mode,sheet_id},existing,status) {
 if(!['training','live'].includes(mode)||!sheet_id)throw Error('Publication needs verified mode and source sheet.');
 if(mode==='training'&&sheet_id!==TRAINING_SHEET)throw Error('Training publication must use the configured training sheet.');
 if(!existing||existing.mode!==mode||existing.sheet_id!==sheet_id||!existing.run_id||!Number.isFinite(Date.parse(existing.as_of)))throw Error('Existing page source is unavailable or does not match; owner repair required. Follow desk-tasks/SKILL.md#upgrade-a-saved-page or desk-report/SKILL.md#upgrade-a-saved-page.');
 if(existing.schema_version!=='desk-dashboard-snapshot-v1'&&!status)throw Error('Report source verification requires existing status.json. Follow desk-report/SKILL.md#upgrade-a-saved-page.');
 if(status&&(status.run_id!==existing.run_id||status.as_of!==existing.as_of))throw Error('Existing source manifest does not match status; owner repair required. Follow desk-tasks/SKILL.md#upgrade-a-saved-page or desk-report/SKILL.md#upgrade-a-saved-page.');
 return true;
}
function sourceManifest({mode,sheet_id,run_id,as_of}){
 if(!['training','live'].includes(mode)||typeof sheet_id!=='string'||! /^[A-Za-z0-9_-]+$/.test(sheet_id)||typeof run_id!=='string'||! /^[A-Za-z0-9_-]+$/.test(run_id)||typeof as_of!=='string'||!Number.isFinite(Date.parse(as_of)))throw Error('Source manifest needs verified source metadata.');
 return {mode,sheet_id,run_id,as_of};
}
module.exports={TRAINING_SHEET,assertPublicationTarget,sourceManifest};
if(require.main===module){const fs=require('node:fs'),[target,existing,status]=process.argv.slice(2);if(!target||!existing)throw Error('Usage: node publication-target.cjs target.json existing-source.json [existing-status.json]');const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));assertPublicationTarget(read(target),read(existing),status?read(status):undefined);process.stdout.write('Existing page source verified.\n');}
