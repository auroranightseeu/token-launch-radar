(() => {
  'use strict';
  const D=window.RADAR, $=id=>document.getElementById(id);
  const state={live:false,key:'rank',dir:1};
  const money=n=>n===null?'Unreported':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',notation:'compact',maximumFractionDigits:2}).format(n);
  const exact=n=>n===null?'Unreported':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
  const pct=n=>n===null?'—':(n>=0?'+':'')+n.toFixed(2)+'%';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  $('stamp').textContent=`SNAPSHOT / ${D.as_of} UTC · ${D.model_version.toUpperCase()}`;
  $('metrics').innerHTML=[[D.board_size,'ranked protocols'],[D.watchlist_size+'/'+D.watchlist_size,'watchlist covered'],[D.early_size,'early / below $50M'],[D.live_size,'live / kept separate']].map(([n,t])=>`<div class="metric"><b>${n}</b><span>${t}</span></div>`).join('');
  const C=D.calibration;
  if(C){
    const fmt=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',notation:'compact',maximumFractionDigits:2}).format(n);
    $('b-scale').textContent=`B = ${fmt(C.scale_usd)} × log₂(1 + TVL / $50M)${C.fallback?' (assumed — calibration fallback)':' (fitted)'}`;
    const m2=C.oof.radar2, m3=C.oof.radar3;
    const sgn=n=>(n>=0?'+':'')+n.toFixed(2);
    $('calibration').innerHTML=`<span class="eyebrow">CALIBRATION / FITTED ON ${C.n} PROTOCOLS THAT ALREADY TRADE</span><div class="chips"><div><b class="hl">${fmt(C.scale_usd)}</b><span>fitted scale (was $20M assumed)</span></div><div><b>× ${C.ratio_vs_20m.toFixed(3)}</b><span>scale vs the $20M assumption</span></div><div><b>${C.n}</b><span>tokened protocols, mcap &gt; 0</span></div><div><b>${m2.median_abs_log_err.toFixed(3)} → ${m3.median_abs_log_err.toFixed(3)}</b><span>holdout median log error, radar-2 → radar-3</span></div><div><b>${sgn(m2.bias)} → ${sgn(m3.bias)}</b><span>holdout bias, radar-2 → radar-3</span></div></div><p>5-fold holdout on the 128 tokened protocols: the fitted scale removes the +22% level bias and lowers the median error. Ranking is unchanged — a pure scale change cannot re-rank. Method and limits in METHOD.md.</p>`;
  }
  function categories(){
    const old=$('category').value;
    $('category').innerHTML='<option value="">All categories</option>'+[...new Set((state.live?D.live:D.rows).map(r=>r.category||'Other'))].sort().map(c=>`<option>${esc(c)}</option>`).join('');
    if([...$('category').options].some(o=>o.value===old)) $('category').value=old;
  }
  function render(){
    const q=$('search').value.trim().toLowerCase(), cat=$('category').value, min=Number($('minimum').value);
    const rows=(state.live?D.live:D.rows).filter(r=>(r.name+' '+r.slug).toLowerCase().includes(q)&&(!cat||(r.category||'Other')===cat)&&r.tvl_usd>=min&&(!$('watch').checked||r.watchlist));
    rows.sort((a,b)=>{const x=a[state.key]??-1,y=b[state.key]??-1;return (typeof x==='string'?x.localeCompare(y):x-y)*state.dir||(a.slug<b.slug?-1:1);});
    $('count').textContent=`${rows.length} / ${(state.live?D.live:D.rows).length} visible${q||cat||min||$('watch').checked?' · FILTERED':''}`;
    $('view-title').textContent=state.live?'Already trading — market value, not an implied value':'Pre-token / implied launch value';
    const cols=state.live?[['name','Protocol'],['category','Category'],['tvl_usd','TVL'],['change_7d','7d change'],['mcap_usd','Market cap']]:[['rank','Rank'],['name','Protocol'],['category','Category'],['implied_value_usd','Implied value'],['tvl_usd','TVL'],['change_7d','7d change'],['age_days','Age'],['watchlist','Universe']];
    $('columns').innerHTML='<tr>'+cols.map(([key,label])=>`<th aria-sort="${state.key===key?(state.dir===1?'ascending':'descending'):'none'}"><button data-sort="${key}">${label} ${state.key===key?(state.dir===1?'↑':'↓'):'↕'}</button></th>`).join('')+'</tr>';
    $('rows').innerHTML=rows.map(r=>`<tr tabindex="0" data-slug="${esc(r.slug)}" aria-label="Open ${esc(r.name)} details">${state.live?'':`<td class="num sub">${String(r.rank).padStart(2,'0')}</td>`}<td><div class="protocol"><span class="avatar">${esc(r.name.slice(0,2).toUpperCase())}</span><div><b>${esc(r.name)}</b><span class="sub">${esc(r.chains.slice(0,2).join(' · '))}${r.chains.length>2?' +'+(r.chains.length-2):''}</span></div></div></td><td><span class="sub">${esc(r.category||'Other')}</span></td>${state.live?'':`<td class="num value">${money(r.implied_value_usd)}<span class="bar"><i style="width:${r.implied_value_usd/D.rows[0].implied_value_usd*100}%"></i></span></td>`}<td class="num">${money(r.tvl_usd)}</td><td class="num ${r.change_7d<0?'neg':'pos'}">${pct(r.change_7d)}</td>${state.live?`<td class="num value">${money(r.mcap_usd)}</td>`:`<td class="num">${r.age_days===null?'Unknown':r.age_days+'d'}</td><td><span class="badge ${r.watchlist?'':'early'}">${r.watchlist?'WATCHLIST':'EARLY'}</span></td>`}</tr>`).join('');
    $('empty').hidden=rows.length>0;
    document.querySelectorAll('[data-sort]').forEach(b=>b.onclick=()=>{const k=b.dataset.sort;state.dir=k===state.key?-state.dir:k==='rank'||k==='name'?1:-1;state.key=k;render();});
    document.querySelectorAll('[data-slug]').forEach(tr=>{tr.onclick=()=>detail(tr.dataset.slug);tr.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();detail(tr.dataset.slug);}};});
  }
  function detail(slug){
    const r=(state.live?D.live:D.rows).find(r=>r.slug===slug), m=r.model;
    const facts=[['TVL',exact(r.tvl_usd)],['7d change',pct(r.change_7d)],['Listed',r.listed_at||'Unknown'],['Listing age',m?(r.age_days===null?'Unknown / 180d model':r.age_days+' days'):'Not modeled']];
    $('detail').innerHTML=`<div class="detail-head"><div><span class="eyebrow">${state.live?'ALREADY TRADING':`PROTOCOL FILE / RANK ${String(r.rank).padStart(2,'0')} · ${r.watchlist?'WATCHLIST':'EARLY'}`}</span><h2 id="detail-title">${esc(r.name)}</h2><p>${esc(r.category)} · ${esc(r.chains.join(' / '))}</p></div><button class="close" id="close">Close ×</button></div><div class="detail-grid"><section><span class="eyebrow">${state.live?'RECORDED MARKET CAP':'IMPLIED LAUNCH VALUE'}</span><div class="detail-value">${exact(state.live?r.mcap_usd:r.implied_value_usd)}</div><div class="facts">${facts.map(([k,v])=>`<div><span>${k}</span><b>${esc(v)}</b></div>`).join('')}</div>${m?`<div class="arithmetic"><div><span>Logarithmic base B</span><b>${exact(m.base_usd)}</b></div><div><span>Clamped growth</span><b>${m.growth_pct.toFixed(2)}%</b></div><div><span>Growth G</span><b>× ${m.growth_multiplier.toFixed(6)}</b></div><div><span>Maturity M</span><b>× ${m.maturity_multiplier.toFixed(6)}</b></div><div><span>Effective age</span><b>${m.effective_age_days}d</b></div><div><span>Rounded B × G × M</span><b>${exact(r.implied_value_usd)}</b></div></div><p class="note">Same snapshot-only formula for every name. Full-precision multipliers are retained in board.json; displayed factors are rounded. No category valuation adjustments.</p><p class="note">Records no token in all three fields: market cap, symbol and CoinGecko ID. This is an index observation, not proof. The snapshot contains no official app URL or verified campaign rules.</p>`:'<p class="note">Already trading — market value, not an implied value. Excluded from all pre-token ranks. An unreported market cap is never estimated here.</p>'}</section><section><span class="eyebrow">${m?'SIX-STEP FIELD PLAN / COST + TIME':'TOKEN RECORD'}</span>${m?`<ol class="steps">${r.farm_steps.map(s=>{const [action,...tail]=s.split(' Cost: ');return `<li><strong>${esc(action.slice(0,4))}</strong> ${esc(action.slice(5))}<small>Cost: ${esc(tail.join(' Cost: '))}</small></li>`;}).join('')}</ol>`:`<p class="note">Symbol: ${esc(r.symbol||'Unreported')}<br>CoinGecko record: ${esc(r.gecko_id||'Unreported')}</p>`}</section></div>`;
    $('close').onclick=()=>$('detail').close();
    $('detail').showModal();
  }
  ['search','category','minimum','watch'].forEach(id=>$(id).addEventListener(id==='search'?'input':'change',render));
  $('reset').onclick=()=>{$('search').value='';$('category').value='';$('minimum').value='0';$('watch').checked=false;render();};
  function tab(live){state.live=live;state.key=live?'mcap_usd':'rank';state.dir=live?-1:1;$('watch').checked=false;$('watch').disabled=live;$('pre').classList.toggle('active',!live);$('live').classList.toggle('active',live);$('pre').setAttribute('aria-pressed',String(!live));$('live').setAttribute('aria-pressed',String(live));categories();render();}
  $('pre').onclick=()=>tab(false);$('live').onclick=()=>tab(true);
  $('detail').addEventListener('click',e=>{if(e.target===$('detail')){const b=$('detail').getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)$('detail').close();}});
  tab(false);
})();
