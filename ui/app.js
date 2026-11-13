// Workwood window. Draws what the service reports and sends back what you do.
const P={
  plus:'<path d="M12 5v14M5 12h14"/>',
  chat:'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  term:'<path d="m4 17 6-6-6-6M12 19h8"/>',
  diff:'<path d="M12 4v8M8 8h8M8 18h8"/>',
  code:'<path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/>',
  clip:'<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
  up:'<path d="M12 19V5M5 12l7-7 7 7"/>',
  max:'<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>',
  min:'<path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/>',
  ext:'<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"/>',
  x:'<path d="M18 6 6 18M6 6l12 12"/>',
  refresh:'<path d="M21 12a9 9 0 1 1-2.64-6.36L21 8"/><path d="M21 3v5h-5"/>',
  zap:'<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
  pencil:'<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
  archive:'<rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8M10 12h4"/>',
  trash:'<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  dots:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
  cog:'<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  gear:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
  'chev-d':'<path d="m6 9 6 6 6-6"/>',
  'chev-r':'<path d="m9 6 6 6-6 6"/>',
  'chev-l':'<path d="m15 6-6 6 6 6"/>',
  play:'<path d="M6 4l14 8-14 8z"/>',
  folder:'<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
  'folder-plus':'<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2zM12 11v6M9 14h6"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  mic:'<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3"/>',
  list:'<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  gauge:'<path d="M12 14l4-4"/><path d="M3.3 17a9 9 0 1 1 17.4 0"/>',
  cpu:'<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
  stop:'<rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" stroke="none"/>',
  check:'<path d="M20 6 9 17l-5-5"/>',
  spark:'<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" fill="currentColor"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  monitor:'<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
  branch:'<path d="M6 3v12"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/>',
  moon:'<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'
};
const svg=(n,c='')=>`<svg viewBox="0 0 24 24" class="${c}">${P[n]||''}</svg>`;
const hydrate=(r=document)=>r.querySelectorAll('[data-i]').forEach(e=>{e.innerHTML=svg(e.dataset.i)});
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const TOKEN=document.body.dataset.token;
async function api(path,body){
  const r=await fetch('/api/'+path,{method:body?'POST':'GET',headers:{'x-workwood-token':TOKEN,'content-type':'application/json'},body:body?JSON.stringify(body):undefined});
  const j=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(j.error||'Something went wrong.');
  return j;
}

/* ---------- state ---------- */
const A={profiles:[],sessions:[],projects:[],next:null,ready:false,fresh:false,preview:null};           // from the service
const V={sel:null,isNew:false,items:[],run:null,context:null,loading:false,     // what the window shows
  project:null,profile:null,mk:false,find:'',
  used:{model:'',effort:''},pick:{},def:{model:'',effort:''},   // what the open session last ran on; what you chose instead, per session ('new' for one not started)
  shut:JSON.parse(localStorage.getItem('ww.shut')||'{}'),more:{},openTools:new Set(),
  q:{id:null,step:0,picks:{},typed:{}},dismissed:null,busy:false,
  work:[],pv:null,full:false,
  views:{},                                                                        // session -> 'chat' or 'term'
  showArch:localStorage.getItem('ww.arch')==='1',menuFor:null,renaming:null,renameText:'',caret:0};  // session actions                                                    // files the agent made; the one shown in the side panel
const MODELS=[['','Default','Whatever Claude Code picks'],['claude-fable-5-2','Fable 5.2','Most capable'],['claude-opus-5-5','Opus 5.5','Strong, lighter on your limit'],['claude-sonnet-5-5','Sonnet 5.5','Fast, for everyday work'],['claude-haiku-5-5','Haiku 5.5','Fastest']];
const EFFORTS=[['','Default','Whatever Claude Code picks'],['low','Low','Quick answers, least of your limit'],['medium','Medium','A balance for routine work'],['high','High','Thinks longer on each step'],['xhigh','Extra','For hard problems'],['max','Max','Slowest, uses the most of your limit']];

/* ---------- small helpers ---------- */
// The model and effort the next message goes out with: your choice for this session if you made one, else what it last used.
const pickKey=()=>V.isNew?'new':V.sel;
const curModel=()=>V.pick[pickKey()]?.model??(V.isNew?'':V.used.model||'');
const curEffort=()=>V.pick[pickKey()]?.effort??(V.isNew?'':V.used.effort||'');
const choose=(k,v)=>{V.pick[pickKey()]={...V.pick[pickKey()],[k]:v}};
// What the pickers show: always the real model and effort. A leading * marks the default, the one your Claude Code settings give.
const shownModel=()=>curModel()||V.def.model||'',shownEffort=()=>curEffort()||V.def.effort||'';
const star=(v,d)=>!v||v===d?'*':'';
async function loadDefaults(){ // for a session not started yet: depends on the project and the profile
  const key=V.project+'|'+V.profile;try{const d=await api(`defaults?cwd=${encodeURIComponent(V.project||'')}&profile=${encodeURIComponent(V.profile||'')}`);if(V.isNew&&key===V.project+'|'+V.profile){V.def={model:d.model||'',effort:d.effort||''};renderComposer()}}catch{}
}
// "claude-opus-5-5[1m]" reads as "Opus 5.5 (1M)"
const modelName=id=>{const known=MODELS.find(m=>m[0]===id);if(known)return known[1];const big=/\[1m\]/i.test(id),p=id.replace(/\[1m\]/i,'').replace(/^claude-/,'').replace(/-\d{8}$/,'').split('-');
  const nums=p.filter(x=>/^\d+$/.test(x)),words=p.filter(x=>!/^\d+$/.test(x));return (words.map(w=>w[0].toUpperCase()+w.slice(1)).join(' ')+(nums.length?' '+nums.join('.'):'')+(big?' (1M)':'')).trim()||id};
const hueOf=name=>{let h=0;for(const c of String(name))h=(h*31+c.charCodeAt(0))>>>0;return h%360};
const monogram=name=>{const p=String(name).replace(/^\.+/,'').split(/[^A-Za-z0-9]+/).filter(Boolean);return ((p.length>1?p[0][0]+p[1][0]:(p[0]||'?').slice(0,2))).toUpperCase()};
const tile=(name,c='')=>`<span class="tile ${c}" style="--h:${hueOf(name)}">${esc(monogram(name))}`;
const ago=mts=>{const s=Math.max(0,Date.now()/1000-mts);return s<90?'now':s<3600?Math.round(s/60)+'m':s<86400?Math.round(s/3600)+'h':Math.round(s/86400)+'d'};
const until=ts=>{const s=Math.max(0,ts-Date.now()/1000);return s<3600?Math.max(1,Math.round(s/60))+'m':s<86400?Math.floor(s/3600)+'h '+Math.round(s%3600/60)+'m':Math.round(s/86400)+'d'};
const dur=ms=>{const s=Math.round(ms/1000);return s<60?s+'s':Math.floor(s/60)+'m '+String(s%60).padStart(2,'0')+'s'};
const clock=ts=>{const d=new Date(ts);return isNaN(d)?'':d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})};
const selSession=()=>A.sessions.find(s=>s.id===V.sel)||null;
const profile=n=>A.profiles.find(p=>p.name===n);
const globalProfile=()=>A.profiles.find(p=>p.global)||A.profiles[0];
function oops(msg){const o=$('oops');o.textContent=msg||'';o.hidden=!msg;if(msg)setTimeout(()=>{if(o.textContent===msg)o.hidden=true},8000)}

