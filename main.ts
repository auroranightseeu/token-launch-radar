import {readFileSync,writeFileSync,mkdirSync,cpSync,readdirSync,rmSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseSnapshot,buildRadar,boardIssue,dataScript} from './lib/model.ts';
import {buildDossier} from './vendor/makefun-board.ts';

const root=fileURLToPath(new URL('.',import.meta.url));
function option(name,fallback) {
  const args=process.argv.slice(2), index=args.indexOf('--'+name);
  return index>=0?args[index+1]:args.find(a=>a.startsWith('--'+name+'='))?.slice(name.length+3)??fallback;
}
let input=option('input','/input/snapshot.json');
if(!input.endsWith('.json')) input=join(input,'snapshot.json');
const out=resolve(option('output',process.env.MAKEFUN_OUTPUT_DIR??'/output'));
const snapshot=parseSnapshot(readFileSync(input,'utf8'));
const {board,radar}=buildRadar(snapshot);
const issue=boardIssue(board,snapshot);
if(issue) throw Error(issue);
mkdirSync(out,{recursive:true});
writeFileSync(join(out,'board.json'),JSON.stringify({model_version:radar.model_version,rows:board})+'\n');
writeFileSync(join(out,'data.js'),dataScript(radar));
// Clean asset destinations so repeated local builds cannot retain obsolete files.
for(const dir of ['dashboard','screenshots']) {
  rmSync(join(out,dir),{recursive:true,force:true});
  cpSync(join(root,dir),join(out,dir),{recursive:true});
}
if(readdirSync(join(out,'screenshots')).length!==3) throw Error('Exactly three screenshots required');
writeFileSync(join(out,'dossier.json'),buildDossier(out,{text_max_bytes:65536,
  screenshots:{max:3,max_bytes:524288},dashboard:{max_files:400,max_bytes:4194304}}));
console.log(`Signal: ${board.length} ranked / ${radar.watchlist_size} watchlist / ${radar.early_size} early / ${radar.live_size} live`);
