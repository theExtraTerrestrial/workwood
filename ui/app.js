// Workwood window. Draws what the service reports and sends back what you do.
const P={
  plus:'<path d="M12 5v14M5 12h14"/>',
  chat:'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  term:'<path d="m4 17 6-6-6-6M12 19h8"/>',
  diff:'<path d="M12 4v8M8 8h8M8 18h8"/>',
  code:'<path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/>',
  clip:'<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
  up:'<path d="M12 19V5M5 12l7-7 7 7"/>','arrow-down':'<path d="M12 5v14M6 13l6 6 6-6"/>',
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
  pulse:'<path d="M4 12h3l2-6 4 12 2-6h5"/>',
  eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  copy:'<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>',
  stop:'<rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" stroke="none"/>',
  check:'<path d="M20 6 9 17l-5-5"/>',
  panel:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>',
  spark:'<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" fill="currentColor"/>',
  tree:'<circle cx="6" cy="5" r="2.5"/><circle cx="18" cy="5" r="2.5"/><circle cx="12" cy="19" r="2.5"/><path d="M6 7.5v2a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3v-2M12 12.5v4"/>',
  slash:'<rect x="4" y="4" width="16" height="16" rx="4"/><path d="m14 8.5-4 7"/>',
  done:'<circle cx="12" cy="12" r="9"/><path d="m8 12.5 3 3 5-6"/>',
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
  used:{model:'',effort:'',mode:''},pick:{},def:{model:'',effort:'',mode:''},   // what the open session last ran on; what you chose instead, per session ('new' for one not started)
  shut:JSON.parse(localStorage.getItem('ww.shut')||'{}'),more:{},openTools:new Set(),shutTools:new Set(),codeOpen:new Set(),codeShut:new Set(),outOpen:new Set(),outFull:new Map(),cmdAll:new Set(),subAll:new Set(),repAll:new Set(),trayOpen:false,seenEv:{},task:null,
  q:{id:null,step:0,picks:{},typed:{},show:{},auto:null},dismissed:null,busy:false,
  work:[],pv:null,full:false,
  pend:null,                                                                       // a message you just sent, shown at once until the service reports it back
  qLocal:[],qGone:new Set(),qNow:null,                                             // the queue: sends still on their way, ones being taken back, the one sent now
  att:[],                                                                          // files waiting to go with the next message
  ch:null,side:null,sk:{key:null,list:null,err:null},chFile:null,chDiff:null,                                    // changed files in the project; the changes panel
  views:{},                                                                        // session -> 'chat' or 'term'
  place:null,ans:null,skOpen:false,limBase:null,menuFor:null,renaming:null,renameText:'',caret:0};  // session actions                                                    // files the agent made; the one shown in the side panel
const MODELS=[['','Default','Whatever Claude Code picks'],['claude-fable-5-2','Fable 5.2','Most capable'],['claude-opus-5-5','Opus 5.5','Strong, lighter on your limit'],['claude-sonnet-5-5','Sonnet 5.5','Fast, for everyday work'],['claude-haiku-5-5','Haiku 5.5','Fastest']];
// Permission modes, in the order Shift+Tab goes through them. Bypass only once it is turned on in Settings.
const MODES=[['default','Ask','Asks before edits and commands'],['acceptEdits','Accept edits','Edits files without asking; asks before commands'],['plan','Plan','Reads and plans; changes nothing until you approve'],['auto','Auto','Approves what is safe, asks about the rest'],['bypassPermissions','Bypass','Never asks. Turned on in Settings']];
const EFFORTS=[['','Default','Whatever Claude Code picks'],['low','Low','Quick answers, least of your limit'],['medium','Medium','A balance for routine work'],['high','High','Thinks longer on each step'],['xhigh','Extra','For hard problems'],['max','Max','Slowest, uses the most of your limit']];

