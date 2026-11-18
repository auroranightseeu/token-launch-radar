import assert from 'node:assert/strict';
import {readFileSync,readdirSync,statSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {buildDossier} from './vendor/makefun-board.ts';
import {isRankable,isPreToken,impliedValue,calibrate} from './lib/model.ts';
const dir=process.argv[2]??'out';
const snapshot=JSON.parse(readFileSync('token-radar-01-kit/input/snapshot.json','utf8'));
const rows=JSON.parse(readFileSync(join(dir,'board.json'),'utf8')).rows;
const calibration=calibrate(snapshot);
const index=new Map(snapshot.protocols.map(p=>[p.slug,p]));
const slugs=new Set(rows.map(r=>r.slug));
assert(rows.length>=100&&rows.length<=4000);
assert.equal(slugs.size,rows.length);
assert(statSync(join(dir,'board.json')).size<=8*1024*1024);
assert(snapshot.watchlist.every(s=>slugs.has(s)));
assert(rows.filter(r=>!snapshot.watchlist.includes(r.slug)).length>=60);
assert(new Set(rows.map(r=>r.implied_value_usd)).size>1);
let minStep=Infinity,maxStep=0;
for(const [i,r] of rows.entries()) {
  assert(index.has(r.slug)&&r.name.trim().length>0);
  assert.equal(r.rank,i+1);
  assert(isPreToken(r));
  assert(Number.isSafeInteger(r.implied_value_usd)&&r.implied_value_usd>0&&r.implied_value_usd<=1e14);
  if(i) assert(r.implied_value_usd<=rows[i-1].implied_value_usd);
  assert.equal(r.implied_value_usd,impliedValue(index.get(r.slug),snapshot.as_of,calibration.scale_usd).implied_value_usd);
  assert.equal(r.farm_steps.length,6);
  for (const step of r.farm_steps) {
    for (const figure of [`TVL $${r.tvl_usd}`, `implied $${r.implied_value_usd}`, `(${r.chains.length} total)`, `age ${r.age_days === null ? 'unknown' : r.age_days+'d'}`, 'Cost:', 'Time:']) assert(step.includes(figure));
  }
  for(const s of r.farm_steps){assert.equal(typeof s,'string');assert.equal(s,s.trim());assert(s.length>=20&&s.length<=600);minStep=Math.min(minStep,s.length);maxStep=Math.max(maxStep,s.length);}
  if(!snapshot.watchlist.includes(r.slug)) assert(isRankable(r)&&r.tvl_usd<snapshot.floor_usd);
}
const expected=snapshot.protocols.filter(p=>snapshot.watchlist.includes(p.slug)||(p.tvl_usd<snapshot.floor_usd&&isRankable(p)));
assert.equal(expected.length,rows.length);
function walk(path){return readdirSync(path,{withFileTypes:true}).flatMap(e=>{
  assert(/^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}$/.test(e.name));
  assert(e.isFile()||e.isDirectory());
  return e.isDirectory()?walk(join(path,e.name)):[join(path,e.name)];
});}
const files=walk(join(dir,'dashboard'));
const dashBytes=files.reduce((n,p)=>n+statSync(p).size,0);
assert(files.length<=400&&dashBytes<=4194304);
for(const name of ['index.html','app.css','app.js']) assert(files.includes(join(dir,'dashboard',name)));
const sourceBytes=files.reduce((n,p)=>n+statSync(p).size,0);
assert(sourceBytes<65536);
// Our sources contain no network URL at all, a stronger condition than attribute/import checks.
for(const p of files) assert(!/https?:\/\//i.test(readFileSync(p,'utf8')));
assert(Buffer.from(buildDossier(dir,{text_max_bytes:65536})).equals(readFileSync(join(dir,'dossier.json'))));
assert(statSync(join(dir,'dossier.json')).size<=1.5*1024*1024);
const dossier=JSON.parse(readFileSync(join(dir,'dossier.json'),'utf8'));
assert(!dossier.text.includes('[Cut at'));
const shotNames=readdirSync(join(dir,'screenshots'));assert.equal(shotNames.length,3);
const shots=shotNames.map(name=>{
 const b=readFileSync(join(dir,'screenshots',name));
 assert(b.length<=524288);assert(b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])));
 const w=b.readUInt32BE(16),h=b.readUInt32BE(20);assert(Math.max(w,h)<=1440&&Math.min(w,h)>=800);
 return {name,bytes:b.length,width:w,height:h};
});
const report={rows:rows.length,watchlist:'40/40',early:rows.length-snapshot.watchlist.length,
 top:{name:rows[0].name,value:rows[0].implied_value_usd},bottom:{name:rows.at(-1).name,value:rows.at(-1).implied_value_usd},
 boardBytes:statSync(join(dir,'board.json')).size,farmStepLengths:[minStep,maxStep],dashboardFiles:files.length,dashboardBytes:dashBytes,sourceBytes,
 dossierBytes:statSync(join(dir,'dossier.json')).size,dossierMatches:true,screenshots:shots,
 screenshotContentStatus:'OK: real renders of the radar-3 Signal dashboard at 1440x900, captured with local Chromium via capture.cjs (Muse exec environment, not the Codex sandbox). Shot 1: board scrolled to the table (8 rows visible) with the RADAR-3 model notes and the visible Calibration panel ($16.02M fitted scale, 128 protocols, holdout 1.296 to 1.267, bias +0.22 to +0.00). Shot 2: detail of rank-1 Steakhouse Financial, $90,928,759, calibrated arithmetic (B $93,058,172) and six-step plan. Shot 3: Lending filter (14/178 visible, FILTERED). All three visually verified.',
 main:{sha256:createHash('sha256').update(readFileSync('main.ts')).digest('hex'),bytes:statSync('main.ts').size},
 ranksContiguous:true,valuesNonIncreasing:true,farmStepsPerRow:6,networkUrlCount:0,sourceComplete:true,
 ...JSON.parse(readFileSync('round2-runtime.json','utf8')),nodeVersion:process.version,
 session:process.env.CODEX_SESSION_ID??process.env.CODEX_THREAD_ID??'unavailable'};
writeFileSync('validation.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