// Just enough Markdown for agent replies. Everything is escaped first.
function md(src){
  const blocks=[];let s=String(src).replace(/```[^\n]*\n([\s\S]*?)```/g,(_,c)=>{blocks.push(`<pre><code>${esc(c.replace(/\n$/,''))}</code></pre>`);return `\u0000${blocks.length-1}\u0000`});
  const inline=t=>esc(t).replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>').replace(/\[([^\]]+)\]\(([^)\s]+)\)/g,'$1');
  const out=[];let list=null,para=[],table=null;
  const flush=()=>{if(para.length){out.push('<p>'+para.map(inline).join('<br>')+'</p>');para=[]}if(list){out.push(`<${list.t}>${list.i.map(x=>'<li>'+inline(x)+'</li>').join('')}</${list.t}>`);list=null}
    if(table){out.push('<table>'+table.map((r,i)=>'<tr>'+r.map(c=>i?`<td>${inline(c)}</td>`:`<th>${inline(c)}</th>`).join('')+'</tr>').join('')+'</table>');table=null}};
  for(const line of s.split('\n')){
    let m;
    if((m=line.match(/^\u0000(\d+)\u0000$/))){flush();out.push(blocks[+m[1]])}
    else if(!line.trim())flush();
    else if((m=line.match(/^#{1,6}\s+(.*)/))){flush();out.push('<h4>'+inline(m[1])+'</h4>')}
    else if((m=line.match(/^\s*(?:[-*•]|(\d+)[.)])\s+(.*)/))){const t=m[1]?'ol':'ul';if(para.length||table||(list&&list.t!==t))flush();(list=list||{t,i:[]}).i.push(m[2])}
    else if(/^\s*\|.*\|\s*$/.test(line)){if(para.length||list)flush();if(!/^\s*\|[\s:|-]+\|\s*$/.test(line))(table=table||[]).push(line.trim().slice(1,-1).split('|').map(c=>c.trim()))}
    else if(list&&/^\s+\S/.test(line))list.i[list.i.length-1]+=' '+line.trim();
    else{if(list||table)flush();para.push(line)}
  }
  flush();return out.join('');
}

/* ---------- sidebar ---------- */
const shown=s=>V.showArch||!s.archived;
let drawing=false;
function renderList(){drawing=true;try{drawList()}finally{drawing=false}
  const r=$('renIn');if(r){r.value=V.renameText;r.focus();r.setSelectionRange(V.caret,V.caret)}}
function drawList(){
  $('prog').classList.toggle('on',!A.fresh);$('list').classList.toggle('stale',A.ready&&!A.fresh);
  if(!A.ready){$('list').innerHTML='<div class="none" style="padding:16px">Reading your sessions…</div>';return}
  $('list').innerHTML=A.profiles.map(p=>{
    const all=A.sessions.filter(s=>s.profile===p.name&&shown(s)),shut=!!V.shut[p.name],cap=V.more[p.name]?all.length:8;
    const full=p.d7>=100?`7d full${p.r7?' · clears '+until(p.r7):''}`:p.h5>=100?`5h full${p.r5?' · clears '+until(p.r5):''}<small>7d ${p.d7}%</small>`:'';
    const use=p.h5==null?'':`<span class="use ${p.h5>=80?'hot':''}"><span class="bar2"><i style="width:${Math.min(100,p.h5)}%"></i></span><b>${p.h5}%</b></span>`;
    return `<div class="grp ${shut?'shut':''}" data-grp="${esc(p.name)}">${svg('chev-d')}${esc(p.name)}${p.global?'<span class="pill">global</span>':''}${use}</div>`+
      (full?`<div class="sub"><span class="st">${full}</span></div>`:'')+(shut?'':
      (V.isNew&&p.name===V.profile?`<button class="sess sel"><span class="tile new">${svg('plus')}</span><span class="txt"><span class="l1"><b>New session</b></span><span class="l2"><span>Not started</span></span></span></button>`:'')+
      all.slice(0,cap).map(s=>s.id===V.renaming?`<div class="sess ren ${!V.isNew&&s.id===V.sel?'sel':''}" data-id="${s.id}" style="--h:${hueOf(s.project)}">${tile(s.project)}</span><input id="renIn" maxlength="120" autocomplete="off" spellcheck="false" aria-label="Session name"></div>`
        :`<button class="sess ${s.status} ${!V.isNew&&s.id===V.sel?'sel':''} ${s.archived?'arch':''} ${s.id===V.menuFor?'mopen':''}" data-id="${s.id}" style="--h:${hueOf(s.project)}" title="${esc(s.cwd)}">${tile(s.project)}${s.outside||s.term?`<em class="xb">${svg('term')}</em>`:''}</span><span class="txt"><span class="l1"><b>${esc(s.title)}</b><time>${ago(s.mts)}</time><span class="sact"><span data-arch title="${s.archived?'Unarchive':'Archive'}">${svg('archive')}</span><span data-dots title="More">${svg('dots')}</span></span></span><span class="l2"><em>${esc(s.project)}</em><span>${esc(s.line)}</span></span></span></button>`).join('')+
      (all.length>cap?`<button class="more" data-more="${esc(p.name)}">Show ${all.length-cap} older</button>`:'')+
      (!all.length&&!(V.isNew&&p.name===V.profile)?'<div class="none">No sessions yet</div>':''));
  }).join('');
}
$('list').onclick=e=>{
  const g=e.target.closest('[data-grp]'),m=e.target.closest('[data-more]'),b=e.target.closest('[data-id]');
  if(g){V.shut[g.dataset.grp]=!V.shut[g.dataset.grp];localStorage.setItem('ww.shut',JSON.stringify(V.shut));renderList()}
  else if(m){V.more[m.dataset.more]=true;renderList()}
  else if(b&&!b.classList.contains('ren')){
    const s=A.sessions.find(x=>x.id===b.dataset.id),d=e.target.closest('[data-dots]');
    if(e.target.closest('[data-arch]')){e.stopPropagation();closePops();setArchived(s,!s.archived)}
    else if(d){e.stopPropagation();const r=d.getBoundingClientRect();openMenu(s.id,r.left,r.bottom+4)}
    else openSession(s.id);
  }
};

/* ---------- session actions: rename, open elsewhere, archive, delete ---------- */
function openMenu(id,x,y){
  const s=A.sessions.find(z=>z.id===id);if(!s)return;
  closePops();V.menuFor=id;
  const m=$('smenu');
  m.innerHTML=`<button data-do="rename">${svg('pencil')}Rename</button><button data-do="code">${svg('code')}Open in VS Code</button><button data-do="term">${svg('term')}Open in terminal</button><hr><button data-do="archive">${svg('archive')}${s.archived?'Unarchive':'Archive'}</button><button class="hot" data-do="delete">${svg('trash')}Delete</button>`;
  m.hidden=false;m.style.left=Math.max(4,Math.min(x,innerWidth-210))+'px';m.style.top=Math.max(4,Math.min(y,innerHeight-m.offsetHeight-8))+'px';
  document.querySelector(`.sess[data-id="${id}"]`)?.classList.add('mopen');
}
$('list').oncontextmenu=e=>{const b=e.target.closest('.sess[data-id]');if(!b||b.classList.contains('ren'))return;e.preventDefault();openMenu(b.dataset.id,e.clientX,e.clientY)};
$('smenu').onclick=e=>{
  e.stopPropagation();const b=e.target.closest('[data-do]'),s=A.sessions.find(x=>x.id===V.menuFor);closePops();if(!b||!s)return;
  const d=b.dataset.do,fail=err=>oops(err.message);
  if(d==='rename'){V.renaming=s.id;V.renameText=s.title;V.caret=s.title.length;renderList();$('renIn')?.select()}
  else if(d==='code')api('open-editor',{sessionId:s.id}).catch(fail);
  else if(d==='term')api(`sessions/${s.id}/terminal`,{}).catch(fail);
  else if(d==='archive')setArchived(s,!s.archived);
  else askDelete(s);
};
// When the session you are looking at goes away, show the next one.
function leave(id){if(V.isNew||V.sel!==id)return render();const n=A.sessions.find(s=>s.id!==id&&shown(s));n?openSession(n.id):newSession()}
async function setArchived(s,on){
  try{await api(`sessions/${s.id}/archive`,{on})}catch(e){return oops(e.message)}
  s.archived=on;on&&!V.showArch?leave(s.id):render();
}
function endRename(save){
  const s=A.sessions.find(x=>x.id===V.renaming),name=V.renameText.replace(/\s+/g,' ').trim();V.renaming=null;
  if(save&&s&&name&&name!==s.title){s.title=name;api(`sessions/${s.id}/rename`,{title:name}).catch(e=>oops(e.message))}
  render();
}
$('list').addEventListener('input',e=>{if(e.target.id==='renIn'){V.renameText=e.target.value;V.caret=e.target.selectionStart}});
$('list').addEventListener('keydown',e=>{if(e.target.id!=='renIn')return;if(e.key==='Enter'){e.preventDefault();endRename(true)}else if(e.key==='Escape'){e.stopPropagation();endRename(false)}});
$('list').addEventListener('focusout',e=>{if(e.target.id==='renIn'&&!drawing&&V.renaming)endRename(true)});
function askDelete(s){
  $('ask').innerHTML=`<h3>Delete this session?</h3><p><b>${esc(s.title)}</b> and its whole history will be removed from this computer, for every profile. This cannot be undone.</p><div class="qrow"><button class="qbtn" data-no>Cancel</button><button class="qbtn danger" data-yes="${s.id}">Delete</button></div>`;
  $('dim').hidden=false;$('ask').querySelector('[data-no]').focus();
}
$('dim').onclick=async e=>{
  const y=e.target.closest('[data-yes]');
  if(!y){if(e.target===$('dim')||e.target.closest('[data-no]'))$('dim').hidden=true;return}
  const id=y.dataset.yes;y.disabled=true;
  try{await api(`sessions/${id}/delete`,{});A.sessions=A.sessions.filter(s=>s.id!==id);$('dim').hidden=true;leave(id)}
  catch(err){$('dim').hidden=true;oops(err.message)}
};
$('newBtn').onclick=()=>newSession();

function newSession(){
  V.isNew=true;V.sel=null;V.items=[];V.run=null;V.context=null;V.used={model:'',effort:''};V.dismissed=null;V.work=[];V.pv=null;V.full=false;
  V.profile=globalProfile()?.name; // every new session starts on the global profile; the project stays as last chosen
  V.project=V.project&&A.projects.some(p=>p.cwd===V.project)?V.project:A.projects[0]?.cwd||null;
  render();$('input').focus();loadDefaults();
}
async function openSession(id){
  V.isNew=false;V.sel=id;V.items=[];V.run=null;V.context=null;V.used={model:'',effort:''};V.loading=true;V.dismissed=null;V.openTools.clear();V.work=[];V.pv=null;V.full=false;
  render();
  try{const d=await api('sessions/'+id);if(V.sel!==id)return;V.items=d.items;V.run=d.run;V.context=d.context;V.cut=d.cut;V.work=d.work||[];V.used={model:d.model||'',effort:d.effort||''};V.def={model:d.defaults?.model||'',effort:d.defaults?.effort||''}}
  catch(e){oops(e.message)}
  V.loading=false;render();toBottom(true);
}

/* ---------- conversation ---------- */
const GROUPS={read:['read','file','files'],edit:['edited','file','files'],run:['ran','command','commands'],search:['searched','time','times'],web:['looked up','thing','things'],agent:['ran','agent','agents']};
function toolSummary(tools){
  const n={};for(const t of tools)n[t.group]=(n[t.group]||0)+1;
  const parts=Object.entries(n).map(([g,c])=>GROUPS[g]?`${GROUPS[g][0]} ${c} ${GROUPS[g][c>1?2:1]}`:null).filter(Boolean);
  const rest=tools.filter(t=>!GROUPS[t.group]);
  if(rest.length)parts.push(rest.length===1?rest[0].verb.toLowerCase():`${rest.length} other steps`);
  const s=parts.join(', ');return s.charAt(0).toUpperCase()+s.slice(1);
}
// Redraws only what changed, so previews inside the conversation are not reloaded on every update.
function patch(root,parts){
  let i=0;
  for(const [k,h] of parts){
    const el=root.children[i];
    if(!(el&&el.dataset.k===k&&el._h===h)){
      const t=document.createElement('template');t.innerHTML=h.trim();const neu=t.content.firstElementChild;neu.dataset.k=k;neu._h=h;
      if(el&&el.dataset.k===k)root.replaceChild(neu,el);else root.insertBefore(neu,el||null);
    }
    i++;
  }
  while(root.children.length>parts.length)root.lastElementChild.remove();
}
const KIND={page:'Page',image:'Image',video:'Video',pdf:'PDF'};
const fileUrl=f=>`${A.preview}/${V.sel}${f.path.split('/').map(encodeURIComponent).join('/')}?v=${f.v}`;
const folderOf=f=>{const cwd=selSession()?.cwd||'',d=f.path.slice(0,f.path.lastIndexOf('/'));return d===cwd?'':d.startsWith(cwd+'/')?d.slice(cwd.length+1):d.replace(/^\/home\/[^/]+/,'~')};
const SANDBOX='allow-scripts allow-forms allow-same-origin allow-popups allow-modals';
function thumb(f){
  const u=esc(fileUrl(f));
  return f.kind==='page'?`<iframe src="${u}" loading="lazy" tabindex="-1" sandbox="allow-scripts allow-same-origin" title=""></iframe>`
    :f.kind==='image'?`<img src="${u}" loading="lazy" alt="">`
    :f.kind==='video'?`<video src="${u}#t=0.5" preload="metadata" muted></video><span class="play">${svg('play')}</span>`
    :svg('file');
}
// A file gets its card under the latest turn that touched it; earlier turns keep only a quiet line.
function workCards(it,latest){
  const cards=it.files.filter(f=>latest.get(f.path)===it.n),old=it.files.filter(f=>latest.get(f.path)!==it.n);
  const show=cards.slice(0,3),rest=cards.length-show.length;
  return `<div>${show.length?`<div class="hero n${show.length}">${show.map(f=>`<button class="hc" data-open="${esc(f.path)}" title="${esc(f.path)}"><span class="ht k-${f.kind}">${thumb(f)}</span><span class="cap"><b>${esc(f.name)}</b><span>${KIND[f.kind]}${folderOf(f)?' · '+esc(folderOf(f)):''}</span></span></button>`).join('')}</div>`:''}${rest>0?`<button class="morework" data-open="${esc(cards[3].path)}">and ${rest} more</button>`:''}${old.length?`<div class="sknote wk">${svg('file')}<span>Worked on ${old.map(f=>`<button data-open="${esc(f.path)}" title="${esc(f.path)}">${esc(f.name)}</button>`).join(', ')}</span></div>`:''}</div>`;
}
function fitThumbs(){document.querySelectorAll('.ht iframe').forEach(f=>{const w=f.parentNode.clientWidth,h=f.parentNode.clientHeight;if(!w)return;const k=w/1280;f.style.transform=`scale(${k})`;f.style.height=Math.ceil(h/k)+'px'})}
new ResizeObserver(fitThumbs).observe($('thread'));
function renderThread(){
  const nw=V.isNew,t=$('thread');
  t.hidden=nw;$('hello').hidden=!nw;
  if(nw)return;
  if(V.loading){patch(t,[['loading','<div class="loading">Opening…</div>']]);return}
  const parts=[],latest=new Map();
  for(const it of V.items)if(it.kind==='work')for(const f of it.files)latest.set(f.path,it.n);
  if(V.cut)parts.push(['cut','<div class="sys">Earlier messages are not shown</div>']);
  for(const it of V.items){
    let h='';
    if(it.kind==='user')h=`<div class="me">${esc(it.text)}</div>`;
    else if(it.kind==='assistant')h=`<div class="ai">${md(it.text)}</div>`;
    else if(it.kind==='tools'){const open=V.openTools.has(it.n);h=`<div class="acts ${open?'open':''}"><button class="act" data-tools="${it.n}">${svg('chev-r')}${esc(toolSummary(it.tools))}</button>${open?`<div class="w2">${it.tools.map(x=>`<div class="sp"><span>${esc(x.verb)} ${esc(x.what)}</span></div>`).join('')}</div>`:''}</div>`}
    else if(it.kind==='skill')h=`<div class="sknote">${svg('zap')}Loaded skill <b>${esc(it.name)}</b></div>`;
    else if(it.kind==='note')h=`<div class="sys">${esc(it.text)}</div>`;
    else if(it.kind==='done')h=`<div class="tfoot">Worked for ${dur(it.ms)}${it.ts?' · '+clock(it.ts):''}</div>`;
    else if(it.kind==='work'&&A.preview)h=workCards(it,latest);
    if(h)parts.push(['i'+it.n,h]);
  }
  if(V.run?.status==='working')parts.push(['working',`<div class="w1"><i class="spin"></i><span class="shim">${esc(V.run.activity||'Working')}</span><span class="el" id="elapsed"></span></div>`]);
  if(!V.items.length&&!V.run)parts.splice(0,parts.length,['empty','<div class="empty">Nothing in this session yet.</div>']);
  patch(t,parts);tick();fitThumbs();markCards();
}
const markCards=()=>document.querySelectorAll('#thread [data-open]').forEach(c=>c.classList.toggle('on',c.dataset.open===V.pv));

/* ---------- side panel: what the agent made ---------- */
let staged=null;
function renderPanel(){
  const i=V.work.findIndex(f=>f.path===V.pv),f=V.work[i],open=!V.isNew&&!!f&&!!A.preview;
  $('panel').hidden=!open;$('split').classList.toggle('full',open&&V.full);markCards();
  if(!open){if(staged){staged=null;$('stage').innerHTML=''}$('menu').hidden=true;return}
  $('pName').textContent=f.name;$('pCnt').textContent=V.work.length>1?`${i+1} of ${V.work.length}`:'';
  $('pPrev').disabled=$('pNext').disabled=V.work.length<2;
  $('menu').innerHTML=V.work.map(w=>`<button data-pick="${esc(w.path)}" class="${w.path===V.pv?'cur':''}" title="${esc(w.path)}"><b>${esc(w.name)}</b><span>${w.ts?ago(Date.parse(w.ts)/1000)==='now'?'just now':ago(Date.parse(w.ts)/1000)+' ago':''}</span></button>`).join('');
  $('bFull').dataset.i=V.full?'min':'max';$('bFull').title=V.full?'Show conversation':'Full width';$('bFull').classList.toggle('on',V.full);hydrate($('bFull').parentNode);
  const key=f.path+'|'+f.v;
  if(key!==staged){staged=key;const u=esc(fileUrl(f));
    $('stage').innerHTML=f.kind==='page'?`<iframe class="pvf" src="${u}" sandbox="${SANDBOX}" title="${esc(f.name)}"></iframe>`
      :f.kind==='image'?`<div class="pvbox"><img src="${u}" alt="${esc(f.name)}"></div>`
      :f.kind==='video'?`<div class="pvbox v"><video src="${u}" controls></video></div>`
      :`<iframe class="pvf" src="${u}" title="${esc(f.name)}"></iframe>`}
  fitThumbs();
}
// A file that changed on disk, whoever changed it, is shown again in its new state.
async function checkWork(){
  if(V.isNew||!V.sel||!V.work.length||document.hidden)return;
  const id=V.sel;let now;try{now=await api(`sessions/${id}/work`)}catch{return}
  if(id!==V.sel)return;let changed=false;
  const fix=f=>{const v=now[f.path];if(v&&v!==f.v){f.v=v;changed=true}};
  V.work.forEach(fix);for(const it of V.items)if(it.kind==='work')it.files.forEach(fix);
  if(changed){renderThread();renderPanel()}
}
// Checked whenever the session reports anything (a step finished, a message arrived). For anything else,
// such as your own edits, there is the refresh button.
let workTimer;const checkSoon=()=>{clearTimeout(workTimer);workTimer=setTimeout(checkWork,150)};
$('bRefresh').onclick=async()=>{staged=null;await checkWork();if(!staged)renderPanel()};
const showWork=p=>{V.pv=p;renderPanel()};
const step=d=>()=>{const i=V.work.findIndex(f=>f.path===V.pv),n=V.work.length;if(n)showWork(V.work[(i+d+n)%n].path)};
$('pPrev').onclick=step(-1);$('pNext').onclick=step(1);
$('moreBtn').onclick=e=>{e.stopPropagation();const was=$('menu').hidden;closePops();$('menu').hidden=!was};
$('menu').onclick=e=>{const b=e.target.closest('[data-pick]');if(b){closePops();showWork(b.dataset.pick)}};
$('bFull').onclick=()=>{V.full=!V.full;renderPanel()};
$('bClose').onclick=()=>{V.pv=null;V.full=false;renderPanel()};
$('bExt').onclick=()=>{const f=V.work.find(w=>w.path===V.pv);if(f)window.open(fileUrl(f),'_blank','noopener')};
// A turn's new files go to the top of the list; a file written again replaces its older entry.
function addWork(files){const has=new Set(files.map(f=>f.path));V.work=files.concat(V.work.filter(f=>!has.has(f.path)))}
$('thread').onclick=e=>{const o=e.target.closest('[data-open]');if(o){showWork(o.dataset.open);return}const b=e.target.closest('[data-tools]');if(!b)return;const n=+b.dataset.tools;V.openTools.has(n)?V.openTools.delete(n):V.openTools.add(n);renderThread()};
function tick(){const el=$('elapsed');if(el&&V.run?.startedAt)el.textContent=dur(Date.now()-V.run.startedAt)}
setInterval(tick,1000);
setInterval(()=>{if(A.ready)renderList()},60000);
function toBottom(force){const s=$('scroll');if(force||s.scrollHeight-s.scrollTop-s.clientHeight<160)s.scrollTop=s.scrollHeight}

/* ---------- terminal view: the session's real Claude Code terminal ---------- */
const view=()=>V.isNew||!V.sel?'chat':V.views[V.sel]||'chat';
const turnBusy=()=>!!V.run&&(V.run.status==='working'||V.run.status==='waiting');
const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const termTheme=()=>({background:css('--term'),foreground:css('--term-text'),cursor:css('--term-text'),selectionBackground:'rgba(128,128,128,.35)'});
let T=null; // the terminal on screen: {id, term, es, ro} or {id, wait} while a chat turn still holds the session
function tnote(html){$('tnote').innerHTML=html||'';$('tnote').hidden=!html}
function dropTerm(){if(!T)return;T.es?.close();T.ro?.disconnect();T.term?.dispose();T=null;$('xt').innerHTML='';tnote('')}
function setView(id,v){V.views[id]=v;if(id!==V.sel)return;v==='chat'?openSession(id):render()} // back in the chat, read what the terminal added
function renderTerm(){
  const v=view();
  $('seg').hidden=V.isNew||!V.sel;$('vChat').classList.toggle('on',v==='chat');$('vTerm').classList.toggle('on',v==='term');
  $('conv').hidden=v!=='chat';$('term').hidden=v!=='term';
  if(v!=='term')return dropTerm();
  if(T&&T.id===V.sel&&!(T.wait&&!turnBusy()))return;
  dropTerm();startTerm(V.sel);
}
async function startTerm(id){
  if(turnBusy()){T={id,wait:true};tnote('<p>The agent is working in the chat. The terminal opens when this turn ends.</p><button class="qbtn" data-stopterm>Stop the turn and open the terminal</button>');return}
  const term=new Terminal({fontFamily:'"Cascadia Code","JetBrains Mono",ui-monospace,Menlo,Consolas,monospace',fontSize:13,cursorBlink:true,scrollback:5000,theme:termTheme()});
  const fit=new FitAddon.FitAddon();term.loadAddon(fit);term.open($('xt'));try{fit.fit()}catch{}
  const me=T={id,term};
  const closed=text=>{if(T===me)tnote(`<p>${esc(text)}</p><button class="qbtn" data-again>Start again</button>`)};
  try{await api(`sessions/${id}/term`,{cols:term.cols,rows:term.rows})}catch(e){return closed(e.message)}
  if(T!==me)return;
  const es=me.es=new EventSource(`/api/sessions/${id}/term?token=${TOKEN}`);
  es.addEventListener('data',e=>term.write(JSON.parse(e.data)));
  es.addEventListener('exit',e=>{es.close();if(T!==me)return;JSON.parse(e.data).code===0?setView(id,'chat'):closed('The terminal closed.')});
  es.onerror=()=>{if(es.readyState===2)closed('The terminal closed.')};
  let q=Promise.resolve();
  term.onData(d=>{q=q.then(()=>api(`sessions/${id}/term/input`,{data:d}).catch(()=>{}))});
  term.onResize(({cols,rows})=>api(`sessions/${id}/term/resize`,{cols,rows}).catch(()=>{}));
  term.attachCustomKeyEventHandler(e=>{if(e.type==='keydown'&&e.ctrlKey&&e.shiftKey&&e.code==='KeyC'){navigator.clipboard?.writeText(term.getSelection());return false}return true});
  me.ro=new ResizeObserver(()=>{if(!$('term').hidden)try{fit.fit()}catch{}});me.ro.observe($('xt'));
  term.focus();
}
$('vChat').onclick=()=>{if(view()!=='chat')setView(V.sel,'chat')};
$('vTerm').onclick=()=>{if(view()!=='term')setView(V.sel,'term')};
$('tnote').onclick=e=>{
  if(e.target.closest('[data-stopterm]'))api(`sessions/${V.sel}/stop`,{}).catch(err=>oops(err.message));
  else if(e.target.closest('[data-again]')){dropTerm();renderTerm()}
};

/* ---------- cards: questions, permissions, plans, stops ---------- */
const typeBox=ph=>`<div class="qtype"><input id="qText" placeholder="${esc(ph)}" autocomplete="off"></div>`;
function renderCard(){
  const c=$('qcard'),p=V.run?.pending,st=V.run?.status==='stopped'&&V.dismissed!==V.run.startedAt?V.run.stopped:null;
  const show=!V.isNew&&(p||st);
  c.hidden=!show;$('box').hidden=!!show;
  if(!show)return;
  if(st){c.innerHTML=stoppedCard(st);return}
  if(V.q.id!==p.id)V.q={id:p.id,step:0,picks:{},typed:{}};
  if(p.kind==='question'){
    const qs=p.input.questions,i=Math.min(V.q.step,qs.length-1),q=qs[i],picked=V.q.picks[i]||[];
    c.innerHTML=`<div class="steps2">${qs.map((x,k)=>`<span class="qhd ${k===i?'':'off'}">${esc(x.header||'Question '+(k+1))}</span>`).join('')}${qs.length>1?`<span class="cnt">${i+1} of ${qs.length}</span>`:''}</div>
      <div class="qq">${esc(q.question)}${q.multiSelect?'<small>Pick any</small>':''}</div>
      <div class="qgrid ${q.options.length>4?'one':''}">${q.options.map((o,k)=>`<button class="qopt ${picked.includes(k)?'on':''}" data-opt="${k}"><span class="mark ${q.multiSelect?'sq':''}">${svg('check')}</span><span><b>${esc(o.label)}</b><span class="d">${esc(o.description||'')}</span></span></button>`).join('')}</div>
      ${typeBox('Or type your own answer…')}
      <div class="qfoot"><span class="gap"></span>${i>0?'<button class="qbtn" data-act="back">Back</button>':''}<button class="qbtn pri" data-act="${i<qs.length-1?'next':'send'}">${i<qs.length-1?'Next':qs.length>1?'Send answers':'Send answer'}</button></div>`;
    $('qText').value=V.q.typed[i]||'';
  }else if(p.kind==='plan'){
    c.innerHTML=`<div class="steps2"><span class="qhd">Plan</span></div><div class="qq">Start on this plan?</div>
      <div class="planbody ai">${md(p.input.plan||'')}</div>
      <div class="qrow"><button class="qbtn pri" data-act="allow">Approve and start</button><button class="qbtn" data-act="deny">Keep planning</button></div>${typeBox('Or say what to change in the plan…')}`;
  }else if(p.kind==='unknown'){
    c.innerHTML=`<div class="steps2"><span class="qhd">Needs you</span></div><div class="qq">The agent is asking something this app can't show properly yet</div>
      <div class="why">Here is what could be read from it:</div><div class="raw">${esc(JSON.stringify(p.input,null,1).slice(0,900))}</div>${typeBox('Answer in your own words…')}
      <div class="qfoot"><button class="qbtn" data-act="term" title="Stops this turn. Ask the agent to put the question again there.">Continue in the terminal</button><span class="gap"></span><button class="qbtn pri" data-act="deny">Send</button></div>`;
  }else{
    const inp=p.input||{},edit=/^(Edit|Write|MultiEdit|NotebookEdit)$/.test(p.toolName);
    let detail;
    if(p.toolName==='Bash')detail=`<div class="qq">Run this command?</div><div class="cmd"><i>$</i>${esc(inp.command||'')}</div>${inp.description?`<div class="why">${esc(inp.description)}</div>`:''}`;
    else if(edit){
      const del=String(inp.old_string||'').split('\n'),add=String(inp.new_string??inp.content??'').split('\n');
      const rows=[...(inp.old_string?del.slice(0,8).map(l=>`<div class="m">- ${esc(l)}</div>`):[]),...add.slice(0,12).map(l=>`<div class="p">+ ${esc(l)}</div>`)];
      const hidden=(inp.old_string?Math.max(0,del.length-8):0)+Math.max(0,add.length-12);
      detail=`<div class="qq">${p.toolName==='Write'?'Write this file?':'Make this edit?'}</div><div class="frow">${esc(inp.file_path||inp.notebook_path||'')}<span class="plus">+${add.length}</span>${inp.old_string?`<span class="minus">−${del.length}</span>`:''}</div><div class="peek">${rows.join('')}${hidden?`<div>  … ${hidden} more lines</div>`:''}</div>`;
    }else detail=`<div class="qq">Allow ${esc(p.toolName.replace(/^mcp__/,'').replace(/__/g,' · '))}?</div><div class="raw">${esc(JSON.stringify(inp,null,1).slice(0,700))}</div>`;
    c.innerHTML=`<div class="steps2"><span class="qhd">Permission</span></div>${detail}
      <div class="qrow"><button class="qbtn pri" data-act="allow">Allow once</button>${p.choices.map(ch=>`<button class="qbtn" data-act="allow" data-choice="${ch.id}">${esc(ch.label)}${ch.code?` <code>${esc(ch.code.length>46?ch.code.slice(0,45)+'…':ch.code)}</code>`:''}</button>`).join('')}<button class="qbtn" data-act="deny">Deny</button></div>
      ${typeBox('Or tell the agent what to do instead…')}`;
  }
}
function stoppedCard(st){
  const cur=V.run.profile,others=A.profiles.filter(p=>p.name!==cur);
  const head={limit:['Limit reached',`Limit reached on ${cur}`],auth:['Sign-in needed',`${cur} is signed out`]}[st.reason]||['Stopped','The turn stopped'];
  const why=st.reason==='auth'?`Its sign-in could not be renewed. Run <code>claudius relogin ${esc(cur)}</code> in a terminal, then continue. Nothing is lost.`:esc(st.text||'');
  return `<div class="steps2"><span class="qhd">${head[0]}</span></div><div class="qq">${esc(head[1])}</div><div class="why">${why}</div>
    <div class="qrow">${st.reason==='limit'?'':`<button class="qbtn pri" data-go="${esc(cur)}">${st.reason==='auth'?'I have signed in, continue':'Try again'}</button>`}${others.map((p,i)=>`<button class="qbtn ${st.reason==='limit'&&!i?'pri':''} ${p.h5>=100?'off':''}" data-go="${esc(p.name)}">Continue on ${esc(p.name)}${p.h5!=null?`<small>${p.h5>=100?'5h full':p.h5+'% used'}</small>`:''}</button>`).join('')}<button class="qbtn" data-act="dismiss">Dismiss</button></div>`;
}
$('qcard').addEventListener('input',e=>{if(e.target.id==='qText')V.q.typed[V.q.step]=e.target.value});
$('qcard').addEventListener('keydown',e=>{if(e.target.id==='qText'&&e.key==='Enter'){e.preventDefault();const b=$('qcard').querySelector('[data-act=next],[data-act=send]')||$('qcard').querySelector('[data-act=deny]');b?.click()}});
$('qcard').onclick=async e=>{
  const p=V.run?.pending,o=e.target.closest('[data-opt]'),a=e.target.closest('[data-act]'),go=e.target.closest('[data-go]');
  if(go){sendText('Continue where you left off.',go.dataset.go);return}
  if(a?.dataset.act==='dismiss'){V.dismissed=V.run.startedAt;render();return}
  if(a?.dataset.act==='term'){api(`sessions/${V.sel}/stop`,{}).catch(err=>oops(err.message));setView(V.sel,'term');return}
  if(!p)return;
  if(o){const i=V.q.step,k=+o.dataset.opt,multi=p.input.questions[i].multiSelect,cur=V.q.picks[i]||[];
    V.q.picks[i]=multi?(cur.includes(k)?cur.filter(x=>x!==k):[...cur,k]):[k];V.q.typed[i]='';renderCard();return}
  if(!a)return;
  const act=a.dataset.act,text=($('qText')?.value||'').trim();
  if(act==='next'){V.q.step++;renderCard();return}
  if(act==='back'){V.q.step--;renderCard();return}
  let payload;
  if(act==='send'){
    const answers={};
    p.input.questions.forEach((q,i)=>{const typed=(V.q.typed[i]||'').trim(),labels=(V.q.picks[i]||[]).map(k=>q.options[k].label);answers[q.question]=typed||labels.join(', ')});
    if(Object.values(answers).some(v=>!v)){oops('Pick an option or type an answer for each question.');return}
    payload={action:'answer',answers};
  }else if(act==='allow')payload={action:text?'deny':'allow',choice:a.dataset.choice,text};
  else payload={action:'deny',text};
  try{await api(`sessions/${V.sel}/answer`,{requestId:p.id,...payload})}catch(err){oops(err.message)}
};

/* ---------- composer ---------- */
function renderComposer(){
  const nw=V.isNew,s=selSession(),working=!nw&&V.run&&(V.run.status==='working'||V.run.status==='waiting'),locked=!nw&&s?.locked&&!working;
  $('sProject').hidden=$('sProfile').hidden=!nw;
  $('box').classList.toggle('off',!!locked);
  $('input').disabled=!!locked;
  $('input').placeholder=nw?'Describe the task…':locked?'In use in a terminal. You can write here when it is idle.':working?'The agent is working. You can send again when this turn ends.':'Message the agent…';
  $('send').dataset.i=working?'stop':'up';$('send').title=working?'Stop':'Send';hydrate($('send').parentNode);
  const pr=A.projects.find(p=>p.cwd===V.project);
  $('pProject').innerHTML=pr?`${tile(pr.name,'s')}</span><span>${esc(pr.name)}</span>${svg('chev-d','cv')}`:`${svg('folder')}<span>Pick a project</span>${svg('chev-d','cv')}`;
  const cur=profile(V.profile);
  $('pProfile').innerHTML=`${svg('user')}<span>${esc(cur?.name||'Profile')}</span>${cur?.h5!=null?`<small>${cur.h5}%</small>`:''}${svg('chev-d','cv')}`;
  $('pModel').innerHTML=`<span>${star(shownModel(),V.def.model)}${shownModel()?esc(modelName(shownModel())):'Default model'}</span>${svg('chev-d','cv')}`;
  $('pEffort').innerHTML=`<span>${star(shownEffort(),V.def.effort)}${esc(EFFORTS.find(m=>m[0]===shownEffort())?.[1]||shownEffort()).replace(/^Default$/,'Default effort')}</span>${svg('chev-d','cv')}`;
  const c=!nw&&V.context,pct=c?Math.min(100,Math.round(c.used/c.window*100)):0,k=n=>n>=1e6?(n/1e6).toFixed(n%1e6?1:0)+'M':Math.round(n/1000)+'k';
  $('pCtx').textContent=c?`${pct}% · ${k(c.used)} of ${k(c.window)}`:'';
  $('ctxBar').style.visibility=c?'visible':'hidden';$('ctxBar').firstElementChild.style.width=pct+'%';
}
function renderMenus(){
  const f=V.find.toLowerCase(),list=A.projects.filter(p=>!f||p.name.toLowerCase().includes(f)||p.cwd.toLowerCase().includes(f));
  const row=p=>`<button class="item" data-proj="${esc(p.cwd)}">${tile(p.name)}</span><span class="nm"><b>${esc(p.name)}</b><span class="mono">${esc(p.cwd.replace(/^\/home\/[^/]+/,'~'))}</span></span>${p.cwd===V.project?svg('check','ck'):''}</button>`;
  const rec=list.filter(p=>p.recent),rest=list.filter(p=>!p.recent);
  $('mProject').innerHTML=`<div class="find">${svg('search')}<input id="pFind" placeholder="Find a project" value="${esc(V.find)}" autocomplete="off"></div>
    ${rec.length?'<div class="lab">Recent</div>'+rec.map(row).join(''):''}${rest.length?'<div class="lab">In ~/workspace</div>'+rest.map(row).join(''):''}${!list.length?'<div class="lab">Nothing matches.</div>':''}
    <div class="sep"></div>${V.mk?`<div class="mk"><span class="mono">~/workspace/</span><input id="mkName" placeholder="folder-name" autocomplete="off"><button data-create>Create</button></div>`:`<button class="item" data-mk>${svg('folder-plus')}<span class="nm"><b>New folder…</b></span></button>`}`;
  const lvl=v=>v>=80?'hot':v>=60?'mid':'';
  $('mProfile').innerHTML=A.profiles.map(p=>`<button class="prow" data-prof="${esc(p.name)}">
    <span class="p1"><b>${esc(p.name)}</b>${p.global?'<span class="pill">global</span>':''}${p.name===A.next?`<span class="pill sug">${svg('spark')}use next</span>`:''}${p.name===V.profile?svg('check','ck'):''}</span>
    <span class="p2"><span class="meter ${lvl(p.h5)}">5h<span class="bar"><i style="width:${Math.min(100,p.h5||0)}%"></i></span><b>${p.h5??'–'}%</b></span><span class="meter ${lvl(p.d7)}">7d<span class="bar"><i style="width:${Math.min(100,p.d7||0)}%"></i></span><b>${p.d7??'–'}%</b></span>${p.r5?`<span class="rs">resets ${until(p.r5)}</span>`:''}</span></button>`).join('');
  const opts=(arr,cur,label,def)=>`<div class="lab">${label}</div>`+arr.filter(x=>x[0]||!def).map(([v,n,d])=>`<button class="item" data-v="${esc(v)}"><span class="nm"><b>${v&&v===def?'*':''}${n}</b><span>${d}</span></span>${v===cur?svg('check','ck'):''}</button>`).join('')+`<div class="cap2" style="padding-top:8px">Applies from your next message.${def?' * is your default.':''}</div>`;
  const extra=[[V.used.model,'Used in this session'],[V.def.model,'Your default']].filter(([m],i,a)=>m&&!MODELS.some(x=>x[0]===m)&&a.findIndex(y=>y[0]===m)===i).map(([m,d])=>[m,esc(modelName(m)),d]);
  $('mModel').innerHTML=opts([MODELS[0],...extra,...MODELS.slice(1)],shownModel(),'Model',V.def.model);$('mEffort').innerHTML=opts(EFFORTS,shownEffort(),'Effort',V.def.effort);
}
function closePops(){document.querySelectorAll('.pop').forEach(p=>p.hidden=true);$('gmenu').hidden=true;$('smenu').hidden=true;V.menuFor=null;document.querySelectorAll('.sess.mopen').forEach(b=>b.classList.remove('mopen'));$('menu').hidden=true;document.querySelectorAll('.pick.open').forEach(b=>b.classList.remove('open'));$('bGear').classList.remove('on')}
const toggle=(btn,pop,then)=>e=>{e.stopPropagation();const was=$(pop).hidden;closePops();if(was){V.mk=false;V.find='';renderMenus();$(pop).hidden=false;$(btn).classList.add('open');then?.()}};
$('pProject').onclick=toggle('pProject','mProject',()=>$('pFind').focus());
$('pProfile').onclick=toggle('pProfile','mProfile');
$('pModel').onclick=toggle('pModel','mModel');
$('pEffort').onclick=toggle('pEffort','mEffort');
// Menus close when you press anywhere outside them. (Listening for a click instead let a second click event, which some
// windows deliver for one press, close a menu the moment it opened.)
document.addEventListener('pointerdown',e=>{if(!e.target.closest('.pop,.fmenu,.menu,.pick,#bGear,#moreBtn,[data-dots]'))closePops()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closePops();$('dim').hidden=true}});
$('mProject').addEventListener('input',e=>{if(e.target.id==='pFind'){V.find=e.target.value;const at=e.target.selectionStart;renderMenus();const i=$('pFind');i.focus();i.setSelectionRange(at,at)}});
$('mProject').addEventListener('keydown',e=>{if(e.target.id==='mkName'&&e.key==='Enter')$('mProject').querySelector('[data-create]').click()});
$('mProject').onclick=async e=>{
  e.stopPropagation();const t=e.target.closest('button');if(!t)return;
  if(t.dataset.proj){V.project=t.dataset.proj;closePops();render();loadDefaults()}
  else if('mk' in t.dataset){V.mk=true;renderMenus();$('mkName').focus()}
  else if('create' in t.dataset){try{const p=await api('projects',{name:$('mkName').value.trim()});if(!A.projects.some(x=>x.cwd===p.cwd))A.projects.push(p);V.project=p.cwd;closePops();render()}catch(err){oops(err.message)}}
};
$('mProfile').onclick=e=>{e.stopPropagation();const t=e.target.closest('[data-prof]');if(t){V.profile=t.dataset.prof;closePops();render();loadDefaults()}};
$('mModel').onclick=e=>{e.stopPropagation();const t=e.target.closest('[data-v]');if(t){choose('model',t.dataset.v);closePops();renderComposer()}};
$('mEffort').onclick=e=>{e.stopPropagation();const t=e.target.closest('[data-v]');if(t){choose('effort',t.dataset.v);closePops();renderComposer()}};

const input=$('input');
const grow=()=>{input.style.height='auto';input.style.height=Math.min(220,input.scrollHeight)+'px'};
input.addEventListener('input',grow);
input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();$('send').click()}});
$('send').onclick=async()=>{
  const working=!V.isNew&&V.run&&(V.run.status==='working'||V.run.status==='waiting');
  if(working){try{await api(`sessions/${V.sel}/stop`,{})}catch(e){oops(e.message)}return}
  const text=input.value.trim();if(!text||V.busy)return;
  if(await sendText(text)){input.value='';grow()}
};
async function sendText(text,asProfile){
  if(V.busy)return false;V.busy=true;oops('');
  try{
    if(V.isNew){
      if(!V.project){oops('Pick a project first.');return false}
      $('hello').textContent='Starting…';
      const r=await api('sessions',{cwd:V.project,profile:V.profile,text,model:curModel(),effort:curEffort()});
      if(V.pick.new){V.pick[r.sessionId]=V.pick.new;delete V.pick.new}
      await openSession(r.sessionId);
    }else{
      V.dismissed=null;
      await api(`sessions/${V.sel}/send`,{text,profile:asProfile,model:curModel(),effort:curEffort()});
    }
    return true;
  }catch(e){oops(e.message);return false}
  finally{V.busy=false;$('hello').textContent='What should the agent do?'}
}