/* ---------- small helpers ---------- */
// The model and effort the next message goes out with: your choice for this session if you made one, else what it last used.
const pickKey=()=>V.isNew?'new':V.sel;
const curModel=()=>V.pick[pickKey()]?.model??(V.isNew?'':V.used.model||'');
const curEffort=()=>V.pick[pickKey()]?.effort??(V.isNew?'':V.used.effort||'');
// The permission mode: one you picked that has not reached a run yet, else what the session is in, else the profile's default.
const shownMode=()=>V.pick[pickKey()]?.mode||(V.isNew?'':V.used.mode)||V.def.mode||'default';
const modeName=m=>MODES.find(x=>x[0]===m)?.[1]||m;
const modeList=()=>MODES.filter(([v])=>v!=='bypassPermissions'||A.prefs?.bypass||shownMode()===v);
async function pickMode(m){
  closePops();if(m===shownMode()&&!V.pick[pickKey()]?.mode)return renderComposer();
  if(V.isNew){choose('mode',m);return renderComposer()}
  const id=V.sel;choose('mode',m);renderComposer();
  try{const r=await api(`sessions/${id}/mode`,{mode:m});if(r.live&&V.sel===id){V.used.mode=m;delete V.pick[id].mode}}   // a running session takes it at once; otherwise it goes with your next message
  catch(e){if(V.pick[id])delete V.pick[id].mode;oops(e.message)}
  renderComposer();
}
const choose=(k,v)=>{V.pick[pickKey()]={...V.pick[pickKey()],[k]:v}};
// What the pickers show: always the real model and effort. A leading * marks the default, the one your Claude Code settings give.
const shownModel=()=>curModel()||V.def.model||'',shownEffort=()=>curEffort()||V.def.effort||'';
async function loadDefaults(){ // for a session not started yet: depends on the project and the profile
  const key=V.project+'|'+V.profile;try{const d=await api(`defaults?cwd=${encodeURIComponent(V.project||'')}&profile=${encodeURIComponent(V.profile||'')}`);if(V.isNew&&key===V.project+'|'+V.profile){V.def={model:d.model||'',effort:d.effort||'',mode:d.mode||''};renderComposer()}}catch{}
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
const startProfile=()=>A.profiles.find(p=>p.name===A.prefs?.defaultProfile)||globalProfile();
const globalProfile=()=>A.profiles.find(p=>p.global)||A.profiles[0];
function oops(msg){const o=$('oops');o.textContent=msg||'';o.hidden=!msg;if(msg)setTimeout(()=>{if(o.textContent===msg)o.hidden=true},8000)}

// Just enough Markdown for agent replies. Everything is escaped first.
function md(src){
  const blocks=[];let s=String(src).replace(/```[^\n]*\n([\s\S]*?)```/g,(_,c)=>{blocks.push(`<pre><code>${esc(c.replace(/\n$/,''))}</code></pre>`);return `\u0000${blocks.length-1}\u0000`});
  const inline=t=>esc(t).replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>').replace(/\[([^\]]+)\]\(([^)\s]+)\)/g,'$1');
  const out=[];let list=null,para=[],table=null;
  // A list keeps each item's indent, so items written under another become a list inside it.
  const listHtml=items=>{let h='';const stack=[];
    for(const it of items){
      while(stack.length>1&&it.d<stack.at(-1).d)h+=`</li></${stack.pop().t}>`;
      const top=stack.at(-1);
      if(!top||it.d>top.d){h+=`<${it.t}>`;stack.push({d:it.d,t:it.t})}
      else if(it.t!==top.t){h+=`</li></${top.t}><${it.t}>`;top.t=it.t}
      else h+='</li>';
      h+='<li>'+inline(it.x);
    }
    while(stack.length)h+=`</li></${stack.pop().t}>`;return h};
  const flush=()=>{if(para.length){out.push('<p>'+para.map(inline).join('<br>')+'</p>');para=[]}if(list){out.push(listHtml(list.i));list=null}
    if(table){out.push('<table>'+table.map((r,i)=>'<tr>'+r.map(c=>i?`<td>${inline(c)}</td>`:`<th>${inline(c)}</th>`).join('')+'</tr>').join('')+'</table>');table=null}};
  for(const line of s.split('\n')){
    let m;
    if((m=line.match(/^\u0000(\d+)\u0000$/))){flush();out.push(blocks[+m[1]])}
    else if(!line.trim())flush();
    else if((m=line.match(/^#{1,6}\s+(.*)/))){flush();out.push('<h4>'+inline(m[1])+'</h4>')}
    else if((m=line.match(/^([ \t]*)(?:[-*•]|(\d+)[.)])\s+(.*)/))){const t=m[2]?'ol':'ul',d=m[1].replace(/\t/g,'    ').length;
      if(para.length||table||(list&&d===0&&list.t!==t))flush();if(!list)list={t,i:[]};list.i.push({d,t,x:m[3]})}
    else if(/^\s*\|.*\|\s*$/.test(line)){if(para.length||list)flush();if(!/^\s*\|[\s:|-]+\|\s*$/.test(line))(table=table||[]).push(line.trim().slice(1,-1).split('|').map(c=>c.trim()))}
    else if(list&&/^\s+\S/.test(line))list.i[list.i.length-1].x+=' '+line.trim();
    else{if(list||table)flush();para.push(line)}
  }
  flush();return out.join('');
}

/* ---------- sidebar ---------- */
// The sidebar is an inbox: sessions that still need something, under the project they belong to. A done session
// is listed only while it is the one you are looking at.
const shown=s=>!s.done||(!V.isNew&&s.id===V.sel);
const needsYou=s=>s.status==='wait'?2:s.unread?1:0;
const askLabel=l=>{const m=/^(\d+) question/.exec(l);return m?m[1]+' question'+(m[1]>1?'s':''):/plan/i.test(l)?'Plan':/^Wants/.test(l)?'Approve':/sign-in/.test(l)?'Sign in':/^Stopped|^Paused/.test(l)?'Stopped':'Waiting'};
const stateOf=s=>(s.bg&&s.status==='idle'?`<span class="bgc" data-tip="${plural(s.bg,'task')} running in the background"><i></i>${s.bg}</span>`:'')+stateOf1(s);
const stateOf1=s=>s.status==='work'?'<i class="spin"></i>':s.status==='wait'?`<span class="askl">${esc(askLabel(s.line))}</span>`:`${s.unread?'<i class="dot"></i>':''}<time>${ago(s.mts)}</time>`;
let drawing=false;
function renderList(){drawing=true;try{drawList()}finally{drawing=false}
  const r=$('renIn');if(r){r.value=V.renameText;r.focus();r.setSelectionRange(V.caret,V.caret)}}
function drawList(){
  $('prog').classList.toggle('on',!A.fresh);$('list').classList.toggle('stale',A.ready&&!A.fresh);
  $('newBtn').classList.toggle('on',V.isNew);
  const nd=A.sessions.filter(s=>s.done).length;$('bHist').innerHTML=`${svg('done')}<span>Done</span>${nd?`<small>${nd}</small>`:''}<kbd>Ctrl K</kbd>`;
  if(!A.ready){$('list').innerHTML='<div class="none" style="padding:16px">Reading your sessions…</div>';return}
  const groups=new Map();
  for(const s of A.sessions.filter(shown).sort((a,b)=>b.mts-a.mts)){const k=s.root||s.cwd;if(!groups.has(k))groups.set(k,{name:s.project,list:[]});groups.get(k).list.push(s)}
  $('list').innerHTML=[...groups].map(([k,g])=>{
    const shut=!!V.shut[k],n=g.list.filter(needsYou).length;
    return `<div class="grp ${shut?'shut':''}" data-grp="${esc(k)}" title="${esc(k)}">${tile(g.name,'s')}</span><b>${esc(g.name)}</b>${shut?`<small>${n?`<i class="dot"></i>`:''}${g.list.length}</small>`:''}<span class="gnew" data-gnew data-tip="New session in ${esc(g.name)}">${svg('plus')}</span></div>`+(shut?'':
      g.list.map(s=>{const sel=!V.isNew&&s.id===V.sel,tip=V.compact||s.line?` data-tip="${esc(s.title+' — '+s.project+(s.line?' · '+s.line:''))}"`:'';
        return s.id===V.renaming?`<div class="sess ren ${sel?'sel':''}" data-id="${s.id}">${tile(s.project)}</span><input id="renIn" maxlength="120" autocomplete="off" spellcheck="false" aria-label="Session name"></div>`
        :`<button class="sess ${s.status} ${sel?'sel':''} ${s.unread?'unread':''} ${s.done?'isdone':''} ${s.id===V.menuFor?'mopen':''}" data-id="${s.id}"${tip}>${tile(s.project)}${s.status==='work'?'<u class="go"></u>':needsYou(s)?`<u class="${s.status==='wait'?'warn':'new'}"></u>`:''}</span><span class="txt"><span class="l1"><b>${esc(s.title)}</b>${s.outside||s.term?`<em class="xb">${svg('term')}</em>`:''}<span class="st">${stateOf(s)}</span><span class="sact"><span data-done data-tip="${s.done?'Back to the inbox':'Mark done (Ctrl+D)'}">${svg(s.done?'refresh':'check')}</span><span data-dots>${svg('dots')}</span></span></span>${s.status==='work'&&!s.outside&&!s.term&&s.line?`<span class="l2">${esc(s.line)}</span>`:''}</span></button>`}).join(''));
  }).join('')||`<div class="none inbox0">Nothing needs you.<br>Older sessions are under Done.</div>`;
}
$('list').onclick=e=>{
  const g=e.target.closest('[data-grp]'),m=e.target.closest('[data-more]'),b=e.target.closest('[data-id]');
  if(g&&e.target.closest('[data-gnew]')){e.stopPropagation();hideTip();newSession(g.dataset.grp)}
  else if(g){V.shut[g.dataset.grp]=!V.shut[g.dataset.grp];localStorage.setItem('ww.shut',JSON.stringify(V.shut));renderList()}
  else if(m){V.more[m.dataset.more]=true;renderList()}
  else if(b&&!b.classList.contains('ren')){
    const s=A.sessions.find(x=>x.id===b.dataset.id),d=e.target.closest('[data-dots]');
    if(e.target.closest('[data-done]')){e.stopPropagation();closePops();hideTip();setDone(s,!s.done)}
    else if(d){e.stopPropagation();const r=d.getBoundingClientRect();openMenu(s.id,r.left,r.bottom+4)}
    else openSession(s.id);
  }
};

/* ---------- session actions: rename, open elsewhere, archive, delete ---------- */
function openMenu(id,x,y){
  const s=A.sessions.find(z=>z.id===id);if(!s)return;
  closePops();V.menuFor=id;
  const m=$('smenu');
  m.innerHTML=`<button data-do="rename">${svg('pencil')}Rename</button><button data-do="code">${svg('code')}Open in VS Code</button><button data-do="term">${svg('term')}Open in terminal</button><hr><button data-do="done">${svg(s.done?'refresh':'check')}${s.done?'Back to the inbox':'Mark done'}</button><button class="hot" data-do="delete">${svg('trash')}Delete</button>`;
  m.hidden=false;m.style.left=Math.max(4,Math.min(x,innerWidth-210))+'px';m.style.top=Math.max(4,Math.min(y,innerHeight-m.offsetHeight-8))+'px';
  document.querySelector(`.sess[data-id="${id}"]`)?.classList.add('mopen');
}
$('list').oncontextmenu=e=>{const b=e.target.closest('.sess[data-id]');if(!b||b.classList.contains('ren'))return;e.preventDefault();openMenu(b.dataset.id,e.clientX,e.clientY)};
$('smenu').onclick=e=>{
  e.stopPropagation();const b=e.target.closest('[data-do]'),s=A.sessions.find(x=>x.id===V.menuFor);closePops();if(!b||!s)return;
  const d=b.dataset.do,fail=err=>oops(err.message);
  if(d==='rename'){if(V.compact)setSide('full');V.renaming=s.id;V.renameText=s.title;V.caret=s.title.length;renderList();$('renIn')?.select()}
  else if(d==='code')api('open-editor',{sessionId:s.id}).catch(fail);
  else if(d==='term')api(`sessions/${s.id}/terminal`,{}).catch(fail);
  else if(d==='done')setDone(s,!s.done);
  else askDelete(s);
};
// When the session you are looking at goes away, show the next one that needs you, so you can work down the list.
function leave(id){if(V.isNew||V.sel!==id)return render();const rest=A.sessions.filter(s=>s.id!==id&&!s.done),n=rest.find(s=>s.status==='wait')||rest.find(s=>s.unread)||rest[0];n?openSession(n.id):newSession()}
async function setDone(s,on){
  if(!s)return;
  try{await api(`sessions/${s.id}/done`,{on})}catch(e){return oops(e.message)}
  s.done=on;s.unread=false;on?leave(s.id):render();
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

// The profile last used in a project: the one that ran its most recent session, if that profile is still here.
const lastProfileIn=cwd=>{const p=A.sessions.filter(s=>(s.root||s.cwd)===cwd&&s.profile).sort((a,b)=>b.mts-a.mts)[0]?.profile;return A.profiles.some(x=>x.name===p)?p:null};
function newSession(project){
  resetJump();V.isNew=true;V.sel=null;V.pend=null;V.qLocal=[];V.qNow=null;V.place=null;V.skOpen=false;V.q.auto=null;V.items=[];V.run=null;V.context=null;V.used={model:'',effort:'',mode:''};V.dismissed=null;V.work=[];V.pv=null;V.full=false;V.ch=null;V.side=null;V.chFile=null;V.chDiff=null;
  V.profile=startProfile()?.name; // every new session starts on your default profile (the global one unless you chose another); the project stays as last chosen
  if(project){V.project=project;V.profile=lastProfileIn(project)||V.profile} // the + on a project in the sidebar
  else V.project=V.project&&A.projects.some(p=>p.cwd===V.project)?V.project:A.projects[0]?.cwd||null;
  render();$('input').focus();loadDefaults();
}
async function openSession(id,sending){
  if(!sending)V.pend=null;
  if(V.sel!==id){V.qLocal=[];V.qNow=null}
  resetJump();
  V.isNew=false;V.sel=id;V.place=null;V.ans=null;V.skOpen=false;V.q.auto=null;V.items=[];V.run=null;V.context=null;V.used={model:'',effort:'',mode:''};V.loading=true;V.dismissed=null;V.openTools.clear();V.shutTools.clear();V.codeOpen.clear();V.codeShut.clear();V.outOpen.clear();V.outFull.clear();V.cmdAll.clear();V.subAll.clear();V.repAll.clear();V.task=null;V.work=[];V.pv=null;V.full=false;V.ch=null;V.side=null;V.chFile=null;V.chDiff=null;
  render();
  try{const d=await api('sessions/'+id);if(V.sel!==id)return;V.items=d.items;V.run=d.run;V.context=d.context;V.cut=d.cut;V.work=d.work||[];V.place=d.place||null;V.used={model:d.model||'',effort:d.effort||'',mode:d.mode||''};V.def={model:d.defaults?.model||'',effort:d.defaults?.effort||'',mode:d.defaults?.mode||''}}
  catch(e){oops(e.message)}
  V.loading=false;render();toBottom(true);loadChanges();
}

/* ---------- conversation ---------- */
/* ---------- steps: what the agent did, each with its command, how long it took and how it ended ---------- */
// short and relative, the way Claude Code writes it: 0.4s, 48s, 1m 13s, 1h 5m
const sdur=ms=>{const s=Math.max(0,ms)/1000;return s<10?s.toFixed(1)+'s':s<60?Math.floor(s)+'s':s<3600?Math.floor(s/60)+'m '+String(Math.floor(s%60)).padStart(2,'0')+'s':Math.floor(s/3600)+'h '+Math.floor(s%3600/60)+'m'};
const busy=()=>!!V.run&&(V.run.status==='working'||V.run.status==='waiting');
const clockEl=(from,c='')=>`<span class="el live ${c}" data-from="${from}">${sdur(Date.now()-from)}</span>`;
// A shell command, escaped as it is: only the programs it runs and its quoted strings get a colour.
function shellHtml(cmd){
  const re=/('[^']*'?|"(?:[^"\\]|\\.)*"?)|((?:^|&&|\|\||[|;(])[ \t]*)([\w./~+-]+)/g;let h='',i=0,m;
  while((m=re.exec(cmd))){h+=esc(cmd.slice(i,m.index))+(m[1]?`<span class="s">${esc(m[1])}</span>`:`${esc(m[2])}<span class="f">${esc(m[3])}</span>`);i=re.lastIndex}
  return h+esc(cmd.slice(i));
}
// The time a group of steps took, from the first one starting to the last one ending; counting while one still runs.
function stepsTime(tools,live){
  const t=tools.filter(x=>x.start);if(!t.length)return '';
  const from=Math.min(...t.map(x=>x.start));
  if(live&&t.some(x=>!x.end&&!x.state))return clockEl(from);
  const to=Math.max(...t.map(x=>x.end||0));return to>=from?`<span class="el">${sdur(to-from)}</span>`:'';
}
// While a turn runs, only its newest step shows its command and output (and any step still running, or failed);
// the ones before it are a line each, and a click on the line shows or hides the rest. Steps you opened by hand show all.
let lastStep=null;
function stepHtml(x,live,inner){
  const run=live&&!x.state,bgRun=x.state==='bg'&&!x.end&&(live||bgList().some(t=>t.tool===x.id));
  const cls=x.state==='bg'?'bg':run?'run':x.state||'unk';
  const verb=x.state==='no'?"Didn't run":run||bgRun?x.verb:x.past||x.verb;
  const can=!inner&&!!(x.cmd||x.out),body=V.codeOpen.has(x.id)||!V.codeShut.has(x.id)&&(!live||!x.state||x.state==='bad'||x.state==='stop'||x.id===lastStep);
  const file=(x.group==='read'||x.group==='edit')&&x.what||(inner||can&&!body)&&!x.what&&x.cmd&&x.cmd.split('\n')[0];
  const tags=[x.wait&&['wait','waiting for you'],x.state==='bad'&&['bad',x.code!=null?'exit '+x.code:x.why||'failed'],
    x.state==='stop'&&['stop','stopped'],x.state==='no'&&['stop','declined'],x.kind&&['n',x.kind],x.nEvents&&['mo',plural(x.nEvents,'event')],x.bg&&x.group!=='monitor'&&['bg','in background']].filter(Boolean);
  const time=x.end&&x.start?`<span class="el ${x.end-x.start>30000?'slow':''}">${sdur(x.end-x.start)}</span>`
    :(run&&!x.wait||bgRun)&&x.start?clockEl(x.start,'go'):'';
  const limit=run&&x.limit?`<span class="stl">stops after ${x.limit%60000?sdur(x.limit):x.limit/60000+'m'}</span>`:'';
  let h=`<div class="step s-${cls} ${can&&!body?'shut':''}" data-step="${esc(x.id||'')}"><div class="sth"${can?` data-code="${esc(x.id)}" data-on="${body?1:''}" title="${body?'Hide':'Show'} the command"`:''}><b>${esc(verb)}</b>${file?`<span class="stf">${esc(file)}</span>`:x.what?`<span class="std">${esc(x.what)}</span>`:'<span class="std"></span>'}`
    +tags.map(([c,t])=>`<span class="stt ${c}">${t}</span>`).join('')+limit
    +(run&&x.task?`<button class="stx" data-stopstep="${esc(x.id)}" title="Stop this command; the agent carries on">${svg('stop')}Stop</button>`:'')+time+'</div>';
  if(inner)return h+'</div>';                     // an agent's own steps: one line each
  if(x.cmd&&body){const n=x.cmd.split('\n').length,clip=n>4&&!V.cmdAll.has(x.id);
    h+=`<div class="cbk ${clip?'clip':''}"><pre><span class="p">$ </span>${shellHtml(x.cmd)}</pre><button class="cpy" data-copy="${esc(x.id)}" title="Copy">${svg('copy')}</button>${clip?`<button class="more" data-cmdall="${esc(x.id)}">Show all ${n} lines</button>`:''}</div>`}
  if(x.out&&body){const open=V.outOpen.has(x.id),failed=x.state==='bad'||x.state==='stop';
    const full=open?(x.cut?V.outFull.get(x.id):x.out):failed?x.out.split('\n').slice(-3).join('\n'):null;
    if(open||failed)h+=`<div class="cbo ${failed?'bad':''} ${open?'open':''}"><pre>${full==null?'Loading…':esc(full)}</pre></div>`;
    const label=open?'Hide output':failed?(x.lines>3?`Show all output · ${x.lines} lines`:''):`Show output · ${plural(x.lines,'line')}`;
    if(label)h+=`<div class="stm"><button data-out="${esc(x.id)}">${label}</button></div>`}
  if(x.events?.length)h+=`<div class="evs">${x.events.slice(-3).map(e=>`<time>${new Date(e.t).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'})}</time><span>${esc(e.x)}</span>`).join('')}</div>`;
  if(x.group==='agent'&&(x.sub||x.report||x.tokens||x.doing))h+=agentHtml(x,run||bgRun);
  return h+'</div>';
}
// An agent's step holds its own: what it is doing, its newest steps, its size, and when it is done a few lines of its report.
function agentHtml(x,going){
  const all=V.subAll.has(x.id),kept=x.sub||[],shown=all?kept:kept.slice(-3),n=x.count??x.subN??0,earlier=(x.subN||kept.length)-shown.length;
  const nums=[n&&plural(n,'step'),x.tokens&&Math.round(x.tokens/1000)+'k tokens'].filter(Boolean).join(' · ');
  let h=`<div class="agb"><div class="agt">${going&&x.doing?`<span class="shim">${esc(x.doing)}</span>`:'<span></span>'}<span class="nums">${nums}</span></div>`;
  if(earlier>0&&!all)h+=`<button class="agm" data-suball="${esc(x.id)}">› ${plural(earlier,'earlier step')}</button>`;
  if(shown.length)h+=`<div class="steps">${shown.map(s=>stepHtml(s,going,true)).join('')}</div>`;
  if(x.report){const long=x.report.length>320||x.report.split('\n').length>4,open=V.repAll.has(x.id);
    h+=`<div class="agr ${open?'all':''}"><b>Report.</b> ${esc(x.report)}</div>${long?`<button class="agm" data-repall="${esc(x.id)}">${open?'Show less':'Show whole report'}</button>`:''}`}
  return h+'</div>';
}
const stepById=id=>{for(const it of V.items)if(it.kind==='tools')for(const x of it.tools)if(x.id===id)return x};
async function toggleOutput(id){
  const x=stepById(id);if(!x)return;
  if(V.outOpen.delete(id))return renderThread();
  V.outOpen.add(id);renderThread();
  if(x.cut&&!V.outFull.has(id)){const sel=V.sel;
    try{const d=await api(`sessions/${sel}/output?tool=${encodeURIComponent(id)}`);if(V.sel===sel){V.outFull.set(id,d.text);renderThread()}}
    catch(e){if(V.sel===sel){V.outFull.set(id,x.out+'\n\n('+e.message+')');renderThread()}}}
}
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
const RANK={video:0,page:1,pdf:2,image:3};
const fileUrl=f=>`${A.preview}/${V.sel}/${f.path.split(/[\\/]/).filter(Boolean).map(encodeURIComponent).join('/')}?v=${f.v}`;
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
  // the ones that get a picture: a video or page before the stills that went into it
  const cards=it.files.filter(f=>latest.get(f.path)===it.n).sort((a,b)=>(RANK[a.kind]??9)-(RANK[b.kind]??9)),old=it.files.filter(f=>latest.get(f.path)!==it.n);
  const show=cards.slice(0,3),rest=cards.length-show.length;
  return `<div>${show.length?`<div class="hero n${show.length}">${show.map(f=>`<button class="hc" data-open="${esc(f.path)}" title="${esc(f.path)}"><span class="ht k-${f.kind}">${thumb(f)}</span><span class="cap"><b>${esc(f.name)}</b><span>${KIND[f.kind]}${folderOf(f)?' · '+esc(folderOf(f)):''}</span></span></button>`).join('')}</div>`:''}${rest>0?`<button class="morework" data-open="${esc(cards[3].path)}">and ${rest} more</button>`:''}${old.length?`<div class="sknote wk">${svg('file')}<span>Worked on ${old.map(f=>`<button data-open="${esc(f.path)}" title="${esc(f.path)}">${esc(f.name)}</button>`).join(', ')}</span></div>`:''}</div>`;
}
function fitThumbs(){document.querySelectorAll('.ht iframe').forEach(f=>{const w=f.parentNode.clientWidth,h=f.parentNode.clientHeight;if(!w)return;const k=w/1280;f.style.transform=`scale(${k})`;f.style.height=Math.ceil(h/k)+'px'})}
new ResizeObserver(fitThumbs).observe($('thread'));
function renderThread(){
  const nw=V.isNew,t=$('thread');
  // What you just sent is shown straight away, and gives way to the real message when the service reports it.
  if(V.pend&&V.items.filter(it=>it.kind==='user').length>=V.pend.need)V.pend=null;
  const pd=V.pend,pend=pd?[['pend',`<div class="me">${esc(pd.text)}${pd.files.length?`<div class="matt">${pd.files.map(n=>`<span class="fch">${svg('file')}${esc(n)}</span>`).join('')}</div>`:''}</div>`]].concat(V.run?.status==='working'&&!nw&&!V.loading?[]:[['pendw','<div class="w1"><i class="spin"></i><span class="shim">Starting</span></div>']]):[];
  t.hidden=nw&&!pd;$('hello').hidden=!nw||!!pd;
  if(nw&&!pd){renderRail();return}   // a session not started has no turns: clear the rail left by the one you were reading
  if(nw||V.loading){patch(t,pd?pend:[['loading','<div class="loading">Opening…</div>']]);renderRail();return}
  const parts=[],latest=new Map();
  for(const it of V.items)if(it.kind==='work')for(const f of it.files)latest.set(f.path,it.n);
  if(V.cut)parts.push(['cut','<div class="sys">Earlier messages are not shown</div>']);
  // the steps of the turn in progress are open while it runs, unless you closed them; they close when it ends.
  // The turn starts at your last message: an earlier turn that was stopped leaves no end mark, and must not open again.
  lastStep=null;if(busy()){const t=V.items.findLast(x=>x.kind==='tools')?.tools;lastStep=t?.[t.length-1]?.id??null}
  const going=busy(),since=going?V.items.findLastIndex(x=>x.kind==='done'||x.kind==='note'||x.kind==='user'):Infinity;
  for(const [ix,it] of V.items.entries()){
    let h='';
    if(it.kind==='user'){const at=(it.images?[`${it.images} image${it.images>1?'s':''}`]:[]).concat(it.files||[]);h=`<div class="me">${it.skill?`<span class="chip">${svg('zap')}${esc(it.skill)}</span>`:''}${esc(it.text)}${at.length?`<div class="matt">${at.map(n=>`<span class="fch">${svg('file')}${esc(n)}</span>`).join('')}</div>`:''}</div>`}
    else if(it.kind==='assistant')h=`<div class="ai">${md(it.text)}</div>`;
    else if(it.kind==='tools'){const live=ix>since,open=V.openTools.has(it.n)||live&&!V.shutTools.has(it.n);
      h=`<div class="acts ${open?'open':''}"><button class="act" data-tools="${it.n}" data-on="${open?1:''}">${svg('chev-r')}${esc(toolSummary(it.tools))}${stepsTime(it.tools,live)}</button>${open?`<div class="steps">${it.tools.map(x=>stepHtml(x,live)).join('')}</div>`:''}</div>`}
    else if(it.kind==='bg')h=`<div class="bgn ${esc(it.of||'')} ${it.bad?'bad':''}"><i></i>${it.event?`<b>${esc(it.name||'Monitor')}</b><span class="mono">${esc(it.event)}</span>`:`<span>${esc(it.text||'')}</span>`}<time>${clock(it.ts)}</time></div>`;
    else if(it.kind==='skill')h=`<div class="sknote">${svg('zap')}Loaded skill <b>${esc(it.name)}</b></div>`;
    else if(it.kind==='note')h=`<div class="sys">${esc(it.stop?`${it.stop==='auth'?'Paused':'Stopped'} at ${clock(it.ts)} · ${it.stop==='auth'?it.profile+' was signed out':it.stop==='limit'?'limit reached on '+it.profile:(it.text||'something went wrong')}`:it.text)}</div>`;
    else if(it.kind==='done')h=`<div class="tfoot">Worked for ${dur(it.ms)}${it.ts?' · '+clock(it.ts):''}</div>`;
    else if(it.kind==='work'&&A.preview)h=workCards(it,latest);
    if(h&&it.n===J.at)parts.push(['newline','<div class="newline">New</div>']);
    if(h)parts.push(['i'+it.n,h]);
  }
  parts.push(...pend);
  if(answered())parts.push(['working','<div class="w1"><i class="spin"></i><span class="shim">Working</span></div>']);
  else if(V.run?.status==='working')parts.push(['working',`<div class="w1"><i class="spin"></i><span class="shim">${esc(V.run.activity||'Working')}</span><span class="el" id="elapsed"></span></div>`]);
  if(!V.items.length&&!V.run&&!pd)parts.splice(0,parts.length,['empty','<div class="empty">Nothing in this session yet.</div>']);
  patch(t,parts);tick();fitThumbs();markCards();renderRail();if(V.side==='outline')renderOutline();
}
const markCards=()=>document.querySelectorAll('#thread [data-open]').forEach(c=>c.classList.toggle('on',c.dataset.open===V.pv));

/* ---------- side panel: what the agent made ---------- */
let staged=null;
function renderPanel(){
  const i=V.work.findIndex(f=>f.path===V.pv),f=V.work[i],open=!V.isNew&&!!f&&!!A.preview,ch=!V.isNew&&V.side==='changes'&&!!V.ch?.repo,ol=!open&&!V.isNew&&V.side==='outline',cm=!open&&V.side==='compare'?compareSet():null;
  const pb=$('bPreview');pb.hidden=V.isNew||!A.preview||!V.work.length;$('pvN').textContent=V.work.length>1?V.work.length:'';pb.classList.toggle('on',open);
  const tk=!open&&!V.isNew&&V.side==='tasks'&&bgList().length>0;$('tkw').hidden=!tk;if(tk)renderTasks();else clearTimeout(tkTimer);
  $('panel').hidden=!open&&!ch&&!cm&&!ol&&!tk;$('pvw').hidden=!open;$('cmw').hidden=!cm;renderCompare(cm);$('olw').hidden=!ol;renderOutline();$('chw').hidden=open||!ch;renderChanges();
  $('split').classList.toggle('full',!!(open||cm)&&V.full);markCards();fitSide();
  if(!open){if(staged){staged=null;$('stage').innerHTML=''}$('menu').hidden=true;return}
  $('pName').textContent=f.name;$('pCnt').textContent=V.work.length>1?`${i+1} of ${V.work.length}`:'';
  $('pPrev').disabled=$('pNext').disabled=V.work.length<2;
  $('menu').innerHTML=V.work.map(w=>`<button data-pick="${esc(w.path)}" class="${w.path===V.pv?'cur':''}" title="${esc(w.path)}"><b>${esc(w.name)}</b><span>${w.ts?ago(Date.parse(w.ts)/1000)==='now'?'just now':ago(Date.parse(w.ts)/1000)+' ago':''}</span></button>`).join('');
  $('bFull').dataset.i=V.full?'min':'max';$('bFull').title=V.full?'Show conversation':'Full width';$('bFull').classList.toggle('on',V.full);hydrate($('bFull').parentNode);
  const key=f.path+'|'+f.v;
  if(key!==staged){staged=key;$('stage').innerHTML=stageOf(f)}
  fitThumbs();
}
const stageOf=f=>{const u=esc(fileUrl(f));
  return f.kind==='page'?`<iframe class="pvf" src="${u}" sandbox="${SANDBOX}" title="${esc(f.name)}"></iframe>`
    :f.kind==='image'?`<div class="pvbox"><img src="${u}" alt="${esc(f.name)}"></div>`
    :f.kind==='video'?`<div class="pvbox v"><video src="${u}" controls></video></div>`
    :`<iframe class="pvf" src="${u}" title="${esc(f.name)}"></iframe>`};

/* ---------- long conversations: a rail of turns beside the thread, and an outline in the side panel ---------- */
function turnsOf(){const out=[];let cur=null;
  for(const it of V.items){
    if(it.kind==='user'){cur={n:it.n,ts:it.ts,text:((it.skill?'/'+it.skill+' ':'')+(it.text||'')).trim()||(it.files?.length||it.images?'Attachment':'…'),body:'',files:0,cmds:0,ms:0,asked:it.asked||0};out.push(cur)}
    else if(cur){if(it.kind==='tools')for(const t of it.tools){if(t.group==='edit')cur.files++;else if(t.group==='run')cur.cmds++}
      else if(it.kind==='done')cur.ms+=it.ms||0;else if(it.kind==='assistant')cur.body+=' '+it.text}}
  return out}
const plural=(n,w)=>`${n} ${w}${n===1?'':'s'}`;
const turnMeta=(t,html)=>[t.files&&plural(t.files,'file'),t.cmds&&plural(t.cmds,'command'),t.ms&&dur(t.ms),t.asked&&(html?`<em>${plural(t.asked,'question')}</em>`:plural(t.asked,'question'))].filter(Boolean).join(' · ');
const dayOf=ts=>{const d=new Date(ts);if(!ts||isNaN(d))return '';const a=new Date();a.setHours(0,0,0,0);const b=new Date(d);b.setHours(0,0,0,0);const diff=Math.round((a-b)/864e5);
  return diff===0?'Today':diff===1?'Yesterday':d.toLocaleDateString([],{day:'numeric',month:'short'})};
let curTurn=null,railT;
const goTurn=n=>{const el=$('thread').querySelector(`[data-k="i${n}"]`);if(el)$('scroll').scrollTo({top:Math.max(0,el.offsetTop-16),behavior:'smooth'})};
function renderRail(){
  const all=turnsOf(),ts=all.slice(-48),r=$('rail');r.hidden=V.isNew||all.length<3;if(r.hidden){r.innerHTML='';r._h='';return}
  const h=ts.map(t=>t.n+(t.asked?'w':'')+(t.n===curTurn?'c':'')).join();if(r._h===h)return;r._h=h;
  r.innerHTML=ts.map((t,i)=>`<button data-turn="${t.n}" class="${t.n===curTurn?'cur':t.asked?'w':''}" data-tip="${esc(`Turn ${all.length-ts.length+i+1} of ${all.length}${t.ts?' · '+clock(t.ts):''}${turnMeta(t)?' · '+turnMeta(t):''} — ${t.text.slice(0,140)}`)}"><i></i></button>`).join('')}
// The turn you are reading: the last message of yours at or above the top of the view, or the newest at the bottom.
function markTurn(){const sc=$('scroll'),top=sc.scrollTop+70,end=sc.scrollTop+sc.clientHeight>=sc.scrollHeight-6;let cur=null,last=null;
  for(const el of $('thread').children){if(!el.classList.contains('me'))continue;const n=+String(el.dataset.k).slice(1);last=n;if(el.offsetTop<=top)cur=n}
  cur=end?last:cur??null;if(cur===curTurn)return;curTurn=cur;renderRail();if(V.side==='outline')renderOutline()}
$('scroll').addEventListener('scroll',()=>{paintJump();clearTimeout(railT);railT=setTimeout(markTurn,80)},{passive:true});
$('rail').onclick=e=>{const b=e.target.closest('[data-turn]');if(b)goTurn(+b.dataset.turn)};
function renderOutline(){
  const all=turnsOf(),q=$('olQ').value.trim().toLowerCase(),hit=q?all.filter(t=>(t.text+' '+t.body).toLowerCase().includes(q)):all;
  $('olT').textContent=`Conversation · ${plural(all.length,'turn')}`;$('bOutline').classList.toggle('on',V.side==='outline'&&!V.pv);
  let day=null;
  $('oll').innerHTML=hit.length?hit.map(t=>{const d=dayOf(t.ts),sep=d&&d!==day?`<div class="daysep">${d}</div>`:'';day=d||day;
    return sep+`<button class="olrow ${t.n===curTurn?'cur':''}" data-turn="${t.n}"><time>${t.ts?clock(t.ts):''}</time><span class="tx2"><b>${esc(t.text.split('\n')[0])}</b><span class="mt">${turnMeta(t,true)}</span></span></button>`}).join('')
    :`<div class="skl" style="padding:14px 10px">${q?'Nothing in this conversation matches.':'Nothing here yet.'}</div>`}
$('bOutline').onclick=()=>{V.side=V.side==='outline'&&!V.pv?null:'outline';V.pv=null;V.full=false;$('olQ').value='';renderPanel();if(V.side){markTurn();$('olQ').focus()}};
$('olClose').onclick=()=>{V.side=null;renderPanel()};
$('olQ').oninput=renderOutline;
$('oll').onclick=e=>{const b=e.target.closest('[data-turn]');if(b)goTurn(+b.dataset.turn)};

/* ---------- context: how full it is, what fills it, and compacting on request ---------- */
const kTok=n=>n>=1e6?(n/1e6).toFixed(n%1e6?1:0)+'M':Math.round(n/1000)+'k';
function renderCtx(){const c=V.context,m=$('mCtx');if(!c||V.isNew){m.hidden=true;return}
  const d=V.ctx?.id===V.sel?V.ctx:null,pct=Math.min(100,Math.round(c.used/c.window*100)),COL=['var(--accent)','var(--warn)','var(--go)','var(--dim)','var(--hot)'],rows=(d?.rows||[]).slice(0,5);
  m.innerHTML=`<div class="big">${pct}%<small>${kTok(c.used)} of ${kTok(c.window)} tokens</small></div>`+
    (rows.length?`<div class="cbar">${rows.map((r,i)=>`<i style="width:${Math.min(100,r.tokens/c.window*100)}%;background:${COL[i]}"></i>`).join('')}</div>`+rows.map((r,i)=>`<div class="crow"><i style="background:${COL[i]}"></i>${esc(r.name)}<span>${kTok(r.tokens)}</span></div>`).join('')
      :`<div class="cbar"><i style="width:${pct}%;background:var(--accent)"></i></div><div class="cap2" id="ctxNote">${d?.err?esc(d.err):'Counting what fills it…'}</div>`)+
    `<div class="sep"></div><button class="item" data-compact ${isWorking()?'disabled':''}><span class="nm"><b>Compact the conversation now</b><span>Summarises earlier turns to free up room</span></span></button><div class="cap2">Compacts by itself when nearly full.</div>`}
$('pCtx').onclick=e=>{e.stopPropagation();const was=$('mCtx').hidden;closePops();hideTip();if(!was)return;
  $('mCtx').hidden=false;$('pCtx').classList.add('open');
  const id=V.sel;
  if(V.ctx?.id!==id||Date.now()-V.ctx.at>30000){V.ctx={id,at:Date.now()};
    api(`sessions/${id}/context`).then(r=>{V.ctx={id,at:Date.now(),rows:r.rows}},err=>{V.ctx={id,at:0,err:'The breakdown is not available ('+err.message+')'}}).then(()=>{if(V.sel===id&&!$('mCtx').hidden)renderCtx()})}
  renderCtx()};
$('mCtx').onclick=e=>{e.stopPropagation();if(e.target.closest('[data-compact]')&&!isWorking()){closePops();sendText('/compact')}};

/* ---------- compare: a question about things the agent just made, with those things next to it ---------- */
// Each option is shown with the text the agent attached to it, or with the file from this turn that its wording names.
// When nothing can be told apart that way, this turn's files are offered under their own names instead.
const plainWords=s=>' '+String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()+' ';
function compareSet(){
  const p=V.run?.pending;if(V.isNew||p?.kind!=='question')return null;
  const qs=p.input.questions,q=qs[Math.min(V.q.step,qs.length-1)];
  let files=[];
  if(A.preview)for(let j=V.items.length-1;j>=0&&V.items[j].kind!=='user';j--)if(V.items[j].kind==='work')files=V.items[j].files.concat(files);
  files=files.filter((f,i)=>files.findIndex(x=>x.path===f.path)===i).map(f=>V.work.find(w=>w.path===f.path)||f);
  const used=new Set(),of=q.options.map(o=>typeof o.preview==='string'&&o.preview.trim()?{text:o.preview}:null);
  for(const words of [o=>o.label,o=>o.label+' '+(o.description||'')])q.options.forEach((o,k)=>{if(of[k])return;const t=plainWords(words(o));
    const f=files.find(f=>!used.has(f.path)&&(t.includes(plainWords(f.name))||t.includes(plainWords(f.name.replace(/\.[^.]+$/,'')))));if(f){used.add(f.path);of[k]={file:f}}});
  let tabs=of.map((x,k)=>x&&{...x,opt:k,label:q.options[k].label}).filter(Boolean);
  if(!tabs.length&&files.length>1&&files.length<=4)tabs=files.map(f=>({file:f,opt:null,label:f.name}));
  return tabs.length>1?{q,tabs}:null;
}
// The options of a question. When 2 to 4 of them match something the agent made, those are pictures you pick
// directly, and the rest stay rows under them. `data-big` opens that one large in the side panel.
function optionsHtml(q,set){
  const tabOf=k=>set?set.tabs.findIndex(t=>t.opt===k):-1,mark=`<span class="mark ${q.multiSelect?'sq':''}">${svg('check')}</span>`;
  const words=o=>`<span><b>${esc(o.label)}</b><span class="d">${esc(o.description||'')}</span></span>`;
  const row=(o,k)=>`<button class="qopt" data-opt="${k}">${mark}${words(o)}${tabOf(k)>=0?`<span class="eye" data-big="${tabOf(k)}" data-tip="Open it beside the question">view</span>`:''}</button>`;
  const all=q.options.map((o,k)=>k),withPic=all.filter(k=>tabOf(k)>=0);
  if(withPic.length<2||withPic.length>4){
    const loose=set&&set.tabs[0].opt===null;   // files nothing could be matched to by name: offered under their own names
    return `<div class="qgrid ${q.options.length>4||set&&!loose?'one':''}">${all.map(k=>row(q.options[k],k)).join('')}</div>${loose?`<button class="qlook" data-big="0">${svg('monitor')}Look at the ${set.tabs.length} files it made</button>`:''}`;
  }
  const pic=k=>{const t=set.tabs[tabOf(k)];
    return `<button class="qopt pic" data-opt="${k}"><span class="th ${t.file?(t.file.kind==='page'?'pg':''):'txt mono'}">${t.file?thumb(t.file):esc(t.text)}</span><span class="cap">${mark}${words(q.options[k])}</span><span class="big" data-big="${tabOf(k)}" data-tip="Open it large, beside the question">${svg('max')}</span></button>`};
  const rest=all.filter(k=>tabOf(k)<0);
  return `<div class="qgrid pics" style="--n:${withPic.length===3?3:2}">${withPic.map(pic).join('')}</div>${rest.length?`<div class="qgrid one">${rest.map(k=>row(q.options[k],k)).join('')}</div>`:''}`;
}
// What you picked, and which one the side panel is showing.
function qState(set){
  const picked=V.q.picks[V.q.step]||[],eye=shownOpt(set),c=$('qcard');
  c.querySelectorAll('[data-opt]').forEach(o=>o.classList.toggle('on',picked.includes(+o.dataset.opt)));
  c.querySelectorAll('[data-big]').forEach(b=>{const on=eye!=null&&set.tabs[+b.dataset.big]?.opt===eye;b.classList.toggle('on',on);if(b.classList.contains('eye'))b.textContent=on?'shown →':'view'});
}
let cmStaged=null;
function renderCompare(set){
  if(!set){if(cmStaged){cmStaged=null;$('cmStage').innerHTML=''}return}
  const n=set.tabs.length,want=V.q.show[V.q.step]??0,all=want==='all'&&n<=3,cur=all?-1:Math.min(+want||0,n-1);
  $('cmSeg').innerHTML=set.tabs.map((t,i)=>`<button data-cmp="${i}" class="${i===cur?'on':''}" data-tip="${esc(t.file?t.file.path:t.label)}">${esc(t.label)}</button>`).join('')+(n<=3?`<button data-cmp="all" class="${all?'on':''}">Side by side</button>`:'');
  $('cmFull').dataset.i=V.full?'min':'max';$('cmFull').dataset.tip=V.full?'Show conversation':'Full width';$('cmFull').classList.toggle('on',V.full);hydrate($('cmFull').parentNode);
  const shown=all?set.tabs:[set.tabs[cur]],key=V.q.id+'|'+V.q.step+'|'+shown.map(t=>t.file?t.file.path+'|'+t.file.v:'t'+t.opt).join('|');
  if(key!==cmStaged){cmStaged=key;$('cmStage').innerHTML=shown.map(t=>`<div class="cmcol">${all?`<div class="cmlab">${esc(t.label)}</div>`:''}${t.file?stageOf(t.file):`<div class="cmtext mono">${esc(t.text)}</div>`}</div>`).join('')}
}
const shownOpt=set=>{const w=V.q.show[V.q.step]??0;return set&&V.side==='compare'&&!V.pv&&w!=='all'?set.tabs[Math.min(+w||0,set.tabs.length-1)].opt:null};
$('cmSeg').onclick=e=>{const b=e.target.closest('[data-cmp]'),set=compareSet();if(!b||!set)return;
  const i=V.q.step,w=b.dataset.cmp==='all'?'all':+b.dataset.cmp;V.q.show[i]=w;
  const t=set.tabs[w];if(t&&t.opt!==null&&!set.q.multiSelect){V.q.picks[i]=[t.opt];V.q.typed[i]=''}
  renderCard()};
$('cmFull').onclick=()=>{V.full=!V.full;renderPanel()};
$('cmClose').onclick=()=>{V.side=null;V.full=false;renderCard()};
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
// A card clicked in the conversation opens at full width (beside it while a question or permission waits there);
// the header button opens beside the conversation.
const showWork=(p,full)=>{V.pv=V.lastPv=p;V.side=null;if(full!==undefined)V.full=full;renderPanel();if(V.run?.pending?.kind==='question')renderCard()};
const step=d=>()=>{const i=V.work.findIndex(f=>f.path===V.pv),n=V.work.length;if(n)showWork(V.work[(i+d+n)%n].path)};
$('pPrev').onclick=step(-1);$('pNext').onclick=step(1);
$('moreBtn').onclick=e=>{e.stopPropagation();const was=$('menu').hidden;closePops();$('menu').hidden=!was};
$('menu').onclick=e=>{const b=e.target.closest('[data-pick]');if(b){closePops();showWork(b.dataset.pick)}};
$('bFull').onclick=()=>{V.full=!V.full;renderPanel()};
$('bClose').onclick=()=>{V.pv=null;V.full=false;renderPanel()};
// the header button opens the preview on what you last looked at (or the newest), and closes it again
$('bPreview').onclick=()=>{if(V.pv){V.pv=null;V.full=false;renderPanel();return}
  const p=(V.work.find(f=>f.path===V.lastPv)||V.work[0])?.path;if(p)showWork(p,false)};
$('bExt').onclick=()=>{const f=V.work.find(w=>w.path===V.pv);if(f)window.open(fileUrl(f),'_blank','noopener')};
// A turn's new files go to the top of the list; a file written again replaces its older entry.
function addWork(files){const has=new Set(files.map(f=>f.path));V.work=files.concat(V.work.filter(f=>!has.has(f.path)))}
$('thread').onclick=e=>{const o=e.target.closest('[data-open]');if(o){showWork(o.dataset.open,!V.run?.pending);return}
  const t=e.target.closest('[data-copy],[data-cmdall],[data-out],[data-stopstep],[data-suball],[data-repall],[data-code]');
  if(t){const d=t.dataset;
    if(d.code){if(getSelection().toString())return;if(d.on){V.codeOpen.delete(d.code);V.codeShut.add(d.code)}else{V.codeOpen.add(d.code);V.codeShut.delete(d.code)}renderThread();return}
    if(d.suball||d.repall){const s=d.suball?V.subAll:V.repAll,k=d.suball||d.repall;s.has(k)?s.delete(k):s.add(k);renderThread();return}
    if(d.copy){const x=stepById(d.copy);if(x?.cmd)navigator.clipboard.writeText(x.cmd).then(()=>{t.classList.add('done');setTimeout(()=>t.classList.remove('done'),1200)}).catch(()=>{})}
    else if(d.cmdall){V.cmdAll.add(d.cmdall);renderThread()}
    else if(d.out)toggleOutput(d.out);
    else if(d.stopstep){t.disabled=true;api(`sessions/${V.sel}/stop-step`,{id:d.stopstep}).catch(err=>{t.disabled=false;oops(err.message)})}
    return}
  const b=e.target.closest('[data-tools]');if(!b)return;const n=+b.dataset.tools;
  if(b.dataset.on){V.openTools.delete(n);V.shutTools.add(n)}else{V.openTools.add(n);V.shutTools.delete(n)}renderThread()};
function tick(){const el=$('elapsed');if(el&&V.run?.startedAt)el.textContent=dur(Date.now()-V.run.startedAt);
  const now=Date.now();for(const c of document.querySelectorAll('[data-from]'))c.textContent=sdur(now-c.dataset.from)}
setInterval(tick,200);
setInterval(()=>{if(A.ready)renderList()},60000);
const FOLLOW=160;   // the thread follows the agent while you are within this much of its end
const awayNow=()=>{const s=$('scroll');return s.scrollHeight-s.scrollTop-s.clientHeight>=FOLLOW};
function toBottom(force){const s=$('scroll');if(force||!awayNow())s.scrollTop=s.scrollHeight;paintJump()}
// Live updates: whether you were at the end is read before the thread is drawn, since a long arrival would otherwise
// push the end past the follow distance and leave you behind. At the end, a new reply is brought in the way the
// arrow brings it: its first line at the top of the view, or the end if all of it fits. Anything else follows the end.
function follow(end,reply){
  if(landing)land();   // already bringing a reply in: it stays where it is going, whatever arrives under it
  else if(end&&reply!=null){landing={n:reply,until:Date.now()+4000};land()}
  else if(end){const s=$('scroll');s.scrollTop=s.scrollHeight}
  paintJump()}

/* ---------- new replies while you are scrolled up ----------
   Scrolled up, the thread stays where you are reading. A mark over the foot of the thread counts the replies that arrived
   below, and a click puts the first of them at the top of the view. Only replies count: steps show as a small live dot.
   A reply stops being new once its first line has come into view. The "New" line stays until you send something. */
const J={unseen:new Set(),at:null,below:false};
const resetJump=()=>{J.unseen.clear();J.at=null;J.below=false;landing=null};
function noteArrival(item,isNew){   // called before the item is drawn, while the view is still where you left it
  if(V.isNew||V.loading||!awayNow())return;
  if(item.kind==='assistant'){if(isNew){if(!J.unseen.size)J.at=item.n;J.unseen.add(item.n)}}
  else if(item.kind!=='user')J.below=true}
function paintJump(){
  const b=$('jump'),s=$('scroll'),away=!V.isNew&&!V.loading&&awayNow();
  if(!away){J.unseen.clear();J.below=false}
  else{const edge=s.scrollTop+s.clientHeight-24;for(const n of [...J.unseen]){const el=$('thread').querySelector(`[data-k="i${n}"]`);if(!el||el.offsetTop<edge)J.unseen.delete(n)}}
  const n=J.unseen.size,h=!away?'':n+(J.below?'b':'');if(b._h===h)return;b._h=h;
  b.hidden=!away;b.className='jump'+(n?' new':'');b.title=n?'Go to the first new message':'Go to the latest';
  b.innerHTML=svg('arrow-down')+(n?`<span>${plural(n,'new message')}</span>`:J.below?'<i class="dot"></i>':'')}
// Where a click on the mark is heading: the first new reply at the top of the view, or the end. For a few seconds it
// keeps heading there while the thread changes under it (a reply growing, steps closing, a card taking room), so the
// reply does not end up low in the view with the rest of it out of sight. Scrolling yourself ends that.
let landing=null;
function land(){
  if(!landing)return;if(Date.now()>landing.until){landing=null;return}
  const s=$('scroll'),el=landing.n!=null&&$('thread').querySelector(`[data-k="i${landing.n}"]`),max=s.scrollHeight-s.clientHeight;
  const head=el&&el.previousElementSibling?.dataset.k==='newline'?el.previousElementSibling:el;
  const to=Math.max(0,Math.min(max,head?head.offsetTop-16:max));
  if(Math.abs(to-s.scrollTop)>2)s.scrollTo({top:to,behavior:landing.smooth?'smooth':'auto'})}
$('jump').onclick=()=>{const s=$('scroll'),line=J.unseen.size&&$('thread').querySelector('[data-k="newline"]');
  landing={n:line&&line.offsetTop-16>s.scrollTop+4?J.at:null,until:Date.now()+4000,smooth:true};land()};
new ResizeObserver(land).observe($('thread'));new ResizeObserver(land).observe($('scroll'));
for(const ev of ['wheel','touchstart','pointerdown','keydown'])$('scroll').addEventListener(ev,()=>{landing=null},{passive:true});

/* ---------- changes: the project's working tree against its last commit, read only ---------- */
function renderChanges(){
  const c=V.ch,b=$('bChanges');
  b.hidden=!c?.repo;$('chN').textContent=c?.count||'';b.classList.toggle('on',V.side==='changes'&&!V.pv);
  if($('chw').hidden)return;
  $('chT').textContent=c.count===1?'1 changed file':`${c.count} changed files`;
  $('chS').innerHTML=c.count?`<span class="plus">+${c.add}</span> <span class="minus">−${c.del}</span>`:'';
  $('files').hidden=!c.count;
  $('files').innerHTML=c.files.map(f=>`<button class="file ${f.path===V.chFile?'on':''}" data-file="${esc(f.path)}" title="${esc(f.path)}"><b>${esc(f.path)}</b>${f.kind==='changed'?'':`<i>${f.kind}</i>`}${f.binary?'':`<span class="plus">+${f.add}</span><span class="minus">−${f.del}</span>`}</button>`).join('')
    +(c.count>c.files.length?`<div class="note">and ${c.count-c.files.length} more</div>`:'');
  const d=V.chDiff;
  $('diff').innerHTML=!c.count?'<div class="note">Nothing has changed since the last commit.</div>'
    :!d||d.path!==V.chFile?''
    :d.binary?'<div class="note">This file is not text, so there is nothing to show.</div>'
    :!d.lines.length?'<div class="note">No lines changed.</div>'
    :d.lines.map(l=>`<div class="${l.t}">${esc(l.s)||' '}</div>`).join('')+(d.cut?'<div class="note">The rest of this change is too long to show here.</div>':'');
}
async function loadChanges(){
  if(V.isNew||!V.sel)return;const id=V.sel;let c;
  try{c=await api(`sessions/${id}/changes`)}catch{return}
  if(id!==V.sel)return;V.ch=c;
  if(!c.files.some(f=>f.path===V.chFile)){V.chFile=c.files[0]?.path||null;V.chDiff=null}
  renderPanel();if(V.side==='changes'&&V.chFile)loadDiff();
}
async function loadDiff(){
  const id=V.sel,p=V.chFile;let d;
  try{d=await api(`sessions/${id}/changes/file?path=${encodeURIComponent(p)}`)}catch{d={path:p,lines:[],binary:false}}
  if(id!==V.sel||p!==V.chFile)return;
  const keep=V.chDiff?.path===p?$('diff').scrollTop:0;V.chDiff=d;renderChanges();$('diff').scrollTop=keep;
}
let chTimer;const changesSoon=()=>{clearTimeout(chTimer);chTimer=setTimeout(loadChanges,900)};
$('bChanges').onclick=()=>{V.side=V.side==='changes'&&!V.pv?null:'changes';V.pv=null;V.full=false;renderPanel();if(V.side)loadChanges()};
$('chClose').onclick=()=>{V.side=null;renderPanel()};
$('chRefresh').onclick=()=>loadChanges();
$('files').onclick=e=>{const f=e.target.closest('[data-file]');if(!f||f.dataset.file===V.chFile)return;V.chFile=f.dataset.file;V.chDiff=null;renderChanges();loadDiff()};
addEventListener('focus',()=>changesSoon());

/* ---------- skills: what "/" can start in this session, as Claude Code reports it ---------- */
const skillsKey=()=>{const s=selSession();return V.isNew?(V.project?V.project+'|'+(V.profile||''):null):s?s.cwd+'|'+(V.run?.profile||s.profile||''):null};
const skillList=()=>V.sk.key===skillsKey()?V.sk.list:null;
async function needSkills(){
  const key=skillsKey();if(!key||V.sk.key===key)return;
  V.sk={key,list:null,err:null};const [cwd,profile]=key.split('|');
  try{const d=await api(`skills?cwd=${encodeURIComponent(cwd)}&profile=${encodeURIComponent(profile)}`);if(V.sk.key!==key)return;V.sk.list=d.skills}
  catch(e){if(V.sk.key!==key)return;V.sk.list=[];V.sk.err=e.message}
  renderSlash();if(!$('sdim').hidden&&stab===2)renderSettings();   // the Skills tab may be showing that it is loading
}
let slSel=0,slHits=[];
const slashOpen=()=>!$('slash').hidden&&slHits.length>0;
// The list opens when a message starts with "/", or from the skills button in the box.
function renderSlash(){
  const m=$('input').value.match(/^\/([\w:-]*)$/)||(V.skOpen?['','']:null),el=$('slash');
  $('bSkills').classList.toggle('on',!!V.skOpen);
  if(!m){el.hidden=true;slHits=[];return}
  needSkills();const all=skillList(),q=m[1].toLowerCase();el.hidden=false;
  if(!all){slHits=[];el.innerHTML='<div class="note">Loading skills…</div>';return}
  slHits=all.filter(s=>s.name.toLowerCase().startsWith(q)).concat(q?all.filter(s=>{const n=s.name.toLowerCase();return !n.startsWith(q)&&n.includes(q)}):[]);
  slSel=Math.min(slSel,Math.max(slHits.length-1,0));
  el.innerHTML=(q?'':`<div class="skl">${all.length} skills in this session</div>`)+(slHits.length?slHits.map((s,i)=>{const k=s.name.toLowerCase().indexOf(q);
    return `<button class="skr ${i===slSel?'on':''}" data-sk="${esc(s.name)}" data-tip="${esc(s.about)}"><b>/${esc(s.name.slice(0,k))}<u>${esc(s.name.slice(k,k+q.length))}</u>${esc(s.name.slice(k+q.length))}</b><span class="d">${esc(s.about)}</span><span class="src">${s.from}</span></button>`}).join('')
    :`<div class="skr none">${V.sk.err?esc(V.sk.err):q?`No skill matches "${esc(q)}"`:'No skills here'}</div>`);
  el.querySelector('.skr.on')?.scrollIntoView({block:'nearest'});
}
function useSkill(n){const i=$('input'),rest=/^\/[\w:-]*$/.test(i.value)?'':i.value;V.skOpen=false;i.value='/'+n+' '+rest;renderSlash();grow();fitSend();i.focus();i.setSelectionRange(i.value.length,i.value.length)}
function slashKey(e){
  if($('slash').hidden)return false;
  if(e.key==='Escape'){e.preventDefault();if(V.skOpen)V.skOpen=false;else $('input').value='';renderSlash();return true}
  if(!slashOpen())return false;
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();slSel=(slSel+(e.key==='ArrowDown'?1:-1)+slHits.length)%slHits.length;renderSlash();return true}
  if((e.key==='Enter'&&!e.shiftKey&&!e.isComposing)||e.key==='Tab'){e.preventDefault();useSkill(slHits[slSel].name);return true}
  return false;
}
$('slash').onclick=e=>{const b=e.target.closest('[data-sk]');if(b)useSkill(b.dataset.sk)};
$('bSkills').onclick=()=>{const i=$('input');if(V.skOpen||/^\/[\w:-]*$/.test(i.value)){V.skOpen=false;if(i.value==='/')i.value=''}else if(i.value.trim())V.skOpen=true;else i.value='/';slSel=0;renderSlash();i.focus()};
document.addEventListener('pointerdown',e=>{if(V.skOpen&&!e.target.closest('#slash,#bSkills')){V.skOpen=false;renderSlash()}});

/* ---------- attachments: pictures as thumbnails and other files as chips, above the text in the box ---------- */
const PICS=['image/png','image/jpeg','image/gif','image/webp'];let attSeq=0;
const b64=blob=>new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(String(r.result).split(',')[1]||'');r.onerror=()=>no(r.error);r.readAsDataURL(blob)});
// A picture too large to send as it is goes smaller, which loses nothing the agent can use.
async function shrink(file){
  const bmp=await createImageBitmap(file),k=Math.min(1,2000/Math.max(bmp.width,bmp.height)),c=document.createElement('canvas');
  c.width=Math.round(bmp.width*k);c.height=Math.round(bmp.height*k);c.getContext('2d').drawImage(bmp,0,0,c.width,c.height);
  return new Promise(ok=>c.toBlob(ok,'image/jpeg',.85));
}
async function addFiles(files){
  for(const f of [...files]){
    if(V.att.length>=10){oops('Attach at most 10 files at a time.');break}
    const where=window.workwood?.pathFor?.(f)||'';let blob=f,type=f.type,pic=PICS.includes(type);
    if(where){V.att.push({id:++attSeq,name:f.name,type,pic,path:where,url:pic?URL.createObjectURL(f):null});continue} // already on disk: named, not copied
    if(f.size>20e6){oops(`${f.name} is larger than 20 MB.`);continue}
    if(!f.size)continue;
    try{if(pic&&f.size>3.5e6){blob=await shrink(f);type='image/jpeg'}
      V.att.push({id:++attSeq,name:f.name||'pasted image',type,pic,data:await b64(blob),url:pic?URL.createObjectURL(blob):null})}
    catch{oops(`${f.name} could not be read.`)}
  }
  renderAtt();$('input').focus();
}
function renderAtt(){
  // Pictures and files share one strip above the text, so a long file name never crowds the buttons below it.
  const im=V.att.filter(a=>a.pic),fl=V.att.filter(a=>!a.pic);
  $('atts').hidden=!V.att.length;
  $('atts').innerHTML=im.map(a=>`<span class="ath" data-tip="${esc(a.path||a.name)}" style="background-image:url(${a.url})"><button data-rm="${a.id}" title="Remove">${svg('x')}</button></span>`).join('')
    +fl.map(a=>`<span class="fch"${a.path?` data-tip="${esc(a.path)}"`:''}>${svg('file')}<span class="fn">${esc(a.name)}</span><button data-rm="${a.id}" title="Remove">${svg('x')}</button></span>`).join('');
}
function clearAtt(){for(const a of V.att)if(a.url)URL.revokeObjectURL(a.url);V.att=[];renderAtt()}
$('bAttach').onclick=()=>$('filePick').click();
$('filePick').onchange=e=>{addFiles(e.target.files);e.target.value=''};
$('box').addEventListener('click',e=>{const b=e.target.closest('[data-rm]');if(!b)return;const a=V.att.find(x=>x.id===+b.dataset.rm);if(a?.url)URL.revokeObjectURL(a.url);V.att=V.att.filter(x=>x!==a);hideTip();renderAtt()});
$('input').addEventListener('paste',e=>{const f=e.clipboardData?.files;if(f?.length){e.preventDefault();addFiles(f)}});
const hasFiles=e=>[...(e.dataTransfer?.types||[])].includes('Files');
document.addEventListener('dragover',e=>{if(!hasFiles(e))return;e.preventDefault();$('box').classList.add('drop')});
document.addEventListener('dragleave',e=>{if(!e.relatedTarget)$('box').classList.remove('drop')});
document.addEventListener('drop',e=>{if(!hasFiles(e))return;e.preventDefault();$('box').classList.remove('drop');addFiles(e.dataTransfer.files)});

/* ---------- dictation: record here, turn into text on this machine, put it in the message box or a card's answer field ---------- */
let R=null; // the recording under way: {target, stream, ctx, chunks, n, t0, base, timer, preview}
$('wave').innerHTML='<i></i>'.repeat(22);
const joined=r=>{const a=new Float32Array(r.n);let o=0;for(const c of r.chunks){a.set(c,o);o+=c.length}return a};
async function hear(audio,preview){
  const r=await fetch('/api/voice'+(preview?'?preview':''),{method:'POST',headers:{'x-workwood-token':TOKEN,'content-type':'application/octet-stream'},body:audio});
  const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||'Dictation did not work.');return j;
}
// The waveform and timer sit beside whichever mic is recording: the message box's, or the one in a card's answer field.
const MICTIP='Dictate: click to start and stop, or hold while you speak';
function voiceLook(){
  const on=!!R&&!R.done,inCard=R?.target==='qText',qm=$('qcard').querySelector('[data-mic]'),v=$('voice');
  if(inCard&&qm){if(v.nextSibling!==qm)qm.before(v)}else if(v.nextSibling!==$('mic'))$('mic').before(v);
  v.hidden=!R;$('wave').hidden=$('vCancel').hidden=!on;
  $('box').classList.toggle('rec',on&&!inCard);qm?.parentNode.classList.toggle('rec',on&&inCard);
  for(const [b,mine] of [[$('mic'),!inCard],[qm,inCard]]){if(!b)continue;const live=!!R&&mine;
    b.classList.toggle('live',live&&on);b.classList.toggle('wait',live&&R.done);const i=live&&on?'stop':'mic';
    if(b.dataset.i!==i){b.dataset.i=i;hydrate(b.parentNode)}b.dataset.tip=live&&on?'Stop and keep the text':MICTIP}
}
// Recording never waits for the speech model: what you say meanwhile is kept and written down once it is in memory.
async function watchModel(r){
  try{for(;;){const s=await api('voice?warm');if(R!==r)return;
    if(s.state==='ready'){r.note='';return}if(s.state==='failed'){r.note='';oops('The speech model could not be loaded: '+s.error);return}
    r.note=s.progress&&s.progress<100?` · getting the speech model, one time, ${s.progress}%`:' · loading the speech model';await new Promise(ok=>setTimeout(ok,400))}}catch{}
}
// A recording is cut at each pause. A finished piece is written down once and then never changes; only the piece
// you are still speaking is shown as a guess and redone. Pieces with no speech in them are dropped.
const QUIET=.012,PAUSE=5,LONGEST=16000*25;
const cut=(r,a,b)=>{const out=new Float32Array(b-a);let o=0,at=r.off;for(const c of r.chunks){const lo=Math.max(a,at),hi=Math.min(b,at+c.length);if(hi>lo){out.set(c.subarray(lo-at,hi-at),o);o+=hi-lo}at+=c.length}return out};
function setField(r,v){const el=$(r.target);if(!el)return;el.value=v;if(r.target==='input')grow();else if(V.q.id===r.qid)V.q.typed[r.qstep]=v}
function showSaid(r,guess){setField(r,[r.base.replace(/\s+$/,''),...r.fixed,guess||''].filter(Boolean).join(' '))}
function closePiece(r){
  const a=r.from,b=r.n,spoke=r.spoke;r.from=b;r.spoke=false;r.gap=0;r.seen=b;r.guess='';
  if(!spoke||b-a<4000)return;
  const audio=cut(r,a,b),slot=r.fixed.push('')-1;
  while(r.chunks.length&&r.off+r.chunks[0].length<=r.from)r.off+=r.chunks.shift().length;   // written down, no longer needed
  r.chain=r.chain.then(async()=>{try{r.fixed[slot]=(await hear(audio)).text||''}catch(e){r.err=e.message}if(R===r)showSaid(r,r.guess)});
}
async function startVoice(target='input'){
  if(R)return;oops('');R={done:true,target,qid:V.q.id,qstep:V.q.step};voiceLook();
  try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true}});
    R.stream=stream;
    const ctx=new AudioContext({sampleRate:16000}),node=ctx.createScriptProcessor(4096,1,1),bars=[...$('wave').children];
    Object.assign(R,{done:false,note:'',ctx,chunks:[],off:0,n:0,from:0,seen:0,spoke:false,gap:0,fixed:[],guess:'',chain:Promise.resolve(),t0:Date.now(),base:$(target)?.value||''});
    node.onaudioprocess=e=>{const r=R;if(!r||r.done)return;const d=new Float32Array(e.inputBuffer.getChannelData(0));r.chunks.push(d);r.n+=d.length;
      let p=0,sq=0;for(const v of d){p=Math.max(p,Math.abs(v));sq+=v*v}
      bars.forEach((b,i)=>{b.style.transform=`scaleY(${Math.max(.15,Math.min(1,p*3*(.55+.45*Math.sin(i*1.7+r.n/3000))))})`});
      if(Math.sqrt(sq/d.length)>QUIET){r.spoke=true;r.gap=0}else r.gap++;
      if((r.spoke&&r.gap>=PAUSE)||r.n-r.from>=LONGEST||(!r.spoke&&r.n-r.from>16000*4))closePiece(r)};
    ctx.createMediaStreamSource(stream).connect(node);node.connect(ctx.destination);
    R.timer=setInterval(async()=>{const r=R;if(!r||r.done)return;const s=Math.floor((Date.now()-r.t0)/1000);$('vtime').textContent=`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}${r.note}`;
      if(r.asking||!r.spoke||r.n-r.seen<16000)return;r.asking=true;r.seen=r.n;const from=r.from;
      try{const j=await hear(cut(r,from,r.n),true);if(R===r&&!r.done&&r.from===from&&j.text!=null){r.guess=j.text;showSaid(r,r.guess)}}catch{}r.asking=false},500);
    $('vtime').textContent='0:00';voiceLook();watchModel(R);if(R.letGo)stopVoice();
  }catch(e){
    R?.stream?.getTracks().forEach(t=>t.stop());R=null;voiceLook();
    oops(e.name==='NotAllowedError'||e.name==='NotFoundError'?'No microphone is available to this window.':e.message);
  }
}
// Resolves once the text is in its field, also when called again while it is still being written down.
function stopVoice(keep=true){
  const r=R;if(!r)return;if(r.done)return r.fin;r.done=true;clearInterval(r.timer);r.stream.getTracks().forEach(t=>t.stop());r.ctx.close();
  if(!keep){setField(r,r.base);R=null;voiceLook();return}
  $('vtime').textContent='Writing it down…';voiceLook();
  return r.fin=(async()=>{closePiece(r);await r.chain;showSaid(r,'');if(r.err)oops(r.err);
    if(R===r)R=null;voiceLook();const el=$(r.target);if(el){el.focus();el.setSelectionRange(el.value.length,el.value.length)}})();
}
// Click to start and click to stop, or hold the button while you speak and let go.
let micDown=0,micHeld=false;
function micPress(e,target){if(e.button)return;hideTip();if(R){micHeld=false;stopVoice()}else{micHeld=true;micDown=Date.now();startVoice(target)}}
$('mic').addEventListener('pointerdown',e=>micPress(e,'input'));
$('qcard').addEventListener('pointerdown',e=>{if(e.target.closest('[data-mic]')){e.preventDefault();micPress(e,'qText')}});   // the answer field keeps the focus
addEventListener('pointerup',()=>{if(!micHeld)return;micHeld=false;if(Date.now()-micDown<450||!R)return;R.done&&!R.ctx?R.letGo=true:stopVoice()});
$('mic').onclick=e=>{if(e.detail===0)R?stopVoice():startVoice()};   // from the keyboard
$('vCancel').onclick=()=>stopVoice(false);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&R&&!R.done){e.stopPropagation();stopVoice(false)}},true);

