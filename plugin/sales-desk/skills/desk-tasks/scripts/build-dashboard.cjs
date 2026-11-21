#!/usr/bin/env node
// Compile the live page from the maintained source, without reading any seed data.
const fs=require('node:fs'),path=require('node:path');
const {assertLiveTarget,checkPaths}=require('../../desk-report/scripts/lib/live-target.cjs');
function buildDashboard({target,provenance,deskName='Sales Desk'},inputPaths=[]) {
 assertLiveTarget({mode:'live',target,provenance,content:{deskName},paths:inputPaths});
 let html=fs.readFileSync(path.join(__dirname,'../assets/dashboard.html'),'utf8');
 html=html.replace('const CONFIG = { sheetId: "__SHEET_ID__", deskName: "__DESK_NAME__" };',()=>`const CONFIG = ${JSON.stringify({sheetId:target.sheet_id,deskName,mode:'live'}).replace(/</g,'\\u003c')};`)
 .replace(/ <span id="practice"[^>]*>Practice<\/span>/,'')
 .replace(/^#practice\{[^\n]*\}\n/m,'')
 .replace(/^  \$\("practice"\)\.hidden[^\n]*\n/m,'')
 .replace('actual or practice clock time','actual clock time')
 .replace("['training','live'].includes(snapshot.mode)","['live'].includes(snapshot.mode)");
 if(html.includes('__SHEET_ID__')||/>Practice<|practice clock|practiceRaw|snapshot-training|narrative-training|desk-setup\/assets\/seed/i.test(html))throw Error('Live page compilation retained a non-live path.');
 return html;
}
module.exports={buildDashboard};
if(require.main===module){
 const [input,output]=process.argv.slice(2);if(!input||!output)throw Error('Usage: node build-dashboard.cjs live-target.json index.html');
 checkPaths([input]);const html=buildDashboard(JSON.parse(fs.readFileSync(input,'utf8')),[input]);fs.writeFileSync(output,html);
}
