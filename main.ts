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
// Keep scenario values and every six-step plan tied to the same sealed snapshot.
if (radar.as_of !== snapshot.as_of) throw Error('Snapshot date mismatch');
// Round 4: the audit bar must account for every protocol in the snapshot.
const _a=radar.audit, _sum=_a.ranked+_a.live+_a.bridge+_a.liquid+_a.exchange+_a.versioned+_a.wrapped+_a.other;
if (_sum !== snapshot.protocols.length || _a.other !== 0) throw Error('Audit does not account for all protocols');
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
const a=radar.audit;
console.log(`Audit: 758 = ${a.ranked} ranked + ${a.live} live + ${a.bridge} bridge + ${a.liquid} liquid + ${a.exchange} exchange + ${a.versioned} versioned + ${a.wrapped} wrapped + ${a.other} other`);
const head=drop=>{const c={FARM:0,MARGINAL:0,SKIP:0};for(const r of board)c[r.verdicts[1000][drop].verdict]++;return c;};
for(const drop of [0.035,0.07,0.14]){const c=head(drop);console.log(`Verdicts $1,000 / ${drop*100}%: FARM ${c.FARM} / MARGINAL ${c.MARGINAL} / SKIP ${c.SKIP}`);}