/* ---------- settings dialog ---------- */
const STABS=['General','Profiles','Skills','About'],LANGS=['english','latvian','russian','german','french','spanish','italian','polish','lithuanian','estonian','finnish','swedish','ukrainian'];
const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
let stab=0,about=null,L=null,PE=null,PSel=null,PAdd=false,PD=null; // PSel: the profile open on the Profiles page; PAdd: the add form is showing; PD: its Claude Code defaults {name, d}
 // L: the sign-in terminal on screen {name, term, es, ro}; PE: a profile being renamed or asked about {name, kind}
function dropLogin(close){if(!L)return;const l=L;L=null;l.es?.close();l.ro?.disconnect();l.term?.dispose();if(close)api(`profiles/${l.name}/login/close`,{}).catch(()=>{})}
function renderSettings(){
  if($('sdim').hidden)return;
  $('stabs').innerHTML=STABS.map((t,i)=>`<button data-st="${i}" class="${i===stab?'on':''}">${t}</button>`).join('');
  if(L&&stab===1)return;                                     // the sign-in terminal is showing; leave it be
  if(stab===0&&$('spage').contains(document.activeElement)&&document.activeElement.tagName==='SELECT')return; // a menu is open
  const cd=svg('chev-d'),pf=A.prefs||{},pg=$('spage');
  if(stab===0)pg.innerHTML=`<div class="pgh">General</div>
    <div class="srow"><span>Theme</span><button class="sval" data-set="theme">${root.dataset.theme==='dark'?'Dark':'Light'}${cd}</button></div>
    <div class="srow"><span>Clear quiet sessions<small>A session nobody has touched for this long leaves the sidebar. Search still finds it.</small></span><select class="sval" id="sDays">${[[1,'After a day'],[3,'After 3 days'],[7,'After 7 days'],[14,'After 14 days'],[30,'After 30 days'],[0,'Never']].map(([v,n])=>`<option value="${v}" ${(pf.doneDays??7)===v?'selected':''}>${n}</option>`).join('')}</select></div>${LOGIN?`<div class="srow"><span>Open at login<small>Start Workwood when you sign in to this computer.</small></span><i class="stog ${loginOn?'on':''}" data-set="login"></i></div>`:''}
    <div class="srow"><span>Offer Bypass mode<small>A permission mode that never asks before edits or commands. Only for work you trust completely.</small></span><i class="stog ${pf.bypass?'on':''}" data-set="bypass"></i></div>
    <div class="srow"><span>Dictation language<small>What the mic expects to hear.</small></span><select class="sval" id="sLang">${LANGS.map(l=>`<option value="${l}" ${(pf.language||'english')===l?'selected':''}>${cap(l)}</option>`).join('')}</select></div>
    <div class="srow"><span>Project folders<small>Folders that hold your projects. Separate several with a semicolon.</small></span><input class="sval sin mono" id="sFolders" spellcheck="false" autocomplete="off" value="${esc((pf.folders||[]).map(short).join('; '))}" placeholder="${esc(short((A.folders||[])[0]||''))}">${window.workwood?.pickFolder?'<button class="sval" id="sBrowse" data-tip="Choose a folder to add">Add…</button>':''}</div>`;
  else if(stab===1)renderProfilePage(pg);
  else if(stab===2){needSkills();const all=skillList();pg.innerHTML=`<div class="pgh">Skills</div>`+(!all?'<div class="cap2">Loading skills…</div>':V.sk.err?`<div class="cap2">${esc(V.sk.err)}</div>`:all.map(s=>`<div class="srow" data-tip="${esc(s.about)}"><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">/${esc(s.name)}</span><span class="sstate">${s.from}</span></div>`).join('')+`<div class="cap2" style="padding:10px 8px">As Claude Code reports them for ${V.isNew?'a new session here':'the open session'}.</div>`)}
  else{pg.innerHTML=`<div class="pgh">About</div>`+(about?`<div class="srow"><span>Workwood</span><span class="sstate">${esc(about.version)}</span></div>
    <div class="srow"><span>Claude Code<small>Runs your sessions.</small></span><span class="sstate ${about.claude?'':'bad'}">${esc(about.claude||'Not found')}</span></div>
    <div class="srow"><span>Speech model<small>${esc(about.speech.model)}, on this computer.</small></span><span class="sstate ${about.speech.state==='failed'?'bad':''}">${{idle:'Not loaded yet',loading:'Loading…',ready:'Ready',failed:'Could not be loaded'}[about.speech.state]}</span></div>
    <div class="srow"><span>Service<small>Node ${esc(about.node)}</small></span><span class="sstate">Running</span></div>`:'<div class="cap2">Loading…</div>');
    if(!about)api('about').then(a=>{about=a;renderSettings()}).catch(()=>{})}
}
// ---------- the Profiles page: the list on the left, the open profile on the right ----------
const avHue=n=>[...n].reduce((h,c)=>(h*31+c.charCodeAt(0))>>>0,7)%360;
const avatar=(n,c='')=>`<span class="pav ${c}" style="--h:${avHue(n)}">${esc((n[0]||'?').toUpperCase())}</span>`;
const isDefault=p=>startProfile()?.name===p.name;
// What is wrong with a profile, worst first, each with what to do about it. lv: bad (it cannot be used), warn, info.
function problems(p){
  const out=[],now=Date.now()/1000,signin={k:'signin',t:'Sign in again',pri:1};
  if(p.lapsed||p.failed==='expired')out.push({lv:'bad',t:'Sign-in has lapsed',d:'Claude Code could not renew it. Sessions on this profile pause until you sign in again. Nothing is lost.',a:[signin]});
  else if(p.failed==='signin')out.push({lv:'bad',t:'Signed out',d:'This profile has no sign-in, so nothing can run on it.',a:[{...signin,t:'Sign in'}]});
  else if(p.stop?.reason==='auth')out.push({lv:'bad',t:'A session paused: signed out',d:`At ${clock(p.stop.at*1000)} the sign-in was refused. Sign in again, then continue the session.`,a:[signin,{k:'open',t:'Open the session',id:p.stop.sessionId}]});
  const others=roomOrder(A.profiles.filter(x=>x.name!==p.name&&!x.lapsed&&!x.failed&&Math.max(x.h5||0,x.d7||0)<100));
  for(const k of ['h5','d7']){const v=p[k],r=p[WIN[k][1]],nm=k==='h5'?'5-hour':'7-day';if(v==null)continue;
    if(v>=100)out.push({lv:'bad',t:`${nm} limit reached`,d:`${r?'It clears in '+until(r)+'. ':''}Sessions stopped by it can continue on another profile.${isDefault(p)&&others[0]?' New sessions start here, so they will stop too.':''}`,
      a:isDefault(p)&&others[0]?[{k:'mkdef',t:`Start new sessions on ${others[0].name}`,name:others[0].name,pri:1}]:[]});
    else if(v>=80)out.push({lv:'warn',t:`Close to the ${nm} limit`,d:`${v}% used${r?', resets in '+until(r):''}.`,a:[]})}
  if(p.stop?.reason==='error')out.push({lv:'warn',t:'The last turn failed',d:p.stop.text||'Claude Code stopped with an error.',a:[{k:'open',t:'Open the session',id:p.stop.sessionId},{k:'dismiss',t:'Dismiss'}]});
  if(PD?.name===p.name&&PD.d?.bad)out.push({lv:'warn',t:'Its settings.json cannot be read',d:`${short(PD.d.bad)} is not valid JSON, so Claude Code ignores it. Fix or delete the file; the defaults below cannot be changed until then.`,a:[]});
  if(!p.lapsed&&!p.reading){
    if(p.failed==='offline')out.push({lv:'info',t:'Could not read the limits',d:`Claude did not answer.${p.at?' The numbers are from '+ago(p.at)+' ago.':''}`,a:[{k:'read',t:'Try again'}]});
    else if(p.failed==='busy')out.push({lv:'info',t:'Asked too often',d:'Claude asked Workwood to slow down. Readings resume on their own in a few minutes.',a:[{k:'read',t:'Try again'}]});
    else if(!p.failed&&!A.plain&&(!p.at||now-p.at>3600))out.push({lv:'info',t:p.at?`Limits last read ${ago(p.at)} ago`:'Limits not read yet',d:'',a:[{k:'read',t:'Read now'}]})}
  return out;
}
const worst=ps=>ps.find(x=>x.lv==='bad')||ps.find(x=>x.lv==='warn');
function renderProfilePage(pg){
  const ed=!A.plain;
  const cur=A.profiles.some(p=>p.name===PSel)?PSel:startProfile()?.name||A.profiles[0]?.name; // PSel stays: a profile just added may not be listed yet
  const p=PAdd?null:profile(cur);
  if(p&&PD?.name!==p.name){PD={name:p.name,d:null};api(`defaults?profile=${encodeURIComponent(p.name)}`).then(d=>{if(PD?.name===p.name){PD.d=d;renderSettings()}}).catch(()=>{})}
  const list=A.profiles.map(x=>{const w=worst(problems(x));
    return `<button class="pfr ${!PAdd&&x.name===cur?'on':''}" data-psel="${esc(x.name)}">${avatar(x.name)}<span class="pfn"><b>${esc(x.name)}</b><small class="${w?w.lv:''}">${esc(w?w.t:x.email||cap(x.plan||''))}</small></span>${isDefault(x)?'<span class="pstar" data-tip="New sessions start here">★</span>':''}${w?`<i class="adot ${w.lv==='bad'?'hot':''}"></i>`:''}</button>`}).join('');
  let detail;
  if(PAdd)detail=`<div class="pfh">${avatar('+','big')}<div><b>Add a profile</b><small>Another Claude account, in a folder of its own.</small></div></div>
    <div class="pkv"><span>Name</span><span><input class="sval sin" id="sNew" placeholder="e.g. work" spellcheck="false" autocomplete="off"></span></div>
    <div class="pacts"><button class="sval pri" data-add>Sign in</button><button class="sval q" data-pcancel>Cancel</button></div>
    <div class="cap2" style="padding:12px 0 0">Profiles live in ~/.claude-profiles, where Claudius finds them too.</div>`;
  else if(p){
    const now=Date.now()/1000,d=PD?.d,ps=problems(p),ren=PE?.name===p.name&&PE.kind==='rename',rm=PE?.name===p.name&&PE.kind==='remove';
    const meter=k=>{const v=p[k],r=p[WIN[k][1]];return `<span class="pm ${lvl(v??0)}"><span class="pk">${k==='h5'?'5h':'7d'}</span><span class="bar"><i style="width:${Math.min(100,v||0)}%"></i></span><span class="v">${v??'–'}%</span>${r?`<small>${v>=100?'clears':'resets'} in ${until(r)}</small>`:''}</span>`};
    const sel=(id,opts,v,dis)=>{const has=!v||opts.some(o=>o[0]===v);return `<select class="sval" id="${id}" ${dis?'disabled':''}>${has?'':`<option value="${esc(v)}" selected>${esc(v)}</option>`}${opts.map(([k,n])=>`<option value="${esc(k)}" ${(v||'')===k?'selected':''}>${k?esc(n):"Claude Code's choice"}</option>`).join('')}</select>`};
    const modes=MODES.filter(m=>m[0]!=='bypassPermissions'||A.prefs?.bypass||d?.mode==='bypassPermissions');
    const act=(x,i)=>x.k==='signin'?`<button class="sval ${x.pri?'pri':''}" data-login="${esc(p.name)}">${x.t}</button>`:`<button class="sval ${x.pri?'pri':''}" data-fix="${x.k}" ${x.id?`data-id="${esc(x.id)}"`:''} ${x.name?`data-name="${esc(x.name)}"`:''}>${esc(x.t)}</button>`;
    detail=`<div class="pfh">${avatar(p.name,'big')}<div>${ren?`<input class="sval sin pren" id="sRen" value="${esc(p.name)}" spellcheck="false" autocomplete="off" data-tip="Enter saves, Escape cancels">`:`<b>${esc(p.name)}</b>`}${p.global?' <span class="pill" data-tip="The account ~/.claude is signed in to">global</span>':''}<small>${esc([p.email,p.org].filter(Boolean).join(' · ')||'—')}</small></div></div>`
      +(ps.length?`<div class="pbs">${ps.map(x=>`<div class="pb ${x.lv}"><div class="pbt"><i></i><b>${esc(x.t)}</b></div>${x.d?`<div class="pbd">${esc(x.d)}</div>`:''}${x.a.length?`<div class="pba">${x.a.map(act).join('')}</div>`:''}</div>`).join('')}</div>`:'')
      +`<div class="pkv">
        <span>Plan</span><span>${esc(cap(p.plan||'')||'—')}</span>
        <span>Limits</span><span class="pms">${p.h5==null&&p.d7==null?'<span class="pdim">Not known yet</span>':meter('h5')+meter('d7')}<button class="ib rf ${p.reading?'busy':''}" data-fix="read" data-tip="Read this profile's limits again. Nothing is sent to Claude.">${svg('refresh')}</button></span>
        <span>New sessions</span><span>${isDefault(p)?`<span class="pdim">Start on this profile</span>${A.prefs?.defaultProfile===p.name&&!p.global?' <button class="sval q" data-fix="undef">Use the global one</button>':''}`:`<button class="sval" data-fix="mkdef" data-name="${esc(p.name)}">Start them here</button>`}</span>
        <span>Model</span><span>${sel('sModel',MODELS,d?.model,!d||d.bad)}</span>
        <span>Effort</span><span>${sel('sEffort',EFFORTS,d?.effort,!d||d.bad)}</span>
        <span>Permissions</span><span>${sel('sMode',[['',''],...modes],d?.mode,!d||d.bad)}</span>
      </div><div class="cap2" style="padding:6px 0 0">Model, effort and permissions are this profile's own Claude Code settings. A project's settings win over them.</div>`
      +(rm?`<div class="pacts sconf"><span>Remove <b>${esc(p.name)}</b>? Its sign-in and settings are deleted. Sessions and their history stay.</span><button class="sval" data-pe="cancel">Cancel</button><button class="sval danger" data-pe="remove">Remove</button></div>`
        :`<div class="pacts">${ps.some(x=>x.a.some(a=>a.k==='signin'))?'':`<button class="sval" data-login="${esc(p.name)}">Sign in again</button>`}${ed?`<button class="sval q" data-pe="rename">Rename</button><span class="gap"></span><button class="sval q red" data-pe="ask" ${p.global?'disabled data-tip="This is the account ~/.claude is signed in to. Switch to another with Claudius before removing it."':''}>Remove</button>`:''}</div>`);
  }
  else detail='<div class="cap2">No profiles.</div>';
  pg.innerHTML=`<div class="pgh">Profiles</div><div class="pfx"><div class="pfl"><div class="pfls">${list}</div>${ed?`<button class="pfadd ${PAdd?'on':''}" data-padd>+ Add profile</button>`:''}</div><div class="pfd" ${p?`data-p="${esc(p.name)}"`:''}>${detail}</div></div>`
    +(A.plain?`<div class="cap2" style="padding:8px 0 0">This is the account Claude Code is signed in to on this computer.</div>`:'');
  if(PE?.kind==='rename'&&$('sRen')){const i=$('sRen');i.focus();i.select()}
  if(PAdd&&$('sNew')&&document.activeElement?.id!=='sNew')$('sNew').focus();
}
function openSettings(tab=0,prof){closePops();stab=tab;if(prof){PSel=prof;PAdd=false}about=null;$('sdim').hidden=false;renderSettings()}
function closeSettings(){dropLogin(true);$('sdim').hidden=true}
async function startLogin(name,add){
  $('spage').innerHTML=`<div class="lgbar"><b>${add?'Add':'Sign in to'} ${esc(name)}</b><span id="lgNote">Follow the steps below. A browser page may open.</span><button class="sval" id="lgBack">Back</button></div><div class="lgx" id="lgx"></div>`;
  const term=new Terminal({fontFamily:'"Cascadia Code","JetBrains Mono",ui-monospace,Menlo,Consolas,monospace',fontSize:12.5,cursorBlink:true,theme:termTheme()});
  const fit=new FitAddon.FitAddon();term.loadAddon(fit);term.open($('lgx'));try{fit.fit()}catch{}
  const me=L={name,term};const say=t=>{if(L===me)$('lgNote').textContent=t};
  try{if(add){me.name=name=PSel=(await api('profiles',{name,cols:term.cols,rows:term.rows})).name;$('spage').querySelector('.lgbar b').textContent='Add '+name}
    else await api(`profiles/${name}/login`,{cols:term.cols,rows:term.rows})}catch(e){return say(e.message)}
  if(L!==me)return;
  const es=me.es=new EventSource(`/api/profiles/${name}/login?token=${TOKEN}`);
  es.addEventListener('data',e=>term.write(JSON.parse(e.data)));
  es.addEventListener('exit',e=>{es.close();say(JSON.parse(e.data).code===0?(add?`${name} is added. You can go back.`:'Signed in. You can go back.'):add?'The sign-in did not finish, so nothing was added.':'The sign-in did not finish. The old one is kept.')});
  let q=Promise.resolve();
  term.onData(d=>{q=q.then(()=>api(`profiles/${name}/login/input`,{data:d}).catch(()=>{}))});
  term.onResize(({cols,rows})=>api(`profiles/${name}/login/resize`,{cols,rows}).catch(()=>{}));
  term.attachCustomKeyEventHandler(e=>{if(e.type==='keydown'&&e.ctrlKey&&e.shiftKey&&e.code==='KeyC'){navigator.clipboard?.writeText(term.getSelection());return false}return true});
  me.ro=new ResizeObserver(()=>{try{fit.fit()}catch{}});me.ro.observe($('lgx'));term.focus();
}
$('gAll').onclick=()=>openSettings(0);
$('dClose').onclick=closeSettings;
$('sdim').addEventListener('pointerdown',e=>{if(e.target===$('sdim'))closeSettings()});
$('stabs').onclick=e=>{const b=e.target.closest('[data-st]');if(!b)return;dropLogin(true);PE=null;stab=+b.dataset.st;renderSettings()};
$('spage').onclick=async e=>{
  const s=e.target.closest('[data-set]'),l=e.target.closest('[data-login]');
  if(e.target.closest('#lgBack')){dropLogin(true);renderSettings();return}
  if(l){PE=null;startLogin(l.dataset.login);return}
  const ps=e.target.closest('[data-psel]');if(ps){PSel=ps.dataset.psel;PAdd=false;PE=null;renderSettings();return}
  if(e.target.closest('[data-padd]')){PAdd=true;PE=null;renderSettings();return}
  if(e.target.closest('[data-pcancel]')){PAdd=false;renderSettings();return}
  const fx=e.target.closest('[data-fix]');
  if(fx){const k=fx.dataset.fix,name=fx.closest('[data-p]')?.dataset.p;
    try{if(k==='read'){api('limits/refresh',{profile:name}).catch(err=>oops(err.message));const p=profile(name);if(p){p.reading=true;renderSettings()}}
      if(k==='dismiss')await api(`profiles/${name}/dismiss`,{});
      if(k==='mkdef'||k==='undef'){A.prefs=await api('settings',{defaultProfile:k==='mkdef'?fx.dataset.name:null});renderSettings()}
      if(k==='open'&&fx.dataset.id){closeSettings();openSession(fx.dataset.id)}}catch(err){oops(err.message)}
    return}
  const pe=e.target.closest('[data-pe]');
  if(pe){const name=pe.closest('[data-p]').dataset.p,k=pe.dataset.pe;
    if(k==='rename'||k==='ask'){PE={name,kind:k==='ask'?'remove':'rename'};renderSettings();return}
    if(k==='cancel'){PE=null;renderSettings();return}
    if(k==='remove'){try{await api(`profiles/${name}/remove`,{});PE=null;PSel=null;renderSettings()}catch(err){oops(err.message)}return}}
  if(e.target.closest('[data-add]')){const n=$('sNew').value.trim();if(!n){$('sNew').focus();return}PE=null;PAdd=false;PSel=n;startLogin(n,true);return}
  if(e.target.closest('#sBrowse')){const f=await window.workwood.pickFolder();if(!f)return;
    try{A.prefs=await api('settings',{folders:[...(A.prefs.folders||[]),f]});renderSettings()}catch(err){oops(err.message)}return}
  if(s?.dataset.set==='login'){await setLogin(!loginOn);renderSettings()}
  if(s?.dataset.set==='bypass'){try{A.prefs=await api('settings',{bypass:!A.prefs?.bypass});renderSettings();renderComposer()}catch(err){oops(err.message)}}
  if(s?.dataset.set==='theme'){setTheme(root.dataset.theme==='dark'?'light':'dark');renderSettings()}
};
$('spage').addEventListener('keydown',async e=>{
  if(e.target.id==='sNew'&&e.key==='Enter'){e.preventDefault();$('spage').querySelector('[data-add]').click();return}
  if(e.target.id!=='sRen')return;
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();PE=null;renderSettings();return}
  if(e.key!=='Enter')return;
  e.preventDefault();const from=PE.name,to=e.target.value.trim();
  if(!to||to===from){PE=null;renderSettings();return}
  try{await api(`profiles/${from}/rename`,{to});PE=null;if(PSel===from)PSel=to;renderSettings()}catch(err){oops(err.message)}
});
$('spage').onchange=async e=>{
  try{const pk={sModel:'model',sEffort:'effort',sMode:'mode'}[e.target.id];
    if(pk&&PD){const name=PD.name;PD={name,d:await api(`profiles/${name}/defaults`,{[pk]:e.target.value})};e.target.blur();renderSettings();if(V.isNew&&V.profile===name)loadDefaults()}
    if(e.target.id==='sDays')A.prefs=await api('settings',{doneDays:+e.target.value});
    if(e.target.id==='sLang')A.prefs=await api('settings',{language:e.target.value});
    if(e.target.id==='sFolders'){A.prefs=await api('settings',{folders:e.target.value.split(';').map(x=>x.trim()).filter(Boolean)});e.target.value=(A.prefs.folders||[]).map(short).join('; ')}}catch(err){oops(err.message);renderSettings()}
  e.target.blur();
};

