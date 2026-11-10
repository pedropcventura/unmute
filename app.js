(()=>{
const Q=new URLSearchParams(location.search);
const STATIC=Q.has('static'),PRESENTER=Q.has('presenter');
const C=window.CONTENT||{notes:[],bib:[]};
const NOTE={};C.notes.forEach(n=>NOTE[n.tela]=n);
const BIB={};C.bib.forEach(b=>BIB[b.id]=b);
const slides=[...document.querySelectorAll('.slide')];
const stage=document.getElementById('stage');
const ch='BroadcastChannel' in window?new BroadcastChannel('unmute'):null;
const T0KEY='unmute-t0';
const toSec=s=>{const[m,x]=s.split(':').map(Number);return m*60+x};
const fmt=s=>{s=Math.max(0,Math.floor(s));return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')};
let cur=0,timers=[];
function later(fn,ms){timers.push(setTimeout(fn,STATIC?0:ms))}
function clear(){timers.forEach(clearTimeout);timers=[]}
const title=s=>s.dataset.title||'';
const note=s=>NOTE[+s.dataset.tela];
function refsOf(s){return(s.dataset.refs?s.dataset.refs.split(/[ ,]+/):(note(s)||{}).refs)||[]}

/* planned schedule */
let acc=0;const plan={};C.notes.forEach(n=>{plan[n.tela]=acc;acc+=toSec(n.time)});

function startClock(){if(!localStorage.getItem(T0KEY))localStorage.setItem(T0KEY,Date.now())}
function elapsed(){const t=+localStorage.getItem(T0KEY);return t?(Date.now()-t)/1000:0}

if(PRESENTER){initPresenter();return}
if(STATIC)document.body.classList.add('static');

/* BOM chart */
const bom=document.getElementById('bom');
if(bom&&C.bom){const mx=3500,br=n=>n.toLocaleString('pt-BR');
  bom.innerHTML=C.bom.map(([n,a,b],k)=>`<div class="rng${k===0?' hot':''}"><span class="nm">${n}</span><span class="track"><i style="left:${a/mx*100}%;width:${(b-a)/mx*100}%;transition-delay:${.6+k*.1}s"></i></span><span class="val">${br(a)}–${br(b)}</span></div>`).join('')}
/* prepare */
slides.forEach(s=>{
  s.querySelectorAll('.r').forEach((el,i)=>{el.style.transitionDelay=(el.dataset.d??(.15+i*.12))+'s'});
  s.querySelectorAll('.words').forEach(p=>{
    const out=[];
    p.childNodes.forEach(n=>{
      const hl=n.nodeType===1;const txt=n.textContent;
      txt.split(/(\s+)/).forEach(w=>{if(!w)return;out.push(/^\s+$/.test(w)?w:`<span class="w${hl?' hl':''}">${w}</span>`)})
      if(n.nodeName==='BR')out.push('<br>');
    });
    p.innerHTML=out.join('');
  });
  const refs=refsOf(s);
  if(refs.length){
    const b=document.createElement('button');b.className='src';b.textContent='Fontes · '+refs.join(' ');
    const pop=document.createElement('div');pop.className='srcpop';
    pop.innerHTML=refs.map(r=>{const e=BIB[r];return e?`<p><b>[${r}]</b> ${e.text}${e.url?` <a href="${e.url}" target="_blank" rel="noopener">${e.url}</a>`:''}</p>`:''}).join('');
    b.onclick=e=>{e.stopPropagation();pop.classList.toggle('open')};
    pop.onclick=e=>e.stopPropagation();
    s.append(b,pop);
  }
});

function run(s){
  s.querySelectorAll('.words').forEach(p=>{
    const ws=[...p.querySelectorAll('.w')];ws.forEach(w=>w.classList.remove('on'));
    ws.forEach((w,i)=>later(()=>w.classList.add('on'),500+i*(+p.dataset.speed||110)));
  });
  s.querySelectorAll('[data-count]').forEach(el=>{
    const to=+el.dataset.count,dec=+(el.dataset.dec||0),suf=el.dataset.suf||'';
    const f=v=>v.toLocaleString('pt-BR',{minimumFractionDigits:dec,maximumFractionDigits:dec})+suf;
    if(STATIC){el.textContent=f(to);return}
    el.textContent=f(0);const t0=performance.now()+700,d=1800;
    const step=t=>{const k=Math.min(1,Math.max(0,(t-t0)/d));el.textContent=f(to*(1-Math.pow(1-k,3)));if(k<1&&cur===slides.indexOf(s))requestAnimationFrame(step)};
    requestAnimationFrame(step);
  });
  s.querySelectorAll('.bub').forEach(b=>{b.classList.remove('on');later(()=>b.classList.add('on'),+b.dataset.at||0)});
  s.querySelectorAll('[data-typer]').forEach(el=>{
    const items=JSON.parse(el.dataset.typer);let k=0;
    const tick=()=>{
      const[who,line]=items[k%items.length];
      el.innerHTML=`<div class="who${/2/.test(who)?' p2':''}">${who}</div><div class="line"><span class="tx"></span><span class="caret"></span></div>`;
      const tx=el.querySelector('.tx');let i=0;
      if(STATIC){tx.textContent=line;return}
      const type=()=>{tx.textContent=line.slice(0,++i);if(i<line.length)later(type,38);else if(items.length>1){k++;later(tick,2600)}};
      type();
    };
    el.innerHTML='';later(tick,+el.dataset.delay||1800);
  });
}

function go(i,from){
  i=Math.max(0,Math.min(slides.length-1,i));
  clear();document.querySelectorAll('.srcpop.open').forEach(p=>p.classList.remove('open'));
  slides.forEach((s,k)=>s.classList.toggle('active',k===i));
  cur=i;run(slides[i]);
  document.getElementById('bar').style.width=(i/(slides.length-1)*100)+'%';
  document.getElementById('count').textContent=`${i+1} / ${slides.length} · ${title(slides[i])}`;
  history.replaceState(null,'','#'+(i+1)+(STATIC?'':''));
  if(i>0)startClock();
  if(ch&&from!=='remote')ch.postMessage({i});
}
ch&&(ch.onmessage=e=>{if(e.data.go!=null)go(e.data.go,'remote');if(e.data.ask)ch.postMessage({i:cur})});

function fit(){stage.style.setProperty('--s',Math.min(innerWidth/1920,innerHeight/1080))}
addEventListener('resize',fit);fit();

/* index */
const idx=document.getElementById('index');
idx.querySelector('ol').innerHTML=slides.map((s,k)=>`<li data-k="${k}"><b>${String(k+1).padStart(2,'0')}</b>${title(s)}</li>`).join('');
idx.onclick=e=>{const li=e.target.closest('li');if(li){go(+li.dataset.k)}idx.classList.remove('open')};
const presenter=()=>window.open(location.pathname+'?presenter','unmute-presenter','width=1200,height=760');

addEventListener('keydown',e=>{
  if(e.metaKey||e.ctrlKey||e.altKey)return;
  const k=e.key;
  if(['ArrowRight','ArrowDown','PageDown',' '].includes(k)){e.preventDefault();go(cur+1)}
  else if(['ArrowLeft','ArrowUp','PageUp'].includes(k)){e.preventDefault();go(cur-1)}
  else if(k==='Home')go(0);else if(k==='End')go(slides.length-1);
  else if(k==='i'||k==='I')idx.classList.toggle('open');
  else if(k==='p'||k==='P')presenter();
  else if(k==='f'||k==='F'){const p=slides[cur].querySelector('.srcpop');p&&p.classList.toggle('open')}
  else if(k==='Escape'){idx.classList.remove('open');document.querySelectorAll('.srcpop.open').forEach(p=>p.classList.remove('open'))}
});
stage.addEventListener('click',e=>{if(e.target.closest('a,button,.srcpop'))return;document.querySelector('.srcpop.open')?document.querySelectorAll('.srcpop.open').forEach(p=>p.classList.remove('open')):go(cur+1)});
document.getElementById('btnIdx').onclick=()=>idx.classList.toggle('open');
document.getElementById('btnPres').onclick=presenter;
document.getElementById('btnFs').onclick=()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen();
setInterval(()=>{document.getElementById('clock').textContent=fmt(elapsed())},500);
go((parseInt(location.hash.slice(1))||1)-1);

/* presenter window */
function initPresenter(){
  document.body.className='presenter';
  document.getElementById('viewport').remove();document.getElementById('hud').remove();document.getElementById('bar').remove();
  const v=document.createElement('div');v.className='pv';document.body.append(v);
  let i=0;
  const render=()=>{
    const s=slides[i],n=note(s),nx=slides[i+1];
    v.innerHTML=`<div style="display:flex;flex-direction:column;min-height:0">
      <div class="now">${i+1} / ${slides.length}${n?` · Tela ${n.tela} · ${n.act} · tempo sugerido ${n.time}`:''}</div>
      <h2>${title(s)}</h2>
      <div class="script">${n?n.script:(s.dataset.note||'Sem roteiro para esta tela.')}${n?`<div class="rig">Nota de rigor: ${n.rigor}</div>`:''}</div></div>
      <div class="side"><div><div class="clock" id="pc">00:00</div><div class="budget" id="pb"></div></div>
      <div><button id="pp">← Anterior</button><button id="pn">Próximo →</button><button id="pr">Zerar cronômetro</button></div>
      <div class="next">A seguir: <b>${nx?title(nx):'fim'}</b></div>
      <div class="budget">Atalhos: ← → navegam as duas janelas.</div></div>`;
    v.querySelector('#pp').onclick=()=>send(i-1);v.querySelector('#pn').onclick=()=>send(i+1);
    v.querySelector('#pr').onclick=()=>{localStorage.setItem(T0KEY,Date.now())};
    tickP();
  };
  const tickP=()=>{const pc=document.getElementById('pc');if(!pc)return;pc.textContent=fmt(elapsed());
    const n=note(slides[i]);document.getElementById('pb').textContent=n?`Planejado ao iniciar esta tela: ${fmt(plan[n.tela])} · total 15:00`:'Total planejado: 15:00'};
  const send=k=>{k=Math.max(0,Math.min(slides.length-1,k));i=k;render();startClock();ch&&ch.postMessage({go:k})};
  ch&&(ch.onmessage=e=>{if(e.data.i!=null){i=e.data.i;render()}});
  addEventListener('keydown',e=>{if(['ArrowRight','ArrowDown','PageDown',' '].includes(e.key)){e.preventDefault();send(i+1)}else if(['ArrowLeft','ArrowUp','PageUp'].includes(e.key)){e.preventDefault();send(i-1)}});
  setInterval(tickP,500);render();ch&&ch.postMessage({ask:1});
}
})();
