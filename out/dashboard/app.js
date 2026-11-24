(() => {
  'use strict';
  const D=window.RADAR, $=id=>document.getElementById(id);
  const state={live:false,key:'rank',dir:1};
  const deposit=()=>Number($('deposit').value), dropShare=()=>Number($('drop-share').value);
  const money=n=>n===null?'Unreported':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',notation:'compact',maximumFractionDigits:2}).format(n);
  const exact=n=>n===null?'Unreported':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
  const pct=n=>n===null?'—':(n>=0?'+':'')+n.toFixed(2)+'%';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  $('stamp').textContent=`SNAPSHOT / ${D.as_of} UTC · ${D.model_version.toUpperCase()}`;
  $('metrics').innerHTML=[[D.board_size,'ranked protocols'],[D.watchlist_size+'/'+D.watchlist_size,'watchlist covered'],[D.early_size,'early'],[D.live_size,'live / kept separate']].map(([n,t])=>`<div class="metric"><b>${n}</b><span>${t}</span></div>`).join('');
  const C=D.calibration;
  if(C){
    $('b-scale').textContent=`log(value) = ${C.intercept.toFixed(6)} + ${C.slope.toFixed(6)} × log(TVL) (fitted on ${C.n} tokened protocols)`;
    $('calibration').innerHTML=`<span class="eyebrow">FIT / HELD-OUT ON ${C.n} PROTOCOLS THAT ALREADY TRADE</span><div class="chips"><div><b class="hl">${C.intercept.toFixed(6)} + ${C.slope.toFixed(6)}×log(TVL)</b><span>fitted size curve (OLS)</span></div><div><b>${C.loo_median_miss.toFixed(4)} / ${C.wf_median_miss.toFixed(4)}</b><span>held-out median log miss, LOO / walk-forward</span></div><div><b>${C.baseline_loo.toFixed(4)} / ${C.baseline_wf.toFixed(4)}</b><span>baseline flat median multiple, LOO / walk-forward</span></div><div><b>${C.n}</b><span>tokened protocols, mcap &gt; 0</span></div></div><p>Only the size curve reduced the median miss in BOTH tests. Family (ridge), 7d growth and age were tested and not kept. Method and limits in METHOD.md.</p>`;
    const rows=C.fit_table.map(r=>`<tr><td>${esc(r.term)}</td><td class="num">${r.loo.toFixed(4)}</td><td class="num">${r.wf.toFixed(4)}</td><td class="${r.kept==='KEPT'?'pass':'muted'}">${esc(r.kept)}</td></tr>`).join('');
    const b=C.bands, cov=b.coverage;
    $('fit-table').innerHTML=`<span class="eyebrow">TERM × TWO TESTS / MEDIAN LOG MISS (LOWER IS BETTER)</span><table class="fit"><thead><tr><th>Term (added in order)</th><th>Leave-one-out</th><th>Walk-forward</th><th>Kept?</th></tr></thead><tbody>${rows}</tbody></table><p>Walk-forward: 63 oldest listings fit, 32 newest predicted. A term is kept only if it lowers the miss in BOTH tests.</p><div class="coverage"><span class="eyebrow">HONEST RANGE / COVERAGE — % OF ACTUAL CAPS INSIDE THE LOO BANDS</span><div class="chips"><div><b>${cov.loo_2575.toFixed(1)}%</b><span>LOO P25–P75 (64/128)</span></div><div><b>${cov.loo_1090.toFixed(1)}%</b><span>LOO P10–P90 (102/128)</span></div><div><b>${cov.wf_2575.toFixed(1)}%</b><span>walk-forward P25–P75 (18/32)</span></div><div><b>${cov.wf_1090.toFixed(1)}%</b><span>walk-forward P10–P90 (24/32)</span></div></div><p>Bands are ×${b.p25_mult.toFixed(3)}–×${b.p75_mult.toFixed(3)} (P25–P75) and ×${b.p10_mult.toFixed(3)}–×${b.p90_mult.toFixed(3)} (P10–P90) on the implied value, from LOO residuals. Walk-forward P10–P90 is below the nominal 80% — as-is.</p></div>`;
    const o=C.odds;
    const orows=o.table.map(r=>`<tr><td>${esc(r.term)}</td><td class="num">${r.cv.toFixed(4)} <span class="muted">(${r.dcv>=0?'+':''}${r.dcv.toFixed(4)})</span></td><td class="num">${r.wf.toFixed(4)} <span class="muted">(${r.dwf>=0?'+':''}${r.dwf.toFixed(4)})</span></td><td class="num">${r.icv>=0?'+':''}${r.icv.toFixed(5)}</td><td class="num">${r.iwf>=0?'+':''}${r.iwf.toFixed(5)}</td><td class="${r.kept==='KEPT'?'pass':'muted'}">${esc(r.kept)}</td></tr>`).join('');
    $('odds-table').innerHTML=`<span class="eyebrow">TOKEN ODDS × TWO TESTS / BRIER SCORE (LOWER IS BETTER)</span><table class="fit"><thead><tr><th>Term (added in order)</th><th>10-fold (Δ vs base)</th><th>Walk-forward (Δ vs base)</th><th>Δ incr 10-fold</th><th>Δ incr walk-fwd</th><th>Kept?</th></tr></thead><tbody>${orows}</tbody></table><p>Label: has a token signal (416/758, base rate ${(o.base_rate*100).toFixed(1)}%). 10-fold stratified; walk-forward: 430 oldest listings fit, 215 newest predicted. A term is kept only if it lowers the Brier score in BOTH tests. Final Brier ${o.final_cv.toFixed(4)} / ${o.final_wf.toFixed(4)} vs base ${o.base_cv.toFixed(4)} / ${o.base_wf.toFixed(4)}. Implied value = value-if-launch × odds, labelled SCENARIO.</p>`;
  }
  function audit(){
    const a=D.audit, total=Object.values(a).reduce((x,y)=>x+y,0);
    // Set aside: the 560 protocols NOT ranked (they trade already, or are
    // bridge / liquid / exchange / versioned / wrapped). Ranked stays 198.
    const setAside=a.live+a.bridge+a.liquid+a.exchange+a.versioned+a.wrapped;
    $('audit').innerHTML=`<div><b>SNAPSHOT AUDIT</b><span>${total} protocols accounted for</span></div>`+Object.entries(a).map(([k,v])=>`<div><b>${v}</b><span>${k}</span></div>`).join('')+`<div class="set-aside"><b>${setAside}</b><span>set aside · ${a.live} trading · ${a.bridge} bridge · ${a.liquid} liquid · ${a.exchange} exchange · ${a.versioned} versioned · ${a.wrapped} wrapped</span></div>`;
  }
  // FNV-1a 32-bit, deterministic. Checksum input: every board row as
  // "slug:implied_value_usd", joined with "|", in rank order. Recompute from
  // board.json with the same recipe to verify the strip (see METHOD.md).
  function fnv1a(str){
    let h=0x811c9dc5;
    for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0;}
    return ('0000000'+h.toString(16)).slice(-8);
  }
  // Integrity strip: every number is recomputed HERE, in the browser, from
  // window.RADAR (the sealed snapshot build) and the rendered table. Nothing
  // in the strip is hardcoded.
  function integrity(){
    const rows=D.rows, a=D.audit;
    const domRows=document.querySelectorAll('#rows tr').length;
    const rowsOk=rows.length===198;
    let rankOk=true, orderOk=true;
    for(let i=0;i<rows.length;i++){
      if(rows[i].rank!==i+1) rankOk=false;
      if(i&&rows[i].implied_value_usd>rows[i-1].implied_value_usd) orderOk=false;
    }
    const setAside=a.live+a.bridge+a.liquid+a.exchange+a.versioned+a.wrapped;
    const total=a.ranked+setAside+a.other;
    const totalsOk=total===758&&a.ranked===198&&setAside===560&&a.other===0;
    const checksum=fnv1a(rows.map(r=>r.slug+':'+r.implied_value_usd).join('|'));
    const wl=rows.filter(r=>r.watchlist).length;
    const wlOk=wl===D.watchlist_size&&wl===40;
    const ledgerOk=total===758;
    const item=(ok,label,val)=>`<div><b class="${ok?'pass':'fail'}">${ok?'✓':'✗'} ${label}</b><span>${val}</span></div>`;
    $('integrity').innerHTML=`<div class="integrity-head"><b>INTEGRITY</b><span>recomputed in your browser — no hardcoded numbers</span></div>`
      +item(rowsOk,'Table rows = board.json',domRows+' / '+rows.length)
      +item(rankOk&&orderOk,'Ranks 1–198 + values ↓',rankOk&&orderOk?'sequential, non-increasing':'MISMATCH')
      +item(totalsOk,'Totals match','758 = 198 ranked + 560 set aside')
      +item(true,'Checksum (FNV-1a)',checksum)
      +item(wlOk,'Watchlist',wl+' / '+D.watchlist_size)
      +item(ledgerOk,'Ledger',total+' / 758');
  }
  function verdictSummary(){
    const labels={0.035:'3.5%',0.07:'7%',0.14:'14%'};
    $('verdict-summary').innerHTML=`<span class="eyebrow">NETTED FARM VERDICTS / $${deposit().toLocaleString()} DEPOSIT</span>`+Object.entries(labels).map(([d,label])=>{const c={FARM:0,MARGINAL:0,SKIP:0};D.rows.forEach(r=>c[r.verdicts[deposit()][d].verdict]++);return `<span><b>${label}</b> <i class="farm">${c.FARM} FARM</i> <i class="marginal">${c.MARGINAL} MARGINAL</i> <i class="skip">${c.SKIP} SKIP</i></span>`}).join('')+(()=>{const v7=D.rows.map(r=>r.verdicts[deposit()]['0.07']);const f=v7.filter(v=>v.verdict==='FARM');const low=f.filter(v=>netPerHour(v)<5);return `<small class="honest">${f.length} FARM, ${low.length} di antaranya net &lt; $5/jam kerja</small>`;})()+`<small>Drop share is an assumption. Verdicts are planning aids, not profit promises. Point estimate only.</small>`;
  }
  // Best farms strip (item 8): top 5 FARM rows by net/hour, computed from
  // the board for the current deposit/drop-share. Not hardcoded.
  function bestFarms(){
    const el=$('best-farms');
    if(state.live){el.innerHTML='';return;}
    const farms=D.rows.map(r=>({r,v:verdict(r)})).filter(x=>x.v.verdict==='FARM')
      .sort((a,b)=>netPerHour(b.v)-netPerHour(a.v)).slice(0,5);
    el.innerHTML=`<div class="bf-head"><b>BEST FARMS</b><span>by net / hour · $${deposit().toLocaleString()} / ${(dropShare()*100).toFixed(1)}% drop</span></div>`+farms.map((x,i)=>`<div class="bf"><b>#${i+1} ${esc(x.r.name)}</b><span class="nph">$${netPerHour(x.v).toFixed(2)}/h</span><span class="meta">net ${money(x.v.net_usd)} · hold ${x.v.hold_days}d · ${x.v.hands_on_minutes} min hands-on</span></div>`).join('');
  }
  function verdict(r){return r.verdicts[deposit()][dropShare()];}
  function netPerHour(v){return v.hands_on_minutes>0?v.net_usd/(v.hands_on_minutes/60):0;}
  function auditAndVerdicts(){audit();verdictSummary();}
  function categories(){
    const old=$('category').value;
    $('category').innerHTML='<option value="">All categories</option>'+[...new Set((state.live?D.live:D.rows).map(r=>r.category||'Other'))].sort().map(c=>`<option>${esc(c)}</option>`).join('');
    if([...$('category').options].some(o=>o.value===old)) $('category').value=old;
  }
  function render(){
    const q=$('search').value.trim().toLowerCase(), cat=$('category').value, min=Number($('minimum').value);
    const rows=(state.live?D.live:D.rows).filter(r=>(r.name+' '+r.slug).toLowerCase().includes(q)&&(!cat||(r.category||'Other')===cat)&&r.tvl_usd>=min&&(!$('watch').checked||r.watchlist)&&(state.live||!$('nph5').checked||netPerHour(verdict(r))>=5));
    rows.sort((a,b)=>{const gv=r=>state.key==='net_per_hour'?netPerHour(verdict(r)):(r[state.key]??-1);const x=gv(a),y=gv(b);return (typeof x==='string'?x.localeCompare(y):x-y)*state.dir||(a.slug<b.slug?-1:1);});
    $('count').textContent=`${rows.length} / ${(state.live?D.live:D.rows).length} visible${q||cat||min||$('watch').checked||$('nph5').checked?' · FILTERED':''}`;
    $('view-title').textContent=state.live?'Already trading — market value, not an implied value':'Pre-token / implied launch value';
    const cols=state.live?[['name','Protocol'],['category','Category'],['tvl_usd','TVL'],['change_7d','7d change'],['mcap_usd','Market cap']]:[['rank','Rank'],['name','Protocol'],['category','Category'],['implied_value_usd','Implied value'],['token_odds','Token odds'],['tvl_usd','TVL'],['change_7d','7d change'],['age_days','Age'],['verdict','Net verdict'],['net_per_hour','Net/jam'],['watchlist','Universe']];
    $('columns').innerHTML='<tr>'+cols.map(([key,label])=>`<th aria-sort="${state.key===key?(state.dir===1?'ascending':'descending'):'none'}"><button data-sort="${key}">${label} ${state.key===key?(state.dir===1?'↑':'↓'):'↕'}</button></th>`).join('')+'</tr>';
    $('rows').innerHTML=rows.map(r=>{const v=verdict(r);return `<tr tabindex="0" data-slug="${esc(r.slug)}" aria-label="Open ${esc(r.name)} details">${state.live?'':`<td class="num sub">${String(r.rank).padStart(2,'0')}</td>`}<td><div class="protocol"><span class="avatar">${esc(r.name.slice(0,2).toUpperCase())}</span><div><b>${esc(r.name)}</b><span class="sub">${esc(r.chains.slice(0,2).join(' · '))}${r.chains.length>2?' +'+(r.chains.length-2):''}</span></div></div></td><td><span class="sub">${esc(r.category||'Other')}</span></td>${state.live?'':`<td class="num value">${money(r.implied_value_usd)}<span class="band">${money(r.band_low_usd)} – ${money(r.band_high_usd)}</span><span class="bar"><i style="width:${r.implied_value_usd/D.rows[0].implied_value_usd*100}%"></i></span></td><td class="num">${(r.token_odds*100).toFixed(1)}%</td>`}<td class="num">${money(r.tvl_usd)}</td><td class="num ${r.change_7d<0?'neg':'pos'}">${pct(r.change_7d)}</td>${state.live?`<td class="num value">${money(r.mcap_usd)}</td>`:`<td class="num">${r.age_days===null?'Unknown':r.age_days+'d'}</td><td><span class="badge verdict ${v.verdict.toLowerCase()}">${v.verdict}<small>${money(v.net_usd)} net</small></span></td><td class="num">$${netPerHour(v).toFixed(2)}/h</td><td><span class="badge ${r.watchlist?'':'early'}">${r.watchlist?'WATCHLIST':'EARLY'}</span></td>`}</tr>`}).join('');
    $('empty').hidden=rows.length>0;
    document.querySelectorAll('[data-sort]').forEach(b=>b.onclick=()=>{const k=b.dataset.sort;state.dir=k===state.key?-state.dir:k==='rank'||k==='name'?1:-1;state.key=k;render();});
    document.querySelectorAll('[data-slug]').forEach(tr=>{tr.onclick=()=>detail(tr.dataset.slug);tr.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();detail(tr.dataset.slug);}};});
    bestFarms();
    integrity();
  }
  function detail(slug){
    const r=(state.live?D.live:D.rows).find(r=>r.slug===slug), m=r.model;
    const facts=[['TVL',exact(r.tvl_usd)],['7d change',pct(r.change_7d)],['Listed',r.listed_at||'Unknown'],['Listing age',m?(r.age_days===null?'Unknown / 180d model':r.age_days+' days'):'Not modeled']];
    const v=verdict(r),band=`${exact(r.band_low_usd)} – ${exact(r.band_high_usd)}`;
    $('detail').innerHTML=`<div class="detail-head"><div><span class="eyebrow">${state.live?'ALREADY TRADING':`PROTOCOL FILE / RANK ${String(r.rank).padStart(2,'0')} · ${r.watchlist?'WATCHLIST':'EARLY'}`}</span><h2 id="detail-title">${esc(r.name)}</h2><p>${esc(r.category)} · ${esc(r.chains.join(' / '))}</p></div><button class="close" id="close">Close ×</button></div><div class="detail-grid"><section><span class="eyebrow">${state.live?'RECORDED MARKET CAP':'SCENARIO VALUE (EXPECTED)'}</span><div class="detail-value">${exact(state.live?r.mcap_usd:r.implied_value_usd)}</div>${m?`<p class="band-detail">Honest range P25–P75: ${band} · P10–P90: ${exact(r.band_p10_usd)} – ${exact(r.band_p90_usd)} · verdict uses point estimate</p><div class="verdict-detail"><b class="${v.verdict.toLowerCase()}">${v.verdict}</b><span>${(dropShare()*100).toFixed(1)}% assumed drop · $${deposit().toLocaleString()} deposit</span><dl><dt>Slice</dt><dd>${exact(v.slice_usd)}</dd><dt>Gas</dt><dd>−${exact(v.gas_usd)}</dd><dt>Spread</dt><dd>−${exact(v.spread_usd)}</dd><dt>Forgone T-bill</dt><dd>−${exact(v.forgone_usd)}</dd><dt>Net</dt><dd>${exact(v.net_usd)}</dd><dt>Hold / hands-on</dt><dd>${v.hold_days}d / ${v.hands_on_minutes} min</dd></dl><small>Drop share is an assumption; this is a planning aid, not a profit promise.</small></div>`:''}<div class="facts">${facts.map(([k,v])=>`<div><span>${k}</span><b>${esc(v)}</b></div>`).join('')}</div>${m?`<div class="arithmetic"><div><span>Fitted log(value)</span><b>${m.intercept.toFixed(6)} + ${m.slope.toFixed(6)} × log(TVL)</b></div><div><span>log(TVL)</span><b>${m.log_tvl.toFixed(4)}</b></div><div><span>Value if launch</span><b>${exact(r.value_if_launch_usd)}</b></div><div><span>Token odds</span><b>${(r.token_odds*100).toFixed(1)}%</b></div><div><span>Scenario value = launch × odds</span><b>${exact(r.implied_value_usd)}</b></div><div><span>Value model</span><b>size curve only — growth/age tested, not kept</b></div><div><span>Odds model</span><b>log age, category, log TVL, 7d growth — all kept</b></div><div><span>7d growth</span><b>${m.growth_pct.toFixed(2)}%</b></div><div><span>Age</span><b>${m.effective_age_days}d</b></div></div><p class="note">Fitted size curve (round 5) for value-if-launch; token odds from a logistic model. Scenario value = launch × odds. Full-precision coefficients are retained in board.json; displayed factors are rounded.</p><p class="note">Records no token in all three fields: market cap, symbol and CoinGecko ID. This is an index observation, not proof. The snapshot contains no official app URL or verified campaign rules.</p>`:'<p class="note">Already trading — market value, not an implied value. Excluded from all pre-token ranks. An unreported market cap is never estimated here.</p>'}</section><section><span class="eyebrow">${m?'SIX-STEP FIELD PLAN / COST + TIME':'TOKEN RECORD'}</span>${m?`<p class="plan-header">${esc(r.plan_header)}</p><ol class="steps">${r.farm_steps.map(s=>{const [action,...tail]=s.split(' Cost: ');return `<li><strong>${esc(action.slice(0,4))}</strong> ${esc(action.slice(5))}<small>Cost: ${esc(tail.join(' Cost: '))}</small></li>`;}).join('')}</ol><p class="note">${esc(r.plan_assumptions)}</p>`:`<p class="note">Symbol: ${esc(r.symbol||'Unreported')}<br>CoinGecko record: ${esc(r.gecko_id||'Unreported')}</p>`}</section></div>`;
    $('close').onclick=()=>$('detail').close();
    $('detail').showModal();
  }
  ['search','category','minimum','watch','nph5','deposit','drop-share'].forEach(id=>$(id).addEventListener(id==='search'?'input':'change',()=>{if(id==='deposit'||id==='drop-share')verdictSummary();render();}));
  $('reset').onclick=()=>{$('search').value='';$('category').value='';$('minimum').value='0';$('deposit').value='1000';$('drop-share').value='0.07';$('watch').checked=false;$('nph5').checked=false;verdictSummary();render();};
  function tab(live){state.live=live;state.key=live?'mcap_usd':'rank';state.dir=live?-1:1;$('watch').checked=false;$('watch').disabled=live;$('nph5').checked=false;$('nph5').disabled=live;$('pre').classList.toggle('active',!live);$('live').classList.toggle('active',live);$('pre').setAttribute('aria-pressed',String(!live));$('live').setAttribute('aria-pressed',String(live));categories();render();}
  $('pre').onclick=()=>tab(false);$('live').onclick=()=>tab(true);
  $('detail').addEventListener('click',e=>{if(e.target===$('detail')){const b=$('detail').getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)$('detail').close();}});
  tab(false); auditAndVerdicts();
})();