/* ---------- Windows window only: where sessions run, Windows or WSL ---------- */
/* ---------- where sessions run: a quiet word after the sidebar title, with the two places in a menu ---------- */
{const e=window.workwood?.env;if(e&&e.list.length>1){
  let st={};const cur=e.list.find(x=>x.id===e.current)||e.list[0];
  const need=()=>{const o=Object.values(st);return o.some(s=>s.wait)?'wait':o.some(s=>s.work)?'work':''};
  const draw=()=>{const n=need(),w=Object.values(st).reduce((k,s)=>k+(s.wait||0),0);
    $('envl').innerHTML=`· ${esc(cur.label)}${svg('chev-d')}${n?`<i class="edot ${n}"></i>`:''}`;
    $('envl').dataset.tip=n==='wait'?`${w} session${w>1?'s':''} on the other side waiting for you`:n?'An agent on the other side is working':'Where sessions run';
    $('emenu').innerHTML=e.list.map(x=>{const s=st[x.id];
      return `<button data-env="${esc(x.id)}">${x.id===cur.id?svg('check','ck'):'<i class="ck"></i>'}<b>${esc(x.label)}<small>${esc(x.detail||'')}</small></b>${s?.wait?`<span><i class="edot wait"></i>${s.wait} waiting</span>`:s?.work?`<span><i class="edot work"></i>${s.work} working</span>`:''}</button>`}).join('')};
  $('envl').hidden=false;draw();
  $('envl').onclick=ev=>{ev.stopPropagation();const was=$('emenu').hidden;closePops();hideTip();if(was){const r=$('envl').getBoundingClientRect(),m=$('emenu');m.hidden=false;m.style.left=r.left+'px';m.style.top=(r.bottom+6)+'px'}};
  $('emenu').onclick=ev=>{ev.stopPropagation();const b=ev.target.closest('[data-env]');if(!b)return;closePops();if(b.dataset.env!==cur.id)window.workwood.setEnv(b.dataset.env)};
  // Told by the window every few seconds: is an agent on the other side working, or waiting for you?
  window.workwood.onEnvStatus?.(now=>{st=now||{};draw()})}}