/* ---------- everything together ---------- */
function render(){
  const nw=V.isNew,s=selSession();
  renderList();renderThread();renderCard();renderComposer();renderPanel();renderTerm();
  document.documentElement.style.setProperty('--hue',hueOf(nw?(A.projects.find(p=>p.cwd===V.project)?.name||'workwood'):(s?.project||'workwood')));
  $('title').textContent=nw?'New session':s?.title||'';
  $('where').innerHTML=nw||!s?'':`${tile(s.project,'s')}</span>${esc(s.project)}${s.branch?svg('branch')+esc(s.branch):''}`;
  $('tools').style.visibility=nw||!s?'hidden':'visible';
  $('main').classList.toggle('newmode',nw);
}
$('bCode').onclick=()=>api('open-editor',{sessionId:V.sel}).catch(e=>oops(e.message));

const root=document.documentElement;
const setTheme=t=>{root.dataset.theme=t;localStorage.setItem('ww.theme',t);$('gThemeV').textContent=t==='dark'?'Dark':'Light';if(T?.term)T.term.options.theme=termTheme()};
let gearAt=-1e9;
$('bGear').onclick=e=>{e.stopPropagation();if(e.timeStamp-gearAt<350)return;gearAt=e.timeStamp;$('bGear').blur();const was=$('gmenu').hidden;closePops();if(was){const r=$('bGear').getBoundingClientRect(),m=$('gmenu');m.hidden=false;m.style.left=r.left+'px';m.style.top='auto';m.style.bottom=(innerHeight-r.top+6)+'px';$('bGear').classList.add('on')}};
$('gmenu').onclick=e=>e.stopPropagation();
$('gTheme').onclick=()=>setTheme(root.dataset.theme==='dark'?'light':'dark');
const setArch=on=>{V.showArch=on;localStorage.setItem('ww.arch',on?'1':'0');$('gArchV').textContent=on?'Shown':'Hidden'};
$('gArch').onclick=()=>{setArch(!V.showArch);const s=selSession();!V.showArch&&s?.archived?leave(s.id):render()};

