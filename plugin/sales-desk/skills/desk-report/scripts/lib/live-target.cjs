// Publication boundary. Metrics and their input allowlist remain unchanged.
const BLOCKED=['TV84ciqcmciqDvhbQifK2n','X4XP9o3xUzndAzoErpUpX4','PmUaLGPQWctyvEA7BKDMmb','DdCqvoqHdi3BerQfEKPc9p','HP7WmRh73d6W46Rt77jwX2','1DocaVV3FnDcWIaE958shbgrsClCTZ-pNm_7j6GER4uo'];
const offsetTime=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(v)&&Number.isFinite(Date.parse(v));
function checkPaths(paths=[]) {
 for(const path of paths.filter(Boolean))if(/(?:^|[\/_.-])(?:seeds?|fixtures?|training)(?:[\/_.-]|$)/i.test(path))throw Error('Live input cannot come from a seed, fixture or training path.');
}
function scanLive(value,key='') {
 if(typeof value==='string') {
  if(BLOCKED.some(id=>value.includes(id))||/Training data, invented|All people, records, and amounts are invented|>Practice<|>Fictional</i.test(value)||(/^(?:snapshot_id|source_id|sheet_id|origin|path|input_path)$/i.test(key)&&/(?:^|[\/_. -])(?:training|practice|fictional|fixtures?|seeds?)(?:[\/_. -]|$)/i.test(value)))throw Error('Live content contains a training source or label.');
 } else if(Array.isArray(value))value.forEach(item=>scanLive(item,key));
 else if(value&&typeof value==='object')for(const [key,item] of Object.entries(value)) {
  if(/^(?:fixture|training|practice|seed)$/i.test(key)&&item)throw Error('Live content has non-live provenance.');
  scanLive(item,key);
 }
}
function assertLiveTarget({mode,target,provenance,settingsMode=mode,content,paths=[]}) {
 if(!['training','live'].includes(mode))throw Error('Build mode must be training or live.');
 const live=mode==='live'||target?.mode==='live';
 if(!live)return;
 checkPaths(paths);
 if(mode!=='live'||settingsMode!=='live'||target?.mode!=='live'||typeof target.sheet_id!=='string'||!target.sheet_id.trim())throw Error('Live builds require a verified live target and live Settings.');
 if(provenance?.kind!=='sheet'||provenance.origin!=='google-sheets'||provenance.status!=='ok'||provenance.mode!=='live'||provenance.sheet_id!==target.sheet_id||!offsetTime(provenance.retrieved_at))throw Error('Live source receipt must match the configured live sheet.');
 scanLive(target);scanLive(provenance);scanLive(content);
}
module.exports={assertLiveTarget,checkPaths,scanLive,BLOCKED};