/* ---------- sidebar width: full, or a strip of project tiles when room is short or you ask for it ---------- */
let sidePref=localStorage.getItem('ww.side')||'auto';
const autoCompact=()=>{if(innerWidth<1000)return true;
  if($('panel').hidden||$('split').classList.contains('full'))return false;
  return (innerWidth-268)*(innerWidth<=1100?.46:.54)<480};     // a side panel must leave the conversation room to read
function fitSide(){const c=sidePref==='compact'||(sidePref==='auto'&&autoCompact());if(c===V.compact)return;
  V.compact=c;document.querySelector('.app').classList.toggle('compact',c);hideTip();
  $('bSide').dataset.tip=c?'Show the full sidebar (Ctrl+B)':'Compact sidebar (Ctrl+B)';$('newBtn').dataset.tip=c?'New session':'';renderList()}
function setSide(p){sidePref=p;localStorage.setItem('ww.side',p);fitSide()}
const toggleSide=()=>{const a=autoCompact();setSide(V.compact?(a?'full':'auto'):(a?'auto':'compact'))};
$('bSide').onclick=toggleSide;
addEventListener('resize',fitSide);
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&!e.shiftKey&&!e.altKey&&e.key.toLowerCase()==='b'&&!e.target.closest?.('#xt,#lgx')){e.preventDefault();toggleSide()}});