/* ---------- live updates from the service ---------- */
let first=true;
function connect(){
  const es=new EventSource('/api/events?token='+TOKEN);
  es.addEventListener('state',e=>{
    Object.assign(A,JSON.parse(e.data));
    if(first&&A.ready){first=false;const s=A.sessions.find(x=>x.id===location.hash.slice(1))||A.sessions.find(shown);if(s&&location.hash!=='#new')openSession(s.id);else newSession();return}
    if(!V.isNew&&V.sel&&A.fresh&&!V.loading&&!A.sessions.some(x=>x.id===V.sel)){leave(V.sel);return} // deleted somewhere else
    if(V.isNew){if(!V.profile)V.profile=globalProfile()?.name;if(!V.project)V.project=A.projects[0]?.cwd||null}
    render();
  });
  es.addEventListener('run',e=>{const d=JSON.parse(e.data);if(d.sessionId!==V.sel)return;V.run=d.run;if(d.run?.context)V.context=d.run.context;if(d.run?.model)V.used.model=d.run.model;if(d.run?.effort)V.used.effort=d.run.effort;checkSoon();renderThread();renderCard();renderComposer();renderTerm();toBottom()});
  es.addEventListener('item',e=>{const d=JSON.parse(e.data);if(d.sessionId!==V.sel)return;const i=V.items.findIndex(x=>x.n===d.item.n);if(i>=0)V.items[i]=d.item;else V.items.push(d.item);if(d.item.kind==='work'){addWork(d.item.files);renderPanel()}checkSoon();renderThread();toBottom()});
  es.onerror=()=>{};
}
hydrate();setTheme(localStorage.getItem('ww.theme')||'dark');setArch(V.showArch);render();connect();