/* ---------- hover notes: a fixed-width box that always stays inside the window ---------- */
let tipFor=null,tipTimer;
function hideTip(){clearTimeout(tipTimer);tipFor=null;$('tip').hidden=true}
function showTip(el){
  const t=$('tip');if(!el.isConnected||!el.dataset.tip){hideTip();return}
  t.textContent=el.dataset.tip;t.hidden=false;
  const r=el.getBoundingClientRect(),w=t.offsetWidth,h=t.offsetHeight,pad=8;
  if(el.closest('.app.compact .side')){t.style.left=(r.right+8)+'px';t.style.top=Math.max(pad,Math.min(r.top+(r.height-h)/2,innerHeight-h-pad))+'px';return}   // beside the strip, not over it
  const top=r.bottom+6+h<=innerHeight-pad?r.bottom+6:Math.max(pad,r.top-6-h);
  t.style.left=Math.max(pad,Math.min(r.left,innerWidth-w-pad))+'px';t.style.top=top+'px';
}
document.addEventListener('mouseover',e=>{
  const el=e.target.closest?.('[data-tip]');if(el===tipFor)return;
  hideTip();if(!el)return;tipFor=el;tipTimer=setTimeout(()=>{if(tipFor===el)showTip(el)},450);
});
for(const ev of ['pointerdown','keydown','wheel','blur'])addEventListener(ev,hideTip,true);

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
const KEY={enter:'<kbd>↵</kbd>',esc:'<kbd>Esc</kbd>'};
const typeBox=ph=>`<div class="qtype"><input id="qText" placeholder="${esc(ph)}" autocomplete="off"><button class="ib qmic" data-mic data-tip="${MICTIP}" data-i="mic"></button></div>`;
function renderCard(){
  // A card you have just answered, or a stop you have just continued from, goes at once; the service catches up.
  const c=$('qcard'),p=answered()?null:V.run?.pending,st=!V.pend&&V.dismissed!==stopKey()?heldStop():null;
  const show=!V.isNew&&(p||st);
  c.hidden=!show;$('box').hidden=!!show;
  if(R?.target==='qText'&&(!show||!p||R.qid!==p.id))stopVoice(false);    // the field it was writing into has gone
  if(V.side==='compare'&&p?.kind!=='question'){V.side=null;renderPanel()}
  if(!show){c._h=null;return}
  const put=h=>{const k=(p?.id||'')+h;if(c._h===k)return false;c._h=k;if(c.contains($('voice')))$('mic').before($('voice'));c.innerHTML=h;hydrate(c);voiceLook();return true};   // an unchanged card is left alone: its scroll position and typed text survive live updates
  if(st){put(stoppedCard(st));return}
  if(V.q.id!==p.id)V.q={id:p.id,step:0,picks:{},typed:{},show:{},auto:null,at:Date.now()};
  if(p.kind==='question'){
    const qs=p.input.questions,i=Math.min(V.q.step,qs.length-1),q=qs[i],picked=V.q.picks[i]||[];
    const set=compareSet();
    if(set||V.side==='compare')renderPanel();
    put(`<div class="steps2">${qs.map((x,k)=>`<span class="qhd ${k===i?'':'off'}">${esc(x.header||'Question '+(k+1))}</span>`).join('')}${qs.length>1?`<span class="cnt">${i+1} of ${qs.length}</span>`:''}</div>
      <div class="qbody"><div class="qq">${esc(q.question)}${q.multiSelect?'<small>Pick any</small>':''}</div>
      ${optionsHtml(q,set)}</div>
      ${typeBox('Or type your own answer…')}
      <div class="qfoot"><button class="qbtn" data-act="stop" data-tip="Stop the turn without answering (Esc)">Stop</button><span class="gap"></span>${i>0?'<button class="qbtn" data-act="back">Back</button>':''}${i<qs.length-1?'<button class="qbtn" data-act="skip">Skip</button>':''}<button class="qbtn pri" data-act="${i<qs.length-1?'next':'send'}">${i<qs.length-1?'Next':qs.length>1?'Send answers':'Send answer'} ${KEY.enter}</button></div>`);
    if($('qText').value!==(V.q.typed[i]||''))$('qText').value=V.q.typed[i]||'';qState(set);
  }else if(p.kind==='plan'){
    put(`<div class="steps2"><span class="qhd">Plan</span></div><div class="qq">Start on this plan?</div>
      <div class="qbody"><div class="planbody ai">${md(p.input.plan||'')}</div></div>
      <div class="qrow"><button class="qbtn pri" data-act="allow">Approve and start ${KEY.enter}</button><button class="qbtn" data-act="allow" data-choice="plan:ask">Approve, but ask before each edit</button><button class="qbtn" data-act="deny">Keep planning ${KEY.esc}</button></div>${typeBox('Or say what to change in the plan…')}`);
  }else if(p.kind==='unknown'){
    put(`<div class="steps2"><span class="qhd">Needs you</span></div><div class="qq">The agent is asking something this app can't show properly yet</div>
      <div class="qbody"><div class="why">Here is what could be read from it:</div><div class="raw">${esc(JSON.stringify(p.input,null,1).slice(0,900))}</div></div>${typeBox('Answer in your own words…')}
      <div class="qfoot"><button class="qbtn" data-act="term" title="Stops this turn. Ask the agent to put the question again there.">Continue in the terminal</button><span class="gap"></span><button class="qbtn pri" data-act="deny">Send</button></div>`);
  }else{
    const inp=p.input||{},edit=/^(Edit|Write|MultiEdit|NotebookEdit)$/.test(p.toolName);
    let detail;
    if(p.toolName==='Bash')detail=`<div class="qq">Run this command?</div><div class="cmd"><i>$</i>${esc(inp.command||'')}</div>${inp.description?`<div class="why">${esc(inp.description)}</div>`:''}`;
    else if(edit){
      const del=String(inp.old_string||'').split('\n'),add=String(inp.new_string??inp.content??'').split('\n');
      const full=!!V.q.full,nd=full?1e9:8,na=full?1e9:12;
      const rows=[...(inp.old_string?del.slice(0,nd).map(l=>`<div class="m">- ${esc(l)}</div>`):[]),...add.slice(0,na).map(l=>`<div class="p">+ ${esc(l)}</div>`)];
      const hidden=(inp.old_string?Math.max(0,del.length-nd):0)+Math.max(0,add.length-na);
      detail=`<div class="qq">${p.toolName==='Write'?'Write this file?':'Make this edit?'}</div><div class="frow">${esc(inp.file_path||inp.notebook_path||'')}<span class="plus">+${add.length}</span>${inp.old_string?`<span class="minus">−${del.length}</span>`:''}${hidden||full?`<button class="lnk" data-act="full">${full?'Show less':'View full change'}</button>`:''}</div><div class="peek ${full?'all':''}">${rows.join('')}${hidden?`<div>  … ${hidden} more lines</div>`:''}</div>`;
    }else detail=`<div class="qq">Allow ${esc(p.toolName.replace(/^mcp__/,'').replace(/__/g,' · '))}?</div><div class="raw">${esc(JSON.stringify(inp,null,1).slice(0,700))}</div>`;
    put(`<div class="steps2"><span class="qhd">Permission</span></div><div class="qbody">${detail}</div>
      <div class="qrow"><button class="qbtn pri" data-act="allow">Allow once ${KEY.enter}</button>${p.choices.map(ch=>`<button class="qbtn" data-act="allow" data-choice="${ch.id}">${esc(ch.label)}${ch.code?` <code>${esc(ch.code.length>46?ch.code.slice(0,45)+'…':ch.code)}</code>`:''}</button>`).join('')}<button class="qbtn" data-act="deny">Deny ${KEY.esc}</button></div>
      ${typeBox('Or tell the agent what to do instead…')}`);
  }
}
const answered=()=>!!V.ans&&V.run?.pending?.id===V.ans;
// What holds the session for you: the stop of the turn in memory, or, once that is gone (the app restarted, the terminal
// view took the session), a sign-in or limit stop that ends what the history file says.
function heldStop(){
  if(V.run?.status==='stopped')return {...V.run.stopped,profile:V.run.profile};
  if(V.run&&(V.run.status!=='idle'||V.run.stopped)||selSession()?.done)return null;
  const last=V.items[V.items.length-1];
  return last?.kind==='note'&&(last.stop==='auth'||last.stop==='limit')?{reason:last.stop,profile:last.profile}:null;
}
const stopKey=()=>V.run?.status==='stopped'?V.run.startedAt:'n'+V.items[V.items.length-1]?.n;
function stoppedCard(st){
  const cur=st.profile||V.run?.profile||selSession()?.profile,others=A.profiles.filter(p=>p.name!==cur);
  const head={limit:['Limit reached',`Limit reached on ${cur}`],auth:['Sign-in needed',`${cur} is signed out`]}[st.reason]||['Stopped','The turn stopped'];
  const mine=A.profiles.find(p=>p.name===cur),clears=st.reason==='limit'&&(mine?.d7>=100?mine.r7:mine?.r5);
  const why=st.reason==='auth'?`Its sign-in could not be renewed. Sign in again, then continue. Nothing is lost.`:esc(st.text||'')+(st.reason==='limit'?` Nothing is lost.${clears?' The limit clears in '+esc(until(clears))+'.':''}`:'');
  return `<div class="steps2"><span class="qhd">${head[0]}</span></div><div class="qq">${esc(head[1])}</div><div class="why">${why}</div>
    <div class="qrow">${st.reason==='auth'?`<button class="qbtn pri" data-signin="${esc(cur)}">Sign in again</button>`:''}${st.reason==='limit'?'':`<button class="qbtn ${st.reason==='auth'?'':'pri'}" data-go="${esc(cur)}">${st.reason==='auth'?'I have signed in, continue':'Try again'}</button>`}${others.map((p,i)=>`<button class="qbtn ${st.reason==='limit'&&!i?'pri':''} ${p.h5>=100?'off':''}" data-go="${esc(p.name)}">Continue on ${esc(p.name)}${p.h5!=null?`<small>${p.h5>=100?'5h full':p.h5+'% used'}</small>`:''}</button>`).join('')}<button class="qbtn" data-act="dismiss" ${st.reason==='limit'?'data-tip="Closes this card. Write to the session again once the limit has cleared."':''}>${st.reason==='limit'?'Wait for the limit to clear':'Dismiss'} ${KEY.esc}</button></div>`;
}
$('qcard').addEventListener('input',e=>{if(e.target.id==='qText')V.q.typed[V.q.step]=e.target.value});
// Keys for the card: Enter takes the highlighted button, Escape denies (or closes a stopped card), and the arrow and page keys
// scroll a long card. They work from anywhere in the window except another text field, a focused button, the terminal or an open
// menu or dialog. A card that has only just appeared ignores Enter and Escape, so a key meant for the message box cannot answer it.
function cardKey(e){
  const c=$('qcard'),t=e.target,inBox=t.id==='qText';
  if(c.hidden||e.defaultPrevented||e.ctrlKey||e.metaKey||e.altKey||e.isComposing)return;
  if(!inBox&&t.closest?.('input,textarea,select,button,a,[contenteditable],#xt,#lgx'))return;
  if(!$('dim').hidden||!$('sdim').hidden||document.querySelector('.pop:not([hidden])'))return;
  const body=c.querySelector('.qbody'),page=body?Math.max(40,body.clientHeight-40):0;
  const move={ArrowUp:-40,ArrowDown:40,PageUp:-page,PageDown:page,Home:-1e9,End:1e9}[e.key];
  if(move&&!inBox&&body&&body.scrollHeight>body.clientHeight){e.preventDefault();body.scrollTop+=move;return}
  if(e.key!=='Enter'&&e.key!=='Escape')return;
  if(e.shiftKey||e.repeat)return;
  const p=V.run?.pending;
  if(p&&!inBox&&Date.now()-(V.q.at||0)<500)return;
  let b;
  if(e.key==='Enter'){
    if(!p||(p.kind==='unknown'&&!$('qText')?.value.trim()))return;
    b=c.querySelector('.qbtn.pri[data-act]');
  }else{
    if(inBox&&t.value){e.preventDefault();t.value='';V.q.typed[V.q.step]='';return}
    b=c.querySelector('[data-act=dismiss]')||(p&&p.kind!=='unknown'?c.querySelector('[data-act=deny],[data-act=stop]'):null);
  }
  if(!b)return;
  e.preventDefault();b.click();
}
document.addEventListener('keydown',cardKey);
$('qcard').onclick=async e=>{
  const p=V.run?.pending,o=e.target.closest('[data-opt]'),a=e.target.closest('[data-act]'),go=e.target.closest('[data-go]');
  const si=e.target.closest('[data-signin]');if(si){openSettings(1,si.dataset.signin);startLogin(si.dataset.signin);return}
  if(go){sendText('Continue where you left off.',go.dataset.go);return}
  if(a?.dataset.act==='dismiss'){V.dismissed=stopKey();render();return}
  if(a?.dataset.act==='term'){api(`sessions/${V.sel}/stop`,{}).catch(err=>oops(err.message));setView(V.sel,'term');return}
  if(!p)return;
  const big=e.target.closest('[data-big]');
  if(big&&p.kind==='question'){const i=V.q.step,t=+big.dataset.big,open=V.side==='compare'&&!V.pv&&(V.q.show[i]??0)===t;
    if(open){V.side=null;V.full=false}else{V.q.show[i]=t;V.side='compare';V.pv=null}
    renderPanel();renderCard();return}
  if(o){const i=V.q.step,k=+o.dataset.opt,multi=p.input.questions[i].multiSelect,cur=V.q.picks[i]||[];
    V.q.picks[i]=multi?(cur.includes(k)?cur.filter(x=>x!==k):[...cur,k]):[k];V.q.typed[i]='';
    const t=compareSet()?.tabs.findIndex(x=>x.opt===k);if(t>=0&&V.side==='compare'&&V.q.show[i]!=='all')V.q.show[i]=t;   // the open panel follows your pick
    renderCard();return}
  if(e.target.closest('[data-mic]')){if(e.detail===0)R?stopVoice():startVoice('qText');return}   // the mouse is handled on pointerdown
  if(!a)return;
  if(a.dataset.act==='stop'){if(R?.target==='qText')stopVoice(false);V.ans=p.id;renderCard();$('input').focus();api(`sessions/${V.sel}/stop`,{}).catch(err=>{V.ans=null;renderCard();oops(err.message)});return}
  if(R?.target==='qText')await stopVoice();                                // what is being dictated goes with the answer
  const act=a.dataset.act,text=($('qText')?.value||'').trim();
  if(act==='next'){V.q.step++;renderCard();return}
  if(act==='skip'){const i=V.q.step;(V.q.skipped||={})[i]=true;V.q.picks[i]=[];V.q.typed[i]='';V.q.step++;renderCard();return}
  if(act==='full'){V.q.full=!V.q.full;renderCard();return}
  if(act==='back'){V.q.step--;renderCard();return}
  let payload;
  if(act==='send'){
    const answers={};
    p.input.questions.forEach((q,i)=>{const typed=(V.q.typed[i]||'').trim(),labels=(V.q.picks[i]||[]).map(k=>q.options[k].label);answers[q.question]=typed||labels.join(', ')||(V.q.skipped?.[i]?'Skipped':'')});
    if(Object.values(answers).some(v=>!v)){oops('Pick an option or type an answer for each question.');return}
    payload={action:'answer',answers};
  }else if(act==='allow')payload={action:text?'deny':'allow',choice:a.dataset.choice,text};
  else payload={action:'deny',text};
  V.ans=p.id;renderCard();renderThread();toBottom(true);$('input').focus();
  try{await api(`sessions/${V.sel}/answer`,{requestId:p.id,...payload})}catch(err){V.ans=null;renderCard();renderThread();oops(err.message)}
};

/* ---------- composer ---------- */
// While the agent works the button stops it, unless you have written something: then it sends that to the agent.
const isWorking=()=>!V.isNew&&!!V.run&&(V.run.status==='working'||V.run.status==='waiting');
const hasDraft=()=>!!$('input').value.trim()||V.att.length>0;
function fitSend(){const stop=isWorking()&&!hasDraft(),b=$('send');if(b.dataset.i===(stop?'stop':'up'))return;b.dataset.i=stop?'stop':'up';b.title=stop?'Stop':'Send';hydrate(b.parentNode)}
const curProfile=()=>V.isNew?V.profile:V.pick[V.sel]?.profile||V.run?.profile||selSession()?.profile;
const lvl=v=>v>=100?'hot':v>=80?'mid':'';
let limT;
function renderComposer(){
  const nw=V.isNew,s=selSession(),working=!nw&&V.run&&(V.run.status==='working'||V.run.status==='waiting'),locked=!nw&&s?.locked&&!working;
  $('sProject').hidden=!nw;
  $('box').classList.toggle('off',!!locked);
  $('input').disabled=!!locked;
  $('input').placeholder=nw?'Describe the task…':locked?'In use in a terminal. You can write here when it is idle.':working?'Message the agent… it reads this when the current step ends':'Message the agent…';
  fitSend();
  const pr=A.projects.find(p=>p.cwd===V.project);
  $('pProject').innerHTML=pr?`${tile(pr.name,'s')}</span><span>${esc(pr.name)}</span>${svg('chev-d','cv')}`:`${svg('folder')}<span>Pick a project</span>${svg('chev-d','cv')}`;
  // Under the box: who this conversation runs as and how much of that profile's limits is used, then how it will think.
  const cur=profile(curProfile());
  const mine=cur?Math.max(cur.h5||0,cur.d7||0):0;   // the dot is about this profile only; the others show their state in the menu
  $('pProfile').innerHTML=`${mine>=80?`<i class="adot ${lvl(mine)}"></i>`:''}<span>${esc(cur?.name||'Profile')}</span>${svg('chev-d','cv')}`;
  $('pProfile').dataset.tip=(nw?'The profile this session starts on':'The profile this conversation runs on. Pick another to continue on it.')+(mine>=100?' It has reached a limit.':mine>=80?' It is close to a limit.':'');
  const b=V.limBase&&cur&&V.limBase.name===cur.name&&!working?V.limBase:null,meter=(k,v,was)=>v==null?'':`<span class="m ${lvl(v)} ${was!=null&&was!==v?'fresh':''}">${k}<span class="bar"><i style="width:${Math.min(100,v)}%"></i></span>${was!=null&&was!==v?`<u>${was} →</u> `:''}${v}%</span>`;
  $('lim').innerHTML=cur?meter('5h',cur.h5,b?.h5)+meter('7d',cur.d7,b?.d7):'';
  if(b&&(cur.h5!==b.h5||cur.d7!==b.d7)&&!limT)limT=setTimeout(()=>{limT=null;V.limBase=null;renderComposer()},60000);   // what the turn cost stays readable for a minute
  const full7=cur?.d7>=100,top=cur?Math.max(cur.h5||0,cur.d7||0):0,rs=cur&&(full7?cur.r7:cur.r5);
  $('limNote').className='limnote '+lvl(top);
  // One row, always: the meter beside it already shows which limit is full, so the note only says when it clears, and it is the part that gives way when the row is tight.
  $('limNote').textContent=top>=100?(rs?`${full7?'7d':'5h'} limit clears in ${until(rs)}`:`${full7?'7d':'5h'} limit reached`):top>=80&&rs?`resets in ${until(rs)}`:'';
  $('limNote').title=$('limNote').textContent;
  const eff=EFFORTS.find(m=>m[0]===shownEffort())?.[1]||shownEffort();
  $('pModel').innerHTML=`<span>${shownModel()?esc(modelName(shownModel())):'Default model'}${eff&&eff!=='Default'?` <i>·</i> ${esc(eff)}`:''}</span>${svg('chev-d','cv')}`;
  const md=shownMode();
  $('pMode').className='pick mode k-'+md+($('mMode').hidden?'':' open');
  $('pMode').innerHTML=`<i class="dot"></i><span>${esc(modeName(md))}</span>${svg('chev-d','cv')}`;
  $('pMode').dataset.tip=`${MODES.find(x=>x[0]===md)?.[2]||''}. Shift+Tab in the message box switches modes.`;
  $('box').classList.toggle('m-plan',md==='plan');$('box').classList.toggle('m-bypass',md==='bypassPermissions');
  const c=!nw&&V.context,pct=c?Math.min(100,Math.round(c.used/c.window*100)):0;
  $('pCtx').innerHTML=c?`<i class="ring" style="--p:${pct}"></i>${pct}%`:'';$('pCtx').className='ctx '+(pct>=80?'mid':'')+($('mCtx').hidden?'':' open');$('sCtx').hidden=!c;
  $('pCtx').dataset.tip=c?`${pct}% of the agent's memory of this conversation is used: ${kTok(c.used)} of ${kTok(c.window)} tokens`:'';
}
const short=p=>A.home&&p&&p.startsWith(A.home)?'~'+p.slice(A.home.length):p||'';
// The profile menu: a small table, one row per account with its 5-hour and 7-day limits, the one with most room first.
// The mark on a bar is how far that window has run, so a bar past its mark is being used faster than the clock.
const WIN={h5:[18000,'r5'],d7:[604800,'r7']};
const WHY={expired:'Sign-in lapsed · last reading',signin:'Signed out · last reading',offline:'Could not read · last reading',busy:'Asked too often · last reading'};
const roomOrder=ps=>{const used=p=>p.h5==null&&p.d7==null?1e3:Math.max(p.h5||0,p.d7||0);
  return [...ps].sort((a,b)=>(b.name===A.next)-(a.name===A.next)||used(a)-used(b)||a.name.localeCompare(b.name))};
function renderProfiles(){
  const now=Date.now()/1000,busy=A.profiles.some(p=>p.reading);
  const newest=Math.max(0,...A.profiles.map(p=>p.at||0));
  const cell=(p,k)=>{const v=p[k],r=p[WIN[k][1]],run=r?Math.min(100,Math.max(0,(1-(r-now)/WIN[k][0])*100)):null;
    return `<span class="pc ${lvl(v??0)}" data-k="${k}" ${r?`data-tip="${k==='h5'?'5-hour':'7-day'} limit ${v>=100?'clears':'resets'} in ${until(r)}"`:''}><span class="t"><span class="v">${v??'–'}%</span><small class="rs">${r?until(r):''}</small></span><span class="bar"><i style="width:${Math.min(100,v||0)}%"></i>${run!=null&&v<100?`<b style="left:${run}%"></b>`:''}</span></span>`};
  $('mProfile').innerHTML=`<div class="lab">${V.isNew?'Start this session on':'Continue this conversation on'}</div>`
    +`<div class="phd"><span></span><span>Account</span><span>5h</span><span>7d</span></div>`
    +roomOrder(A.profiles).map(p=>{const old=p.at&&now-p.at>900,why=p.failed&&WHY[p.failed],full=Math.max(p.h5||0,p.d7||0)>=100;
      return `<button class="prow ${p.reading?'reading':''} ${full?'full':''} ${p.name===curProfile()?'cur':''}" data-prof="${esc(p.name)}">${p.name===curProfile()?svg('check','ck'):'<span></span>'}
      <span class="pn"><b>${esc(p.name)}</b><small class="age">${p.reading?'<i class="spin"></i>':why?esc(why)+(p.at?' '+ago(p.at):''):old?ago(p.at)+' ago':''}</small></span>${cell(p,'h5')}${cell(p,'d7')}</button>`}).join('')
    +`<div class="pft"><button class="pman" data-manage data-tip="Settings for each profile, and what to do when one has a problem">Manage…</button><span>${V.isNew?'':'Applies from your next message.'}</span><span class="upd">${busy?'Reading…':newest?'Updated '+(ago(newest)==='now'?'just now':ago(newest)+' ago'):''}</span><button class="ib rf ${busy?'busy':''}" data-refresh data-tip="Read every profile's limits again, one after another. Nothing is sent to Claude.">${svg('refresh')}</button></div>`;
}
function renderMenus(){
  const f=V.find.toLowerCase(),list=A.projects.filter(p=>!f||p.name.toLowerCase().includes(f)||p.cwd.toLowerCase().includes(f));
  const row=p=>`<button class="item" data-proj="${esc(p.cwd)}">${tile(p.name)}</span><span class="nm"><b>${esc(p.name)}</b><span class="mono">${esc(p.cwd.replace(/^\/home\/[^/]+/,'~'))}</span></span>${p.cwd===V.project?svg('check','ck'):''}</button>`;
  const rec=list.filter(p=>p.recent),rest=list.filter(p=>!p.recent);
  $('mProject').innerHTML=`<div class="find">${svg('search')}<input id="pFind" placeholder="Find a project or type a path" value="${esc(V.find)}" autocomplete="off" spellcheck="false"></div>${/^(~|\/|[A-Za-z]:[\\/]|\\\\)/.test(V.find.trim())?`<button class="item" data-path="${esc(V.find.trim())}">${svg('folder')}<span class="nm"><b>Use this folder</b><span class="mono">${esc(V.find.trim())}</span></span></button>`:''}
    ${rec.length?'<div class="lab">Recent</div>'+rec.map(row).join(''):''}${rest.length?`<div class="lab">${(A.folders||[]).length===1?'In '+esc(short(A.folders[0])):'In your project folders'}</div>`+rest.map(row).join(''):''}${!list.length?'<div class="lab">Nothing matches.</div>':''}
    <div class="sep"></div>${window.workwood?.pickFolder?`<button class="item" data-browse>${svg('folder')}<span class="nm"><b>Browse…</b></span></button>`:''}${V.mk?`<div class="mk"><span class="mono">${esc(short((A.folders||[])[0]||'')+(/\\/.test((A.folders||[])[0]||'')?'\\':'/'))}</span><input id="mkName" placeholder="folder-name" autocomplete="off"><button data-create>Create</button></div>`:`<button class="item" data-mk>${svg('folder-plus')}<span class="nm"><b>New folder…</b></span></button>`}`;
  renderProfiles();
  const md=shownMode(),dmo=V.def.mode||'default',who=curProfile();
  $('mMode').innerHTML=`<div class="lab">Permission mode <span class="kbd">Shift+Tab</span></div>`+modeList().map(([v,n,d])=>`<button class="item k-${v} ${v===md?'on':''}" data-mode="${v}"><i class="dot"></i><span class="nm"><b>${n}</b><span>${d}</span></span>${v===dmo?'<small class="def">default</small>':''}${v===md?svg('check','ck'):''}</button>`).join('')
    +(md!==dmo&&who?`<div class="sep"></div><button class="item" data-mkdef><span class="nm"><b>Make ${esc(modeName(md))} the default</b><span>For new sessions on ${esc(who)}, here and in Claude Code</span></span></button>`:'')
    +`<div class="cap2" style="padding-top:6px">${V.isNew?'New sessions start in it.':'Changes right away, even mid-turn. A card already waiting stays until you answer it.'}</div>`;
  // Model and effort are one decision, so they share one menu.
  const extra=[[V.used.model,'Used in this session'],[V.def.model,'Your default']].filter(([m],i,a)=>m&&!MODELS.some(x=>x[0]===m)&&a.findIndex(y=>y[0]===m)===i).map(([m,d])=>[m,esc(modelName(m)),d]);
  const dm=V.def.model,de=V.def.effort,tag='<small class="def">default</small>';
  $('mModel').innerHTML='<div class="lab">Model</div>'+[MODELS[0],...extra,...MODELS.slice(1)].filter(x=>x[0]||!dm).map(([v,n,d])=>`<button class="item ${v===shownModel()?'on':''}" data-v="${esc(v)}"><span class="nm"><b>${n}</b><span>${d}</span></span>${v&&v===dm?tag:''}${v===shownModel()?svg('check','ck'):''}</button>`).join('')
    +'<div class="sep"></div><div class="lab">Effort</div><div class="eseg">'+EFFORTS.filter(x=>x[0]||!de).map(([v,n,d])=>`<button class="${v===shownEffort()?'on':''}" data-e="${esc(v)}" data-tip="${esc(d+(v&&v===de?'. Your default.':''))}">${n}</button>`).join('')+'</div>'
    +`<div class="cap2" style="padding-top:6px">${de?`${esc(EFFORTS.find(x=>x[0]===de)?.[1]||de)} is your default effort. `:''}Applies from your next message.</div>`;
}
function closePops(){document.querySelectorAll('.pop').forEach(p=>p.hidden=true);$('pCtx').classList.remove('open');$('gmenu').hidden=true;$('emenu').hidden=true;$('smenu').hidden=true;V.menuFor=null;document.querySelectorAll('.sess.mopen').forEach(b=>b.classList.remove('mopen'));$('menu').hidden=true;document.querySelectorAll('.pick.open').forEach(b=>b.classList.remove('open'));$('bGear').classList.remove('on')}
const toggle=(btn,pop,then)=>e=>{e.stopPropagation();const was=$(pop).hidden;closePops();if(was){V.mk=false;V.find='';renderMenus();$(pop).hidden=false;$(btn).classList.add('open');then?.()}};
$('pProject').onclick=toggle('pProject','mProject',()=>$('pFind').focus());
$('pProfile').onclick=toggle('pProfile','mProfile');
$('pModel').onclick=toggle('pModel','mModel');
$('pMode').onclick=toggle('pMode','mMode');
$('mMode').onclick=async e=>{e.stopPropagation();const t=e.target.closest('[data-mode]');if(t)return pickMode(t.dataset.mode);
  if(e.target.closest('[data-mkdef]')){const m=shownMode(),who=curProfile();closePops();
    try{await api('default-mode',{profile:who,mode:m});if(curProfile()===who)V.def.mode=m;renderComposer()}catch(err){oops(err.message)}}};
// Menus close when you press anywhere outside them. (Listening for a click instead let a second click event, which some
// windows deliver for one press, close a menu the moment it opened.)
document.addEventListener('pointerdown',e=>{if(!e.target.closest('.pop,.fmenu,.menu,.pick,#bGear,#moreBtn,[data-dots]'))closePops()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closePops();$('dim').hidden=true;if(!$('sdim').hidden&&!L)closeSettings()}});
$('mProject').addEventListener('input',e=>{if(e.target.id==='pFind'){V.find=e.target.value;const at=e.target.selectionStart;renderMenus();const i=$('pFind');i.focus();i.setSelectionRange(at,at)}});
$('mProject').addEventListener('keydown',e=>{if(e.target.id==='mkName'&&e.key==='Enter')$('mProject').querySelector('[data-create]').click()});
$('mProject').onclick=async e=>{
  e.stopPropagation();const t=e.target.closest('button');if(!t)return;
  if(t.dataset.proj){V.project=t.dataset.proj;closePops();render();loadDefaults()}
  else if('mk' in t.dataset){V.mk=true;renderMenus();$('mkName').focus()}
  else if('path' in t.dataset||'browse' in t.dataset){const f='browse' in t.dataset?await window.workwood.pickFolder():t.dataset.path;if(!f)return;
    try{const p=await api('projects',{path:f});if(!A.projects.some(x=>x.cwd===p.cwd))A.projects.push(p);V.project=p.cwd;closePops();render()}catch(err){oops(err.message)}}
  else if('create' in t.dataset){try{const p=await api('projects',{name:$('mkName').value.trim()});if(!A.projects.some(x=>x.cwd===p.cwd))A.projects.push(p);V.project=p.cwd;closePops();render()}catch(err){oops(err.message)}}
};
$('mProfile').onclick=e=>{e.stopPropagation();if(e.target.closest('[data-manage]')){openSettings(1,curProfile());return}if(e.target.closest('[data-refresh]')){api('limits/refresh',{}).catch(err=>oops(err.message));A.profiles.forEach(p=>p.reading=true);renderProfiles();return}const t=e.target.closest('[data-prof]');if(!t)return;closePops();if(V.isNew){V.profile=t.dataset.prof;render();loadDefaults()}else{choose('profile',t.dataset.prof);V.limBase=null;renderComposer()}};
$('mModel').onclick=e=>{e.stopPropagation();const t=e.target.closest('[data-v]'),f=e.target.closest('[data-e]');if(t){choose('model',t.dataset.v);closePops();renderComposer()}else if(f){choose('effort',f.dataset.e);hideTip();renderMenus();renderComposer()}};

const input=$('input');
const grow=()=>{input.style.height='auto';input.style.height=Math.min(220,input.scrollHeight)+'px'};
input.addEventListener('input',grow);
input.addEventListener('input',()=>{slSel=0;renderSlash()});
input.addEventListener('input',fitSend);
input.addEventListener('input',()=>{if(V.limBase){V.limBase=null;clearTimeout(limT);limT=null;renderComposer()}});
input.addEventListener('keydown',e=>{if(slashKey(e))return;
  if(e.key==='Tab'&&e.shiftKey&&!e.ctrlKey&&!e.altKey&&!e.metaKey){e.preventDefault();const l=modeList().map(x=>x[0]).filter(v=>v!=='bypassPermissions'),i=l.indexOf(shownMode());pickMode(l[(i+1)%l.length]);return}   // as in Claude Code
  if(e.key==='ArrowUp'&&!e.shiftKey&&!e.altKey&&!e.ctrlKey&&!e.metaKey&&queued().length&&input.selectionStart===0&&input.selectionEnd===0){e.preventDefault();takeBack();return}
  if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();if(!isWorking()||hasDraft())$('send').click()}});   // Enter never stops a turn
$('send').onclick=async()=>{
  if(isWorking()&&!hasDraft()){try{await api(`sessions/${V.sel}/stop`,{})}catch(e){oops(e.message)}return}
  if(R){await stopVoice();return}                                          // finish dictating first; a second press sends
  const text=input.value.trim();if(!text&&!V.att.length)return;
  // The box empties at once; if the message could not be sent, what you wrote comes back.
  const att=V.att;V.att=[];input.value='';renderAtt();grow();fitSend();
  // One at a time: a message sent while the one before is still on its way goes right after it.
  const go=sendQ.then(()=>sendText(text,undefined,att.map(({name,type,data,path})=>({name,type,data,path}))));sendQ=go.catch(()=>{});
  if(await go)for(const a of att){if(a.url)URL.revokeObjectURL(a.url)}
  else{if(!input.value)input.value=text;V.att=att.concat(V.att);renderAtt();grow();fitSend()}
};
let sendQ=Promise.resolve(),qSeq=0;

/* ---------- the queue: what you wrote while the agent works ---------- */
// It waits here until the agent finishes the step it is on. Until then it can be taken back (↑, or the pencil)
// to change it, or sent now, which cuts the step short.
const queued=()=>V.isNew?[]:[...(V.run?.queued||[]).filter(q=>!V.qGone.has(q.id)),...V.qLocal];
/* ---------- background work: a tray above the message box, a header button, and a side panel with each task's output ---------- */
const bgList=()=>V.isNew?[]:V.run?.bg||[];
const BGI={shell:'term',monitor:'eye',agent:'user'};
window.wwBackground=()=>A.sessions.filter(s=>s.bg).map(s=>({title:s.title,n:s.bg}));   // asked by the window before it quits
function bgRow(t,sel){
  const [a,l]=t.kind==='agent'?['steps','Steps']:t.kind==='monitor'?['out','Events']:['out','Output'];
  const fresh=t.kind==='monitor'&&t.events>(V.seenEv[t.id]||0);
  const sub=t.kind==='agent'?[t.last,t.steps!=null&&plural(t.steps,'step'),t.tokens&&Math.round(t.tokens/1000)+'k tokens'].filter(Boolean).join(' · ')
    :t.last||(t.kind==='monitor'?'No events yet':t.cmd||'');
  return `<div class="tk ${sel?'on':''}" data-task="${esc(t.id)}"><span class="tki ${t.kind}">${svg(BGI[t.kind]||'term')}</span>
    <div class="tk1"><b>${esc(t.name)}</b>${t.sub?`<span class="stt n">${esc(t.sub)}</span>`:''}${fresh?'<span class="stt mo">new event</span>':''}</div>
    <div class="tka">${clockEl(t.start,'go')}<button class="mini" data-bg${a}="${esc(t.id)}">${l}</button><button class="mini stop" data-bgstop="${esc(t.tool||t.id)}" title="Stop it">${svg('stop')}Stop</button></div>
    <div class="tk2 ${t.kind==='agent'?'':'mono'}">${esc(sub)}</div></div>`;
}
function renderTray(){
  const l=bgList(),tr=$('tray'),b=$('bTasks');
  tr.hidden=b.hidden=!l.length;$('tkN').textContent=l.length||'';b.classList.toggle('on',V.side==='tasks'&&!V.pv);
  if(V.side==='tasks'&&!l.length){V.side=null;renderPanel()}
  if(!l.length){tr.innerHTML='';return}
  const names=l.slice(0,3).map(t=>`<span class="tkk ${t.kind}">${esc(t.name)}</span>`).join('')+(l.length>3?`<span class="tkk">+${l.length-3}</span>`:'');
  tr.classList.toggle('open',V.trayOpen);
  tr.innerHTML=`<button class="tl" data-tray><b>${l.length} running</b>${names}<span class="gap"></span>${svg('chev-d')}</button>${V.trayOpen?`<div class="tasks">${l.map(t=>bgRow(t)).join('')}</div>`:''}`;
  if(V.side==='tasks'&&!V.pv)renderTasks();
}
let tkTimer=null;
function renderTasks(){
  const l=bgList();if(!l.some(t=>t.id===V.task))V.task=l[0]?.id||null;
  const t=l.find(x=>x.id===V.task);
  $('tkList').innerHTML=l.map(x=>bgRow(x,x.id===V.task)).join('');
  if(t?.kind==='monitor')V.seenEv[t.id]=t.events;
  $('tkInfo').innerHTML=!t?'':[t.cmd&&`<span>Command</span><code>${esc(t.cmd)}</code>`,`<span>Started</span><div>${clock(new Date(t.start))} · running ${clockEl(t.start)}</div>`,
    t.limit&&`<span>Limit</span><div>stops by itself after ${sdur(t.limit)}</div>`,t.kind==='monitor'&&`<span>Events</span><div>${t.events||0}</div>`,
    t.kind==='agent'&&`<span>Doing</span><div>${esc(t.last||'Starting')}${t.tokens?' · '+Math.round(t.tokens/1000)+'k tokens':''}</div>`].filter(Boolean).join('');
  clearTimeout(tkTimer);
  const out=$('tkOut');out.hidden=!t||t.kind==='agent';
  if(!t||t.kind==='agent')return;
  const sid=V.sel,id=t.id;
  const pull=async()=>{if(V.sel!==sid||V.task!==id||V.side!=='tasks')return;
    try{const d=await api(`sessions/${sid}/task-output?task=${encodeURIComponent(id)}`);const end=out.scrollTop+out.clientHeight>=out.scrollHeight-8;
      if(out.textContent!==d.text){out.textContent=d.text||'Nothing printed yet.';if(end)out.scrollTop=out.scrollHeight}}catch{}
    tkTimer=setTimeout(pull,1500)};
  pull();
}
const openTask=id=>{V.side='tasks';V.task=id;V.pv=null;V.full=false;renderPanel();renderTray()};
function bgClick(e){
  const b=e.target.closest('[data-tray],[data-bgout],[data-bgsteps],[data-bgstop],[data-task]');if(!b)return;const d=b.dataset;
  if('tray' in d){V.trayOpen=!V.trayOpen;renderTray()}
  else if(d.bgout)openTask(d.bgout);
  else if(d.bgsteps){const t=bgList().find(x=>x.id===d.bgsteps),it=t&&V.items.find(i=>i.kind==='tools'&&i.tools.some(s=>s.id===t.tool));
    if(it){V.openTools.add(it.n);V.shutTools.delete(it.n);renderThread();document.querySelector(`#thread [data-step="${CSS.escape(t.tool)}"]`)?.scrollIntoView({block:'center',behavior:'smooth'})}}
  else if(d.bgstop){b.disabled=true;api(`sessions/${V.sel}/stop-step`,{id:d.bgstop}).catch(err=>{b.disabled=false;oops(err.message)})}
  else if(d.task&&e.currentTarget.id==='tkList'){V.task=d.task;renderTasks()}
}
$('tray').onclick=bgClick;$('tkList').onclick=bgClick;
$('bTasks').onclick=()=>{if(V.side==='tasks'&&!V.pv)V.side=null;else{V.side='tasks';V.pv=null;V.full=false}renderPanel();renderTray()};
$('tkClose').onclick=()=>{V.side=null;renderPanel();renderTray()};
function renderQueue(){renderTray();
  const q=queued(),el=$('queue'),busy=V.run?.status==='working';
  el.hidden=!q.length||!$('qcard').hidden;
  if(el.hidden){el.innerHTML='';return}
  el.innerHTML=`<div class="qh"><span>${busy?'Queued: the agent reads '+(q.length>1?'these':'this')+' when its current step ends':'Waiting to be sent'}</span><span class="gap"></span><span class="hint"><kbd>↑</kbd> to edit</span></div>`
    +q.map(m=>`<div class="qm${m.tmp||V.qNow===m.id?' going':''}" data-q="${esc(m.id)}"><span class="qt">${esc(m.text.replace(/\s+/g,' ').trim()||'Attached files')}</span>${m.files?.length?`<span class="qf">${svg('file')}${m.files.length}</span>`:''}`
      +(m.tmp?'':`<button class="ib" data-qedit data-tip="Take it back to change it" data-i="pencil"></button><button class="qnow" data-qnow data-tip="${busy?'Cut the current step short and send this now':'Send this now'}">Send now</button>`)+'</div>').join('');
  hydrate(el);
}
function backToBox(items){
  if(!items.length)return;
  const was=input.value.trim();
  input.value=[...items.map(m=>m.text.trim()).filter(Boolean),...(was?[was]:[])].join('\n\n');
  for(const m of items)for(const a of m.attachments||[]){const pic=PICS.includes(a.type);V.att.push({...a,id:++attSeq,pic,url:pic&&a.data?`data:${a.type};base64,${a.data}`:null})}
  renderAtt();grow();fitSend();input.focus();input.setSelectionRange(input.value.length,input.value.length);
}
async function takeBack(ids){
  // ↑ straight after sending: the message is still on its way to the queue; take it back once it has arrived
  if(!ids&&V.qSending&&!queued().some(m=>!m.tmp)){await V.qSending;return takeBack()}
  const sid=V.sel,gone=ids||queued().filter(m=>!m.tmp).map(m=>m.id);if(!gone.length)return;
  for(const id of gone)V.qGone.add(id);renderQueue();
  try{const r=await api(`sessions/${sid}/unqueue`,ids?{ids}:{});if(V.sel===sid)backToBox(r.items)}
  catch(e){oops(e.message)}
  finally{for(const id of gone)V.qGone.delete(id);if(V.run)V.run.queued=(V.run.queued||[]).filter(m=>!gone.includes(m.id));renderQueue()}
}
$('queue').onclick=async e=>{
  const row=e.target.closest('[data-q]');if(!row)return;const id=row.dataset.q;hideTip();
  if(e.target.closest('[data-qedit]'))return takeBack([id]);
  if(!e.target.closest('[data-qnow]'))return;
  if(V.run?.status==='working'){V.qNow=id;renderQueue();try{await api(`sessions/${V.sel}/now`,{id})}catch(err){V.qNow=null;renderQueue();oops(err.message)}return}
  // nothing is running: it simply goes as your next message
  const sid=V.sel;V.qGone.add(id);renderQueue();
  try{const r=await api(`sessions/${sid}/unqueue`,{ids:[id]});if(V.run)V.run.queued=(V.run.queued||[]).filter(m=>m.id!==id);const m=r.items[0];if(m&&V.sel===sid)await sendText(m.text,undefined,m.attachments)}
  catch(err){oops(err.message)}finally{V.qGone.delete(id);renderQueue()}
};
async function sendText(text,asProfile,attachments){
  if(V.busy)return false;V.busy=true;oops('');
  {const p=profile(asProfile||curProfile());clearTimeout(limT);limT=null;V.limBase=p&&p.h5!=null?{name:p.name,h5:p.h5,d7:p.d7}:null}
  const later=isWorking()&&V.run?.status==='working';   // the agent is busy: it waits in the queue, where it can still be changed
  const tmp=later?{id:'tmp'+(++qSeq),text,files:(attachments||[]).map(a=>a.name),tmp:true}:null;
  if(later){V.qLocal.push(tmp);renderQueue()}
  else V.pend={text,files:(attachments||[]).map(a=>a.name),need:(V.isNew?0:V.items.filter(it=>it.kind==='user').length)+1+(V.pend&&!V.isNew?1:0)};resetJump();render();toBottom(true);
  try{
    if(V.isNew){
      if(!V.project){oops('Pick a project first.');return false}
      $('hello').textContent='Starting…';
      const r=await api('sessions',{cwd:V.project,profile:V.profile,text,attachments,model:curModel(),effort:curEffort(),mode:V.pick.new?.mode||undefined});
      if(V.pick.new){V.pick[r.sessionId]=V.pick.new;delete V.pick.new}
      await openSession(r.sessionId,true);
    }else{
      V.dismissed=null;
      const req=api(`sessions/${V.sel}/send`,{text,attachments,profile:asProfile||V.pick[V.sel]?.profile,model:curModel(),effort:curEffort(),mode:V.pick[V.sel]?.mode||undefined});
      if(tmp)V.qSending=req.catch(()=>{});
      const r=await req;
      if(tmp){V.qLocal=V.qLocal.filter(x=>x!==tmp);if(r.queued&&V.run&&!(V.run.queued||[]).some(x=>x.id===r.queued))(V.run.queued=V.run.queued||[]).push({id:r.queued,text:tmp.text,files:tmp.files})}
      if(tmp)renderQueue();
    }
    return true;
  }catch(e){if(tmp)V.qLocal=V.qLocal.filter(x=>x!==tmp);V.pend=null;render();oops(e.message);return false}
  finally{V.busy=false;if(tmp)V.qSending=null;$('hello').textContent='What should the agent do?'}
}

/* ---------- everything together ---------- */
// Under the title, always starting at the same place: where the work is happening. The worktree when there is one,
// else the branch; the project comes after it.
function renderHead(){
  const nw=V.isNew,s=selSession(),w=$('where');
  $('title').textContent=nw?'New session':s?.title||'';
  if(nw||!s){w.innerHTML='';return}
  const pl=V.place||{project:s.project,worktree:null,branch:s.branch,cwd:s.cwd};
  w.dataset.tip=pl.cwd||s.cwd;
  w.innerHTML=(pl.worktree?`<span class="pl1">${svg('tree')}<b>${esc(pl.worktree)}</b><small>worktree</small></span>${pl.branch&&pl.branch!==pl.worktree?`<span>${svg('branch')}${esc(pl.branch)}</span>`:''}`
    :pl.branch?`<span class="pl1">${svg('branch')}<b>${esc(pl.branch)}</b></span>`:'')+`<span class="${pl.worktree||pl.branch?'pj':'pl1'}">${pl.worktree||pl.branch?'':svg('folder')}${pl.worktree||pl.branch?esc(pl.project||s.project):`<b>${esc(pl.project||s.project)}</b>`}</span>`;
  const d=$('bDone');d.innerHTML=`${svg(s.done?'refresh':'check')}<span>${s.done?'Back to inbox':'Done'}</span>`;d.dataset.tip=s.done?'Bring this session back into the sidebar':'Mark done: it leaves the sidebar, and search still finds it (Ctrl+D)';
}
function render(){
  const nw=V.isNew,s=selSession();
  if(s?.unread&&!nw&&!document.hidden){s.unread=false;api(`sessions/${s.id}/seen`,{}).catch(()=>{})}   // you are looking at it
  renderList();renderThread();renderCard();renderQueue();renderComposer();renderPanel();renderTerm();renderHead();
  $('tools').style.visibility=nw||!s?'hidden':'visible';
  $('main').classList.toggle('newmode',nw&&!V.pend);
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)render()});
$('bDone').onclick=()=>{const s=selSession();if(s)setDone(s,!s.done)};

/* ---------- find: every session, in the inbox or done, by its name or project ---------- */
let fSel=0,fHits=[];
function renderFinder(){
  const q=$('fQ').value.trim().toLowerCase(),hit=A.sessions.filter(s=>!q||(s.title+' '+s.project+' '+(s.line||'')).toLowerCase().includes(q)).sort((a,b)=>b.mts-a.mts);
  const inb=hit.filter(s=>!s.done).slice(0,30),dn=hit.filter(s=>s.done).slice(0,60);fHits=inb.concat(dn);fSel=Math.min(fSel,Math.max(fHits.length-1,0));
  const row=(s,i)=>`<button class="frow2 ${i===fSel?'on':''}" data-find="${s.id}"><b>${esc(s.title)}</b><span>${esc(s.project)}${s.line?' · '+esc(s.line):''}</span>${s.status==='idle'?`<time>${ago(s.mts)}</time>`:stateOf(s)}</button>`;
  $('fList').innerHTML=(inb.length?'<div class="lab">In your inbox</div>'+inb.map(row).join(''):'')+(dn.length?'<div class="lab">Done</div>'+dn.map((s,i)=>row(s,i+inb.length)).join(''):'')||`<div class="lab" style="padding:14px 12px">${q?'No session matches.':'No sessions yet.'}</div>`;
  $('fList').querySelector('.on')?.scrollIntoView({block:'nearest'});
}
function openFinder(){closePops();hideTip();$('fdim').hidden=false;$('fQ').value='';fSel=0;renderFinder();$('fQ').focus()}
const closeFinder=()=>{$('fdim').hidden=true};
const pickFound=id=>{closeFinder();openSession(id)};
$('bFind').onclick=$('bHist').onclick=openFinder;
$('fQ').oninput=()=>{fSel=0;renderFinder()};
$('fQ').onkeydown=e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(fHits.length){fSel=(fSel+(e.key==='ArrowDown'?1:-1)+fHits.length)%fHits.length;renderFinder()}}
  else if(e.key==='Enter'){e.preventDefault();if(fHits[fSel])pickFound(fHits[fSel].id)}else if(e.key==='Escape'){e.stopPropagation();closeFinder()}};
$('fList').onclick=e=>{const b=e.target.closest('[data-find]');if(b)pickFound(b.dataset.find)};
$('fdim').addEventListener('pointerdown',e=>{if(e.target===$('fdim'))closeFinder()});
document.addEventListener('keydown',e=>{if(!(e.ctrlKey||e.metaKey)||e.shiftKey||e.altKey||e.target.closest?.('#xt,#lgx'))return;const k=e.key.toLowerCase();
  if(k==='k'){e.preventDefault();$('fdim').hidden?openFinder():closeFinder()}
  else if(k==='d'&&!V.isNew&&selSession()&&$('fdim').hidden&&$('sdim').hidden){e.preventDefault();const s=selSession();if(!s.done)setDone(s,true)}});

$('bCode').onclick=()=>api('open-editor',{sessionId:V.sel}).catch(e=>oops(e.message));

const root=document.documentElement;
const setTheme=t=>{root.dataset.theme=t;localStorage.setItem('ww.theme',t);$('gThemeV').textContent=t==='dark'?'Dark':'Light';if(T?.term)T.term.options.theme=termTheme()};
let gearAt=-1e9;
$('bGear').onclick=e=>{e.stopPropagation();if(e.timeStamp-gearAt<350)return;gearAt=e.timeStamp;$('bGear').blur();const was=$('gmenu').hidden;closePops();if(was){$('gProf').hidden=A.profiles.length<2;$('gProfV').textContent=A.prefs?.defaultProfile||A.profiles.find(p=>p.global)?.name||'';const r=$('bGear').getBoundingClientRect(),m=$('gmenu');m.hidden=false;m.style.left=r.left+'px';m.style.top='auto';m.style.bottom=(innerHeight-r.top+6)+'px';$('bGear').classList.add('on')}};
$('gmenu').onclick=e=>e.stopPropagation();
$('gTheme').onclick=()=>setTheme(root.dataset.theme==='dark'?'light':'dark');
// Open at login: only where the window can arrange it (the Windows window).
const LOGIN=window.workwood?.login||null;let loginOn=!!LOGIN?.on;
async function setLogin(on){try{loginOn=!!(await LOGIN.set(on))}catch{}$('gLoginV').textContent=loginOn?'On':'Off'}
$('gLogin').hidden=!LOGIN;$('gLoginV').textContent=loginOn?'On':'Off';
$('gLogin').onclick=()=>setLogin(!loginOn);
$('gProf').onclick=()=>openSettings(1,startProfile()?.name);

/* ---------- live updates from the service ---------- */
let first=true;
function connect(){
  const es=new EventSource('/api/events?token='+TOKEN);
  es.addEventListener('state',e=>{
    Object.assign(A,JSON.parse(e.data));
    if(first&&A.ready){first=false;const s=A.sessions.find(x=>x.id===location.hash.slice(1))||A.sessions.find(x=>!x.done);if(s&&location.hash!=='#new')openSession(s.id);else newSession();return}
    if(!V.isNew&&V.sel&&A.fresh&&!V.loading&&!A.sessions.some(x=>x.id===V.sel)){leave(V.sel);return} // deleted somewhere else
    if(V.isNew){if(!V.profile)V.profile=startProfile()?.name;if(!V.project)V.project=A.projects[0]?.cwd||null}
    render();{const f=document.activeElement;if(!$('spage').contains(f)||!/^(SELECT|INPUT)$/.test(f.tagName))renderSettings()}if(!$('mProfile').hidden)renderProfiles();
  });
  es.addEventListener('run',e=>{const d=JSON.parse(e.data);if(d.sessionId!==V.sel)return;const end=!awayNow();const was=V.run?.status;V.run=d.run;if(V.ans&&d.run?.pending?.id!==V.ans)V.ans=null;
    if(was==='working'&&d.run?.status!=='working'&&d.run?.status!=='waiting'){const id=V.sel;setTimeout(()=>api('sessions/'+id).then(x=>{if(V.sel===id&&x.place){V.place=x.place;renderHead()}}).catch(()=>{}),900)}   // the agent may have moved to a worktree
    if(d.run?.context)V.context=d.run.context;if(d.run?.model)V.used.model=d.run.model;if(d.run?.effort)V.used.effort=d.run.effort;if(d.run?.mode){V.used.mode=d.run.mode;if(V.pick[d.sessionId])delete V.pick[d.sessionId].mode}if(V.qNow&&!(d.run?.queued||[]).some(q=>q.id===V.qNow))V.qNow=null;checkSoon();changesSoon();renderThread();renderCard();renderQueue();renderComposer();renderTerm();follow(end)});
  es.addEventListener('item',e=>{const d=JSON.parse(e.data);if(d.sessionId!==V.sel)return;const i=V.items.findIndex(x=>x.n===d.item.n),end=!awayNow();noteArrival(d.item,i<0);if(i>=0)V.items[i]=d.item;else V.items.push(d.item);if(d.item.kind==='work'){addWork(d.item.files);renderPanel()}checkSoon();changesSoon();renderThread();follow(end,i<0&&d.item.kind==='assistant'?d.item.n:null)});
  es.onerror=()=>{};
}
hydrate();setTheme(localStorage.getItem('ww.theme')||'dark');render();connect();
