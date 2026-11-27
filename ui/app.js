// Workwood window. Draws what the service reports and sends back what you do.
const P={
  cold:'<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5 12 7l2.5-2.5M9.5 19.5 12 17l2.5 2.5"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  chat:'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  term:'<path d="m4 17 6-6-6-6M12 19h8"/>',
  diff:'<path d="M12 4v8M8 8h8M8 18h8"/>',
  code:'<path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/>',
  clip:'<path transform="translate(12 12) scale(.8) translate(-12 -12)" stroke-width="2.19" d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',   // drawn edge to edge, so shrunk to sit at the size of the composer's other marks
  up:'<path d="M12 19V5M5 12l7-7 7 7"/>','arrow-down':'<path d="M12 5v14M6 13l6 6 6-6"/>',
  max:'<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>',
  zoomout:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5M8 11h6"/>',
  min:'<path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/>',
  ext:'<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"/>',
  x:'<path d="M18 6 6 18M6 6l12 12"/>',
  alert:'<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
  refresh:'<path d="M21 12a9 9 0 1 1-2.64-6.36L21 8"/><path d="M21 3v5h-5"/>',
  zap:'<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
  pencil:'<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
  archive:'<rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8M10 12h4"/>',
  trash:'<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  dots:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  pin:'<path d="M12 17v5M9 3h6l-1 6 4 4v2H6v-2l4-4z"/>',
  kebab:'<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>',
  rewind:'<path d="M11 6.5v11L3.5 12z"/><path d="M20.5 6.5v11L13 12z"/>',
  file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
  cog:'<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  gear:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
  'chev-d':'<path d="m6 9 6 6 6-6"/>',
  'arrow-r':'<path d="M5 12h13M13 6l6 6-6 6"/>',compress:'<path d="M8 3v5H3M16 21v-5h5M3 8l6-6M21 16l-6 6"/>',
  'chev-r':'<path d="m9 6 6 6-6 6"/>',
  'chev-l':'<path d="m15 6-6 6 6 6"/>',
  play:'<path d="M6 4l14 8-14 8z"/>',
  globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  server:'<rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 7.5h.01M7 16.5h.01"/>',
  folder:'<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
  'folder-plus':'<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2zM12 11v6M9 14h6"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  mic:'<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3"/>',
  list:'<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  gauge:'<path d="M12 14l4-4"/><path d="M3.3 17a9 9 0 1 1 17.4 0"/>',
  cpu:'<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
  pulse:'<path d="M4 12h3l2-6 4 12 2-6h5"/>',
  eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  spk:'<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" stroke-linejoin="round"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
  rplay:'<path d="M9 5.4v13.2c0 .8.9 1.3 1.6.8l9.6-6.6c.6-.4.6-1.2 0-1.6L10.6 4.6C9.9 4.1 9 4.6 9 5.4z" fill="currentColor" stroke="none"/>',
  rpause:'<rect x="6.5" y="5" width="4" height="14" rx="1.2" fill="currentColor" stroke="none"/><rect x="13.5" y="5" width="4" height="14" rx="1.2" fill="currentColor" stroke="none"/>',
  rback:'<g fill="currentColor" stroke="none"><rect x="5" y="5.5" width="2.6" height="13" rx="1"/><path d="M19 6.6v10.8c0 .8-.9 1.2-1.5.8l-7.9-5.4a1 1 0 0 1 0-1.6l7.9-5.4c.6-.4 1.5 0 1.5.8z"/></g>',
  rfwd:'<g fill="currentColor" stroke="none"><rect x="16.4" y="5.5" width="2.6" height="13" rx="1"/><path d="M5 6.6v10.8c0 .8.9 1.2 1.5.8l7.9-5.4a1 1 0 0 0 0-1.6L6.5 5.8C5.9 5.4 5 5.8 5 6.6z"/></g>',
  layers:'<path d="M12 4 3 8.5l9 4.5 9-4.5z" stroke-linejoin="round"/><path d="m3 13 9 4.5 9-4.5" stroke-linejoin="round"/>',
  copy:'<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>',
  stop:'<rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" stroke="none"/>',
  bgdown:'<path d="M12 4v10m-4-4 4 4 4-4M5 19h14"/>',
  check:'<path d="M20 6 9 17l-5-5"/>',
  panel:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>',
  spark:'<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" fill="currentColor"/>',
  tree:'<circle cx="6" cy="5" r="2.5"/><circle cx="18" cy="5" r="2.5"/><circle cx="12" cy="19" r="2.5"/><path d="M6 7.5v2a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3v-2M12 12.5v4"/>',
  slash:'<rect x="3.5" y="3.5" width="17" height="17" rx="4.5"/><path d="m14.2 8.2-4.4 7.6"/>',
  done:'<circle cx="12" cy="12" r="9"/><path d="m8 12.5 3 3 5-6"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  monitor:'<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
  branch:'<path d="M6 3v12"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/>',
  moon:'<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  chevL:'<path d="m15 18-6-6 6-6"/>',chevR:'<path d="m9 18 6-6-6-6"/>',
  home:'<path d="m3 10.5 9-7.5 9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  sliders:'<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  flag:'<path d="M5 21V4M5 4h12l-2.5 4L17 12H5"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'
};
const svg=(n,c='')=>`<svg viewBox="0 0 24 24" class="${c}">${P[n]||''}</svg>`;
const hydrate=(r=document)=>r.querySelectorAll('[data-i]').forEach(e=>{e.innerHTML=svg(e.dataset.i)});
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const TOKEN=document.body.dataset.token,PHONE=document.body.dataset.phone==='1';
async function api(path,body){
  const r=await fetch('/api/'+path,{method:body?'POST':'GET',headers:{'x-workwood-token':TOKEN,'content-type':'application/json'},body:body?JSON.stringify(body):undefined});
  const j=await r.json().catch(()=>({}));
  if(r.status===401&&j.unpaired&&PHONE)phGone();
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
  place:null,ans:null,skOpen:false,limBase:null,menuFor:null,renaming:null,renameText:'',caret:0,
  // a thread: the sessions this one continues, those of them loaded, how many show above it, one looked at on its own, open handoffs
  thread:null,handing:null,older:new Map(),shown:0,focus:null,hopen:new Set(),olOpen:new Set(),hpick:{}};  // session actions                                                    // files the agent made; the one shown in the side panel
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
// A reset time in full, for hovering over the relative one: "Tue 25 Nov, 14:30".
const fullAt=ts=>new Date(ts*1000).toLocaleDateString([],{weekday:'short',day:'numeric',month:'short'})+', '+clock(ts*1000);
const selSession=()=>A.sessions.find(s=>s.id===V.sel)||null;
const profile=n=>A.profiles.find(p=>p.name===n);
const startProfile=()=>A.profiles.find(p=>p.name===A.prefs?.defaultProfile)||globalProfile();
const globalProfile=()=>A.profiles.find(p=>p.global)||A.profiles[0];
function oops(msg){const o=$('oops');o.textContent=msg||'';o.hidden=!msg;if(msg)setTimeout(()=>{if(o.textContent===msg)o.hidden=true},8000)}

// A path to a page, picture, video or PDF, as an answer writes it in code or a link: one you can open in the preview.
const PVPATH=/^(?:~?\/|\.{1,2}\/)?[^\s:`'"<>|*?]+\.(?:html?|svg|png|jpe?g|gif|webp|avif|mp4|webm|mov|m4v|pdf)$/i;
// Any other file or folder a message names, perhaps with :line after it: a link to VS Code once it turns out to be there.
// In a code span or link anything path-shaped counts; in plain text it needs a folder in it and a file's extension.
const EDPATH=/^(?!-)(?:~?\/|\.{1,2}\/)?[\w@.+-]+(?:\/[\w@.+-]+)*\/?(?::\d+(?::\d+)?)?$/,EDLIKE=p=>EDPATH.test(p)&&!/^\d+([.:]\d+)*$/.test(p)&&(p.includes('/')||/\.[A-Za-z]\w{0,7}(?::\d+(?::\d+)?)?$/.test(p));
const TXPATH=/(<a\b[\s\S]*?<\/a>|<[^>]+>)|(?<![\w\/.~:@+-])((?:~|\.{1,2})?\/?[\w@.+-]+(?:\/[\w@.+-]+)+\.[A-Za-z]\w{0,7}(?::\d+(?::\d+)?)?)(?![\w\/])/g;
const pathTag=(tag,p,inner)=>PVPATH.test(p)?`<${tag} class="fl" data-fpath="${esc(p)}">${inner}</${tag}>`:EDLIKE(p)&&!PHONE?`<${tag} class="ep" data-epath="${esc(p)}">${inner}</${tag}>`:null;
// Just enough Markdown for agent replies. Everything is escaped first.
function md(src){
  const blocks=[];let s=String(src).replace(/```[^\n]*\n([\s\S]*?)```/g,(_,c)=>{blocks.push(`<div class="cdb"><pre><code>${esc(c.replace(/\n$/,''))}</code></pre><button class="cpy" data-cpcode data-tip="Copy">${svg('copy')}</button></div>`);return `\u0000${blocks.length-1}\u0000`});
  // A code span opens with a run of backticks and closes on a run of the same length, so `` a`b `` holds a backtick;
  // one space either side is padding. Its text is set aside first so bold and links never reach inside it.
  const inline=t=>{const cs=[];
    t=String(t).replace(/(?<!`)(`+)(?!`)([\s\S]*?[^`])\1(?!`)/g,(_,f,c)=>{if(/^ [\s\S]* $/.test(c)&&c.trim())c=c.slice(1,-1);cs.push(pathTag('code',c,esc(c))||`<code>${esc(c)}</code>`);return `\u0001${cs.length-1}\u0001`});
    return esc(t).replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>').replace(/\[([^\]]+)\]\(([^)\s]+)\)/g,(_,t,h)=>{h=h.replace(/&amp;/g,'&').replace(/^file:\/\//,'');return pathTag('a',h,t)||t})
      .replace(TXPATH,(m,tag,p)=>tag||pathTag('span',p,p)||p).replace(/\u0001(\d+)\u0001/g,(_,i)=>cs[i])};
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
    if(table){out.push('<div class="tw"><table>'+table.map((r,i)=>'<tr>'+r.map(c=>i?`<td>${inline(c)}</td>`:`<th>${inline(c)}</th>`).join('')+'</tr>').join('')+'</table></div>');table=null}};
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
// Background work: a count, and a network icon in place of the dot when the session's servers are among it.
const stateOf=s=>{const n=(s.bg||0)+(s.srv||0),k=s.nets?.length||0;if(!n||s.status!=='idle')return stateOf1(s);
  const tip=k?`${s.nets.join(', ')} running${n>k?` · ${plural(n-k,'more task')}`:''}`:`${plural(n,'task')} running in the background`;
  return `<span class="bgc${k?' sv':''}" data-tip="${esc(tip)}">${k?svg('globe','nw'):'<i></i>'}${n}</span>`+stateOf1(s)};
const stateOf1=s=>s.status==='work'?'<i class="spin"></i>':s.status==='wait'?`<span class="askl">${esc(askLabel(s.line))}</span>`:`${s.unread?'<i class="dot"></i>':''}<time>${ago(s.mts)}</time>`;
// The prompt cache: kept for a while after each reply (an hour on a subscription), then the next message reads the
// whole conversation again, at full price against your limits. Settings sets how long; a reply that wrote a shorter
// cache (five minutes, once usage runs into overage) counts that. In the list too, the last reply counts, not the file's time: opening a session adds lines to it.
const cacheMin=()=>A.prefs?.cacheMinutes??60;
// A small clock marks the few sessions whose cache is still warm, emptying as it cools; cold ones (most) show nothing.
const hm=ms=>{const m=Math.max(1,Math.round(ms/60000));return m<60?m+' min':Math.floor(m/60)+' h'+(m%60?' '+m%60+' min':'')};
const warmLeft=end=>{const l=end-Date.now();return l>0?l:0};
function warmDial(end,total){const l=warmLeft(end);if(!l)return'';
  return `<span class="wdial" style="--left:${Math.min(1,l/total).toFixed(3)}" data-tip="Cache warm · ${hm(l)} left" data-tip-d="A reply sent within this time reads the conversation from Claude's cache, which costs far less of your limits. After it, the next message reads it all again."></span>`}
const coldAt=c=>!c?.at||!cacheMin()?null:c.at+Math.min(cacheMin()*60,c.ttl||Infinity)*1000;
const listWarm=s=>{const end=s.done||s.status!=='idle'?null:coldAt(s.reply);return end?warmDial(end,end-s.reply.at):''};
// Everything running in a project's folders (its checkout and its worktrees), whoever started it: a mark on its heading.
function grpServers(root){
  const l=Object.entries(A.servers||{}).filter(([,h])=>h.root===root).flatMap(([top,h])=>h.list.filter(x=>x.state!=='exited').map(x=>({...x,wt:top!==root?top.split(/[\\/]/).pop():''})));
  if(!l.length)return '';
  const tip=l.map(x=>`${x.name}${x.ports.length?' :'+x.ports.join(' :'):''}${x.wt?' in '+x.wt:''}`).join(' · ');
  return `<span class="gsv" data-tip="${esc(tip)}">${svg('globe','nw')}${l.length}</span>`;
}
let drawing=false;
function renderList(){drawing=true;try{drawList()}finally{drawing=false}renderBgs()
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
    return `<div class="grp ${shut?'shut':''}" data-grp="${esc(k)}" data-tip-path="${esc(short(k))}">${tile(g.name,'s')}</span><b>${esc(g.name)}</b>${grpServers(k)}${shut?`<small>${n?`<i class="dot"></i>`:''}${g.list.length}</small>`:''}<span class="gnew" data-gnew data-tip="New session in ${esc(g.name)}">${svg('plus')}</span></div>`+(shut?'':
      g.list.map(s=>{const sel=!V.isNew&&s.id===V.sel,tip=V.compact||s.line?` data-tip="${esc(s.title+' — '+s.project+(s.line?' · '+s.line:''))}"`:'';
        return s.id===V.renaming?`<div class="sess ren ${sel?'sel':''}" data-id="${s.id}">${tile(s.project)}</span><input id="renIn" maxlength="120" autocomplete="off" spellcheck="false" aria-label="Session name"></div>`
        :`<button class="sess ${s.status} ${sel?'sel':''} ${s.unread?'unread':''} ${s.done?'isdone':''} ${s.id===V.menuFor?'mopen':''}" data-id="${s.id}"${tip}>${listWarm(s)}${tile(s.project,s.thread?'stack':'')}${s.status==='work'?'<u class="go"></u>':needsYou(s)?`<u class="${s.status==='wait'?'warn':'new'}"></u>`:''}</span><span class="txt"><span class="l1"><b>${esc(s.title)}</b>${s.thread?`<span class="thr" data-tip="${s.thread} sessions, one thread">${s.thread<=4?'<i></i>'.repeat(s.thread):s.thread}</span>`:''}${s.outside||s.term?`<em class="xb">${svg('term')}</em>`:''}<span class="st">${stateOf(s)}</span><span class="sact"><span data-done data-tip="${s.done?'Back to the inbox':'Mark done'}"${s.done?'':' data-tip-k="Ctrl D"'}>${svg(s.done?'refresh':'check')}</span><span data-dots>${svg('dots')}</span></span></span>${!sel&&DRAFTS.has(s.id)?`<span class="l2"><em class="dft">Draft</em><span>${esc(draftLine(DRAFTS.get(s.id)))}</span></span>`:s.status==='work'&&!s.outside&&!s.term&&s.line?`<span class="l2">${esc(s.line)}</span>`:''}</span></button>`}).join(''));
  }).join('')||`<div class="none inbox0">Nothing needs you.<br>Older sessions are under Done.</div>`;
}
$('list').onclick=e=>{
  const g=e.target.closest('[data-grp]'),m=e.target.closest('[data-more]'),b=e.target.closest('[data-id]');
  if(g&&e.target.closest('[data-gnew]')){e.stopPropagation();hideTip();startNew(g.dataset.grp)}
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
  m.innerHTML=`<button data-do="rename">${svg('pencil')}Rename</button><button data-do="code">${svg('code')}Open in VS Code</button><button data-do="term">${svg('term')}Open in terminal</button>${s.id===V.sel&&srvHere()?.conf?.names?.length?`<button data-do="serve">${svg('server')}Start servers</button>`:''}<hr><button data-do="done">${svg(s.done?'refresh':'check')}${s.done?'Back to the inbox':'Mark done'}</button><button class="hot" data-do="delete">${svg('trash')}Delete</button>`;
  m.hidden=false;m.style.left=Math.max(4,Math.min(x,innerWidth-210))+'px';m.style.top=Math.max(4,Math.min(y,innerHeight-m.offsetHeight-8))+'px';
  document.querySelector(`.sess[data-id="${id}"]`)?.classList.add('mopen');
}
$('list').oncontextmenu=e=>{const b=e.target.closest('.sess[data-id]');if(!b||b.classList.contains('ren'))return;e.preventDefault();openMenu(b.dataset.id,e.clientX,e.clientY)};
$('smenu').onclick=e=>{
  e.stopPropagation();const b=e.target.closest('[data-do]'),s=A.sessions.find(x=>x.id===V.menuFor);closePops();if(!b||!s)return;
  sessAct(b.dataset.do,s);
};
function sessAct(d,s){
  const fail=err=>oops(err.message);
  if(d==='rename'){if(V.compact)setSide('full');V.renaming=s.id;V.renameText=s.title;V.caret=s.title.length;renderList();$('renIn')?.select()}
  else if(d==='code')api('open-editor',{sessionId:s.id}).catch(fail);
  else if(d==='term')api(`sessions/${s.id}/terminal`,{}).catch(fail);
  else if(d==='done')setDone(s,!s.done);
  else if(d==='serve')srvMenu($('bServe').offsetParent?$('bServe'):$('tray').hidden?null:$('tray'));
  else askDelete(s);
}
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
$('newBtn').onclick=()=>startNew();   // on the Wall, the message box slides up over it

// The profile last used in a project: the one that ran its most recent session, if that profile is still here.
const lastProfileIn=cwd=>{const p=A.sessions.filter(s=>(s.root||s.cwd)===cwd&&s.profile).sort((a,b)=>b.mts-a.mts)[0]?.profile;return A.profiles.some(x=>x.name===p)?p:null};
function newSession(project){
  if(!V.isNew&&R&&!R.done)stopVoice();   // dictation stays with the session it was started in
  keepDraft();const was=V.isNew;
  resetJump();V.isNew=true;V.sel=null;if(!was)takeDraft('new');V.pend=null;V.qLocal=[];V.qNow=null;V.place=null;V.skOpen=false;V.q.auto=null;V.items=[];V.run=null;V.context=null;V.used={model:'',effort:'',mode:''};V.dismissed=null;V.work=[];V.pv=null;V.full=false;V.ch=null;V.side=null;V.chFile=null;V.chDiff=null;
  V.profile=startProfile()?.name; // every new session starts on your default profile (the global one unless you chose another); the project stays as last chosen
  if(project){V.project=project;V.profile=lastProfileIn(project)||V.profile} // the + on a project in the sidebar
  else V.project=V.project&&A.projects.some(p=>p.cwd===V.project)?V.project:A.projects[0]?.cwd||null;
  render();$('input').focus();loadDefaults();H.sig='';homeSoon();
}
// A session as the service has it, and the live events that came while it was being read. The two travel apart, so
// either may arrive first: the events wait until the read has landed, and only those numbered after it are applied,
// so a read taken a moment before a question (or a step, or a message) never hides it again.
const held=new Map();   // session -> {tok, ev}: the read in flight, and the events that came meanwhile
async function readSession(id){
  const h=held.get(id),tok={};held.set(id,{tok,ev:h?h.ev:[]});
  let d;try{d=await api('sessions/'+id)}catch(e){if(held.get(id)?.tok===tok)letGo(id,-1);throw e}
  return held.get(id)?.tok===tok?d:null;   // a newer read of the same session has started: that one counts
}
function letGo(id,seq){const h=held.get(id);held.delete(id);for(const [f,d] of h?.ev||[])if(d.seq>seq)f(d)}
const take=f=>e=>{const d=JSON.parse(e.data),h=held.get(d.sessionId);if(h)h.ev.push([f,d]);else f(d)};
async function openSession(id,sending){
  setTimeout(pcReport,60);   // what this PC shows: what waits for it is not sent
  const from=sending&&V.isNew?id:draftKey(),move=id!==V.sel||V.isNew;   // a new session's first message just went: what you wrote since goes with it
  if(from!==draftKey()&&R?.key===draftKey())R.key=from;   // the new session's box moves to it, and so does dictation into it
  if(move&&R&&!R.done)stopVoice();   // dictation stays with the session it was started in
  keepDraft(from);
  if(!sending)V.pend=null;
  if(V.sel!==id){V.qLocal=[];V.qNow=null}
  resetJump();
  V.isNew=false;V.sel=id;if(move)takeDraft(id);V.place=null;V.ans=null;V.skOpen=false;V.q.auto=null;V.items=[];V.run=null;V.context=null;V.used={model:'',effort:'',mode:''};V.loading=true;V.dismissed=null;V.openTools.clear();V.shutTools.clear();V.codeOpen.clear();V.codeShut.clear();V.outOpen.clear();V.outFull.clear();V.cmdAll.clear();V.subAll.clear();V.repAll.clear();V.task=null;V.work=[];V.pv=null;V.full=false;V.ch=null;V.side=null;V.chFile=null;V.chDiff=null;
  V.thread=null;V.handing=null;V.rewound=null;V.rw=null;V.rp=null;V.cont=null;V.older=new Map();V.shown=0;V.focus=null;V.hopen.clear();V.olOpen=new Set([id]);
  render();
  let got=null;
  try{const d=await readSession(id);if(!d)return;if(V.sel!==id){held.delete(id);return}got=d;V.thread=d.thread||null;V.handing=d.handing||null;V.rewound=d.rewound||null;V.cont=d.continued||null;V.items=d.items;V.run=d.run;V.context=d.context;V.cut=d.cut;V.work=d.work||[];V.place=d.place||null;V.used={model:d.model||'',effort:d.effort||'',mode:d.mode||''};V.def={model:d.defaults?.model||'',effort:d.defaults?.effort||'',mode:d.defaults?.mode||''}}
  catch(e){oops(e.message)}
  V.loading=false;render();toBottom(true);loadChanges();
  if(got)letGo(id,got.seq);
  if(V.sel===id&&V.thread)showEarlier();   // the session before shows above this one, dimmed
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
  let h=`<div class="step s-${cls} ${can&&!body?'shut':''}" data-step="${esc(x.id||'')}"><div class="sth"${can?` data-code="${esc(x.id)}" data-on="${body?1:''}" data-tip="${body?'Hide':'Show'} the command"`:''}><b>${esc(verb)}</b>${file?`<span class="stf">${esc(file)}</span>`:x.what?`<span class="std">${esc(x.what)}</span>`:'<span class="std"></span>'}`
    +tags.map(([c,t])=>`<span class="stt ${c}">${t}</span>`).join('')+limit
    +(run&&x.task&&!x.bg?`<button class="stx" data-bgstep="${esc(x.id)}" data-tip="Keep it running in the background" data-tip-d="The agent carries on.">${svg('bgdown')}Background</button>`:'')
    +(run&&x.task?`<button class="stx" data-stopstep="${esc(x.id)}" data-tip="Stop this command" data-tip-d="The agent carries on.">${svg('stop')}Stop</button>`:'')+time+'</div>';
  if(inner)return h+'</div>';                     // an agent's own steps: one line each
  if(x.cmd&&body){const n=x.cmd.split('\n').length,clip=n>4&&!V.cmdAll.has(x.id);
    h+=`<div class="cbk ${clip?'clip':''}"><pre><span class="p">$ </span>${shellHtml(x.cmd)}</pre><button class="cpy" data-copy="${esc(x.id)}" data-tip="Copy">${svg('copy')}</button>${clip?`<button class="more" data-cmdall="${esc(x.id)}">Show all ${n} lines</button>`:''}</div>`}
  if(x.out&&body){const open=V.outOpen.has(x.id),failed=x.state==='bad'||x.state==='stop';
    const full=open?(x.cut?V.outFull.get(x.id):x.out):failed?x.out.split('\n').slice(-3).join('\n'):null;
    if(open||failed)h+=`<div class="cbo ${failed?'bad':''} ${open?'open':''}"><pre>${full==null?'Loading…':esc(full)}</pre></div>`;
    const label=open?'Hide output':failed?(x.lines>3?`Show all output · ${x.lines} lines`:''):`Show output · ${plural(x.lines,'line')}`;
    if(label)h+=`<div class="stm"><button data-out="${esc(x.id)}">${label}</button></div>`}
  if(x.events?.length)h+=`<div class="evs">${x.events.slice(-3).map(e=>`<time>${new Date(e.t).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'})}</time><span>${esc(e.x)}</span>`).join('')}</div>`;
  if(x.group==='agent'&&(x.sub||x.report||x.tokens||x.doing))h+=agentHtml(x,run||bgRun);
  if(x.group==='recall'&&x.report)h+=`<div class="rcl ${V.repAll.has(x.id)?'all':''}">${esc(x.report)}</div>${x.report.split('\n').length>7?`<button class="agm" data-repall="${esc(x.id)}">${V.repAll.has(x.id)?'Show less':'Show all it found'}</button>`:''}`;
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
// a step of this session, or of an earlier one of its thread shown above it (its output is read from that session)
const stepById=id=>{for(const list of [V.items,...[...V.older.values()].map(o=>o.items)])for(const it of list)if(it.kind==='tools')for(const x of it.tools)if(x.id===id)return Object.assign(x,{owner:it.sid||null})};
async function toggleOutput(id){
  const x=stepById(id);if(!x)return;
  if(V.outOpen.delete(id))return renderThread();
  V.outOpen.add(id);renderThread();
  if(x.cut&&!V.outFull.has(id)){const sel=V.sel;
    try{const d=await api(`sessions/${x.owner||sel}/output?tool=${encodeURIComponent(id)}`);if(V.sel===sel){V.outFull.set(id,d.text);renderThread()}}
    catch(e){if(V.sel===sel){V.outFull.set(id,x.out+'\n\n('+e.message+')');renderThread()}}}
}
const GROUPS={recall:['looked back','time','times'],read:['read','file','files'],edit:['edited','file','files'],run:['ran','command','commands'],search:['searched','time','times'],web:['looked up','thing','things'],agent:['ran','agent','agents']};
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
// Pictures you sent show as small cards in your message, from the copy the service keeps; one opens large.
const picUrl=id=>`/api/picture/${encodeURIComponent(id)}?token=${encodeURIComponent(TOKEN)}`;
// Each is the same small square the message box showed before sending; `gap` keeps it off the words that follow.
const picCards=(list,gap)=>list.length?`<div class="mpics${gap?' gap':''}">${list.map(p=>`<button class="mpic" data-tip="${esc(p.name||'Pasted picture')}"><img src="${esc(p.url)}" loading="lazy" alt=""></button>`).join('')}</div>`:'';
// A question card you answered, settled in the thread at full width: the questions named as the live card named them,
// one shown at a time (the others stacked behind, a click on a name away), each with what you picked or wrote.
const ansAt=new Map();   // which question an answered card shows, by card, so redrawing the thread keeps it
const ansKey=it=>V.sel+'|'+it.n;
function answeredCard(it){
  const qs=it.said?(it.asked?.length?it.asked:[{q:'',head:'Question'}]):it.answers,n=qs.length,key=ansKey(it),at=Math.min(ansAt.get(key)||0,n-1);
  const own=(t,label)=>`<div class="aown"><i>${label}</i><div class="atxt">${esc(t)}</div></div>`;
  const answer=x=>it.said?own(it.said,'You wrote instead'):x.picks?`<div class="apicks">${x.picks.map(p=>`<span class="apk"><span class="mark ${x.multi?'sq':''}">${svg('check')}</span>${esc(p)}</span>`).join('')}</div>`:own(x.a,'You wrote');
  return `<div class="ans ${n>1?'stack':''}" data-ans="${esc(key)}"><div class="steps2">${qs.map((x,k)=>`<button class="qhd ${k===at?'':'off'}" data-astep="${k}">${esc(x.head||'Question '+(k+1))}</button>`).join('')}<span class="cnt">${n>1?`${at+1} of ${n} · `:''}Answered</span></div>
    ${qs.map((x,k)=>`<div class="apage" ${k===at?'':'hidden'}>${x.q?`<div class="aq">${esc(x.q)}</div>`:''}${answer(x)}</div>`).join('')}</div>`;
}
const itemsOf=sid=>sid&&sid!==V.sel?V.older.get(sid)?.items||[]:V.items;
// The last answer of a turn that has no foot line (Claude Code seldom writes the time a turn took) gets one, for its Copy.
function lastWord(it,ix){const L=itemsOf(it.sid);if(L[ix]!==it)return false;
  for(let k=ix+1;k<L.length&&L[k].kind!=='user';k++)if(L[k].kind==='assistant'||L[k].kind==='done')return false;return true}
// What Copy takes: the turn's last answer, not the lines it wrote on the way there.
function lastAnswer(n,sid){const L=itemsOf(sid),i=L.findIndex(x=>x.n===n);if(i<0)return'';
  let k=i;while(k+1<L.length&&L[k+1].kind!=='user')k++;
  for(;k>=0&&L[k].kind!=='user';k--)if(L[k].kind==='assistant'&&L[k].text?.trim())return L[k].text.trim();return''}
const cpTurn=it=>lastAnswer(it.n,it.sid)?`<button data-cpturn="${it.n}"${it.sid?` data-sid="${esc(it.sid)}"`:''} data-tip="Copy" data-tip-d="The last answer, as Markdown">${svg('copy')}</button>`:'';
// Copy, from your message or an answer: the icon turns into a check for a moment.
$('thread').addEventListener('click',e=>{const b=e.target.closest('[data-cpmsg],[data-cpturn]');if(!b)return;e.stopPropagation();
  const sid=b.dataset.sid,t=b.dataset.cpturn?lastAnswer(+b.dataset.cpturn,sid):itemsOf(sid).find(x=>x.n===+b.dataset.cpmsg)?.text||'';
  Promise.resolve(copyText(t)).then(()=>{b.classList.add('ok');b.innerHTML=svg('check');setTimeout(()=>{if(b.isConnected){b.classList.remove('ok');b.innerHTML=svg('copy')}},1200)}).catch(()=>{})});
// A code block in an answer copies its code as written, from the button at its top right.
document.addEventListener('click',e=>{const b=e.target.closest('[data-cpcode]');if(!b)return;e.stopPropagation();
  Promise.resolve(copyText(b.parentElement.querySelector('code')?.textContent||'')).then(()=>{b.classList.add('done');b.innerHTML=svg('check');setTimeout(()=>{if(b.isConnected){b.classList.remove('done');b.innerHTML=svg('copy')}},1200)}).catch(()=>{})});
let lbx=null;   // the pictures of the message open in the large view, and which one shows
// One item of the conversation as the thread draws it. `since`: where the turn in progress starts (its steps are open).
function itemPart(it,ix,since,latest){
    let h='';
    if(it.kind==='user'){const at=it.files||[];h=`<div class="me"><span class="macts">${it.uid&&!it.sid&&canRewind()?`<button class="rwb" data-rw="${it.n}" data-tip="Rewind" data-tip-d="Take this message and all after it back" data-tip-k="Esc Esc">${svg('rewind')}</button>`:''}${it.text?`<button data-cpmsg="${it.n}"${it.sid?` data-sid="${esc(it.sid)}"`:''} data-tip="Copy">${svg('copy')}</button>`:''}</span>${picCards((it.pics||[]).map(p=>({url:picUrl(p.id),name:p.name})),it.text||it.skill||(it.files||[]).length)}${it.skill?`<span class="chip">${svg('zap')}${esc(it.skill)}</span>`:''}${esc(it.text)}${at.length?`<div class="matt">${at.map(n=>`<span class="fch">${svg('file')}${esc(n)}</span>`).join('')}</div>`:''}</div>`}
    else if(it.kind==='assistant')h=`<div class="ai" data-n="${it.n}" data-sid="${esc(it.sid||'')}">${md(it.text)}${ix>since||!lastWord(it,ix)?'':raIs(it)&&raPlace()==='answer'?`<div class="tfoot afoot ply">${raHtml('answer')}</div>`:`<div class="tfoot afoot">${raBtn(it)}${cpTurn(it)}</div>`}</div>`;
    else if(it.kind==='tools'){const live=ix>since,open=V.openTools.has(it.n)||live&&!V.shutTools.has(it.n);
      h=`<div class="acts ${open?'open':''}"><button class="act" data-tools="${it.n}" data-on="${open?1:''}">${svg('chev-r')}${esc(toolSummary(it.tools))}${stepsTime(it.tools,live)}</button>${open?`<div class="steps">${it.tools.map(x=>stepHtml(x,live)).join('')}</div>`:''}</div>`}
    else if(it.kind==='bg')h=`<div class="bgn ${esc(it.of||'')} ${it.bad?'bad':''}"><i></i>${it.event?`<b>${esc(it.name||'Monitor')}</b><span class="mono">${esc(it.event)}</span>`:`<span>${esc(it.text||'')}</span>`}<time>${clock(it.ts)}</time></div>`;
    else if(it.kind==='answers')h=answeredCard(it);
    else if(it.kind==='skill')h=`<div class="sknote">${svg('zap')}Loaded skill <b>${esc(it.name)}</b></div>`;
    else if(it.kind==='note')h=`<div class="sys">${esc(it.stop?`${it.stop==='auth'?'Paused':'Stopped'} at ${clock(it.ts)} · ${it.stop==='auth'?it.profile+' was signed out':it.stop==='limit'?'limit reached on '+it.profile:(it.text||'something went wrong')}`:it.text)}</div>`;
    else if(it.kind==='done')h=raIs(it)&&raPlace()==='answer'?`<div class="tfoot ply">${raHtml('answer')}</div>`:`<div class="tfoot">Worked for ${dur(it.ms)}${it.ts?' · '+clock(it.ts):''}${raBtn(it)}${cpTurn(it)}</div>`;
    else if(it.kind==='work'&&A.preview)h=workCards(it,latest);
    return h;
}
function showPic(){const {list,i}=lbx;$('lbxImg').src=list[i];$('lbxN').textContent=list.length>1?`${i+1} of ${list.length}`:'';$('lbxN').hidden=list.length<2;$('lbx').hidden=false}
function closePic(){lbx=null;$('lbx').hidden=true;$('lbxImg').removeAttribute('src')}
$('lbx').onclick=closePic;
document.addEventListener('keydown',e=>{if(!lbx)return;e.stopPropagation();
  if(e.key==='Escape'){e.preventDefault();closePic()}
  else if((e.key==='ArrowLeft'||e.key==='ArrowRight')&&lbx.list.length>1){e.preventDefault();lbx.i=(lbx.i+(e.key==='ArrowRight'?1:-1)+lbx.list.length)%lbx.list.length;showPic()}},true);
// a file an earlier session of the thread made is asked for as that session's: the folders it may show from are its own
const fileUrl=f=>`${A.preview}/${f.sid||V.sel}/${f.path.split(/[\\/]/).filter(Boolean).map(encodeURIComponent).join('/')}?v=${f.v}`;
const folderOf=f=>{const cwd=selSession()?.cwd||'',d=f.path.slice(0,f.path.lastIndexOf('/'));return d===cwd?'':d.startsWith(cwd+'/')?d.slice(cwd.length+1):d.replace(/^\/home\/[^/]+/,'~')};
const SANDBOX='allow-scripts allow-forms allow-same-origin allow-popups allow-modals';
function thumb(f,url=fileUrl(f)){
  const u=esc(url);
  return f.kind==='page'?`<iframe src="${u}" loading="lazy" tabindex="-1" sandbox="allow-scripts allow-same-origin" title=""></iframe>`
    :f.kind==='image'?`<img src="${u}" loading="lazy" alt="">`
    :f.kind==='video'?`<video src="${u}#t=0.5" preload="metadata" muted></video><span class="play">${svg('play')}</span>`
    :svg('file');
}
// A file gets its card under the latest turn that touched it; earlier turns keep only a quiet line.
function workCards(it,latest){
  // the ones that get a picture: a video or page before the stills that went into it
  const cards=it.files.filter(f=>latest.get(f.path)===it.n).sort((a,b)=>(RANK[a.kind]??9)-(RANK[b.kind]??9)),old=it.files.filter(f=>latest.get(f.path)!==it.n);
  const show=PHONE?cards:cards.slice(0,3),rest=cards.length-show.length;
  return `<div>${show.length?`<div class="hero n${show.length}">${show.map(f=>`<button class="hc" data-open="${esc(f.path)}" data-tip-path="${esc(f.path)}"><span class="ht k-${f.kind}">${thumb(f)}</span><span class="cap"><b>${esc(f.name)}</b><span>${KIND[f.kind]}${folderOf(f)?' · '+esc(folderOf(f)):''}</span></span></button>`).join('')}</div>`:''}${rest>0?`<button class="morework" data-open="${esc(cards[3].path)}">and ${rest} more</button>`:''}${old.length?`<div class="sknote wk">${svg('file')}<span>Worked on ${old.map(f=>`<button data-open="${esc(f.path)}" data-tip-path="${esc(f.path)}">${esc(f.name)}</button>`).join(', ')}</span></div>`:''}</div>`;
}
function fitThumbs(){document.querySelectorAll('.ht iframe').forEach(f=>{const w=f.parentNode.clientWidth,h=f.parentNode.clientHeight;if(!w)return;const k=w/1280;f.style.transform=`scale(${k})`;f.style.height=Math.ceil(h/k)+'px'})}
new ResizeObserver(fitThumbs).observe($('thread'));
function renderThread(){
  const nw=V.isNew,t=$('thread');
  // What you just sent is shown straight away, and gives way to the real message when the service reports it.
  if(V.pend&&V.items.filter(it=>it.kind==='user').length>=V.pend.need)V.pend=null;
  const pd=V.pend,pend=pd?[['pend',`<div class="me">${picCards(pd.pics||[],pd.text||pd.files.length)}${esc(pd.text)}${pd.files.length?`<div class="matt">${pd.files.map(n=>`<span class="fch">${svg('file')}${esc(n)}</span>`).join('')}</div>`:''}</div>`]].concat(V.run?.status==='working'&&!nw&&!V.loading?[]:[['pendw','<div class="w1"><i class="spin"></i><span class="shim">Starting</span></div>']]):[];
  t.hidden=nw&&!pd;$('hello').hidden=!nw||!!pd||isHome();
  if(nw&&!pd){renderRail();return}   // a session not started has no turns: clear the rail left by the one you were reading
  if(nw||V.loading){patch(t,pd?pend:[['loading','<div class="loading">Opening…</div>']]);renderRail();return}
  const parts=[],latest=new Map();
  for(const it of V.items)if(it.kind==='work')for(const f of it.files)latest.set(f.path,it.n);
  if(V.thread&&V.focus&&V.older.has(V.focus))return renderFocus(t);
  if(V.thread)parts.push(...threadParts());
  if(V.cut)parts.push(['cut','<div class="sys">Earlier messages are not shown</div>']);
  // the steps of the turn in progress are open while it runs, unless you closed them; they close when it ends.
  // The turn starts at your last message: an earlier turn that was stopped leaves no end mark, and must not open again.
  lastStep=null;if(busy()){const t=V.items.findLast(x=>x.kind==='tools')?.tools;lastStep=t?.[t.length-1]?.id??null}
  const going=busy(),since=going?V.items.findLastIndex(x=>x.kind==='done'||x.kind==='note'||x.kind==='user'):Infinity;
  const skip=firstAuto(V.items,V.thread?.handoff);
  for(const [ix,it] of V.items.entries()){
    if(it.n===skip)continue;
    const h=itemPart(it,ix,since,latest);
    if(h&&it.n===J.at)parts.push(['newline','<div class="newline">New</div>']);
    if(h)parts.push(['i'+it.n,h]);
  }
  if(V.cont&&!V.handing)parts.push(['cont',`<div class="tstub"><span>Handed off · <b>continues in Session ${V.cont.n}</b></span><span class="gap"></span><button data-tgo="${esc(V.cont.id)}">Open</button></div>`]);
  if(V.handing)parts.push(['handing',`<div class="seam writing"><span>Writing the handoff · ${esc(hLabel(V.handing))}…</span></div>`]);
  parts.push(...pend);
  if(answered())parts.push(['working','<div class="w1"><i class="spin"></i><span class="shim">Working</span></div>']);
  else if(V.run?.status==='working')parts.push(['working',`<div class="w1"><i class="spin"></i><span class="shim">${esc(V.run.activity||'Working')}</span><span class="el" id="elapsed"></span></div>`]);
  if(!V.items.length&&!V.run&&!pd)parts.splice(0,parts.length,['empty','<div class="empty">Nothing in this session yet.</div>']);
  if(V.rw&&!V.focus){const k=parts.findIndex(([key])=>key==='i'+V.rw.n),r=rwInfo(V.rw.n);if(k>=0&&r)parts.splice(k,0,['rwcut',`<div class="rwcut"><b>${plural(r.turns,'turn')}</b>${r.gain?' · −'+kTok(r.gain):''}</div>`])}
  patch(t,parts);markGone();tick();fitThumbs();markCards();renderRail();if(V.side==='outline')renderOutline();raPaint();
}
const markCards=()=>{document.querySelectorAll('#thread [data-open]').forEach(c=>c.classList.toggle('on',c.dataset.open===V.pv));
  document.querySelectorAll('#thread [data-fpath]').forEach(c=>{const f=FP.get(V.sel+'|'+c.dataset.fpath);c.classList.toggle('miss',f===null);c.classList.toggle('on',!!f&&f.path===V.pv)});markEditPaths()};
// Which named paths are there, asked once for all a render shows (a missing one again after a while: it may be made).
const EP=new Map();let epAsking=false;
function markEditPaths(){const sid=V.sel,els=[...document.querySelectorAll('#thread [data-epath]')];if(!sid||V.isNew||!els.length)return;
  const now=performance.now(),want=[...new Set(els.map(e=>e.dataset.epath))].filter(p=>{const f=EP.get(sid+'|'+p);return !f||f.v===null&&now-f.t>15000});
  els.forEach(e=>e.classList.toggle('ok',!!EP.get(sid+'|'+e.dataset.epath)?.v));
  if(!want.length||epAsking)return;epAsking=true;
  api(`sessions/${sid}/paths`,{paths:want}).then(r=>{for(const p of want)EP.set(sid+'|'+p,{v:r[p]||null,t:performance.now()})},()=>{})
    .finally(()=>{epAsking=false;if(V.sel===sid)document.querySelectorAll('#thread [data-epath]').forEach(e=>e.classList.toggle('ok',!!EP.get(sid+'|'+e.dataset.epath)?.v))})}
// What a named path turned out to be, per session: the file, null when it is not there. Asked when you point at it,
// and again when you click it (it may have been made, or gone, since).
const FP=new Map();
function fpath(raw,open){const sid=V.sel,k=sid+'|'+raw;if(!sid||V.isNew)return Promise.resolve(undefined);
  if(!open&&FP.has(k))return Promise.resolve(FP.get(k));
  return api(`sessions/${sid}/file?path=${encodeURIComponent(raw)}${open?'&open=1':''}`).then(f=>f,e=>/Not found/.test(e.message)?null:undefined)
    .then(f=>{if(f!==undefined)FP.set(k,f);markCards();return f})}

/* ---------- side panel: what the agent made ---------- */
let staged=null;
// What the preview steps through: this session's files, then those of the earlier sessions shown above it, newest first
function pvList(){const out=[...V.work],has=new Set(out.map(f=>f.path));
  for(const x of [...(V.thread?.sessions||[])].reverse()){const o=V.older.get(x.id);if(!o)continue;
    for(let j=o.items.length-1;j>=0;j--)if(o.items[j].kind==='work')for(const f of o.items[j].files)if(!has.has(f.path)){has.add(f.path);out.push(f)}}
  return out}
function renderPanel(){
  const W=pvList(),i=W.findIndex(f=>f.path===V.pv),f=W[i],open=!V.isNew&&!!f&&!!A.preview,ch=!V.isNew&&V.side==='changes'&&!!V.ch?.repo,ol=!open&&!V.isNew&&V.side==='outline',cm=!open&&V.side==='compare'?compareSet():null;
  const pb=$('bPreview');pb.hidden=V.isNew||!A.preview;hMute(pb,!W.length,'Nothing to preview yet','Preview what the agent made');$('pvN').textContent=W.length>1?W.length:'';pb.classList.toggle('on',open);
  const tk=!open&&!V.isNew&&V.side==='tasks'&&(bgList().length+srvRows().length)>0;$('tkw').hidden=!tk;if(tk)renderTasks();else clearTimeout(tkTimer);
  $('panel').hidden=!open&&!ch&&!cm&&!ol&&!tk;$('pvw').hidden=!open;$('cmw').hidden=!cm;renderCompare(cm);$('olw').hidden=!ol;renderOutline();$('chw').hidden=open||!ch;renderChanges();
  if(PHONE)phPane();
  $('split').classList.toggle('full',!!(open||cm)&&V.full);markCards();fitSide();
  if(!open){if(staged){staged=null;$('stage').innerHTML='';pvGone()}$('menu').hidden=true;raHead();return}
  $('pName').textContent=f.name;$('pCnt').textContent=W.length>1?`${i+1} of ${W.length}`:'';
  $('pPrev').disabled=$('pNext').disabled=W.length<2;
  $('menu').innerHTML=W.map(w=>`<button data-pick="${esc(w.path)}" class="${w.path===V.pv?'cur':''}" data-tip-path="${esc(w.path)}"><b>${esc(w.name)}</b><span>${w.ts?ago(Date.parse(w.ts)/1000)==='now'?'just now':ago(Date.parse(w.ts)/1000)+' ago':''}</span></button>`).join('');
  $('bFull').dataset.i=V.full?'min':'max';$('bFull').dataset.tip=V.full?'Show conversation':'Full width';$('bFull').classList.toggle('on',V.full);hydrate($('bFull').parentNode);
  const key=f.path+'|'+f.v+'|'+(f.sid||'');
  if(key!==staged){staged=key;$('stage').innerHTML=stageOf(f);pvGone()}
  raHead();
  fitThumbs();if(PHONE)phFit();
}
const stageOf=f=>{const u=esc(fileUrl(f));
  return f.kind==='page'?`<iframe class="pvf" src="${u}${A.tts?'&amp;ra':''}" sandbox="${SANDBOX}" title="${esc(f.name)}"></iframe>`
    :f.kind==='image'?`<div class="pvbox"><img src="${u}" alt="${esc(f.name)}"></div>`
    :f.kind==='video'?`<div class="pvbox v"><video src="${u}" controls></video></div>`
    :`<iframe class="pvf" src="${u}" title="${esc(f.name)}"></iframe>`};

/* ---------- long conversations: a rail of turns beside the thread, and an outline in the side panel ---------- */
function turnsOf(items=V.items,h=items===V.items?V.thread?.handoff:V.older.get(items[0]?.sid)?.handoff){const out=[];let cur=null;const skip=firstAuto(items,h);
  for(const it of items){if(it.n===skip){cur={n:it.n,body:'',files:0,cmds:0,ms:0,asked:0,hide:true};continue}
    if(it.kind==='user'){cur={n:it.n,ts:it.ts,text:((it.skill?'/'+it.skill+' ':'')+(it.text||'')).trim()||(it.files?.length||it.pics?.length?'Attachment':'…'),body:'',files:0,cmds:0,ms:0,asked:it.asked||0};out.push(cur)}
    else if(cur){if(it.kind==='tools')for(const t of it.tools){if(t.group==='edit')cur.files++;else if(t.group==='run')cur.cmds++}
      else if(it.kind==='done')cur.ms+=it.ms||0;else if(it.kind==='assistant')cur.body+=' '+it.text}}
  return out.filter(t=>!t.hide)}
const plural=(n,w)=>`${n} ${w}${n===1?'':'s'}`;
const turnMeta=(t,html)=>[t.files&&plural(t.files,'file'),t.cmds&&plural(t.cmds,'command'),t.ms&&dur(t.ms),t.asked&&(html?`<em>${plural(t.asked,'question')}</em>`:plural(t.asked,'question'))].filter(Boolean).join(' · ');
const dayOf=ts=>{const d=new Date(ts);if(!ts||isNaN(d))return '';const a=new Date();a.setHours(0,0,0,0);const b=new Date(d);b.setHours(0,0,0,0);const diff=Math.round((a-b)/864e5);
  return diff===0?'Today':diff===1?'Yesterday':d.toLocaleDateString([],{day:'numeric',month:'short'})};
let curTurn=null,railT;
const goTurn=n=>{const el=$('thread').querySelector(`[data-k="i${n}"]`);if(el)$('scroll').scrollTo({top:Math.max(0,el.offsetTop-16),behavior:'smooth'})};
function renderRail(){
  const r=$('rail');
  // in a thread, the turns of the sessions shown above this one count too, with a dot where each starts
  const segs=V.focus?[V.older.get(V.focus)?.items||[]]:[...threadShown().map(x=>V.older.get(x.id)?.items||[]),V.items];
  const marks=[];segs.forEach((items,i)=>{const ts=turnsOf(items);if(i&&ts.length)marks.push({brk:true});marks.push(...ts)});
  const all=marks.filter(m=>!m.brk),keep=all.slice(-48),from=marks.indexOf(keep[0]),ts=from>0?marks.slice(from):marks,more=!V.focus&&V.thread?V.thread.sessions.length-V.shown:0;
  r.hidden=V.isNew||all.length<3&&!V.thread;if(r.hidden){r.innerHTML='';r._h='';return}
  const h=more+'|'+ts.map(t=>t.brk?'|':t.n+(t.asked?'w':'')+(t.n===curTurn?'c':'')).join();if(r._h===h)return;r._h=h;
  let k=all.length-keep.length;
  r.innerHTML=(more?`<button class="more" data-tbrowse data-tip="${esc(more>1?`Sessions 1–${more} of this thread`:'Session 1 of this thread')}" data-tip-d="Not loaded. Browse them in the outline.">+${more}</button>`:'')
    +ts.map(t=>t.brk?'<span class="brk"></span>':`<button data-turn="${t.n}" class="${t.n===curTurn?'cur':t.asked?'w':''}" data-tip="${esc(`Turn ${++k} of ${all.length}${t.ts?' · '+clock(t.ts):''}${turnMeta(t)?' · '+turnMeta(t):''} — ${t.text.slice(0,140)}`)}"><i></i></button>`).join('')}
// The turn you are reading: the last message of yours at or above the top of the view, or the newest at the bottom.
function markTurn(){const sc=$('scroll'),top=sc.scrollTop+70,end=sc.scrollTop+sc.clientHeight>=sc.scrollHeight-6;let cur=null,last=null;
  for(const el of $('thread').children){if(!el.classList.contains('me'))continue;const n=+String(el.dataset.k).slice(1);last=n;if(el.offsetTop<=top)cur=n}
  cur=end?last:cur??null;if(cur===curTurn)return;curTurn=cur;renderRail();if(V.side==='outline')renderOutline()}
$('scroll').addEventListener('scroll',()=>{paintJump();clearTimeout(railT);railT=setTimeout(markTurn,80)},{passive:true});
$('rail').onclick=e=>{const b=e.target.closest('[data-turn]');if(b)goTurn(+b.dataset.turn)};
function renderOutline(){
  if(V.thread)return renderThreadOutline();
  const all=turnsOf(),q=$('olQ').value.trim().toLowerCase(),hit=q?all.filter(t=>(t.text+' '+t.body).toLowerCase().includes(q)):all;
  $('olT').textContent=`Conversation · ${plural(all.length,'turn')}`;$('olQ').placeholder='Find in this conversation';$('bOutline').classList.toggle('on',V.side==='outline'&&!V.pv);
  let day=null;
  $('oll').innerHTML=hit.length?hit.map(t=>{const d=dayOf(t.ts),sep=d&&d!==day?`<div class="daysep">${d}</div>`:'';day=d||day;
    return sep+`<div class="olw"><button class="olrow ${t.n===curTurn?'cur':''}" data-turn="${t.n}"><time>${t.ts?clock(t.ts):''}</time><span class="tx2"><b>${esc(t.text.split('\n')[0])}</b><span class="mt">${turnMeta(t,true)}</span></span></button><button class="olk" data-olk="${t.n}" data-tip="More">${svg('kebab')}</button></div>`}).join('')
    :`<div class="skl" style="padding:14px 10px">${q?'Nothing in this conversation matches.':'Nothing here yet.'}</div>`}
$('bOutline').onclick=()=>{V.side=V.side==='outline'&&!V.pv?null:'outline';V.pv=null;V.full=false;$('olQ').value='';renderPanel();if(V.side){markTurn();$('olQ').focus()}};
$('olClose').onclick=()=>{V.side=null;renderPanel()};
$('olQ').oninput=renderOutline;
$('oll').onclick=e=>{
  const k=e.target.closest('[data-olk]');if(k){e.stopPropagation();return openOlMenu(k)}
  const g=e.target.closest('[data-sg]');if(g){const id=g.dataset.sg;V.olOpen.has(id)?V.olOpen.delete(id):V.olOpen.add(id);if(V.olOpen.has(id)&&id!==V.sel)loadOlder(id).then(renderOutline);renderOutline();return}
  const b=e.target.closest('[data-turn]');if(!b)return;const sid=b.dataset.sid;
  if(!sid||sid===V.sel||threadShown().some(x=>x.id===sid)){if(V.focus){V.focus=null;renderThread()}goTurn(+b.dataset.turn);return}
  look(sid,+b.dataset.turn)};

/* ---------- threads: a session handed off goes on in a new one; together they read as one conversation ---------- */
const HMODEL={auto:'Auto',haiku:'Haiku',sonnet:'Sonnet',opus:'Opus'};
const hLabel=h=>`${HMODEL[h.model]||h.model}${h.auto&&h.model!=='auto'?' (Auto)':''} · ${h.effort}`;
const hPick=()=>({model:'auto',effort:'medium',...(A.prefs?.handoff||{}),...(V.hpick[V.sel]||{})});
// The message a new session of a thread started with when you said nothing: the handoff stands in for it.
const firstAuto=(items,h)=>{if(!h?.first)return null;const u=items.find(x=>x.kind==='user');return u&&u.text===h.first?u.n:null};
const pastify=h=>h.replace(/^<(\w+)( class=")?/,(m,t,c)=>c?`<${t} class="past `:`<${t} class="past"`);
// The earlier sessions that show above this one: the newest `V.shown` of them.
const threadShown=()=>V.thread?V.thread.sessions.slice(V.thread.sessions.length-V.shown).filter(x=>V.older.has(x.id)):[];
const sessDay=x=>x.mts?dayOf(x.mts*1000):'';
const span=(a,b)=>{const x=sessDay(a),y=sessDay(b);return x===y?x:`${x} – ${y}`};
function seamHtml(x,h,now){
  return `<div class="seam"><span><b>Session ${x.n}</b>${now?'':sessDay(x)?' · '+esc(sessDay(x)):''}${x.turns&&!now?' · '+plural(x.turns,'turn'):''}${h?`<button class="tag ${V.hopen.has(x.id)?'on':''}" data-hand="${esc(x.id)}" data-tip="The handoff this session started from" data-tip-d="${esc(hLabel(h))}">Handoff</button>`:''}</span></div>`}
const handHtml=h=>`<div class="hoff"><div class="ai">${md(h.sections||'')}</div><details><summary>Word for word: your messages, answers, files changed, failed commands</summary><div class="ai">${md(h.facts||'')}</div></details><div class="hmeta">Written by ${esc(hLabel(h))}${h.at?' · '+clock(new Date(h.at).toISOString()):''}</div></div>`;
function olderParts(x,o,dim){
  const out=[],latest=new Map(),skip=firstAuto(o.items,o.handoff);
  for(const it of o.items)if(it.kind==='work')for(const f of it.files)latest.set(f.path,it.n);
  for(const [ix,it] of o.items.entries()){if(it.n===skip)continue;const h=itemPart(it,ix,Infinity,latest);if(h)out.push(['i'+it.n,dim?pastify(h):h])}
  return out;
}
function threadParts(){
  const T=V.thread,E=T.sessions,from=E.length-V.shown,out=[];
  if(from>0){const turns=E.slice(0,from).reduce((n,x)=>n+(x.turns||0),0);
    out.push(['tstub',`<div class="tstub"><span><b>${from>1?`Sessions 1–${from}`:'Session 1'}</b> · ${esc(span(E[0],E[from-1]))} · ${plural(turns,'turn')}</span><span class="gap"></span><button data-tmore>${V.olderBusy?'Loading…':'Show'}</button><button data-tbrowse>Browse</button></div>`])}
  for(const x of E.slice(from)){const o=V.older.get(x.id);if(!o)continue;
    out.push(['seam'+x.id,seamHtml(x,o.handoff)]);if(V.hopen.has(x.id)&&o.handoff)out.push(['hand'+x.id,handHtml(o.handoff)]);
    out.push(...olderParts(x,o,true))}
  out.push(['seamcur',seamHtml({id:V.sel,n:T.n},T.handoff,true)]);
  if(V.hopen.has(V.sel)&&T.handoff)out.push(['handcur',handHtml(T.handoff)]);
  return out;
}
// One earlier session looked at on its own (picked in the outline): the rest of the thread folds away on both sides.
function renderFocus(t){
  const T=V.thread,E=T.sessions,k=E.findIndex(x=>x.id===V.focus),x=E[k],o=V.older.get(x.id),parts=[];
  if(k>0)parts.push(['ftop',`<div class="tstub"><span><b>${k>1?`Sessions 1–${k}`:'Session 1'}</b> · ${esc(span(E[0],E[k-1]))}</span><span class="gap"></span><button data-tbrowse>Browse</button></div>`]);
  parts.push(['seam'+x.id,seamHtml(x,o.handoff)]);if(V.hopen.has(x.id)&&o.handoff)parts.push(['hand'+x.id,handHtml(o.handoff)]);
  parts.push(...olderParts(x,o,false));
  parts.push(['fend',`<div class="tstub"><span><b>${k+2<T.n?`Sessions ${k+2}–${T.n}`:`Session ${T.n}`}</b> · to now</span><span class="gap"></span><button data-tback>Show</button></div>`]);
  patch(t,parts);fitThumbs();markCards();renderRail();renderBack();renderStrip();if(V.side==='outline')renderOutline();raPaint();
}
$('tback').onclick=e=>{e.stopPropagation();backToNow()};
const renderBack=()=>{const b=$('tback');b.hidden=!V.focus||V.isNew;if(!b.hidden)b.innerHTML=`${svg('chev-d')}Back to now · Session ${V.thread.n}`};
// An earlier session's conversation, read once: its items numbered apart from this session's, and the handoff it began from.
const olderReq=new Map();
function loadOlder(id){
  if(V.older.has(id))return Promise.resolve(V.older.get(id));
  if(olderReq.has(id))return olderReq.get(id);
  const sel=V.sel,k=V.thread?.sessions.findIndex(x=>x.id===id)??-1,base=-(k+1)*1e8;
  const p=api('sessions/'+id).then(d=>{const o={items:d.items.map(it=>({...it,n:base+it.n,sid:id,...(it.kind==='work'?{files:it.files.map(f=>({...f,sid:id}))}:{})})),handoff:d.thread?.handoff||null};if(V.sel===sel)V.older.set(id,o);return o})
    .catch(e=>{oops(e.message);return null}).finally(()=>olderReq.delete(id));
  olderReq.set(id,p);return p;
}
// Shows one more earlier session above, keeping what you were reading where it was.
async function showEarlier(){
  const T=V.thread;if(!T||V.olderBusy)return;const E=T.sessions,x=E[E.length-V.shown-1];if(!x)return;
  const sel=V.sel;V.olderBusy=true;renderThread();
  const o=await loadOlder(x.id);V.olderBusy=false;if(V.sel!==sel)return;
  const sc=$('scroll'),h0=sc.scrollHeight,top0=sc.scrollTop,end=!awayNow();
  if(o)V.shown++;renderThread();
  sc.scrollTop=end?sc.scrollHeight:top0+(sc.scrollHeight-h0);
  if(o)renderPanel();   // its files join what the preview steps through
}
async function look(id,n){
  const sel=V.sel;await loadOlder(id);if(V.sel!==sel||!V.older.has(id))return;
  V.focus=id;renderThread();if(n!=null)requestAnimationFrame(()=>goTurn(n));else $('scroll').scrollTop=0;
}
function backToNow(){V.focus=null;renderThread();renderBack();renderStrip();toBottom(true)}
function openOutline(){if(V.side!=='outline'||V.pv){V.side='outline';V.pv=null;V.full=false;$('olQ').value='';renderPanel();markTurn()}}
document.addEventListener('click',e=>{
  const el=e.target.closest('[data-tmore],[data-tbrowse],[data-tback],[data-hand],[data-tgo]');if(!el)return;
  e.stopPropagation();
  if(el.dataset.tgo)return openSession(el.dataset.tgo);
  if(el.dataset.tmore!=null)showEarlier();
  else if(el.dataset.tbrowse!=null)openOutline();
  else if(el.dataset.tback!=null)backToNow();
  else{const id=el.dataset.hand;V.hopen.has(id)?V.hopen.delete(id):V.hopen.add(id);renderThread()}
});
// The outline of a thread: one group per session, the current one open; Find looks through all of them.
let olWant=null;
function renderThreadOutline(){
  const T=V.thread,E=T.sessions,q=$('olQ').value.trim().toLowerCase(),cur=turnsOf();
  const groups=[...E.map(x=>({x,items:V.older.get(x.id)?.items})),{x:{id:V.sel,n:T.n,turns:cur.length,now:true},items:V.items}];
  if(q){const miss=E.filter(x=>!V.older.has(x.id));if(miss.length&&olWant!==q){olWant=q;Promise.all(miss.map(x=>loadOlder(x.id))).then(()=>{olWant=null;renderOutline()})}}
  $('olT').textContent=`Thread · ${plural(T.n,'session')} · ${plural(E.reduce((n,x)=>n+(x.turns||0),0)+cur.length,'turn')}`;$('olQ').placeholder='Find in this thread';
  $('bOutline').classList.toggle('on',V.side==='outline'&&!V.pv);
  const fid=V.focus||null;
  const html=groups.map(({x,items})=>{
    const ts=items?turnsOf(items):null,hits=q&&ts?ts.filter(t=>(t.text+' '+t.body).toLowerCase().includes(q)):ts;
    if(q&&ts&&!hits.length)return '';
    const open=!!q||V.olOpen.has(x.id),n=x.now?cur.length:x.turns||0;
    const head=`<button class="sgh" data-sg="${esc(x.id)}"><span class="cv">${svg('chev-r')}</span><span class="tx"><b>Session ${x.n}<time>${x.now?'now':esc(sessDay(x))}</time>${x.now?'<i class="nowdot"></i>':''}</b><small>${q&&hits?`<em>${plural(hits.length,'match')}</em> · `:''}${x.topic?esc(x.topic)+' · ':''}${plural(n,'turn')}</small></span></button>`;
    const rows=!open?'':!ts?'<div class="skl" style="padding:6px 10px">Loading…</div>':hits.map(t=> `<div class="olw"><button class="olrow ${t.n===curTurn?'cur':''}" data-turn="${t.n}" data-sid="${esc(x.id)}"><time>${t.ts?clock(t.ts):''}</time><span class="tx2"><b>${q?hlite(t.text.split('\n')[0],q):esc(t.text.split('\n')[0])}</b><span class="mt">${turnMeta(t,true)}</span></span></button><button class="olk" data-olk="${t.n}" data-sid="${esc(x.id)}" data-tip="More">${svg('kebab')}</button></div>`).join('');
    return `<div class="sg ${open?'open':''} ${x.now?'now':''} ${fid===x.id?'look':''}">${head}${open?`<div class="sgr">${rows}</div>`:''}</div>`}).join('');
  $('oll').innerHTML=html||`<div class="skl" style="padding:14px 10px">${q&&olWant?'Looking…':'Nothing in this thread matches.'}</div>`;
}
const hlite=(t,q)=>{const i=t.toLowerCase().indexOf(q);return i<0?esc(t):esc(t.slice(0,i))+`<mark>${esc(t.slice(i,i+q.length))}</mark>`+esc(t.slice(i+q.length))};


/* ---------- context: how full it is, what fills it, and compacting on request ---------- */
const kTok=n=>n>=1e6?(n/1e6).toFixed(n%1e6?1:0)+'M':Math.round(n/1000)+'k';
function renderCtx(){const c=V.context,m=$('mCtx');if(!c||V.isNew){m.hidden=true;return}
  const d=V.ctx?.id===V.sel?V.ctx:null,pct=Math.min(100,Math.round(c.used/c.window*100)),COL=['var(--accent)','var(--warn)','var(--go)','var(--dim)','var(--hot)'],rows=(d?.rows||[]).slice(0,5),off=isWorking()||!!V.handing;
  m.innerHTML=`<div class="big"><b>${kTok(c.used)}</b><small>of ${kTok(c.window)}</small><em>${pct}%</em></div>`+
    (rows.length?`<div class="cbar">${rows.map((r,i)=>`<i style="width:${Math.min(100,r.tokens/c.window*100)}%;background:${COL[i]}"></i>`).join('')}</div><div class="clg">${rows.map((r,i)=>`<div class="crow"><i style="background:${COL[i]}"></i>${esc(r.name)}<span>${kTok(r.tokens)}</span></div>`).join('')}</div>`
      :`<div class="cbar"><i style="width:${pct}%;background:var(--accent)"></i></div><div class="cap2" id="ctxNote">${d?.err?esc(d.err):'Counting what fills it…'}</div>`)+
    `<div class="sep"></div><button class="item act2 pri" data-handoff ${off?'disabled':''}><span class="ic">${svg('arrow-r')}</span><span class="nm"><b>Continue in a new session</b><span>Handoff by <u data-hpick>${esc(hLabel(hPick()))}</u>${svg('chev-d','cv')}</span></span></button>`+
    `<button class="item act2" data-compact ${off?'disabled':''}><span class="ic">${svg('compress')}</span><span class="nm"><b>Summarise to make room</b><span>Compact · earlier detail fades</span></span></button>`}
$('pCtx').onclick=e=>{e.stopPropagation();const was=$('mCtx').hidden;closePops();hideTip();if(!was)return;
  $('mCtx').hidden=false;$('pCtx').classList.add('open');
  const id=V.sel;
  if(V.ctx?.id!==id||performance.now()-V.ctx.at>30000)countCtx(id);
  renderCtx()};
// Claude Code's own count, asked only when the breakdown is opened: it starts Claude Code on the session for a moment
// (about a second and a few hundred MB), too much for every session clicked in passing. Until then the meter shows the
// last reply's size, which a turn here brings up to date when it ends, /compact included.
function countCtx(id){V.ctx={id,at:performance.now()};
  api(`sessions/${id}/context`).then(r=>{V.ctx={id,at:performance.now(),rows:r.rows};if(V.sel===id&&r.window&&!isWorking()){V.context={...V.context,used:r.used,window:r.window};renderComposer()}},
    err=>{V.ctx={id,at:-Infinity,err:'The breakdown is not available ('+err.message+')'}}).then(()=>{if(V.sel===id&&!$('mCtx').hidden)renderCtx()})}
$('mCtx').onclick=e=>{e.stopPropagation();
  if(e.target.closest('[data-hpick]'))return openHPick(e.target.closest('[data-hpick]'));
  if(e.target.closest('[data-compact]')&&!isWorking()){closePops();sendText('/compact')}
  else if(e.target.closest('[data-handoff]')&&!isWorking()&&!V.handing){closePops();handOff()}};

/* ---------- handing off: a new session goes on from a handoff, and the old one stays to look back at ---------- */
async function handOff(text='',at=null){
  const id=V.sel,p=hPick();if(!id||V.isNew)return false;V.rewound=null;
  V.handing={model:p.model,effort:p.effort};V.focus=null;renderThread();toBottom(true);renderComposer();
  try{await api(`sessions/${id}/handoff`,{model:p.model,effort:p.effort,text,...(at?{at}:{}),use:{model:curModel()||undefined,effort:curEffort()||undefined,mode:V.pick[id]?.mode||undefined}});delete V.hpick[id];return true}
  catch(e){if(V.sel===id){V.handing=null;render()}oops(e.message);return false}
}
// Who writes the handoff, for this one: picked from the line under the action, or the strip; Settings holds the default.
function openHPick(anchor){
  const m=$('mHand'),p=hPick(),wasOpen=!m.hidden&&m._a===anchor;
  if(wasOpen){m.hidden=true;return}
  m._a=anchor;
  m.innerHTML=`<div class="skl">Handoff written by</div>`+[['auto','Auto','by how much went on'],['haiku','Haiku','short sessions'],['sonnet','Sonnet','most threads'],['opus','Opus','intricate ones']].map(([v,n,d])=>`<button class="item ${p.model===v?'on':''}" data-hm="${v}"><span class="nm"><b>${n}</b></span><small>${d}</small></button>`).join('')
    +`<div class="hef">${['low','medium','high'].map(v=>`<button class="${p.effort===v?'on':''}" data-he="${v}">${v}</button>`).join('')}</div><div class="cap2">Default in Settings · Sessions</div>`;
  m.hidden=false;
  const c=m.offsetParent.getBoundingClientRect(),r=anchor.getBoundingClientRect();
  m.style.left=Math.max(8,Math.min(r.left-c.left,c.width-m.offsetWidth-8))+'px';m.style.bottom=(c.bottom-r.top+6)+'px';
}
$('mHand').onclick=e=>{e.stopPropagation();const b=e.target.closest('[data-hm],[data-he]');if(!b)return;
  V.hpick[V.sel]={...V.hpick[V.sel],...(b.dataset.hm?{model:b.dataset.hm}:{effort:b.dataset.he})};
  const a=$('mHand')._a;$('mHand').hidden=true;renderComposer();if(!$('mCtx').hidden)renderCtx();if(a?.isConnected)openHPick(a)};
/* ---------- rewind: take back a message of yours and all after it, so it stops filling the context ---------- */
// Found three ways: the arrow beside a message, Esc Esc (or /rewind) in the message box, and ⋮ on a row of the outline.
// Each ends in the same menu; every rewind ends in the strip above the box, with Undo until your next message.
const canRewind=()=>!V.isNew&&!V.loading&&!busy()&&!V.handing&&!V.focus;
// What rewinding to before message `n` takes out: how many turns, how much context, which files their turns edited.
function rwInfo(n){
  const i=V.items.findIndex(x=>x.n===n),it=V.items[i];if(!it?.uid)return null;
  const later=V.items.slice(i).filter(x=>x.kind==='user'),edits=new Set(later.flatMap(x=>x.edits||[]));
  return {it,turns:later.length,files:edits.size,gain:it.ctx&&V.context?.used>it.ctx?V.context.used-it.ctx:0};
}
// The messages a rewind can go back to, oldest first: this session's own, not the one a handoff began it with.
const rwPrompts=()=>{const skip=firstAuto(V.items,V.thread?.handoff);return V.items.filter(x=>x.kind==='user'&&x.uid&&x.n!==skip)};
// While a point is picked, what would go is dimmed under a dashed line.
function markGone(){let on=false;const at=V.rw&&!V.focus?'i'+V.rw.n:null;
  for(const el of $('thread').children){if(at&&el.dataset.k===at)on=true;el.classList.toggle('rwgone',on&&el.dataset.k!=='rwcut')}}
const rwItems=r=>`<button class="item pri" data-rwgo><span class="ic">${svg('rewind')}</span><span class="nm"><b>Rewind to here</b></span>${r.gain?`<small>−${kTok(r.gain)}</small>`:''}</button>`
  +`<button class="item" data-rwedit><span class="ic">${svg('pencil')}</span><span class="nm"><b>Rewind and edit</b></span></button>`
  +`<button class="item" data-rwhand><span class="ic">${svg('arrow-r')}</span><span class="nm"><b>Hand off from here</b></span><small>new session</small></button>`
  +(r.files?`<div class="sep"></div><button class="rwf" data-rwfiles><span class="sw ${V.rw.files?'on':''}"></span>Undo file edits<small>${plural(r.files,'file')}</small></button>`:'');
// The menu beside the arrow, or beside the outline's ⋮ menu (`side`: open to the left of it).
function openRw(n,anchor,side){
  const r=rwInfo(n);if(!r||!canRewind())return;
  const a=anchor.getBoundingClientRect();   // before the menus close: the anchor may be in one
  closePops();V.rw={n,files:true};const m=$('rwm');m.innerHTML=rwItems(r);m.hidden=false;
  const w=m.offsetWidth,h=m.offsetHeight;
  if(side){m.style.left=Math.max(8,a.left-w-4)+'px';m.style.top=Math.max(8,Math.min(a.top,innerHeight-h-8))+'px'}
  else{m.style.left=Math.max(8,Math.min(a.right-w,innerWidth-w-8))+'px';m.style.top=(a.top-h-6>8?a.top-h-6:Math.min(a.bottom+6,innerHeight-h-8))+'px'}
  renderThread();
}
function rwAct(t,from){
  if(t.closest('[data-rwfiles]')){V.rw.files=!V.rw.files;const r=rwInfo(V.rw.n);from.innerHTML=from===$('rwm')?rwItems(r):pickHtml();return}
  const n=V.rw?.n,files=V.rw?.files!==false,it=rwInfo(n)?.it;if(!it)return;
  if(t.closest('[data-rwgo]'))doRewind(it,files,false);
  else if(t.closest('[data-rwedit]'))doRewind(it,files,true);
  else if(t.closest('[data-rwhand]')){closePops();handOff('',it.uid)}
}
$('rwm').onclick=e=>{e.stopPropagation();rwAct(e.target,$('rwm'))};
$('thread').addEventListener('click',e=>{const b=e.target.closest('[data-rw]');if(!b)return;e.stopPropagation();const n=+b.dataset.rw;if(V.rw?.n===n&&!$('rwm').hidden)return closePops();openRw(n,b)});
// The session as the service has it now (after a rewind, or its undo): items, context and the strip.
async function reread(){const id=V.sel;const d=await readSession(id);if(!d)return;if(V.sel!==id){held.delete(id);return}
  V.items=d.items;V.run=d.run;V.context=d.context;V.cut=d.cut;V.work=d.work||[];V.rewound=d.rewound||null;V.ctx=null;render();toBottom(true);loadChanges();letGo(id,d.seq)}
async function doRewind(it,files,edit){
  closePops();if(V.rwing)return;V.rwing=true;oops('');
  try{const r=await api(`sessions/${V.sel}/rewind`,{at:it.uid,files});await reread();V.rewound=r;renderStrip();if(edit)rwEdit(it.text)}
  catch(e){oops(e.message)}finally{V.rwing=false}
}
// The message you took back, in the box to change and send again.
function rwEdit(text){if(text==null)return;input.value=text;grow();fitSend();input.focus();input.setSelectionRange(input.value.length,input.value.length)}
async function unRewind(){try{await api(`sessions/${V.sel}/unrewind`,{});await reread();V.rewound=null;renderStrip()}catch(e){oops(e.message)}}
function rwStrip(){const r=V.rewound;
  return {cls:'cache rw',html:`<span class="t">${svg('rewind','ci')}<b>Rewound</b><span> · ${plural(r.turns,'turn')} out${r.undone?`, ${plural(r.undone,'file')} undone`:''}${r.filesError?' · the files were not undone':''}</span></span>`
    +`${r.text?'<button class="hc2" data-rwtext>Edit that prompt</button>':''}<button class="hgo" data-hgo>Hand off</button><button class="hc2 u" data-unrw data-tip="Put back what was taken out" data-tip-d="Until your next message">${svg('rewind')}Undo</button><button class="ib hx" data-rwx data-tip="Close">${svg('x')}</button>`}}

// Esc Esc, or /rewind: your messages above the box, newest last; Enter on one gives the same menu for it.
function openPick(){if(!canRewind()){oops(busy()?'Rewind once the turn is over.':'There is nothing to rewind here.');return}
  const l=rwPrompts();if(!l.length){oops('There is nothing to rewind here.');return}
  closePops();V.rp={sel:l.length-1,menu:false};renderPick()}
function pickHtml(){const l=rwPrompts(),p=V.rp;
  if(p.menu){const r=rwInfo(V.rw.n);return `<div class="bk"><button data-rpback data-tip="Back" data-tip-k="←">${svg('chev-l')}</button><b>${esc((r.it.text||'…').split('\n')[0])}</b><small>${r.it.ts?clock(r.it.ts):''}</small></div>${rwItems(r)}`}
  return `<div class="rph"><b>Rewind to</b><span>↑↓ <kbd>Enter</kbd> <kbd>Esc</kbd></span></div><div class="rpl">`+l.map((it,i)=>{const f=new Set(l.slice(i).flatMap(x=>x.edits||[])).size;
    return `<button class="item ${i===p.sel?'sel':''}" data-rpi="${i}"><span class="nm"><b>${esc((it.text||(it.skill?'/'+it.skill:'')||'Attachment').split('\n')[0])}</b></span>${f?`<span class="fc">${svg('file')}${f}</span>`:''}<span class="k">${it.ctx?kTok(it.ctx):''}</span></button>`}).join('')
    +`<div class="item now"><span class="nm"><b>Now</b></span><span class="k">${V.context?.used?kTok(V.context.used):''}</span></div></div>`}
function renderPick(){const m=$('rwpick');if(!V.rp){m.hidden=true;return}m.innerHTML=pickHtml();m.hidden=false;hydrate(m);m.querySelector('.item.sel')?.scrollIntoView({block:'nearest'})}
function pickTo(i){const l=rwPrompts();if(!l[i])return;V.rp.sel=i;V.rp.menu=true;V.rw={n:l[i].n,files:true};renderPick();renderThread()}
function pickBack(){V.rp.menu=false;V.rw=null;renderPick();renderThread()}
$('rwpick').onclick=e=>{e.stopPropagation();const t=e.target;
  if(t.closest('[data-rpback]'))return pickBack();
  const r=t.closest('[data-rpi]');if(r)return pickTo(+r.dataset.rpi);
  rwAct(t,$('rwpick'))};
function rwPickKey(e){
  if(!V.rp)return false;const l=rwPrompts(),p=V.rp,k=e.key;
  if(k==='Escape'){e.preventDefault();e.stopPropagation();if(p.menu)pickBack();else closePops();return true}
  if(p.menu){
    if(k==='ArrowLeft'){e.preventDefault();pickBack();return true}
    if(k==='ArrowDown'||k==='ArrowUp'){e.preventDefault();const b=[...$('rwpick').querySelectorAll('[data-rwgo],[data-rwedit],[data-rwhand],[data-rwfiles]')],i=b.indexOf(document.querySelector('#rwpick .hot'));
      b.forEach(x=>x.classList.remove('hot'));b[(i+(k==='ArrowDown'?1:-1)+b.length)%b.length]?.classList.add('hot');return true}
    if(k==='Enter'){e.preventDefault();rwAct($('rwpick').querySelector('.hot')||$('rwpick').querySelector('[data-rwgo]'),$('rwpick'));return true}
    return false;
  }
  if(k==='ArrowDown'||k==='ArrowUp'){e.preventDefault();p.sel=Math.max(0,Math.min(l.length-1,p.sel+(k==='ArrowDown'?1:-1)));renderPick();return true}
  if(k==='Enter'){e.preventDefault();pickTo(p.sel);return true}
  return false;
}
// Esc twice within half a second: as in Claude Code, it first clears what you typed; in an empty box it opens the list.
let lastEsc=-Infinity;
function escEsc(e){
  if(e.key!=='Escape'||e.repeat||V.isNew)return false;
  const now=performance.now(),twice=now-lastEsc<500;lastEsc=twice?-Infinity:now;if(!twice)return false;
  if(input.value){input.value='';V.att=[];renderAtt();grow();fitSend();renderSlash();return true}
  if(!busy()){e.stopPropagation();setTimeout(openPick);return true}
  return false;
}
// ⋮ on a row of the outline: Go to, Rewind (this session's messages only) and Copy.
function olItem(n,sid){const items=!sid||sid===V.sel?V.items:V.older.get(sid)?.items||[];return items.find(x=>x.n===n)}
function openOlMenu(k){
  const n=+k.dataset.olk,sid=k.dataset.sid||null,here=!sid||sid===V.sel,it=olItem(n,sid),can=here&&it?.uid&&canRewind()&&rwPrompts().some(x=>x.n===n);
  closePops();const m=$('olm');m._n=n;m._sid=sid;
  m.innerHTML=`<button data-olgo>${svg('arrow-r')}Go to</button>${can?`<button data-olrw>${svg('rewind')}Rewind${svg('chev-r','cv')}</button>`:''}<button data-olcopy>${svg('copy')}Copy</button>`;
  m.hidden=false;const a=k.getBoundingClientRect();m.style.left=Math.max(8,Math.min(a.right-m.offsetWidth,innerWidth-m.offsetWidth-8))+'px';
  m.style.top=(a.bottom+4+m.offsetHeight<innerHeight?a.bottom+4:a.top-m.offsetHeight-4)+'px';k.classList.add('on');
}
$('olm').onclick=e=>{e.stopPropagation();const m=$('olm'),n=m._n,sid=m._sid,t=e.target;
  if(t.closest('[data-olrw]')){const b=t.closest('[data-olrw]'),keep=m.innerHTML,pos=[m.style.left,m.style.top];openRw(n,b,true);m.innerHTML=keep;m.hidden=false;[m.style.left,m.style.top]=pos;m.querySelector('[data-olrw]')?.classList.add('on');return}
  if(t.closest('[data-olcopy]')){const it=olItem(n,sid);navigator.clipboard?.writeText(it?.text||'').catch(()=>{});closePops();return}
  if(t.closest('[data-olgo]')){closePops();const r=$('oll').querySelector(`.olrow[data-turn="${n}"]${sid?`[data-sid="${sid}"]`:''}`);r?.click()}};

// From this many tokens a quiet strip above the message box offers the handoff: the setting, or ¾ of a smaller window.
const offerAt=c=>Math.min(A.prefs?.handoff?.offer||400000,Math.round(c.window*.75));
const hDismissed=()=>{try{return JSON.parse(localStorage.getItem('ww.hoff')||'{}')}catch{return {}}};
const coldOff=()=>{try{return JSON.parse(localStorage.getItem('ww.cold')||'{}')}catch{return {}}};
// The cache line: a quiet countdown in the last ten minutes, then a warning once it has likely expired. Its × hides it
// until the next reply. It takes the strip's place, with the same handoff on offer.
function coldStrip(c,id){
  const end=coldAt(c);if(!end||coldOff()[id]===c.at)return null;
  const left=end-Date.now(),soon=Math.min(10*60000,(c.ttl||3600)*1000/3);if(left>soon)return null;
  return {cls:'cache'+(left<=0?' expired':''),style:`--left:${Math.max(0,left/soon*100)}%`,
    html:(left>0?`<span class="t">${svg('cold','ci')}<b>Cache cools in ${hm(left)}</b><span> · send now to keep it warm</span></span>`
    :`<span class="t">${svg('cold','ci')}<b>Cache likely expired</b><span> · idle ${hm(Date.now()-c.at)} · your next message re-reads ${kTok(c.used)} tokens</span></span><span class="by">by <u data-hpick>${esc(hLabel(hPick()))}</u>${svg('chev-d','cv')}</span><button class="hgo" data-hgo>Hand off</button>`)
    +`<button class="ib hx" data-cx data-tip="Not now">${svg('x')}</button>`+(left>0?'<span class="drain"></span>':'')}}
// The strips above the box, most urgent first: reading aloud (when its player is the strip), a rewind, the cache
// countdown, the handoff offer. The first is in front; the others wait behind it as lips, and a tab on its top edge
// counts them and opens them all, docked one above another.
function stripList(){
  const c=V.context,id=V.sel,L=[],quiet=!V.isNew&&!V.loading&&!isWorking()&&!V.handing&&!V.focus;
  if(raHere()&&!raInHead()&&(raPlace()==='strip'||RA.pv&&raPlace()==='answer'))L.push({k:'ra',cls:'ply',html:raHtml('strip')});
  if(quiet&&V.rewound)L.push({k:'rw',...rwStrip()});
  const cold=quiet&&c&&coldStrip(c,id);if(cold)L.push({k:'cold',...cold});
  if(quiet&&c&&c.used>=offerAt(c)&&!hDismissed()[id])L.push({k:'ctx',cls:'',html:`<span class="t"><b>Context ${kTok(c.used)}</b> · earlier turns start to blur</span><span class="by">by <u data-hpick>${esc(hLabel(hPick()))}</u>${svg('chev-d','cv')}</span><button class="hgo" data-hgo>Hand off</button><button class="hc2" data-hcompact>Compact</button><button class="ib hx" data-hx data-tip="Not now" data-tip-d="It is still in the context menu and as /handoff.">${svg('x')}</button>`});
  return L}
function renderStrip(){
  const el=$('hstrip'),dk=$('hdeck'),c=V.context;
  const w=$('cWarm'),end=!V.isNew&&!isWorking()&&coldAt(c);w.innerHTML=end?warmDial(end,end-c.at):'';w.hidden=!w.innerHTML;
  const L=stripList(),[f,...rest]=L;if(!rest.length)V.deckOpen=false;
  const open=!!V.deckOpen;
  if(!f){el.hidden=true;el.className='hstrip';dk.hidden=true;raLift();return}
  el.className='hstrip '+f.cls+(open?' dopen':'');el.dataset.k=f.k;el.style.cssText=f.style||'';el.innerHTML=f.html;el.hidden=false;
  dk.hidden=!rest.length;
  if(rest.length){dk.className='hdeck'+(open?' open':'');
    dk.innerHTML=(open?rest.slice().reverse().map(s=>`<div class="hstrip up ${s.cls}" data-k="${s.k}" style="${s.style||''}">${s.html}</div>`).join('')
      :(rest.length>1?'<i class="lip l2"></i>':'')+'<i class="lip"></i>')
      +(open?`<span class="htab open"><button data-hall-x>Close all</button><button class="fold" data-hall-fold data-tip="Fold them back">${svg('chev-d')}</button></span>`
      :`<button class="htab" data-hall data-tip="Show all">${svg('layers')}${L.length}</button>`)}
  raLift();
}
// A strip's ×, also what Close all does to each.
function closeStrip(k){
  if(k==='ra')return raStop();
  if(k==='rw')V.rewound=null;
  else if(k==='cold'){const d=coldOff();d[V.sel]=V.context?.at;const ks=Object.keys(d);if(ks.length>200)delete d[ks[0]];localStorage.setItem('ww.cold',JSON.stringify(d))}
  else if(k==='ctx'){const d=hDismissed();d[V.sel]=Date.now();const ks=Object.keys(d);if(ks.length>200)delete d[ks[0]];localStorage.setItem('ww.hoff',JSON.stringify(d))}
}
function stripClick(e){e.stopPropagation();const t=e.target;
  if(raAct(e))return;
  if(t.closest('[data-hall]')){V.deckOpen=true;return renderStrip()}
  if(t.closest('[data-hall-fold]')){V.deckOpen=false;return renderStrip()}
  if(t.closest('[data-hall-x]')){for(const s of stripList())closeStrip(s.k);V.deckOpen=false;return renderStrip()}
  if(t.closest('[data-hpick]'))return openHPick(t.closest('[data-hpick]'));
  if(t.closest('[data-unrw]'))return unRewind();
  if(t.closest('[data-rwtext]'))return rwEdit(V.rewound?.text);
  if(t.closest('[data-rwx]')){closeStrip('rw');return renderStrip()}
  if(t.closest('[data-hgo]'))handOff();
  else if(t.closest('[data-hcompact]'))sendText('/compact');
  else if(t.closest('[data-cx]')){closeStrip('cold');renderStrip()}
  else if(t.closest('[data-hx]')){closeStrip('ctx');renderStrip()}}
$('hstrip').onclick=stripClick;$('hdeck').onclick=stripClick;
// Show all folds back when you click anywhere else.
document.addEventListener('pointerdown',e=>{if(V.deckOpen&&!e.target.closest?.('#hdeck,#hstrip,.pop')){V.deckOpen=false;renderStrip()}},true);

/* ---------- read aloud: an answer, sentence by sentence, in a voice made on this computer (Kokoro, see service/speech.mjs) ---------- */
// The sentence being read is lit with the CSS Highlight API, so the answer's own HTML is never touched and survives
// the thread being drawn again. Each sentence is its own clip, kept here once made: back, forward and pause are instant.
// The player is one set of parts shown in one of three places (Settings): a strip above the box, the answer's foot
// line, or a small card that floats over the conversation and can be dragged to six spots.
const RA={on:false,home:null,sid:'',n:null,pv:null,sents:[],i:0,playing:false,wait:false,el:new Audio(),clips:new Map(),durs:new Map(),gen:0,watch:{}};
const raVoice=()=>A.prefs?.readVoice||'af_bella',raPlace=()=>A.prefs?.readPlace||'strip',raSpeed=()=>A.prefs?.readSpeed||1;
const raHere=()=>RA.on&&RA.home===V.sel&&!V.isNew;
const raIs=it=>raHere()&&RA.n===it.n&&RA.sid===(it.sid||'');
const RSPEEDS=[1,1.25,1.5,2],spdName=v=>String(v).replace(/^0/,'')+'×';
const raBtn=it=>lastAnswer(it.n,it.sid)?`<button data-ra="${it.n}"${it.sid?` data-sid="${esc(it.sid)}"`:''} class="${raIs(it)?'ok':''}" data-tip="${!A.tts?'Read aloud: set it up':raIs(it)?(RA.playing?'Pause':'Go on reading'):'Read aloud'}">${svg('spk')}</button>`:'';
// what a turn's speaker reads: its last answer, as Copy takes it, not the lines written on the way there
function turnNs(n,sid){const L=itemsOf(sid),i=L.findIndex(x=>x.n===n);if(i<0)return[];
  let k=i;while(k+1<L.length&&L[k+1].kind!=='user')k++;
  for(;k>=0&&L[k].kind!=='user';k--)if(L[k].kind==='assistant'&&L[k].text?.trim())return[L[k].n];return[]}
const raAi=(sid,n)=>document.querySelector(`#thread .ai[data-n="${n}"][data-sid="${CSS.escape(sid||'')}"]`);
// Blocks of text, each read on its own: paragraphs, list items, headings, table cells. A code block is read as "Code block".
const RBLK='p,li,h1,h2,h3,h4,h5,h6,td,th,pre';
const raBlocks=el=>[...el.querySelectorAll(RBLK)].filter(b=>!b.closest('.tfoot')&&(b.tagName==='PRE'||!b.closest('pre')));
function raTexts(b){const w=document.createTreeWalker(b,NodeFilter.SHOW_TEXT,{acceptNode:t=>{const p=t.parentElement;return p.closest(RBLK)===b&&!p.closest('button')?1:3}}),L=[];
  while(w.nextNode())L.push(w.currentNode);return L}
const SEG=typeof Intl.Segmenter==='function'?new Intl.Segmenter('en',{granularity:'sentence'}):null;
function raSentences(sid,ns){const out=[];
  for(const n of ns){const el=raAi(sid,n);if(!el)continue;
    raBlocks(el).forEach((b,bi)=>{
      if(b.tagName==='PRE'){out.push({n,b:bi,s:0,e:0,say:'Code block.',pre:true,first:true});return}
      const txt=raTexts(b).map(t=>t.data).join('');let first=!/^LI$|^T[DH]$/.test(b.tagName);
      for(const g of SEG?SEG.segment(txt):[{index:0,segment:txt}]){let s=g.index,e=s+g.segment.length;
        while(s<e&&/\s/.test(txt[s]))s++;while(e>s&&/\s/.test(txt[e-1]))e--;
        const say=txt.slice(s,e);if(!/[\p{L}\p{N}]/u.test(say))continue;
        out.push({n,b:bi,s,e,say,first});first=false}})}
  return out}
function raRange(x){const el=raAi(RA.sid,x.n),b=el&&raBlocks(el)[x.b];if(!b)return null;const r=document.createRange();
  if(x.pre){r.selectNodeContents(b);return r}
  let pos=0,set=false;
  for(const t of raTexts(b)){const L=t.data.length;
    if(!set&&x.s<=pos+L){r.setStart(t,x.s-pos);set=true}
    if(set&&x.e<=pos+L){r.setEnd(t,x.e-pos);return r}
    pos+=L}
  return null}
function raPaint(){pvLight();const H=window.CSS?.highlights;if(!H)return;H.delete('ra-now');H.delete('ra-done');
  if(!raHere()||RA.pv)return;
  const now=RA.sents[RA.i]&&raRange(RA.sents[RA.i]);if(now)H.set('ra-now',new Highlight(now));
  const done=RA.sents.slice(0,RA.i).map(raRange).filter(Boolean);if(done.length)H.set('ra-done',new Highlight(...done))}
// The clips: made by the service one at a time, kept here by voice and text.
const raUrl=(say,voice)=>`/api/speak?token=${encodeURIComponent(TOKEN)}&voice=${voice}&text=${encodeURIComponent(say)}`;
function raFetch(say,voice=raVoice()){const k=voice+'|'+say;
  if(!RA.clips.has(k)){const p=fetch(raUrl(say,voice)).then(async r=>{if(!r.ok)throw new Error((await r.json().catch(()=>({}))).error||'Could not read that aloud.');return URL.createObjectURL(await r.blob())});
    p.catch(()=>RA.clips.delete(k));RA.clips.set(k,p);
    if(RA.clips.size>400){const [old,op]=RA.clips.entries().next().value;RA.clips.delete(old);op.then(u=>URL.revokeObjectURL(u),()=>{})}}
  return RA.clips.get(k)}
// how long each sentence takes, at normal speed: known once its clip has loaded, guessed from its length before
const raDur=x=>RA.durs.get(raVoice()+'|'+x.say)??x.say.length/15;
const mss=s=>{s=Math.max(0,Math.round(s));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')};
function raTime(){const sp=raSpeed(),S=RA.sents;let done=0,all=0;S.forEach((x,i)=>{const d=raDur(x);all+=d;if(i<RA.i)done+=d});
  return `<b>${mss((done+(RA.el.currentTime||0))/sp)}</b> / ${mss(all/sp)}`}
function raFrac(){const x=RA.sents[RA.i],d=RA.el.duration||(x&&raDur(x));return d?Math.min(1,(RA.el.currentTime||0)/d):0}
// One segment a sentence; past 12 sentences, one smooth bar with a notch where each paragraph starts.
function raBar(){const N=RA.sents.length,f=raFrac();
  if(N<=12)return RA.sents.map((x,i)=>`<i class="${i<RA.i?'d':i===RA.i?'n':''}"${i===RA.i?` style="--f:${f*100}%"`:''}></i>`).join('');
  return `<span class="cont"><b style="width:${(RA.i+f)/N*100}%"></b>${RA.sents.map((x,i)=>i&&x.first?`<u style="left:${i/N*100}%"></u>`:'').join('')}</span>`}
function raHtml(where){
  const tr=`<button class="tb" data-ra-back data-tip="Back a sentence" data-tip-k="←">${svg('rback')}</button><button class="pb ${RA.wait?'wait':''}" data-ra-pp data-tip="${RA.playing?'Pause':'Play'}" data-tip-k="Space">${svg(RA.playing?'rpause':'rplay')}</button><button class="tb" data-ra-fwd data-tip="Forward a sentence" data-tip-k="→">${svg('rfwd')}</button>`,
    bar=`<span class="sc ${RA.sents.length>12?'long':''}" data-ra-bar>${raBar()}</span>`,tm=`<span class="tm" data-ra-tm>${raTime()}</span>`,
    spd=`<button class="spd" data-ra-spd data-tip="Speed">${spdName(raSpeed())}</button>`,cx=`<button class="cx" data-ra-x data-tip="Stop" data-tip-k="Esc">${svg('x')}</button>`,
    cnt=`<span data-ra-cnt>${RA.i+1} of ${RA.sents.length}</span>`,sec=RA.pv?`<span data-ra-sec>${esc(RA.sents[RA.i]?.sec||'')}</span> · `:'';
  if(where==='strip')return `<span class="rap">${tr}<span class="ttl"><b>Reading aloud</b> · ${sec}${cnt}</span>${bar}${tm}${spd}${cx}</span>`;
  if(where==='head')return `<span class="rap">${tr}<span class="ttl"><b>Reading aloud</b> · ${sec}${cnt}</span>${bar}${tm}${spd}${cx}</span>`;
  if(where==='answer')return `<span class="rap">${tr}${bar}${tm}${spd}${cx}</span>`;
  return `<span class="grip" data-ra-grip data-tip="Drag to move"></span><div class="r1 rap"><span class="vis ${RA.playing?'on':''}"><u></u><u></u><u></u><u></u></span><span class="ttl"><b>Reading aloud</b> · sentence ${cnt}</span>${spd}${cx}</div><div class="rap">${tr}${bar}${tm}</div>`}
// What changes while it reads, put in place without drawing the player again.
function raUpdate(){
  document.querySelectorAll('[data-ra-bar]').forEach(e=>{e.innerHTML=raBar();e.classList.toggle('long',RA.sents.length>12)});
  document.querySelectorAll('[data-ra-tm]').forEach(e=>e.innerHTML=raTime());
  document.querySelectorAll('[data-ra-cnt]').forEach(e=>e.textContent=`${RA.i+1} of ${RA.sents.length}`);
  document.querySelectorAll('[data-ra-sec]').forEach(e=>e.textContent=RA.sents[RA.i]?.sec||'');
  document.querySelectorAll('[data-ra-spd]').forEach(e=>e.textContent=spdName(raSpeed()));
  document.querySelectorAll('[data-ra-pp]').forEach(e=>{e.innerHTML=svg(RA.playing?'rpause':'rplay');e.classList.toggle('wait',RA.wait);e.dataset.tip=RA.playing?'Pause':'Play'});
  document.querySelectorAll('.mcard .vis').forEach(e=>e.classList.toggle('on',RA.playing&&!RA.wait))}
// Draw the player where it belongs, and the speakers' state.
function raShow(){renderThread();renderStrip();raMini();raHead();raPaint()}
function raStart(sid,n,i=0){
  const S=raSentences(sid||'',turnNs(n,sid||undefined));if(!S.length)return;
  Object.assign(RA,{on:true,home:V.sel,sid:sid||'',n,pv:null,sents:S,playing:true});raShow();raPlay(i)}
function raStop(){if(!RA.on)return;RA.on=false;RA.playing=false;RA.wait=false;RA.gen++;RA.el.pause();RA.el.removeAttribute('src');RA.el.load();raShow()}
function raVisible(r){if(!r)return false;const a=r.getBoundingClientRect(),s=$('scroll').getBoundingClientRect();return a.bottom>s.top&&a.top<s.bottom-40}
// Follow the reading down the page, but only while you are following it: if the sentence before was in view.
function raFollow(prev){if(!raHere())return;const r=RA.sents[RA.i]&&raRange(RA.sents[RA.i]);if(!r||!prev)return;
  const a=r.getBoundingClientRect(),s=$('scroll').getBoundingClientRect();
  if(a.bottom>s.bottom-60||a.top<s.top)$('scroll').scrollBy({top:a.top-s.top-s.height/3,behavior:'smooth'})}
async function raPlay(i){
  const prev=raVisible(RA.sents[RA.i]&&raRange(RA.sents[RA.i]));
  const g=++RA.gen,x=RA.sents[i];if(!x)return raStop();
  RA.i=i;RA.wait=true;RA.el.pause();raPaint();raUpdate();raFollow(prev);
  let url;try{url=await raFetch(x.say)}catch(e){if(g===RA.gen){oops(e.message);raStop()}return}
  if(g!==RA.gen)return;
  RA.wait=false;const a=RA.el;a.src=url;a.preservesPitch=true;a.playbackRate=raSpeed();
  if(RA.playing)a.play().catch(()=>{});
  raUpdate();
  for(const k of [1,2])if(RA.sents[i+k])raFetch(RA.sents[i+k].say).catch(()=>{});   // the next ones are made while this one plays
}
RA.el.onended=()=>{if(!RA.on)return;if(RA.i+1<RA.sents.length)raPlay(RA.i+1);else raStop()};
RA.el.ontimeupdate=()=>{if(RA.on)raUpdate()};
RA.el.onloadedmetadata=()=>{const x=RA.sents[RA.i];if(x&&isFinite(RA.el.duration))RA.durs.set(raVoice()+'|'+x.say,RA.el.duration);RA.el.playbackRate=raSpeed()};
function raToggle(){if(!RA.on)return;RA.playing=!RA.playing;
  if(RA.playing){if(RA.el.ended)return raPlay(RA.i+1<RA.sents.length?RA.i+1:0);if(!RA.wait)RA.el.play().catch(()=>{})}else RA.el.pause();
  raUpdate();renderThread();raHead()}
const raGo=i=>{if(RA.on)raPlay(Math.max(0,Math.min(RA.sents.length-1,i)))};
function raStep(d,para){if(!RA.on)return;let i=RA.i+d;
  if(para){i=RA.i;do i+=d;while(i>0&&i<RA.sents.length&&!RA.sents[i].first)}
  raGo(i)}
async function raSpeedNext(){const v=RSPEEDS[(RSPEEDS.indexOf(raSpeed())+1)%RSPEEDS.length];RA.el.playbackRate=v;
  A.prefs={...A.prefs,readSpeed:v};raUpdate();try{A.prefs=await api('settings',{readSpeed:v})}catch(e){oops(e.message)}}
function raAct(e){const b=e.target.closest('[data-ra-pp],[data-ra-back],[data-ra-fwd],[data-ra-spd],[data-ra-x],[data-ra-bar]');if(!b)return false;e.stopPropagation();
  const d=b.dataset;
  if('raPp' in d)raToggle();else if('raBack' in d)raStep(-1);else if('raFwd' in d)raStep(1);
  else if('raSpd' in d)raSpeedNext();else if('raX' in d)raStop();
  else{const r=b.getBoundingClientRect();raGo(Math.floor((e.clientX-r.left)/r.width*RA.sents.length))}
  return true}
document.addEventListener('click',e=>{if(raAct(e))return;
  const b=e.target.closest('[data-ra]');if(b){e.stopPropagation();if(!A.tts){hideTip();openSettings(STABS.indexOf('Speech'));return}const n=+b.dataset.ra,sid=b.dataset.sid||'';
    if(raHere()&&RA.n===n&&RA.sid===sid)raToggle();else raStart(sid,n);return}
  // a click on a sentence of the answer being read reads from there
  if(!raHere()||e.target.closest('button,a,pre,.tfoot')||!getSelection().isCollapsed)return;
  const ai=e.target.closest('#thread .ai[data-n]');if(!ai||ai.dataset.sid!==RA.sid)return;
  const p=document.caretRangeFromPoint?.(e.clientX,e.clientY);if(!p)return;
  const i=RA.sents.findIndex(x=>{const r=raRange(x);try{return r&&r.isPointInRange(p.startContainer,p.startOffset)}catch{return false}});
  if(i>=0){RA.playing=true;raGo(i)}});
// pointing at a speaker starts making its first sentence, so it plays sooner
document.addEventListener('pointerover',e=>{const b=e.target.closest?.('[data-ra]');if(!b||b._warm||!A.tts)return;b._warm=1;
  const S=raSentences(b.dataset.sid||'',turnNs(+b.dataset.ra,b.dataset.sid||undefined));if(S[0])raFetch(S[0].say).catch(()=>{})});
// Esc stops; with the message box empty (or nothing typed into), Space pauses and ← → step a sentence, with Shift a paragraph.
addEventListener('keydown',e=>{if(!raHere()||e.ctrlKey||e.metaKey||e.altKey)return;
  const t=e.target,typing=t.closest?.('input,textarea,select,[contenteditable="true"],#xt,#lgx');
  if(e.key==='Escape'){if(document.querySelector('.pop:not([hidden])')||!$('sdim').hidden||!$('lbx').hidden||(R&&!R.done))return;
    e.preventDefault();e.stopImmediatePropagation();raStop();return}
  if(typing&&!(t.id==='input'&&!t.value))return;
  if(e.key===' '&&!e.shiftKey){e.preventDefault();e.stopImmediatePropagation();raToggle()}
  else if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();e.stopImmediatePropagation();raStep(e.key==='ArrowRight'?1:-1,e.shiftKey)}},true);
// Reading goes on only in the session you are looking at: open another and it pauses, and it is there when you come back.
function raSeen(){if(RA.on&&RA.home!==V.sel&&RA.playing){RA.playing=false;RA.el.pause()}raMini()}
// Read answers when a turn ends (Settings): the session you are looking at, when its turn ends while you look at it.
function raTurnEnd(working){const k=V.sel,w=RA.watch;
  if(w.sel===k&&w.w&&!working&&!V.loading&&!V.isNew&&A.tts&&A.prefs?.readAuto&&!document.hidden)setTimeout(()=>{
    if(V.sel!==k||isWorking())return;const u=V.items.findLastIndex(x=>x.kind==='user'),L=V.items.slice(u+1);
    const it=L.findLast(x=>x.kind==='done')||L.findLast(x=>x.kind==='assistant'&&x.text);if(it)raStart('',it.n)},600);
  RA.watch={sel:k,w:!!working&&!V.loading}}
// Reading a previewed page. The page is another site, so a helper the service adds to it (preview-read.js) finds the
// sections of words, lights the sentence and offers Read section and Read aloud; it talks to the window by messages.
const PV={key:null,secs:[]};
const pvWin=()=>$('stage').querySelector('iframe.pvf')?.contentWindow;
const pvAll=()=>PV.secs.flatMap(s=>s.sents.map(x=>({...x,sec:s.title})));
const raInHead=()=>RA.on&&V.full&&!!staged&&!$('pvw').hidden;
function pvGone(){PV.key=null;PV.secs=[];$('bRead').hidden=true;if(RA.on&&RA.pv)raStop()}
function pvStart(sents,label){if(!sents.length)return;
  Object.assign(RA,{on:true,home:V.sel,sid:'',n:null,pv:{key:staged,label},sents,playing:true});raShow();raPlay(0)}
function pvLight(){const w=pvWin();if(!w)return;const on=raHere()&&RA.pv?.key===staged;
  w.postMessage({ww:'ra',t:'light',reading:on?RA.sents.map(x=>x.id):null,now:on?RA.sents[RA.i]?.id:null,done:on?RA.sents.slice(0,RA.i).map(x=>x.id):[]},'*')}
// the header's speaker, or the player itself when the preview is full width and the message box is hidden
let raWasHead=false;
function raHead(){const h=$('pRa'),inH=raInHead()&&raHere(),pvOn=raHere()&&!!RA.pv;
  if(inH!==raWasHead){raWasHead=inH;renderStrip();raMini()}
  h.hidden=!inH;h.innerHTML=inH?raHtml('head'):'';
  const b=$('bRead');b.hidden=inH||!A.tts||!PV.secs.length;b.classList.toggle('on',pvOn);
  b.dataset.tip=pvOn?(RA.playing?'Pause':'Go on reading'):'Read page aloud'}
$('bRead').onclick=()=>{if(raHere()&&RA.pv)raToggle();else pvStart(pvAll(),'page')};
$('pRa').addEventListener('click',e=>raAct(e));
addEventListener('message',e=>{const m=e.data;if(!m||m.ww!=='ra'||e.source!==pvWin())return;
  if(m.t==='secs'){PV.key=staged;PV.secs=m.secs||[];raHead()}
  else if(m.t==='read')pvStart(m.sents||[],m.title);
  else if(m.t==='go'&&raHere()&&RA.pv){const i=RA.sents.findIndex(x=>x.id===m.id);if(i>=0){RA.playing=true;raGo(i)}}
  else if(m.t==='key'&&raHere()){if(m.key==='Escape')raStop();else if(m.key===' ')raToggle();else raStep(m.key==='ArrowRight'?1:-1,m.shift)}});
// a page that loads says hello back with what it can read; the accent comes along so the lit sentence matches
$('stage').addEventListener('load',e=>{if(e.target.matches?.('iframe.pvf'))e.target.contentWindow.postMessage({ww:'ra',t:'hello',acc:getComputedStyle(document.body).getPropertyValue('--accent').trim()},'*')},true);
// The mini player: a card over the conversation, in one of six spots, bottom center unless you dragged it elsewhere.
const raSpot=()=>localStorage.getItem('ww.raSpot')||'bottom-center';
function raMini(){let m=$('raMini');const show=raHere()&&!raInHead()&&raPlace()==='mini';
  if(!m){if(!show)return raLift();m=document.createElement('div');m.id='raMini';m.className='mcard';$('conv').appendChild(m);m.addEventListener('pointerdown',raDrag);
    new ResizeObserver(()=>{if(!m.hidden)raPin(m)}).observe($('conv').querySelector('.composer'))}
  m.hidden=!show;if(show){m.innerHTML=raHtml('mini');raPin(m)}raLift()}
function raPin(m){const [v,h]=raSpot().split('-'),comp=$('conv').querySelector('.composer');
  Object.assign(m.style,{top:v==='top'?'12px':'',bottom:v==='bottom'?comp.offsetHeight+10+'px':'',left:h==='left'?'16px':h==='center'?'50%':'',right:h==='right'?'16px':'',transform:h==='center'?'translateX(-50%)':''});raLift()}
// at bottom center the card sits where "Jump to the end" and "Back to now" show: they rise above it
function raLift(){const m=$('raMini'),on=m&&!m.hidden&&raSpot()==='bottom-center';$('conv').style.setProperty('--ralift',on?m.offsetHeight+10+'px':'0px')}
function raDrag(e){if(!e.target.closest('[data-ra-grip],.r1')||e.target.closest('button'))return;e.preventDefault();
  const m=$('raMini'),conv=$('conv'),cr=conv.getBoundingClientRect(),mr=m.getBoundingClientRect(),dx=e.clientX-mr.left,dy=e.clientY-mr.top,comp=conv.querySelector('.composer');
  const ov=document.createElement('div');ov.className='radrop';
  ov.innerHTML='<div class="scrim"></div>'+['top','bottom'].map(v=>`<div class="row3" style="${v==='top'?'top:10px':`bottom:${comp.offsetHeight+4}px`}">${['left','center','right'].map(h=>`<span class="${h}" data-spot="${v}-${h}"><i class="gh"></i></span>`).join('')}</div>`).join('');
  conv.appendChild(ov);m.classList.add('drag');let spot=raSpot();
  const move=ev=>{Object.assign(m.style,{left:ev.clientX-cr.left-dx+'px',top:ev.clientY-cr.top-dy+'px',right:'',bottom:'',transform:''});
    const x=(ev.clientX-cr.left)/cr.width;spot=(ev.clientY-cr.top<cr.height/2?'top':'bottom')+'-'+(x<1/3?'left':x>2/3?'right':'center');
    ov.querySelectorAll('[data-spot]').forEach(s=>s.classList.toggle('hl',s.dataset.spot===spot))};
  const up=()=>{removeEventListener('pointermove',move);removeEventListener('pointerup',up);ov.remove();m.classList.remove('drag');localStorage.setItem('ww.raSpot',spot);raPin(m)};
  addEventListener('pointermove',move);addEventListener('pointerup',up);move(e)}
// Until Kokoro is here: one row to get it, then how far the download is.
function readGet(){
  const r=VS?.read;if(!r)return'';
  if(r.state==='getting'){clearTimeout(vsT);vsT=setTimeout(readVS,800)}
  const say=r.state==='getting'?`Getting Kokoro… ${r.progress}%<i class="pbar"><i style="width:${r.progress}%"></i></i>`
    :r.state==='failed'?`<b class="bad">${esc(r.error)}</b>`:r.state==='present'?'Kokoro is here.':`Kokoro, on this computer. Nothing you read leaves it. A ${r.size} download, once.`;
  const right=r.state==='getting'?`<span class="sstate">${r.progress}%</span>`:r.state==='present'?'':`<button class="sval go" data-set="getread">${r.state==='failed'?'Try again':'Download'}</button>`;
  return `<div class="lgrp">Read aloud</div><div class="srow"><span>Read answers aloud<small>${say}</small></span>${right}</div>`}
// Settings: the voice (with a sample), where the player shows (three pictures), the speed, and reading when a turn ends.
let raSampleEl=null;
function raSample(){const v=raVoice(),name={af_bella:'Bella',af_heart:'Heart',af_nicole:'Nicole'}[v];
  raSampleEl?.pause();raFetch(`Hi, I'm ${name}. This is how your answers will sound.`,v).then(u=>{raSampleEl=new Audio(u);raSampleEl.playbackRate=raSpeed();raSampleEl.preservesPitch=true;raSampleEl.play()},e=>oops(e.message))}
function readRows(pf){if(!A.tts)return readGet();const v=pf.readVoice||'af_bella',pl=pf.readPlace||'strip',sp=pf.readSpeed||1;
  const ln=w=>`<i class="ln" style="width:${w}%"></i>`,base=`<i class="bm"></i>${ln(85)}`;
  const card=(k,t,d,sk)=>`<button class="rlc ${pl===k?'on':''}" data-rplace="${k}">${pl===k?`<span class="ok">${svg('check')}</span>`:''}<span class="rsk">${sk}</span><b>${t}</b><small>${d}</small></button>`;
  return `<div class="lgrp">Read aloud</div><div class="srow"><span>Voice and speed<small>Kokoro, on this computer. The player's speed button changes it too.</small></span><button class="sib" data-set="hearvoice" data-tip="Hear it">${svg('rplay')}</button><select class="sval" id="sVoice">${[['af_bella','Bella'],['af_heart','Heart'],['af_nicole','Nicole']].map(([k,n])=>`<option value="${k}" ${v===k?'selected':''}>${n}</option>`).join('')}</select><div class="lseg">${RSPEEDS.map(x=>`<button data-rspd="${x}" class="${x===sp?'on':''}">${spdName(x)}</button>`).join('')}</div></div>
    <div class="srow rplace"><span>Player<small>Where the controls show while it reads.</small></span><div class="rlcards">
      ${card('strip','Strip','Above the message box',`${base}<i class="sst hi"></i><i class="bx"></i>`)}${card('answer','Under the answer','In its foot line',`${base}<i class="ft hi"></i><i class="bx"></i>`)}${card('mini','Mini player','A card you can drag',`<i class="fl hi"></i>${ln(55)}<i class="bm"></i>${ln(85)}<i class="bx"></i>`)}</div></div>
    <div class="srow"><span>Read answers when a turn ends<small>Only in the session you're looking at.</small></span><i class="stog ${pf.readAuto?'on':''}" data-set="readauto"></i></div>`}

/* ---------- compare: a question about things the agent just made, with those things next to it ---------- */
// Each option is shown with the file its preview names, the text the agent attached to it, or the file from this turn that
// matchFiles finds for it. When nothing can be told apart that way, this turn's files are offered under their own names instead.
const STOP=new Set('the a an and or of to in on with for by at as is it its this that one two all no not but from into than then only more less your you we our page file mockup mockups option version variant design html htm png svg jpg jpeg webp pdf'.split(' '));
// The words of a name: "headerCompact-v2" is header, compact, v2 and 2.
const nameWords=s=>String(s||'').replace(/([a-z])([A-Z])/g,'$1 $2').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).flatMap(w=>{const m=/^([a-z]+)(\d+)$/.exec(w)||/^(\d+)([a-z]+)$/.exec(w);return m?[w,m[1],m[2]]:[w]});
const textWords=s=>nameWords(s).filter(w=>!STOP.has(w)&&(w.length>1||/\d/.test(w)));
const sameWord=(a,b)=>a===b||a.length>=4&&b.length>=4&&(a.startsWith(b)||b.startsWith(a));
// Which of this turn's files each option is about, or null. In order of trust:
//  1. the words that tell the files apart (not the ones every file shares, like "header" or "index"), in the file's path
//     below the folder they share and in its title, against the option's label and then its description;
//  2. a letter or number in the name (a, b, c; 1, 2, 3; v1, v2) that is the option's place in the list;
//  3. what is left in the order it was written, when as many pages (or pictures) are left as options, and the files
//     look like versions of one thing or the question is about choosing between such things.
function matchFiles(options,files,ask=''){
  const out=options.map(()=>null);if(!files.length||!options.length)return out;
  const dirs=files.map(f=>f.path.split(/[\\/]/).slice(0,-1));let common=dirs[0].length;
  for(const d of dirs){let i=0;while(i<common&&d[i]===dirs[0][i])i++;common=i}
  const raw=files.map((f,i)=>dirs[i].slice(common).join(' ')+' '+f.name.replace(/\.[^.]+$/,''));
  const own=files.map((f,i)=>({path:new Set(textWords(raw[i])),title:new Set(textWords(f.title))}));
  const shared=new Set();
  if(files.length>1)for(const k of ['path','title']){const n=new Map();own.forEach(o=>o[k].forEach(w=>n.set(w,(n.get(w)||0)+1)));
    own.forEach(o=>{for(const w of o[k])if(n.get(w)===files.length){o[k].delete(w);shared.add(w)}})}
  const ords=raw.map(r=>{const ws=nameWords(r).filter(w=>/^([a-h]|[1-9])$/.test(w));return ws.length===1?(/\d/.test(ws[0])?+ws[0]-1:ws[0].charCodeAt(0)-97):null});
  const numbered=ords.filter(x=>x!==null),ordOk=numbered.length>1&&new Set(numbered).size===numbered.length;
  const hits=(ws,set)=>ws.filter(w=>[...set].some(x=>sameWord(w,x))).length;
  const score=(k,i)=>{const l=textWords(options[k].label),d=textWords(options[k].description);
    return 4*hits(l,own[i].path)+3*hits(l,own[i].title)+hits(d,own[i].path)+hits(d,own[i].title)+(ordOk&&ords[i]===k?2:0)};
  const pairs=[];options.forEach((o,k)=>files.forEach((f,i)=>{const s=score(k,i);if(s>0)pairs.push({k,i,s})}));
  pairs.sort((x,y)=>y.s-x.s);
  const usedF=new Set(),stuck=new Set();   // stuck: options and files with a tie at their best, which are left to no one
  for(const p of pairs){if(out[p.k]||usedF.has(p.i)||stuck.has('k'+p.k)||stuck.has('i'+p.i))continue;
    if(pairs.some(q=>q!==p&&q.s===p.s&&(q.k===p.k&&!usedF.has(q.i)||q.i===p.i&&!out[q.k]))){stuck.add('k'+p.k);stuck.add('i'+p.i);continue}
    out[p.k]=files[p.i];usedF.add(p.i)}
  const left=options.map((o,k)=>k).filter(k=>!out[k]);
  const askWords=textWords(ask),about=usedF.size>0||askWords.some(w=>[...shared].some(x=>sameWord(w,x)))||/\b(mockups?|designs?|versions?|variants?|directions?|layouts?|looks?|styles?|drafts?|concepts?|options?|themes?)\b/i.test(ask);
  if(left.length&&about&&(left.length>1||usedF.size))for(const kind of ['page','image']){
    const rest=files.filter((f,i)=>!usedF.has(i)&&f.kind===kind);
    if(rest.length===left.length){left.forEach((k,j)=>out[k]=rest[j]);break}
  }
  return out;
}
const pathOf=p=>String(p||'').trim().replace(/^`+|`+$/g,'').replace(/^file:\/\//,'').replace(/^\.\//,'');
function compareSet(){
  const p=V.run?.pending;if(V.isNew||p?.kind!=='question')return null;
  const qs=p.input.questions,q=qs[Math.min(V.q.step,qs.length-1)];
  let files=[];
  if(A.preview)for(let j=V.items.length-1;j>=0&&V.items[j].kind!=='user';j--)if(V.items[j].kind==='work')files=V.items[j].files.concat(files);
  files=files.filter((f,i)=>files.findIndex(x=>x.path===f.path)===i).map(f=>V.work.find(w=>w.path===f.path)||f);
  // an option whose preview is a file's path shows that file; other text in a preview is shown as it is
  const byPath=o=>{const t=pathOf(o.preview);if(!t||/\n/.test(t))return null;const ends='/'+t.replace(/\\/g,'/').replace(/^~\//,'');
    return files.find(f=>f.path===t||f.path.replace(/\\/g,'/').endsWith(ends))||null};
  // (a path to a file it cannot show is not shown as text either)
  const isPath=o=>{const t=pathOf(o.preview);return !!t&&!/\s/.test(t.replace(/ /g,''))&&/\.(html?|svg|png|jpe?g|gif|webp|avif|mp4|webm|mov|m4v|pdf)$/i.test(t)};
  const used=new Set(),of=q.options.map(o=>{const f=byPath(o);if(f){used.add(f.path);return {file:f}}return typeof o.preview==='string'&&o.preview.trim()&&!isPath(o)?{text:o.preview}:null});
  const open=q.options.map((o,k)=>k).filter(k=>!of[k]),found=matchFiles(open.map(k=>q.options[k]),files.filter(f=>!used.has(f.path)),q.header+' '+q.question);
  open.forEach((k,j)=>{if(found[j])of[k]={file:found[j]}});
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
    return `<button class="qopt pic" data-opt="${k}"><span class="th ${t.file?(t.file.kind==='page'?'pg':''):'txt mono'}"${t.file?` data-tip="${esc(t.file.path)}"`:''}>${t.file?thumb(t.file):esc(t.text)}</span><span class="cap">${mark}${words(q.options[k])}</span><span class="big" data-big="${tabOf(k)}" data-tip="Open it large, beside the question">${svg('max')}</span></button>`};
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
const step=d=>()=>{const W=pvList(),i=W.findIndex(f=>f.path===V.pv),n=W.length;if(n)showWork(W[(i+d+n)%n].path)};
$('pPrev').onclick=step(-1);$('pNext').onclick=step(1);
$('moreBtn').onclick=e=>{e.stopPropagation();const was=$('menu').hidden;closePops();$('menu').hidden=!was};
$('menu').onclick=e=>{const b=e.target.closest('[data-pick]');if(b){closePops();showWork(b.dataset.pick)}};
$('bFull').onclick=()=>{V.full=!V.full;renderPanel()};
$('bClose').onclick=()=>{V.pv=null;V.full=false;renderPanel()};
// the header button opens the preview on what you last looked at (or the newest), and closes it again
$('bPreview').onclick=()=>{if($('bPreview').classList.contains('mute'))return;if(V.pv){V.pv=null;V.full=false;renderPanel();return}
  const W=pvList(),p=(W.find(f=>f.path===V.lastPv)||W[0])?.path;if(p)showWork(p,false)};
$('bExt').onclick=()=>{const f=pvList().find(w=>w.path===V.pv);if(f)window.open(fileUrl(f),'_blank','noopener')};
// A turn's new files go to the top of the list; a file written again replaces its older entry.
function addWork(files){const has=new Set(files.map(f=>f.path));V.work=files.concat(V.work.filter(f=>!has.has(f.path)))}
$('thread').onclick=e=>{const st=e.target.closest('[data-astep]');if(st){const c=st.closest('.ans'),k=+st.dataset.astep;ansAt.set(c.dataset.ans,k);
    c.querySelectorAll('[data-astep]').forEach(b=>b.classList.toggle('off',+b.dataset.astep!==k));c.querySelectorAll('.apage').forEach((p,j)=>p.hidden=j!==k);
    const cnt=c.querySelector('.cnt');if(cnt)cnt.textContent=`${k+1} of ${c.querySelectorAll('.apage').length} · Answered`;return}
  const pc=e.target.closest('.mpic');if(pc){const all=[...pc.parentNode.querySelectorAll('.mpic')];lbx={list:all.map(b=>b.querySelector('img').src),i:all.indexOf(pc)};hideTip();showPic();return}
  const o=e.target.closest('[data-open]');if(o){showWork(o.dataset.open,!V.run?.pending);return}
  const ep=e.target.closest('[data-epath].ok');if(ep){if(getSelection().toString())return;e.preventDefault();hideTip();api('open-editor',{sessionId:V.sel,path:ep.dataset.epath}).catch(err=>oops(err.message));return}
  const fp=e.target.closest('[data-fpath]');if(fp){if(getSelection().toString())return;e.preventDefault();hideTip();const sid=V.sel;
    fpath(fp.dataset.fpath,true).then(f=>{if(!f||V.sel!==sid){if(f===null&&fp.isConnected&&fp.matches(':hover')){tipFor=fp;showTip(fp)}return}
      if(!V.work.some(w=>w.path===f.path))V.work=V.work.concat(f);showWork(f.path)});return}
  const t=e.target.closest('[data-copy],[data-cmdall],[data-out],[data-stopstep],[data-bgstep],[data-suball],[data-repall],[data-code]');
  if(t){const d=t.dataset;
    if(d.code){if(getSelection().toString())return;if(d.on){V.codeOpen.delete(d.code);V.codeShut.add(d.code)}else{V.codeOpen.add(d.code);V.codeShut.delete(d.code)}renderThread();return}
    if(d.suball||d.repall){const s=d.suball?V.subAll:V.repAll,k=d.suball||d.repall;s.has(k)?s.delete(k):s.add(k);renderThread();return}
    if(d.copy){const x=stepById(d.copy);if(x?.cmd)navigator.clipboard.writeText(x.cmd).then(()=>{t.classList.add('done');setTimeout(()=>t.classList.remove('done'),1200)}).catch(()=>{})}
    else if(d.cmdall){V.cmdAll.add(d.cmdall);renderThread()}
    else if(d.out)toggleOutput(d.out);
    else if(d.bgstep){t.disabled=true;api(`sessions/${V.sel}/bg-step`,{id:d.bgstep}).catch(err=>{t.disabled=false;oops(err.message)})}
    else if(d.stopstep){t.disabled=true;api(`sessions/${V.sel}/stop-step`,{id:d.stopstep}).catch(err=>{t.disabled=false;oops(err.message)})}
    return}
  const b=e.target.closest('[data-tools]');if(!b)return;const n=+b.dataset.tools;
  if(b.dataset.on){V.openTools.delete(n);V.shutTools.add(n)}else{V.openTools.add(n);V.shutTools.delete(n)}renderThread()};
function tick(){const el=$('elapsed');if(el&&V.run?.startedAt)el.textContent=dur(Date.now()-V.run.startedAt);
  const now=Date.now();for(const c of document.querySelectorAll('[data-from]'))c.textContent=sdur(now-c.dataset.from)}
setInterval(tick,200);
setInterval(()=>{if(A.ready){renderList();renderHome()}},60000);
setInterval(()=>{if(!V.isNew&&V.context?.at)renderStrip()},20000);   // the cache countdown
const FOLLOW=160;   // the thread follows the agent while you are within this much of its end
const awayNow=()=>{const s=$('scroll');return s.scrollHeight-s.scrollTop-s.clientHeight>=FOLLOW};
function toBottom(force){const s=$('scroll');if(force||!awayNow())s.scrollTop=s.scrollHeight;paintJump()}
// Live updates: whether you were at the end is read before the thread is drawn, since a long arrival would otherwise
// push the end past the follow distance and leave you behind. At the end, a new reply is brought in the way the
// arrow brings it: its first line at the top of the view, or the end if all of it fits. Anything else follows the end.
function follow(end,reply){
  if(landing)land();   // already bringing a reply in: it stays where it is going, whatever arrives under it
  else if(end&&reply!=null){landing={n:reply,until:performance.now()+4000};land()}
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
  b.hidden=!away;b.className='jump'+(n?' new':'');b.dataset.tip=n?'Go to the first new message':'Go to the latest';
  b.innerHTML=svg('arrow-down')+(n?`<span>${plural(n,'new message')}</span>`:J.below?'<i class="dot"></i>':'')}
// Where a click on the mark is heading: the first new reply at the top of the view, or the end. For a few seconds it
// keeps heading there while the thread changes under it (a reply growing, steps closing, a card taking room), so the
// reply does not end up low in the view with the rest of it out of sight. Scrolling yourself ends that.
let landing=null;
function land(){
  if(!landing)return;if(performance.now()>landing.until){landing=null;return}
  const s=$('scroll'),el=landing.n!=null&&$('thread').querySelector(`[data-k="i${landing.n}"]`),max=s.scrollHeight-s.clientHeight;
  const head=el&&el.previousElementSibling?.dataset.k==='newline'?el.previousElementSibling:el;
  const to=Math.max(0,Math.min(max,head?head.offsetTop-16:max));
  if(Math.abs(to-s.scrollTop)>2)s.scrollTo({top:to,behavior:landing.smooth?'smooth':'auto'})}
$('jump').onclick=()=>{const s=$('scroll'),line=J.unseen.size&&$('thread').querySelector('[data-k="newline"]');
  landing={n:line&&line.offsetTop-16>s.scrollTop+4?J.at:null,until:performance.now()+4000,smooth:true};land()};
new ResizeObserver(land).observe($('thread'));new ResizeObserver(land).observe($('scroll'));
for(const ev of ['wheel','touchstart','pointerdown','keydown'])$('scroll').addEventListener(ev,()=>{landing=null},{passive:true});

/* ---------- changes: the project's working tree against its last commit, read only ---------- */
function renderChanges(){
  const c=V.ch,b=$('bChanges');
  hMute(b,!c?.repo,'Changes','Changes');b.dataset.tipD=c?.repo?'':'This folder is not a git repository.';$('chN').textContent=c?.count||'';b.classList.toggle('on',V.side==='changes'&&!V.pv);
  if($('chw').hidden)return;
  $('chT').textContent=c.count===1?'1 changed file':`${c.count} changed files`;
  $('chS').innerHTML=c.count?`<span class="plus">+${c.add}</span> <span class="minus">−${c.del}</span>`:'';
  $('files').hidden=!c.count;
  $('files').innerHTML=c.files.map(f=>`<button class="file ${f.path===V.chFile?'on':''}" data-file="${esc(f.path)}" data-tip-path="${esc(f.path)}"><b>${esc(f.path)}</b>${f.kind==='changed'?'':`<i>${f.kind}</i>`}${f.binary?'':`<span class="plus">+${f.add}</span><span class="minus">−${f.del}</span>`}</button>`).join('')
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
$('bChanges').onclick=()=>{if($('bChanges').classList.contains('mute'))return;V.side=V.side==='changes'&&!V.pv?null:'changes';V.pv=null;V.full=false;renderPanel();if(V.side)loadChanges()};
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
  needSkills();const got=skillList(),q=m[1].toLowerCase();el.hidden=false;
  const all=got&&!V.isNew?[{name:'handoff',about:'Continue in a new session; nothing is lost. Words after it become its first message.',from:'Workwood'},{name:'rewind',about:'Take back a message of yours and all after it.',from:'Workwood'},...(srvHere()?.conf?.names?.length?[{name:'serve',about:'Start this folder\'s servers: all of them, or the ones named after it.',from:'Workwood'}]:[]),...got.filter(x=>x.name!=='handoff'&&x.name!=='rewind'&&x.name!=='serve')]:got;
  if(!all){slHits=[];el.innerHTML='<div class="note">Loading skills…</div>';return}
  slHits=all.filter(s=>s.name.toLowerCase().startsWith(q)).concat(q?all.filter(s=>{const n=s.name.toLowerCase();return !n.startsWith(q)&&n.includes(q)}):[]);
  slSel=Math.min(slSel,Math.max(slHits.length-1,0));
  el.innerHTML=(q?'':`<div class="skl">${all.length} skills in this session</div>`)+(slHits.length?slHits.map((s,i)=>{const k=s.name.toLowerCase().indexOf(q);
    return `<button class="skr ${i===slSel?'on':''}" data-sk="${esc(s.name)}" data-tip="${esc(s.about)}"><b>/${esc(s.name.slice(0,k))}<u>${esc(s.name.slice(k,k+q.length))}</u>${esc(s.name.slice(k+q.length))}</b><span class="d">${esc(s.about)}</span><span class="src">${s.from}</span></button>`}).join('')
    :`<div class="skr none">${V.sk.err?esc(V.sk.err):q?`No skill matches "${esc(q)}"`:'No skills here'}</div>`);
  el.querySelector('.skr.on')?.scrollIntoView({block:'nearest'});
}
function useSkill(n){if(n==='rewind'&&!V.isNew){$('input').value='';V.skOpen=false;renderSlash();grow();fitSend();return openPick()}
  if(n==='serve'&&srvHere()?.conf){$('input').value='';V.skOpen=false;renderSlash();grow();fitSend();return srvMenu($('tray').hidden?null:$('tray'))}const i=$('input'),rest=/^\/[\w:-]*$/.test(i.value)?'':i.value;V.skOpen=false;i.value='/'+n+' '+rest;renderSlash();grow();fitSend();i.focus();i.setSelectionRange(i.value.length,i.value.length)}
function slashKey(e){
  if($('slash').hidden)return false;
  if(e.key==='Escape'){e.preventDefault();if(V.skOpen)V.skOpen=false;else{$('input').value='';keepDraft()}renderSlash();return true}
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
  keepDraft();
  // Pictures and files share one strip above the text, so a long file name never crowds the buttons below it.
  const im=V.att.filter(a=>a.pic),fl=V.att.filter(a=>!a.pic);
  $('atts').hidden=!V.att.length;
  $('atts').innerHTML=im.map(a=>`<span class="ath" data-tip="${esc(a.path||a.name)}" style="background-image:url(${a.url})"><button data-rm="${a.id}" data-tip="Remove">${svg('x')}</button></span>`).join('')
    +fl.map(a=>`<span class="fch"${a.path?` data-tip="${esc(a.path)}"`:''}>${svg('file')}<span class="fn">${esc(a.name)}</span><button data-rm="${a.id}" data-tip="Remove">${svg('x')}</button></span>`).join('');
}
function clearAtt(){for(const a of V.att)if(a.url)URL.revokeObjectURL(a.url);V.att=[];renderAtt()}
/* ---------- drafts: the message box belongs to the session it is in ---------- */
// What you wrote and did not send stays with its session (or with New session) and comes back when you return to it,
// so text meant for one session is never sent to another. Kept in this browser, so it outlasts a restart; a file
// pasted in (not one on disk) is kept over a restart only while the drafts fit.
const DKEY='ww.drafts',DRAFTS=new Map();let dT=null;
try{for(const [k,d] of Object.entries(JSON.parse(localStorage.getItem(DKEY)||'{}')))DRAFTS.set(k,{text:d.text||'',att:(d.att||[]).map(a=>{const pic=!!a.pic&&!!a.data;return {...a,id:++attSeq,pic,url:pic?`data:${a.type};base64,${a.data}`:null}})})}catch{}
const draftKey=()=>V.isNew?'new':V.sel;
function saveDrafts(){
  const o={};for(const [k,d] of [...DRAFTS].slice(-50))o[k]={text:d.text,att:d.att.map(({name,type,pic,data,path})=>({name,type,pic,data,path}))};
  try{localStorage.setItem(DKEY,JSON.stringify(o))}
  catch{for(const k in o)o[k].att=o[k].att.filter(a=>!a.data);try{localStorage.setItem(DKEY,JSON.stringify(o))}catch{}}   // too big: pasted files stay in memory only
}
// The box as it is now, under the session it belongs to; an empty box is no draft.
function keepDraft(k=draftKey()){
  if(!k)return;const text=$('input').value,had=DRAFTS.has(k);
  if(text.trim()||V.att.length){DRAFTS.delete(k);DRAFTS.set(k,{text,att:V.att})}else if(had)DRAFTS.delete(k);else return;
  clearTimeout(dT);dT=setTimeout(saveDrafts,300);
}
function takeDraft(k){const d=DRAFTS.get(k);$('input').value=d?.text||'';V.att=d?d.att:[];renderAtt();grow();fitSend()}
// A message that could not be sent goes back to its own session's draft, wherever you are now.
function draftBack(k,text,att){
  if(k===draftKey()){if(!$('input').value)$('input').value=text;V.att=att.concat(V.att);renderAtt();grow();fitSend();return}
  const d=DRAFTS.get(k)||{text:'',att:[]};DRAFTS.set(k,{text:d.text||text,att:att.concat(d.att)});saveDrafts();renderList();
}
const draftLine=d=>(d.text.replace(/\s+/g,' ').trim()||d.att.map(a=>a.name).join(', '));
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
const MICTIP='Dictate',MICD='Click to start and stop, or hold while you speak.';
function voiceLook(){
  const on=!!R&&!R.done,inCard=R?.target==='qText',qm=$('qcard').querySelector('[data-mic]'),v=$('voice');
  if(inCard&&qm){if(v.nextSibling!==qm)qm.before(v)}else if(v.nextSibling!==$('mic'))$('mic').before(v);
  v.hidden=!R;$('wave').hidden=$('vCancel').hidden=!on;
  $('box').classList.toggle('rec',on&&!inCard);qm?.parentNode.classList.toggle('rec',on&&inCard);
  for(const [b,mine] of [[$('mic'),!inCard],[qm,inCard]]){if(!b)continue;const live=!!R&&mine;
    b.classList.toggle('live',live&&on);b.classList.toggle('wait',live&&R.done);const i=live&&on?'stop':'mic';
    if(b.dataset.i!==i){b.dataset.i=i;hydrate(b.parentNode)}b.dataset.tip=live&&on?'Stop and keep the text':MICTIP;b.dataset.tipD=live&&on?'':MICD;b.dataset.tipK='Ctrl Shift Space'}
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
// What is said goes where it was said: the box of the session (or New session) it started in, or that card's answer.
// Once you are somewhere else, the rest is written into that session's draft, or kept for when its card shows again.
const qKept=new Map();   // card -> {step: text}, dictated into a card that is not showing now
function setField(r,v){
  if(r.target==='input'&&r.key!==draftKey()){const d=DRAFTS.get(r.key)||{text:'',att:[]};if(v.trim()||d.att.length)DRAFTS.set(r.key,{text:v,att:d.att});else DRAFTS.delete(r.key);saveDrafts();renderList();return}
  if(r.target==='qText'&&(r.key!==draftKey()||V.q.id!==r.qid)){qKept.set(r.qid,{...qKept.get(r.qid),[r.qstep]:v});return}
  const el=$(r.target);if(!el)return;el.value=v;if(r.target==='input')grow();else V.q.typed[r.qstep]=v}
function showSaid(r,guess){setField(r,[r.base.replace(/\s+$/,''),...r.fixed,guess||''].filter(Boolean).join(' '))}
function closePiece(r){
  const a=r.from,b=r.n,spoke=r.spoke;r.from=b;r.spoke=false;r.gap=0;r.seen=b;r.guess='';
  if(!spoke||b-a<4000)return;
  const audio=cut(r,a,b),slot=r.fixed.push('')-1;
  while(r.chunks.length&&r.off+r.chunks[0].length<=r.from)r.off+=r.chunks.shift().length;   // written down, no longer needed
  r.chain=r.chain.then(async()=>{try{r.fixed[slot]=(await hear(audio)).text||''}catch(e){r.err=e.message}if(R===r)showSaid(r,r.guess)});
}
async function startVoice(target='input'){
  if(R)return;oops('');R={done:true,target,key:draftKey(),qid:V.q.id,qstep:V.q.step};voiceLook();
  try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true}});
    R.stream=stream;
    const ctx=new AudioContext({sampleRate:16000}),node=ctx.createScriptProcessor(4096,1,1),bars=[...$('wave').children];
    Object.assign(R,{done:false,note:'',ctx,chunks:[],off:0,n:0,from:0,seen:0,spoke:false,gap:0,fixed:[],guess:'',chain:Promise.resolve(),t0:performance.now(),base:$(target)?.value||''});
    node.onaudioprocess=e=>{const r=R;if(!r||r.done)return;const d=new Float32Array(e.inputBuffer.getChannelData(0));r.chunks.push(d);r.n+=d.length;
      let p=0,sq=0;for(const v of d){p=Math.max(p,Math.abs(v));sq+=v*v}
      bars.forEach((b,i)=>{b.style.transform=`scaleY(${Math.max(.15,Math.min(1,p*3*(.55+.45*Math.sin(i*1.7+r.n/3000))))})`});
      if(Math.sqrt(sq/d.length)>QUIET){r.spoke=true;r.gap=0}else r.gap++;
      if((r.spoke&&r.gap>=PAUSE)||r.n-r.from>=LONGEST||(!r.spoke&&r.n-r.from>16000*4))closePiece(r)};
    ctx.createMediaStreamSource(stream).connect(node);node.connect(ctx.destination);
    R.timer=setInterval(async()=>{const r=R;if(!r||r.done)return;const s=Math.floor((performance.now()-r.t0)/1000);$('vtime').textContent=`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}${r.note}`;
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
    if(R===r)R=null;voiceLook();const el=r.key===draftKey()&&$(r.target);if(el){el.focus();el.setSelectionRange(el.value.length,el.value.length)}})();
}
// Click to start and click to stop, or hold the button while you speak and let go.
let micDown=0,micHeld=false;
function micPress(e,target){if(e.button)return;hideTip();if(R){micHeld=false;stopVoice()}else{micHeld=true;micDown=performance.now();startVoice(target)}}
$('mic').addEventListener('pointerdown',e=>micPress(e,'input'));
$('qcard').addEventListener('pointerdown',e=>{if(e.target.closest('[data-mic]')){e.preventDefault();micPress(e,'qText')}});   // the answer field keeps the focus
addEventListener('pointerup',()=>{if(!micHeld)return;micHeld=false;if(performance.now()-micDown<450||!R)return;R.done&&!R.ctx?R.letGo=true:stopVoice()});
$('mic').onclick=e=>{if(e.detail===0)R?stopVoice():startVoice()};   // from the keyboard
$('vCancel').onclick=()=>stopVoice(false);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&R&&!R.done){e.stopPropagation();stopVoice(false)}},true);
// Ctrl+Shift+Space starts and stops dictation from anywhere, into the answer field when that is where you are typing.
document.addEventListener('keydown',e=>{if(!(e.ctrlKey&&e.shiftKey&&!e.altKey&&!e.metaKey&&e.code==='Space')||e.repeat||e.target.closest?.('#xt,#lgx'))return;
  e.preventDefault();if(R){if(!R.done)stopVoice();return}startVoice(document.activeElement?.id==='qText'?'qText':'input')});

/* ---------- settings dialog ---------- */
const STABS=['General','Profiles','Skills','About','Look','Sessions','Speech','Phone'],SORDER=[0,5,6,7,4,-1,1,2,3],LANGS=['english','latvian','russian','german','french','spanish','italian','polish','lithuanian','estonian','finnish','swedish','ukrainian'];
const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
let stab=0,about=null,L=null,PE=null,PSel=null,PAdd=false,PD=null; // PSel: the profile open on the Profiles page; PAdd: the add form is showing; PD: its Claude Code defaults {name, d}
 // L: the sign-in terminal on screen {name, term, es, ro}; PE: a profile being renamed or asked about {name, kind}
function dropLogin(close){if(!L)return;const l=L;L=null;l.es?.close();l.ro?.disconnect();l.term?.dispose();if(close)api(`profiles/${l.name}/login/close`,{}).catch(()=>{})}
// The better dictation model, offered only where there is an NVIDIA card: Download, and it turns itself on; a switch after that.
let VS=null,vsT=0;   // the speech status, while Settings is open
const readVS=()=>api('voice').then(v=>{VS=v;renderSettings()}).catch(()=>{});
function speechRow(){
  if(!VS){readVS();return''}
  const b=VS.better,on=A.prefs?.speech==='turbo';
  if(!b?.gpu)return b?.wsl?`<div class="srow"><span>Better dictation<small>Needs an NVIDIA graphics card. If this computer has one, install its Windows driver, then restart Workwood.</small></span><a class="sval" href="https://www.nvidia.com/Download/index.aspx" target="_blank" rel="noopener">Get the driver${svg('ext')}</a></div>`:'';
  if(b.state==='getting'||on&&VS.state==='loading'){clearTimeout(vsT);vsT=setTimeout(readVS,800)}
  const say=b.state==='failed'?`<b class="bad">${esc(b.error)}</b>`:on&&VS.fallback?`<b class="bad">${esc(VS.fallback)}</b>`
    :`Whisper Large v3 Turbo on your ${esc(b.gpu)}: more accurate, and faster.${b.state==='present'?'':` A ${b.size} download, once.`}`;
  const right=b.state==='getting'?`<span class="sstate">Downloading ${b.progress}%</span>`
    :b.state==='present'?`${on&&VS.state==='loading'?'<span class="sstate">Loading…</span>':''}<i class="stog ${on?'on':''}" data-set="speech"></i>`
    :`<button class="sval" data-set="getspeech">${b.state==='failed'?'Try again':'Download'}</button>`;
  return `<div class="srow"><span>Better dictation<small>${say}</small></span>${right}</div>`;
}
// Look: the theme, and a background for Home, a session and the sidebar, each with its own Motion and Warn at limits.
function renderLook(pg){
  const ed=V.lookEdit||'home',b=bgOf(ed),k=b.kind,still=BGSTILL.includes(k),th=themePref(),who=ed==='session'?'this session':'an agent';
  const key=[ed,k,b.motion,b.limits,th,root.dataset.theme,bgHues(ed,selSession()),skyList().map(s=>s.id),wallOn(),wallClk(),skyLabels()].join('|');
  if(pg.dataset.look===key&&pg.querySelector('.hbgs')){for(const t of pg.querySelectorAll('[data-tk="constel"]'))skyMark(t);return}
  pg.dataset.look=key;
  const seg=(items,cur,attr)=>`<div class="lseg">${items.map(([v,n])=>`<button data-${attr}="${v}" class="${v===cur?'on':''}">${n}</button>`).join('')}</div>`;
  const tiles=list=>`<div class="hbgs">${list.filter(v=>!(v==='constel'&&ed!=='home')).map(v=>`<button class="hbgt ${v===k?'on':''}" data-bgk="${v}"><span class="hbg ${ed==='session'?'insession':ed==='side'?'inside':''}${BGCALM.includes(v)?' calm':''}${v==='paper'?' paperbg':''}" data-tk="${v}"></span><b>${BG.find(x=>x[0]===v)[1]}</b></button>`).join('')}</div>`;
  pg.innerHTML=`<div class="pgh">Look</div>
    <div class="srow"><span>Theme${th==='auto'?'<small>Follows your system.</small>':''}</span>${seg([['dark','Dark'],['light','Light'],['auto','Auto']],th,'th')}</div>
    <div class="lhead"><span>Background</span>${seg(BGPLACES,ed,'bgp')}</div>
    <div class="lgrp">Moving</div>${tiles(BGMOVE)}
    <div class="lgrp">Calm, for reading</div>${tiles([...BGCALM,'none'])}
    <div class="srow lstack ${still?'off':''}"><span>Motion<small>${still?(k==='none'?'Nothing to move.':'This one is always still.'):b.motion==='working'?`Only while ${who} works, then it comes to rest.`:b.motion==='always'?`Livelier while ${who} works.`:'Holds still, in the same colours.'}</small></span>${seg([['always','Always'],['working','While working'],['never','Never']],b.motion,'bgm')}</div>
    <div class="srow"><span>Warn at limits<small>Warm near ${ed==='session'?'this session’s':'a'} limit, red at it. Even when still or None.</small></span><i class="stog ${b.limits?'on':''}" data-set="bglim"></i></div>`
    +(ed==='home'&&k==='constel'?`<div class="srow"><span>Project names<small>Each figure’s project, written under it.</small></span><i class="stog ${skyLabels()?'on':''}" data-set="skylab"></i></div>`:'')
    +(ed==='home'?`<div class="srow"><span>Wall<small>A Home view of only this background and what’s running, to watch from. A soft chime plays when a session needs you while it shows.</small></span><i class="stog ${wallOn()?'on':''}" data-set="wall"></i></div>`:'')
    +(ed==='home'&&wallOn()?`<div class="srow"><span>Clock on the Wall<small>${({quiet:'Shown while all is quiet, hidden while something works.',always:'Shown always, above what runs.',never:'Not shown.'})[wallClk()]}</small></span>${seg([['quiet','When quiet'],['always','Always'],['never','Never']],wallClk(),'wclk')}</div>`:'');
  const [h1,h2,h3]=bgHues(ed,selSession());
  for(const t of pg.querySelectorAll('[data-tk]')){const v=t.dataset.tk;t.style.cssText=`--h1:${h1};--h2:${h2};--h3:${h3}`;
    t.innerHTML=v==='none'?'':v==='constel'?skySVG(skyList(),skyDims(t,true),null):hbgHTML(v)+'<span class="fld grain"></span>';if(v==='constel')skyMark(t)}
}
function renderSettings(){
  if($('sdim').hidden)return;
  $('stabs').innerHTML=SORDER.map(i=>i<0?'<i class="nsep"></i>':`<button data-st="${i}" class="${i===stab?'on':''}">${STABS[i]}</button>`).join('');
  if(L&&stab===1)return;                                     // the sign-in terminal is showing; leave it be
  if([0,5,6].includes(stab)&&$('spage').contains(document.activeElement)&&document.activeElement.tagName==='SELECT')return; // a menu is open
  const cd=svg('chev-d'),pf=A.prefs||{},pg=$('spage');
  if(stab===0)pg.innerHTML=`<div class="pgh">General</div>${LOGIN?`<div class="srow"><span>Open at login<small>Start Workwood when you sign in to this computer.</small></span><i class="stog ${loginOn?'on':''}" data-set="login"></i></div>`:''}
    <div class="srow"><span>Project folders<small>Folders that hold your projects. Separate several with a semicolon.</small></span><input class="sval sin mono" id="sFolders" spellcheck="false" autocomplete="off" value="${esc((pf.folders||[]).map(short).join('; '))}" placeholder="${esc(short((A.folders||[])[0]||''))}">${window.workwood?.pickFolder?'<button class="sval" id="sBrowse" data-tip="Choose a folder to add">Add…</button>':''}</div>`;
  else if(stab===5)pg.innerHTML=`<div class="pgh">Sessions</div>
    <div class="srow"><span>Clear quiet sessions<small>A session nobody has touched for this long leaves the sidebar. Search still finds it.</small></span><select class="sval" id="sDays">${[[1,'After a day'],[3,'After 3 days'],[7,'After 7 days'],[14,'After 14 days'],[30,'After 30 days'],[0,'Never']].map(([v,n])=>`<option value="${v}" ${(pf.doneDays??7)===v?'selected':''}>${n}</option>`).join('')}</select></div>
    <div class="srow"><span>Offer Bypass mode<small>A permission mode that never asks before edits or commands. Only for work you trust completely.</small></span><i class="stog ${pf.bypass?'on':''}" data-set="bypass"></i></div>
    <div class="lgrp">Limits</div>${A.profiles.length>1?`<div class="srow"><span>Continue on another profile at a limit<small>At a limit, it goes on with the profile that has the most room after 5 minutes. You can cancel.</small></span><i class="stog ${pf.autoContinue?'on':''}" data-set="auto"></i></div>`:''}
    <div class="srow"><span>Cache lasts<small>How long Claude keeps a conversation cached after a reply. A countdown shows in its last ten minutes.</small></span><select class="sval" id="sCache">${[[0,'No warning'],[5,'5 minutes'],[30,'30 minutes'],[60,'1 hour'],[120,'2 hours']].map(([v,n])=>`<option value="${v}" ${cacheMin()===v?'selected':''}>${n}</option>`).join('')}</select></div>
    <div class="lgrp">Handoff</div><div class="srow"><span>Offer a handoff at<small>A strip above the message box offers it from here, or at ¾ of a smaller window.</small></span><select class="sval" id="sHOffer">${[100000,200000,300000,400000,600000].map(v=>`<option value="${v}" ${(pf.handoff?.offer||400000)===v?'selected':''}>${v/1000}k tokens</option>`).join('')}</select></div>
    <div class="srow"><span>Handoff written by<small>Auto picks Haiku, Sonnet or Opus by how much went on.</small></span><select class="sval" id="sHModel">${[['auto','Auto'],['haiku','Haiku'],['sonnet','Sonnet'],['opus','Opus']].map(([v,n])=>`<option value="${v}" ${(pf.handoff?.model||'auto')===v?'selected':''}>${n}</option>`).join('')}</select><select class="sval" id="sHEffort">${['low','medium','high'].map(v=>`<option value="${v}" ${(pf.handoff?.effort||'medium')===v?'selected':''}>${cap(v)}</option>`).join('')}</select></div>`;
  else if(stab===6)pg.innerHTML=`<div class="pgh">Speech</div>
    <div class="lgrp">Dictation</div><div class="srow"><span>Language<small>What the mic expects to hear.</small></span><select class="sval" id="sLang">${LANGS.map(l=>`<option value="${l}" ${(pf.language||'english')===l?'selected':''}>${cap(l)}</option>`).join('')}</select></div>${speechRow()}${readRows(pf)}`;
  else if(stab===1)renderProfilePage(pg);
  else if(stab===7)renderPhonePage(pg);
  else if(stab===4)renderLook(pg);
  else if(stab===2){needSkills();const all=skillList();pg.innerHTML=`<div class="pgh">Skills</div>`+(!all?'<div class="cap2">Loading skills…</div>':V.sk.err?`<div class="cap2">${esc(V.sk.err)}</div>`:all.map(s=>`<div class="srow" data-tip="${esc(s.about)}"><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">/${esc(s.name)}</span><span class="sstate">${s.from}</span></div>`).join('')+`<div class="cap2" style="padding:10px 8px">As Claude Code reports them for ${V.isNew?'a new session here':'the open session'}.</div>`)}
  else{pg.innerHTML=`<div class="pgh">About</div>`+(about?`<div class="srow"><span>Workwood</span><span class="sstate">${esc(about.version)}</span></div>
    ${updRow()}
    <div class="srow"><span>Claude Code<small>Runs your sessions.</small></span><span class="sstate ${about.claude?'':'bad'}">${esc(about.claude||'Not found')}</span></div>
    <div class="srow"><span>Speech model<small>${esc(about.speech.model)}, on ${about.speech.device==='cuda'?'the graphics card':'the processor'}.</small></span><span class="sstate ${about.speech.state==='failed'?'bad':''}">${{idle:'Loads when you dictate',loading:'Loading…',ready:'Ready',failed:'Could not be loaded'}[about.speech.state]}</span></div>
    <div class="srow"><span>Service<small>Node ${esc(about.node)}</small></span><span class="sstate">Running</span></div>`:'<div class="cap2">Loading…</div>');
    if(!about)api('about').then(a=>{about=a;renderSettings()}).catch(()=>{})}
}
// A QR code (byte mode, error correction M, versions 1-10) as a grid of booleans, for the pairing code. Null if too long.
function qrGrid(text){
  const data=[...new TextEncoder().encode(text)],ECC=[0,10,16,26,18,24,16,18,22,22,26],NB=[0,1,1,1,2,2,4,4,4,5,5];
  const raw=v=>{let r=(16*v+128)*v+64;if(v>=2){const n=Math.floor(v/7)+2;r-=(25*n-10)*n-55;if(v>=7)r-=36}return r};
  const dcw=v=>Math.floor(raw(v)/8)-ECC[v]*NB[v];
  let v=1;while(v<=10&&4+(v<10?8:16)+data.length*8>dcw(v)*8)v++;if(v>10)return null;
  const bits=[],put=(x,n)=>{for(let i=n-1;i>=0;i--)bits.push(x>>>i&1)};
  put(4,4);put(data.length,v<10?8:16);for(const b of data)put(b,8);
  const cap=dcw(v)*8;put(0,Math.min(4,cap-bits.length));put(0,(8-bits.length%8)%8);for(let p=0xEC;bits.length<cap;p^=0xEC^0x11)put(p,8);
  const cw=[];for(let i=0;i<bits.length;i+=8)cw.push(bits.slice(i,i+8).reduce((a,b)=>a<<1|b,0));
  const mul=(x,y)=>{let z=0;for(let i=7;i>=0;i--){z=(z<<1)^((z>>>7)*0x11D);z^=((y>>>i)&1)*x}return z};
  const deg=ECC[v],div=new Array(deg).fill(0);div[deg-1]=1;for(let i=0,r=1;i<deg;i++){for(let j=0;j<deg;j++){div[j]=mul(div[j],r);if(j+1<deg)div[j]^=div[j+1]}r=mul(r,2)}
  const rem=d=>{const r=new Array(deg).fill(0);for(const b of d){const f=b^r.shift();r.push(0);div.forEach((c,i)=>r[i]^=mul(c,f))}return r};
  const nb=NB[v],tot=Math.floor(raw(v)/8),sh=nb-tot%nb,sl=Math.floor(tot/nb),blocks=[];
  for(let i=0,k=0;i<nb;i++){const d=cw.slice(k,k+sl-deg+(i<sh?0:1));k+=d.length;const e=rem(d);if(i<sh)d.push(0);blocks.push(d.concat(e))}
  const all=[];for(let i=0;i<blocks[0].length;i++)blocks.forEach((b,j)=>{if(i!==sl-deg||j>=sh)all.push(b[i])});
  const n=v*4+17,M=[...Array(n)].map(()=>new Array(n).fill(false)),F=[...Array(n)].map(()=>new Array(n).fill(false)),set=(x,y,d)=>{M[y][x]=d;F[y][x]=true};
  for(let i=0;i<n;i++){set(6,i,i%2===0);set(i,6,i%2===0)}
  for(const [cx,cy] of [[3,3],[n-4,3],[3,n-4]])for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){const d=Math.max(Math.abs(dx),Math.abs(dy)),x=cx+dx,y=cy+dy;if(x>=0&&x<n&&y>=0&&y<n)set(x,y,d!==2&&d!==4)}
  const AL=[[],[],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50]][v],L=AL.length-1;
  AL.forEach((a,i)=>AL.forEach((b,j)=>{if((!i&&!j)||(!i&&j===L)||(i===L&&!j))return;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)set(a+dx,b+dy,Math.max(Math.abs(dx),Math.abs(dy))!==1)}));
  const fmt=m=>{let r=m;for(let i=0;i<10;i++)r=(r<<1)^((r>>>9)*0x537);const b=(m<<10|r)^0x5412,g=i=>(b>>>i&1)===1;
    for(let i=0;i<=5;i++)set(8,i,g(i));set(8,7,g(6));set(8,8,g(7));set(7,8,g(8));for(let i=9;i<15;i++)set(14-i,8,g(i));
    for(let i=0;i<8;i++)set(n-1-i,8,g(i));for(let i=8;i<15;i++)set(8,n-15+i,g(i));set(8,n-8,true)};
  fmt(0);
  if(v>=7){let r=v;for(let i=0;i<12;i++)r=(r<<1)^((r>>>11)*0x1F25);const b=v<<12|r;for(let i=0;i<18;i++){const t=(b>>>i&1)===1,a=n-11+i%3,c=Math.floor(i/3);set(a,c,t);set(c,a,t)}}
  for(let right=n-1,i=0;right>=1;right-=2){if(right===6)right=5;for(let k=0;k<n;k++)for(let j=0;j<2;j++){const x=right-j,y=((right+1)&2)===0?n-1-k:k;if(!F[y][x]&&i<all.length*8){M[y][x]=(all[i>>>3]>>>(7-(i&7))&1)===1;i++}}}
  const MASK=[(x,y)=>(x+y)%2===0,(x,y)=>y%2===0,x=>x%3===0,(x,y)=>(x+y)%3===0,(x,y)=>(Math.floor(x/3)+Math.floor(y/2))%2===0,(x,y)=>x*y%2+x*y%3===0,(x,y)=>(x*y%2+x*y%3)%2===0,(x,y)=>((x+y)%2+x*y%3)%2===0];
  const flip=m=>{for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(!F[y][x]&&MASK[m](x,y))M[y][x]=!M[y][x]};
  // the mask with the fewest long runs, solid squares and imbalance (the standard's rules 1, 2 and 4)
  const score=()=>{let s=0,dark=0;for(let a=0;a<n;a++){for(const row of [0,1]){let run=1;for(let b=1;b<n;b++){const p=row?M[a][b-1]:M[b-1][a],q=row?M[a][b]:M[b][a];if(p===q){run++;if(run===5)s+=3;else if(run>5)s++}else run=1}}
    for(let b=0;b<n;b++){if(M[a][b])dark++;if(a<n-1&&b<n-1&&M[a][b]===M[a][b+1]&&M[a][b]===M[a+1][b]&&M[a][b]===M[a+1][b+1])s+=3}}
    return s+Math.floor(Math.abs(dark*20-n*n*10)/(n*n))*10};
  let best=0,low=Infinity;for(let m=0;m<8;m++){flip(m);fmt(m);const s=score();if(s<low){low=s;best=m}flip(m)}
  flip(best);fmt(best);return M;
}
/** The QR code as an SVG, with its quiet zone. */
const qrSvg=text=>{const M=qrGrid(text);if(!M)return '';const n=M.length;let d='';M.forEach((r,y)=>r.forEach((on,x)=>{if(on)d+=`M${x+4} ${y+4}h1v1h-1z`}));
  return `<svg viewBox="0 0 ${n+8} ${n+8}" shape-rendering="crispEdges"><rect width="${n+8}" height="${n+8}" style="fill:#fff;stroke:none"/><path d="${d}" style="fill:#111;stroke:none"/></svg>`};
/* ---------- Phone: Workwood on your phone over your home Wi-Fi (see service/phone.mjs). The page asks the service
   every few seconds while it shows: a step ticks, a phone pairs, the code renews. ---------- */
let PH=null,phBusy=false,phRep=null;   // phRep: the code that pairs a phone again, while it shows
function phonePoll(){if(phBusy)return;phBusy=true;
  const go=()=>{if($('sdim').hidden||stab!==7){phBusy=false;return}
    api('phone').then(p=>{PH=p;if(!$('sdim').hidden&&stab===7&&!$('spage').querySelector('.phq:hover'))renderSettings()}).catch(()=>{}).finally(()=>setTimeout(go,2500))};
  go()}
/* ---------- at this PC or away: what the phone's notifications do (see service/presence.mjs) ----------
   Each page on the PC says how long since the last input (to the whole computer, in the window) and which session it
   shows. While a phone has notifications on, the sidebar's footer has a mark: Here (they wait for a minute with no input, and what you
   handle here is not sent), a ring running down to one that waits, or Away (they go at once). Click it to switch. */
const PCR={page:Math.random().toString(36).slice(2,10),input:performance.now(),idle:0,locked:false,busy:false,again:false,pop:false,tick:0};
async function pcReport(){
  if(PHONE)return;if(PCR.busy){PCR.again=true;return}PCR.busy=true;
  try{let idle=(performance.now()-PCR.input)/1000,locked=PCR.locked;
    const w=await window.workwood?.pcIdle?.().catch(()=>null);if(w){idle=w.idle;locked=locked||!!w.locked}
    const viewing=document.visibilityState==='visible'&&document.hasFocus()&&!V.isNew&&V.sel||null;
    PCR.idle=idle;pcTake(await api('presence',{page:PCR.page,idle,locked,viewing}))}
  catch{}finally{PCR.busy=false;if(PCR.again){PCR.again=false;pcReport()}}
}
const pcInput=()=>{PCR.input=performance.now();PCR.locked=false;if(PCR.idle>=20){PCR.idle=0;pcReport()}};
if(!PHONE){
  for(const t of ['pointerdown','pointermove','keydown','wheel','touchstart'])addEventListener(t,pcInput,{passive:true,capture:true});
  addEventListener('focus',()=>pcReport());document.addEventListener('visibilitychange',()=>pcReport());
  window.workwood?.onPcLock?.(l=>{PCR.locked=l;if(!l)PCR.input=performance.now();pcReport()});
  setInterval(pcReport,15000);setTimeout(pcReport,500);
}
function pcTake(p){if(!p)return;A.pc=p;renderPc();if(PHONE&&isHome())renderHome()}
const pcHeld=p=>!p.away&&p.held?.length?p.held.reduce((a,x)=>x.until<a.until?x:a):null;   // the one sent first
const mmss=ms=>{const s=Math.max(0,Math.ceil(ms/1000));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')};
const PC_HERE={wait:'Notifications wait until you leave the PC alone for a minute; what you handle here is not sent.',never:'Notifications are not sent while you are here.',now:'Notifications go to your phone at once.'};
const pcWhy=p=>p.why==='manual'?'Set by hand, until you are back.':p.why==='locked'?'This PC is locked.':p.why==='closed'?'Workwood is not open on this PC.':`No input since ${clock(p.since)}.`;
function renderPc(){
  const b=$('pcb'),p=A.pc,on=!PHONE&&!!p?.push;if(!b)return;
  b.hidden=!on;if(!on){$('pcpop').hidden=true;clearInterval(PCR.tick);PCR.tick=0;return}
  const h=pcHeld(p),k=p.away?'away':h?'hold':'here';
  b.className='pcb '+k;
  if(k==='hold'){const left=h.until-Date.now(),c=2*Math.PI*5.8,n=p.held.length;
    b.innerHTML=`<svg viewBox="0 0 14 14"><circle class="rgb" cx="7" cy="7" r="5.8"/><circle class="rg" cx="7" cy="7" r="5.8" stroke-dasharray="${(c*Math.max(0,Math.min(1,left/(p.holdMs||60000)))).toFixed(1)} 99"/></svg><span>${n>1?n+' · ':''}${mmss(left)}</span>`;
    b.dataset.tip='Sending to your phone in '+mmss(left)+' without input';b.dataset.tipD=p.held.map(x=>x.title).join(' · ')+'. Handle it here and it is not sent.'}
  else if(k==='away'){b.innerHTML=`<svg viewBox="0 0 14 14"><rect class="bd" x="3.5" y="1" width="7" height="12" rx="1.6"/><path class="wv" d="M12 4.5a4 4 0 0 1 0 5"/></svg><span>Away</span>`;
    b.dataset.tip='Away: your phone gets notifications';b.dataset.tipD=pcWhy(p)}
  else{b.innerHTML=`<svg viewBox="0 0 14 14"><rect class="bd" x="3.5" y="1" width="7" height="12" rx="1.6"/><line class="sl" x1="1.5" y1="12.5" x2="12.5" y2="1.5"/></svg><span>Here</span>`;
    b.dataset.tip='At this PC';b.dataset.tipD=PC_HERE[p.hold]}
  if(h&&!PCR.tick)PCR.tick=setInterval(()=>{renderPc();if(!$('pcpop').hidden)pcPopPaint()},1000);
  if(!h&&PCR.tick){clearInterval(PCR.tick);PCR.tick=0}
  if(!$('pcpop').hidden)pcPopPaint();
}
function pcPopPaint(){
  const p=A.pc;if(!p)return;
  const held=p.away?[]:p.held||[];
  $('pcpop').innerHTML=`<div class="pch ${p.away?'a':''}"><i></i>${p.away?'Away':'At this PC'}</div><div class="pcs">${p.away?pcWhy(p)+' Your phone gets notifications now.':PC_HERE[p.hold]}</div>`
    +held.map(x=>`<div class="pcheld"><b>${esc(x.title)}</b><span>${mmss(x.until-Date.now())}</span></div>`).join('')
    +`<div class="pcbtns">${p.away?'<button class="pri" data-pcset="here">I’m here</button>':'<button class="pri" data-pcset="away">Away now</button>'}<button data-pcset="settings">Settings</button></div>`;
}
$('pcb').onclick=e=>{e.stopPropagation();const o=$('pcpop');if(!o.hidden){o.hidden=true;return}closePops();hideTip();o.hidden=false;pcPopPaint()};
$('pcpop').onclick=async e=>{
  const b=e.target.closest('[data-pcset]');if(!b)return;const k=b.dataset.pcset;
  if(k==='settings'){$('pcpop').hidden=true;openSettings(STABS.indexOf('Phone'));return}
  try{pcTake(await api('presence',{away:k==='away'}));if(k==='here'){PCR.input=performance.now();pcReport()}}catch(err){oops(err.message)}
};
// on the phone's Home: whether the PC has you, so you know whether to expect notifications here
function pcLine(){
  const p=A.pc;if(!p?.push)return null;
  return ['pc',`<section class="hs hs-pc"><div class="pcline ${p.away?'a':''}"><i></i><span><b>${p.away?'You’re away from the PC':'You’re at the PC'}</b>${p.away?'Notifications come here.':p.hold==='wait'?'Notifications wait while you use it.':p.hold==='never'?'Notifications stay there.':'Notifications come here too.'}</span></div></section>`];
}
function renderPhonePage(pg){
  phonePoll();
  const p=PH,head='<div class="pgh">Phone</div>';
  if(!p){pg.innerHTML=head+'<div class="cap2">Loading…</div>';return}
  const step=(t,d,wait,bad)=>`<div class="srow phs"><span>${t}<small>${d}</small>${bad?`<small class="bad">${esc(bad)}</small>`:wait?`<small class="phw"><i></i>${wait}</small>`:''}</span></div>`;
  let body='';
  if(p.on){
    if(p.error)body+=step('The phone port could not be opened','Workwood listens on port '+p.port+'.',null,p.error);
    else if(p.wsl&&!p.relay.fresh)body+=step('Open Workwood from its Windows window','Inside WSL, the Windows window opens the way in for your phone.');
    else if(p.wsl&&!p.relay.listening)body+=step('Let your Wi-Fi reach this PC','Windows will ask once. Choose <b>Private networks</b> and Allow.','Waiting for Windows…',p.relay.error);
    else if(!p.url)body+=step('Looking for this PC on your Wi-Fi','Connect this PC to your home network.','Looking…');
    else body+=`<div class="phq">${qrSvg(p.url)}<div><b>Scan with your phone's camera</b><span>Your phone must be on the same Wi-Fi. It walks you through the rest.</span>
      <code><i class="phl"></i>${esc(p.ips[0])} · ${esc(p.name)}</code>${Date.now()-p.setupSeen<120000?'<span class="ok">A phone opened the setup page</span>':''}</div></div>`;
    if(phRep&&(phRep.until<Date.now()||!(p.phones.find(x=>x.id===phRep.id)?.paired<phRep.at)))phRep=null;   // ran out, used, or the phone was revoked
    const sg=(items,cur,attr)=>`<div class="lseg">${items.map(([v,n])=>`<button data-${attr}="${v}" class="${String(v)===String(cur)?'on':''}">${n}</button>`).join('')}</div>`,pr=A.prefs||{};
    body+=`<div class="lgrp">Notifications</div><div class="srow"><span>While you’re at this PC<small>${({wait:'It waits while you use the PC; after a minute with no input it goes to the phone.',never:'Nothing goes to the phone while you are here.',now:'Everything goes to the phone at once, as when away.'})[pr.pcHold||'wait']}</small></span>${sg([['wait','Wait a minute'],['never','Don’t send'],['now','Send at once']],pr.pcHold||'wait','pch')}</div>
      <div class="srow"><span>Away after<small>No keyboard or mouse anywhere on this PC. Locked or asleep is away at once.${A.pc?` <span class="pcnow ${A.pc.away?'a':''}"><i></i>${A.pc.away?'Away now':'At this PC now'}</span>`:''}</small></span>${sg([[2,'2 min'],[5,'5 min'],[15,'15 min']],pr.awayMin||5,'pcm')}</div>`;
    body+='<div class="lgrp">Paired phones</div>'+(p.phones.length?p.phones.map(x=>`<div class="srow"><span>${esc(x.name)}<small>${x.seen?(Date.now()-x.seen<90000?'Seen just now':'Seen '+ago(x.seen/1000)+' ago'):'Not opened yet'}${x.push?' · notifications on':''}</small>${x.lost?`<small class="bad">This PC's address changed since. Pair it again to reach it.</small>`:''}</span><span class="phb"><button class="sval" data-phrep="${esc(x.id)}">Pair again</button><button class="sval" data-phrev="${esc(x.id)}">Revoke</button></span></div>`
      +(phRep?.id===x.id&&phRep.url?`<div class="phq">${qrSvg(phRep.url)}<div><b>Scan with ${esc(x.name)}</b><span>Pairs it again as itself: its name and notifications stay. The code lasts 10 minutes.</span></div></div>`:'')).join('')
      :'<div class="cap2" style="padding:8px">No phones yet.</div>')+'<div class="cap2" style="padding:10px 8px">Works while this PC is on and Workwood is open.</div>';
  }
  pg.innerHTML=head+`<div class="srow"><span>Open Workwood on your phone<small>On your home Wi-Fi · only phones you pair</small></span><i class="stog ${p.on?'on':''}" data-set="phone"></i></div>`+body;
}
/* ---------- updates: Workwood runs from a git checkout; when GitHub has more, a card above the sidebar footer offers a restart ---------- */
const U={later:localStorage.getItem('ww.updLater'),busy:false,err:''};   // later: the upstream commit you said Later to; busy: pulling, then restarting
const canRestart=()=>!!window.workwood?.restart;
function running(){const l=A.sessions.filter(x=>!x.outside&&!x.term);return [l.filter(x=>x.status==='work').length,l.reduce((n,x)=>n+(x.bg||0),0)]}
function updView(){
  const u=A.update||{};
  if(U.busy||u.updating)return {k:'going',t:'Updating',d:'Pulling the changes…'};
  if(U.err)return {k:'fail',t:'Could not update',d:U.err};
  if(u.head&&u.head===U.later)return null;
  if(u.state==='updated')return {k:'done',t:'Updated',d:'Restart Workwood to use it'};
  if(u.state==='blocked')return {k:'fail',t:"Can't update",d:u.why};
  if(u.state!=='ready')return null;
  const [w,b]=running(),stops=[w&&plural(w,'working agent'),b&&plural(b,'background task')].filter(Boolean).join(' and ');
  return stops?{k:'busy',t:'Update ready',d:'Restarting stops '+stops}:{k:'ready',t:'Update ready',d:plural(u.behind,'new change')};
}
function renderUpd(){
  const v=updView(),el=$('upd'),u=A.update||{};
  $('bGear').classList.toggle('pip',!!v&&v.k!=='going');
  $('gUpd').hidden=!v||v.k==='going';if(v)$('gUpd').innerHTML=`${svg(v.k==='fail'?'alert':'up')}${esc(v.t)}<span>${v.k==='fail'?'Show':canRestart()?'Restart':'Update'}</span>`;
  el.hidden=!v;if(!v){el.innerHTML='';el.dataset.k='';return}
  const titles=(u.titles||[]).join('\n')+(u.behind>3?`\nand ${u.behind-3} more`:''),go=canRestart()?'Restart':'Update';
  const btns=v.k==='going'?'<div class="ubar"><i></i></div>'
    :v.k==='fail'?`<button class="ubtn ghost" data-u="show">Show</button><button class="ubtn ghost" data-u="later">Later</button>`
    :v.k==='done'?(canRestart()?`<button class="ubtn" data-u="restart">Restart</button>`:'')+`<button class="ubtn ghost" data-u="later">Later</button>`
    :`<button class="ubtn" data-u="go">${v.k==='busy'?go+' anyway':go}</button><button class="ubtn ghost" data-u="later">Later</button>`;
  const html=`<div class="ut"><span class="uic">${svg(v.k==='fail'?'alert':'up')}</span><b>${esc(v.t)}</b>${v.k==='going'?'':`<button class="ib ux" data-u="later" data-tip="Later">${svg('x')}</button>`}</div><div class="ud"${v.k==='ready'&&titles?` data-tip="${esc(titles)}"`:''}>${esc(v.d)}</div><div class="ub">${btns}</div>`;
  if(el.innerHTML!==html)el.innerHTML=html;el.dataset.k=v.k;
}
async function doUpdate(){
  U.busy=true;U.err='';renderUpd();
  try{await api('update/apply',{})}catch(e){U.busy=false;U.err=e.message;renderUpd();return}
  if(canRestart())try{await window.workwood.restart();return}catch{}   // the window goes away and comes back updated
  U.busy=false;renderUpd();
}
function updAct(k){
  const u=A.update||{};
  if(k==='go')doUpdate();
  else if(k==='restart')window.workwood.restart().catch(()=>{});
  else if(k==='later'){U.err='';U.later=u.head||'-';localStorage.setItem('ww.updLater',U.later);renderUpd()}
  else if(k==='show')openSettings(3);
}
$('upd').onclick=e=>{const b=e.target.closest('[data-u]');if(b)updAct(b.dataset.u)};
$('gUpd').onclick=()=>{closePops();const v=updView();updAct(v?.k==='fail'?'show':v?.k==='done'?'restart':'go')};
// Settings, About: where things stand, and a check right now.
function updRow(){
  const u=A.update||{},a=u.at?ago(u.at/1000):'',when=a?` · checked ${a==='now'?'just now':a+' ago'}`:'';
  const line=u.checking?'Checking GitHub…':U.busy||u.updating?'Updating…':U.err?U.err
    :u.state==='updated'?'Updated. Restart Workwood to use it.'
    :u.state==='ready'?`${plural(u.behind,'new change')}: ${(u.titles||[])[0]||''}`
    :u.state==='blocked'?`${u.why}${u.files?.length>1?': '+u.files.slice(0,3).join(', ')+(u.files.length>3?' …':''):''}. Commit or stash them, then check again.`
    :u.error?u.error:u.state==='current'?'Up to date'+when:u.why||'Not checked yet';
  const bad=!!(U.err||u.state==='blocked'||(u.error&&u.state!=='ready'));
  const btn=u.state==='ready'&&!U.busy?`<button class="sval" data-set="updgo">${canRestart()?'Restart':'Update'}</button>`
    :u.state==='updated'?(canRestart()?'<button class="sval" data-set="updrestart">Restart</button>':'')
    :`<button class="sval" data-set="updcheck" ${u.checking||U.busy?'disabled':''}>Check now</button>`;
  return `<div class="srow" id="sUpd"><span>Updates<small class="${bad?'bad':''}">${esc(line)}</small></span>${btn}</div>`;
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
    const meter=k=>{const v=p[k],r=p[WIN[k][1]];return `<span class="pm ${lvl(v??0)}"><span class="pk">${k==='h5'?'5h':'7d'}</span><span class="bar"><i style="width:${Math.min(100,v||0)}%"></i></span><span class="v">${v??'–'}%</span>${r?`<small data-tip="${v>=100?'Clears':'Resets'} ${fullAt(r)}">${v>=100?'clears':'resets'} in ${until(r)}</small>`:''}</span>`};
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
function openSettings(tab=0,prof){closePops();stab=tab;if(prof){PSel=prof;PAdd=false}about=null;VS=null;$('sdim').hidden=false;renderSettings()}
function closeSettings(){dropLogin(true);$('sdim').hidden=true}
// Links in a terminal open in your browser. xterm's own way opens an empty window and then sends it to the link,
// so the window was handed about:blank to open, and Windows could not.
function openLink(e,uri){if(/^https?:\/\//i.test(uri))window.open(uri,'_blank','noopener')}
const TLINKS={activate:openLink};
// The sign-in page's link in what the sign-in printed: a terminal link (OSC 8) first, else plain text; one that
// looks like a sign-in is preferred.
function linkIn(s){
  const all=[...s.matchAll(/\x1b\]8;[^;\x07\x1b]*;(https:\/\/[^\x07\x1b]+)(?:\x07|\x1b\\)/g)].map(m=>m[1]);
  if(!all.length)all.push(...(s.replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g,'').replace(/\x1b\[[0-9;?]*[ -\/]*[@-~]/g,'').match(/https:\/\/[^\s"'<>\x1b]+/g)||[]));
  return all.filter(u=>/oauth|authorize|login/i.test(u)).pop()||all.pop()||null}
function copyText(t){return navigator.clipboard?.writeText(t).catch(()=>fallback())??fallback();
  function fallback(){const a=document.createElement('textarea');a.value=t;document.body.append(a);a.select();const ok=document.execCommand('copy');a.remove();if(!ok)throw new Error('copy')}}
async function startLogin(name,add){
  $('spage').innerHTML=`<div class="lgbar"><div class="lgt"><b>${add?'Add':'Sign in to'} ${esc(name)}</b><span id="lgNote">Follow the steps below. A browser page may open.</span></div><button class="sval pri" id="lgOpen" hidden>Open sign-in page</button><button class="sval" id="lgCopy" hidden>Copy link</button><button class="sval" id="lgBack">Back</button></div><div class="lgx" id="lgx"></div>`;
  const term=new Terminal({fontFamily:'"Cascadia Code","JetBrains Mono",ui-monospace,Menlo,Consolas,monospace',fontSize:12.5,cursorBlink:true,theme:termTheme(),linkHandler:TLINKS});
  const fit=new FitAddon.FitAddon();term.loadAddon(fit);term.open($('lgx'));try{fit.fit()}catch{}
  const me=L={name,term};const say=t=>{if(L===me)$('lgNote').textContent=t};
  try{if(add){me.name=name=PSel=(await api('profiles',{name,cols:term.cols,rows:term.rows})).name;$('spage').querySelector('.lgbar b').textContent='Add '+name}
    else await api(`profiles/${name}/login`,{cols:term.cols,rows:term.rows})}catch(e){return say(e.message)}
  if(L!==me)return;
  const es=me.es=new EventSource(`/api/profiles/${name}/login?token=${TOKEN}`);
  let seen='';
  es.addEventListener('data',e=>{const d=JSON.parse(e.data);term.write(d);seen=(seen+d).slice(-65536);const u=linkIn(seen);
    if(u&&u!==me.url&&L===me){me.url=u;$('lgOpen').hidden=$('lgCopy').hidden=false}});
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
  const rp=e.target.closest('[data-rplace]'),rs=e.target.closest('[data-rspd]');
  try{
    if(rp){A.prefs=await api('settings',{readPlace:rp.dataset.rplace});renderSettings();raShow();return}
    if(rs){A.prefs=await api('settings',{readSpeed:+rs.dataset.rspd});RA.el.playbackRate=raSpeed();renderSettings();raUpdate();return}
    if(s?.dataset.set==='readauto'){A.prefs=await api('settings',{readAuto:!A.prefs?.readAuto});renderSettings();return}
    if(s?.dataset.set==='hearvoice'){raSample();return}
  }catch(err){oops(err.message);return}
  if(e.target.closest('#lgBack')){dropLogin(true);renderSettings();return}
  const lk=e.target.closest('[data-bgk],[data-bgp],[data-bgm],[data-th]');
  if(lk){const ed=V.lookEdit||'home',d=lk.dataset;
    if(d.th)setTheme(d.th);else if(d.bgp)V.lookEdit=d.bgp;else if(d.bgk)setBg(ed,'bg',d.bgk);else if(d.bgm)setBg(ed,'motion',d.bgm);
    renderSettings();return}
  const pcs=e.target.closest('[data-pch],[data-pcm]');if(pcs){try{A.prefs=await api('settings',pcs.dataset.pch?{pcHold:pcs.dataset.pch}:{awayMin:+pcs.dataset.pcm});renderSettings()}catch(err){oops(err.message)}return}
  const wc=e.target.closest('[data-wclk]');if(wc){localStorage.setItem('ww.wallclock',wc.dataset.wclk);renderHome();renderSettings();return}
  if(s?.dataset.set==='wall'){localStorage.setItem('ww.wall',wallOn()?'off':'on');renderHome();renderSettings();return}
  if(s?.dataset.set==='skylab'){localStorage.setItem('ww.skylabels',skyLabels()?'off':'on');renderBgs();renderSettings();return}
  if(s?.dataset.set==='bglim'){const ed=V.lookEdit||'home';setBg(ed,'limits',bgOf(ed).limits?'off':'on');renderSettings();return}
  if(e.target.closest('#lgOpen')&&L?.url){openLink(e,L.url);return}
  if(e.target.closest('#lgCopy')&&L?.url){const b=$('lgCopy');try{await copyText(L.url);b.textContent='Copied'}catch{b.textContent='Select it in the terminal'}setTimeout(()=>{if(b.isConnected)b.textContent='Copy link'},1500);return}
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
  if(s?.dataset.set==='getread'){try{VS=await api('voice/read',{});renderSettings()}catch(err){oops(err.message)}return}
  if(s?.dataset.set==='getspeech'){try{VS=await api('voice/better',{});renderSettings()}catch(err){oops(err.message)}return}
  if(s?.dataset.set==='speech'){try{A.prefs=await api('settings',{speech:A.prefs?.speech==='turbo'?'small':'turbo'});VS=null;renderSettings()}catch(err){oops(err.message)}return}
  if(s?.dataset.set==='login'){await setLogin(!loginOn);renderSettings()}
  if(s?.dataset.set==='phone'){try{PH=await api('phone/on',{on:!PH?.on});renderSettings()}catch(err){oops(err.message)}return}
  {const pr=e.target.closest('[data-phrep]');if(pr){try{phRep=phRep?.id===pr.dataset.phrep?null:{...await api('phone/repair',{id:pr.dataset.phrep}),at:Date.now()};renderSettings()}catch(err){oops(err.message)}return}}
  {const pr=e.target.closest('[data-phrev]');if(pr){try{PH=await api('phone/revoke',{id:pr.dataset.phrev});renderSettings()}catch(err){oops(err.message)}return}}
  if(s?.dataset.set==='auto'){try{A.prefs=await api('settings',{autoContinue:!A.prefs?.autoContinue});renderSettings()}catch(err){oops(err.message)}}
  if(s?.dataset.set==='bypass'){try{A.prefs=await api('settings',{bypass:!A.prefs?.bypass});renderSettings();renderComposer()}catch(err){oops(err.message)}}
  if(s?.dataset.set==='updcheck'){U.err='';U.later=null;localStorage.removeItem('ww.updLater');api('update/check',{}).catch(err=>oops(err.message));setTimeout(renderSettings,50)}
  if(s?.dataset.set==='updgo'){U.later=null;localStorage.removeItem('ww.updLater');closeSettings();doUpdate()}
  if(s?.dataset.set==='updrestart')window.workwood.restart().catch(()=>{});
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
    if(e.target.id==='sVoice'){A.prefs=await api('settings',{readVoice:e.target.value});raSample()}
    if(e.target.id==='sCache'){A.prefs=await api('settings',{cacheMinutes:+e.target.value});renderList();renderStrip()}
    if(e.target.id==='sHModel'||e.target.id==='sHEffort'||e.target.id==='sHOffer')A.prefs=await api('settings',{handoff:{[{sHModel:'model',sHEffort:'effort',sHOffer:'offer'}[e.target.id]]:e.target.id==='sHOffer'?+e.target.value:e.target.value}});
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
function fitSide(){const c=!PHONE&&(sidePref==='compact'||(sidePref==='auto'&&autoCompact()));if(c===V.compact)return;
  V.compact=c;document.querySelector('.app').classList.toggle('compact',c);hideTip();
  $('bSide').dataset.tip=c?'Show the full sidebar':'Compact sidebar';$('newBtn').dataset.tip=c?'Home':'';renderList()}
function setSide(p){sidePref=p;localStorage.setItem('ww.side',p);fitSide()}
const toggleSide=()=>{const a=autoCompact();setSide(V.compact?(a?'full':'auto'):(a?'auto':'compact'))};
$('bSide').onclick=toggleSide;
addEventListener('resize',fitSide);
/* ---------- hover notes: one box for every element with something to say, always inside the window ----------
   data-tip      what it is, on one line where it fits
   data-tip-d    a dim line under it, for what the name alone does not say
   data-tip-k    its keys, shown as keys ("Ctrl K")
   data-tip-path a file's path, its folder dimmed
   data-tip-full the element's own text, only while it is cut off */
const TIPSEL='[data-tip],[data-tip-path],[data-tip-full],[data-fpath],[data-epath].ok';
let tipFor=null,tipTimer,tipShown=false,tipWarm=0;
function hideTip(){clearTimeout(tipTimer);if(tipShown)tipWarm=performance.now()+500;tipShown=false;tipFor=null;const t=$('tip');t.hidden=true;t.classList.remove('on')}
function tipHtml(el){
  const d=el.dataset;
  if(d.fpath!=null){const f=FP.get(V.sel+'|'+d.fpath),p=x=>{const i=x.lastIndexOf('/')+1;return `<span class="dir">${esc(x.slice(0,i)).replace(/\//g,'/<wbr>')}</span>${esc(x.slice(i))}`};
    if(f===undefined)return null;
    if(!f)return['path',`<span class="tipn"><span><b class="nf">Not found</b> · ${p(d.fpath)}</span></span>`];
    return['path',`${f.kind==='image'?`<span class="tthm"><img src="${esc(fileUrl(f))}" alt=""></span>`:''}<span class="tipn"><span class="tipp">${p(f.path)}</span><span class="tiph">Click to preview</span></span>`]}
  if(d.epath!=null){const f=EP.get(V.sel+'|'+d.epath)?.v;if(!f)return null;const i=f.path.lastIndexOf('/')+1,ln=d.epath.match(/:(\d+)(?::\d+)?$/);
    return['path',`<span class="tipn"><span class="tipp"><span class="dir">${esc(f.path.slice(0,i)).replace(/\//g,'/<wbr>')}</span>${esc(f.path.slice(i))}</span><span class="tiph">Click to open ${f.dir?'the folder ':ln?'at line '+ln[1]+' ':''}in VS Code</span></span>`]}
  if(d.tipPath){const i=d.tipPath.lastIndexOf('/')+1;return['path',`<span class="dir">${esc(d.tipPath.slice(0,i))}</span>${esc(d.tipPath.slice(i))}`]}
  if(d.tipFull!=null)return el.scrollWidth>el.clientWidth+1&&el.textContent.trim()?['',esc(el.textContent)]:null;
  if(!d.tip)return null;
  const k=d.tipK?`<span class="tipk">${d.tipK.split(' ').map(x=>`<kbd>${esc(x)}</kbd>`).join('')}</span>`:'';
  return[d.tipD?'note':'',`<span class="tipn">${esc(d.tip)}${k}</span>${d.tipD?`<span class="tipd">${esc(d.tipD)}</span>`:''}`];
}
function showTip(el){
  const t=$('tip'),c=el.isConnected&&tipHtml(el);if(!c){hideTip();return}
  t.className='tip2 '+c[0];t.innerHTML=c[1];t.hidden=false;tipShown=true;
  const r=el.getBoundingClientRect(),w=t.offsetWidth,h=t.offsetHeight,pad=8;
  if(el.closest('.app.compact .side')){t.style.left=(r.right+8)+'px';t.style.top=Math.max(pad,Math.min(r.top+(r.height-h)/2,innerHeight-h-pad))+'px'}   // beside the strip, not over it
  else{const below=r.bottom+6+h<=innerHeight-pad;t.classList.toggle('up',!below);
    t.style.left=Math.max(pad,Math.min(r.left+r.width/2-w/2,innerWidth-w-pad))+'px';t.style.top=(below?r.bottom+6:Math.max(pad,r.top-6-h))+'px'}
  requestAnimationFrame(()=>{if(tipShown&&tipFor===el)t.classList.add('on')});
}
// The first note waits a moment; moving straight on to the next one shows it at once.
document.addEventListener('mouseover',e=>{
  const el=e.target.closest?.(TIPSEL);if(el===tipFor)return;
  hideTip();if(!el)return;tipFor=el;const ready=el.dataset.fpath!=null&&fpath(el.dataset.fpath);   // a named path is looked up while the note waits
  tipTimer=setTimeout(()=>{if(tipFor!==el)return;if(ready)ready.then(()=>{if(tipFor===el)showTip(el)});else showTip(el)},performance.now()<tipWarm?0:450);
});
for(const ev of ['pointerdown','keydown','wheel','blur'])addEventListener(ev,()=>{hideTip();tipWarm=0},true);

/* ---------- single keys: B the sidebar, N the preview, M its full width, ← → through what the session made; never while you type ---------- */
const typing=t=>!!t?.closest?.('input,textarea,select,[contenteditable=""],[contenteditable="true"],#xt,#lgx');
document.addEventListener('keydown',e=>{
  if(e.ctrlKey||e.metaKey||e.altKey||e.shiftKey||e.repeat||typing(e.target)||!$('sdim').hidden||!$('fdim').hidden)return;
  const k=e.key.toLowerCase();
  if(k==='b'){e.preventDefault();toggleSide()}
  else if(k==='n'&&(V.pv||!$('bPreview').hidden&&!$('bPreview').classList.contains('mute'))){e.preventDefault();$('bPreview').click()}
  else if(k==='m'&&V.pv){e.preventDefault();$('bFull').click()}
  else if((k==='arrowleft'||k==='arrowright')&&V.pv&&pvList().length>1&&!e.target.closest?.('video,audio')){e.preventDefault();$(k==='arrowleft'?'pPrev':'pNext').click()}   // a playing video keeps its own arrows
});

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
  const term=new Terminal({fontFamily:'"Cascadia Code","JetBrains Mono",ui-monospace,Menlo,Consolas,monospace',fontSize:13,cursorBlink:true,scrollback:5000,theme:termTheme(),linkHandler:TLINKS});
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
const typeBox=ph=>`<div class="qtype"><input id="qText" placeholder="${esc(ph)}" autocomplete="off"><button class="ib qmic" data-mic data-tip="${MICTIP}" data-tip-d="${MICD}" data-tip-k="Ctrl Shift Space" data-i="mic"></button></div>`;
function renderCard(){
  // A card you have just answered, or a stop you have just continued from, goes at once; the service catches up.
  const c=$('qcard'),p=answered()?null:V.run?.pending,st=!V.pend&&V.dismissed!==stopKey()?heldStop():null;
  const show=!V.isNew&&(p||st);
  c.hidden=!show;$('box').hidden=!!show;
  if(R?.target==='qText'&&(!show||!p||R.qid!==p.id))stopVoice(false);    // the field it was writing into has gone
  if(V.side==='compare'&&p?.kind!=='question'){V.side=null;renderPanel()}
  if(!show){c._h=null;return}
  const put=h=>{const k=(p?.id||'')+h;if(c._h===k)return false;c._h=k;if(c.contains($('voice')))$('mic').before($('voice'));c.innerHTML=h;hydrate(c);voiceLook();return true};   // an unchanged card is left alone: its scroll position and typed text survive live updates
  if(st){if(put(stoppedCard(st)))autoTick();return}
  if(V.q.id!==p.id){V.q={id:p.id,step:0,picks:{},typed:qKept.get(p.id)||{},show:{},auto:null,at:performance.now()};qKept.delete(p.id)}
  if(p.kind==='question'){
    const qs=p.input.questions,i=Math.min(V.q.step,qs.length-1),q=qs[i],picked=V.q.picks[i]||[];
    const set=compareSet();
    if(set||V.side==='compare')renderPanel();
    put(`<div class="steps2">${qs.map((x,k)=>`<span class="qhd ${k===i?'':'off'}">${esc(x.header||'Question '+(k+1))}</span>`).join('')}${qs.length>1?`<span class="cnt">${i+1} of ${qs.length}</span>`:''}</div>
      <div class="qbody"><div class="qq">${esc(q.question)}${q.multiSelect?'<small>Pick any</small>':''}</div>
      ${optionsHtml(q,set)}</div>
      ${typeBox('Or type your own answer…')}
      <div class="qfoot"><button class="qbtn" data-act="stop" data-tip="Stop the turn without answering" data-tip-k="Esc">Stop</button><span class="gap"></span>${i>0?'<button class="qbtn" data-act="back">Back</button>':''}${i<qs.length-1?'<button class="qbtn" data-act="skip">Skip</button>':''}<button class="qbtn pri" data-act="${i<qs.length-1?'next':'send'}">${i<qs.length-1?'Next':qs.length>1?'Send answers':'Send answer'} ${KEY.enter}</button></div>`);
    if($('qText').value!==(V.q.typed[i]||''))$('qText').value=V.q.typed[i]||'';qState(set);
  }else if(p.kind==='plan'){
    put(`<div class="steps2"><span class="qhd">Plan</span></div><div class="qq">Start on this plan?</div>
      <div class="qbody"><div class="planbody ai">${md(p.input.plan||'')}</div></div>
      <div class="qrow"><button class="qbtn pri" data-act="allow">Approve and start ${KEY.enter}</button><button class="qbtn" data-act="allow" data-choice="plan:ask">Approve, but ask before each edit</button><button class="qbtn" data-act="deny">Keep planning ${KEY.esc}</button></div>${typeBox('Or say what to change in the plan…')}`);
  }else if(p.kind==='unknown'){
    put(`<div class="steps2"><span class="qhd">Needs you</span></div><div class="qq">The agent is asking something this app can't show properly yet</div>
      <div class="qbody"><div class="why">Here is what could be read from it:</div><div class="raw">${esc(JSON.stringify(p.input,null,1).slice(0,900))}</div></div>${typeBox('Answer in your own words…')}
      <div class="qfoot"><button class="qbtn" data-act="term" data-tip="Stops this turn" data-tip-d="Ask the agent to put the question again there.">Continue in the terminal</button><span class="gap"></span><button class="qbtn pri" data-act="deny">Send</button></div>`);
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
  return last?.kind==='note'&&(last.stop==='auth'||last.stop==='limit')?{reason:last.stop,profile:last.profile,redo:last.redo}:null;
}
const stopKey=()=>V.run?.status==='stopped'?V.run.startedAt:'n'+V.items[V.items.length-1]?.n;
function stoppedCard(st){
  const cur=st.profile||V.run?.profile||selSession()?.profile,others=A.profiles.filter(p=>p.name!==cur);
  const head={limit:['Limit reached',`Limit reached on ${cur}`],auth:['Sign-in needed',`${cur} is signed out`]}[st.reason]||['Stopped','The turn stopped'];
  const mine=A.profiles.find(p=>p.name===cur),clears=st.reason==='limit'&&(mine?.d7>=100?mine.r7:mine?.r5);
  const auto=st.reason==='limit'&&selSession()?.auto,later=auto&&others.find(p=>p.name===auto.to);
  if(later)others.sort((a,b)=>(b===later)-(a===later));          // the profile it will continue on comes first
  const why=st.reason==='auth'?`Its sign-in could not be renewed. Sign in again, then continue. Nothing is lost.`:esc(st.text||'')+(st.reason==='limit'?` Nothing is lost.${clears?' The limit clears in '+esc(until(clears))+'.':''}`:'');
  return `<div class="steps2"><span class="qhd">${head[0]}</span></div><div class="qq">${esc(head[1])}</div><div class="why">${why}</div>${later?`
    <div class="auto" data-at="${auto.at}" data-wait="${auto.wait}"><span>Continuing on <b>${esc(later.name)}</b> in <span class="acd"></span></span><button class="qbtn" data-act="stay">Cancel</button><i><b></b></i></div>`:''}
    <div class="qrow">${st.reason==='auth'?`<button class="qbtn pri" data-signin="${esc(cur)}">Sign in again</button>`:''}${st.reason==='limit'?'':`<button class="qbtn ${st.reason==='auth'?'':'pri'}" data-go="${esc(cur)}">${st.reason==='auth'?'I have signed in, continue':'Try again'}</button>`}${others.map((p,i)=>`<button class="qbtn ${st.reason==='limit'&&!i?'pri':''} ${p.h5>=100?'off':''}" data-go="${esc(p.name)}">Continue on ${esc(p.name)}${p.h5!=null?`<small>${p.h5>=100?'5h full':p.h5+'% used'}</small>`:''}</button>`).join('')}<button class="qbtn" data-act="dismiss" ${st.reason==='limit'?'data-tip="Closes this card. Write to the session again once the limit has cleared."':''}>${st.reason==='limit'?'Wait for the limit to clear':'Dismiss'} ${KEY.esc}</button></div>`;
}
// The countdown on a limit card that will continue by itself: the time left, and a bar that drains with it.
function autoTick(){const a=document.querySelector('#qcard .auto[data-at]');if(!a)return;const left=Math.max(0,Math.ceil((+a.dataset.at-Date.now())/1000));
  a.querySelector('.acd').textContent=left?`${Math.floor(left/60)}:${String(left%60).padStart(2,'0')}`:'a moment';a.querySelector('i b').style.width=Math.min(100,left*1000/(+a.dataset.wait||3e5)*100)+'%'}
setInterval(autoTick,250);
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
  if(p&&!inBox&&performance.now()-(V.q.at||0)<500)return;
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
  if(go){sendText(heldStop()?.redo||'Continue where you left off.',go.dataset.go);return}   // a stopped /compact runs again, at once
  if(a?.dataset.act==='stay'||a?.dataset.act==='dismiss'&&selSession()?.auto){const id=V.sel,s=selSession();if(s)s.auto=null;api(`sessions/${id}/stay`,{}).catch(err=>oops(err.message));if(a.dataset.act==='stay'){renderCard();return}}
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
function fitSend(){keepDraft();const stop=isWorking()&&!hasDraft(),b=$('send');if(b.dataset.i===(stop?'stop':'up'))return;b.dataset.i=stop?'stop':'up';b.dataset.tip=stop?'Stop':'Send';b.dataset.tipK=stop?'':'Enter';hydrate(b.parentNode)}
const curProfile=()=>V.isNew?V.profile:V.pick[V.sel]?.profile||V.run?.profile||selSession()?.profile;
const lvl=v=>v>=100?'hot':v>=80?'mid':'';
let limT;
function renderComposer(){
  const nw=V.isNew,s=selSession(),working=!nw&&V.run&&(V.run.status==='working'||V.run.status==='waiting'),locked=!nw&&s?.locked&&!working;
  $('sProject').hidden=!nw;
  $('box').classList.toggle('off',!!locked);
  $('input').disabled=!!locked;
  $('input').placeholder=nw?'Describe the task…':locked?'In use in a terminal. You can write here when it is idle.':working&&!PHONE?'Message the agent… it reads this when the current step ends':'Message the agent…';
  fitSend();
  const pr=A.projects.find(p=>p.cwd===V.project);
  $('pProject').innerHTML=pr?`${tile(pr.name,'s')}</span><span>${esc(pr.name)}</span>${svg('chev-d','cv')}`:`${svg('folder')}<span>Pick a project</span>${svg('chev-d','cv')}`;
  // Under the box: who this conversation runs as and how much of that profile's limits is used, then how it will think.
  const cur=profile(curProfile());
  const mine=cur?Math.max(cur.h5||0,cur.d7||0):0;   // the dot is about this profile only; the others show their state in the menu
  $('pProfile').innerHTML=`${mine>=80?`<i class="adot ${lvl(mine)}"></i>`:''}<span class="nm" data-i="${esc((cur?.name||'P').slice(0,1))}"><span>${esc(cur?.name||'Profile')}</span></span>${svg('chev-d','cv')}`;
  $('pProfile').dataset.tip=(nw?'The profile this session starts on':'The profile this conversation runs on. Pick another to continue on it.')+(mine>=100?' It has reached a limit.':mine>=80?' It is close to a limit.':'');
  const b=V.limBase&&cur&&V.limBase.name===cur.name&&!working?V.limBase:null,cool=k=>cur&&cur.h5!=null&&cur.d7!=null&&(k==='7d'?cur.d7<=cur.h5:cur.h5<cur.d7)&&lvl(k==='7d'?cur.d7:cur.h5)==='',   // the emptier window, which a tight row lets go
    meter=(k,v,was)=>v==null?'':`<span class="m ${lvl(v)} ${was!=null&&was!==v?'fresh':''} ${cool(k)?'cool':''}"><span class="wn">${k}</span><span class="bar"><i style="width:${Math.min(100,v)}%"></i></span>${was!=null&&was!==v?`<u>${was} →</u> `:''}${v}%</span>`;
  $('lim').innerHTML=cur?meter('5h',cur.h5,b?.h5)+meter('7d',cur.d7,b?.d7):'';
  if(b&&(cur.h5!==b.h5||cur.d7!==b.d7)&&!limT)limT=setTimeout(()=>{limT=null;V.limBase=null;renderComposer()},60000);   // what the turn cost stays readable for a minute
  // The note speaks for the window that sets its colour: a full 7d one, else a full 5h one, else whichever is higher.
  const h5=cur?.h5||0,d7=cur?.d7||0,full7=d7>=100||(h5<100&&d7>=h5),top=Math.max(h5,d7),rs=cur&&(full7?cur.r7:cur.r5);
  $('limNote').className='limnote '+lvl(top);
  // One row, always: the meter beside it already shows which limit is full, so the note only says when it clears, and it is the part that gives way when the row is tight.
  $('limNote').textContent=top>=100?(rs?`${full7?'7d':'5h'} limit clears in ${until(rs)}`:`${full7?'7d':'5h'} limit reached`):top>=80&&rs?`resets in ${until(rs)}`:'';
  const eff=EFFORTS.find(m=>m[0]===shownEffort())?.[1]||shownEffort();
  $('pModel').innerHTML=`<span>${shownModel()?esc(modelName(shownModel())):'Default model'}${eff&&eff!=='Default'?`<span class="eff"> <i>·</i> ${esc(eff)}</span>`:''}</span>${svg('chev-d','cv')}`;
  const md=shownMode();
  $('pMode').className='pick mode k-'+md+($('mMode').hidden?'':' open');
  $('pMode').innerHTML=`<i class="dot"></i><span class="lbl">${esc(modeName(md))}</span>${svg('chev-d','cv')}`;
  $('pMode').dataset.tip=`${modeName(md)}: ${MODES.find(x=>x[0]===md)?.[2]||''}. Shift+Tab in the message box switches modes.`;
  $('box').classList.toggle('m-plan',md==='plan');$('box').classList.toggle('m-bypass',md==='bypassPermissions');
  const c=!nw&&V.context,pct=c?Math.min(100,Math.round(c.used/c.window*100)):0;
  $('pCtx').innerHTML=c?`<i class="ring" style="--p:${pct}"></i><span class="pct">${pct}%</span>`:'';$('pCtx').className='ctx '+(pct>=80?'mid':'')+($('mCtx').hidden?'':' open');$('sCtx').hidden=!c;
  $('pCtx').dataset.tip=c?`${pct}% of the agent's memory of this conversation is used: ${kTok(c.used)} of ${kTok(c.window)} tokens`:'';
  renderStrip();renderBack();raTurnEnd(working);if(PHONE&&$('phPill'))phPill();
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
    return `<span class="pc ${lvl(v??0)}" data-k="${k}" ${r?`data-tip="${k==='h5'?'5-hour':'7-day'} limit ${v>=100?'clears':'resets'} in ${until(r)} · ${fullAt(r)}"`:''}><span class="t"><span class="v">${v??'–'}%</span><small class="rs">${r?until(r):''}</small></span><span class="bar"><i style="width:${Math.min(100,v||0)}%"></i>${run!=null&&v<100?`<b style="left:${run}%"></b>`:''}</span></span>`};
  $('mProfile').innerHTML=`<div class="lab">${V.isNew?'Start this session on':'Continue this conversation on'}</div>`
    +`<div class="phd"><span></span><span>Account</span><span>5h</span><span>7d</span></div>`
    +roomOrder(A.profiles).map(p=>{const old=p.at&&now-p.at>900,why=p.failed&&WHY[p.failed],full=Math.max(p.h5||0,p.d7||0)>=100;
      return `<button class="prow ${p.reading?'reading':''} ${full?'full':''} ${p.name===curProfile()?'cur':''}" data-prof="${esc(p.name)}">${p.name===curProfile()?svg('check','ck'):'<span></span>'}
      <span class="pn"><b>${esc(p.name)}</b><small class="age">${p.reading?'<i class="spin"></i>':why?esc(why)+(p.at?' '+ago(p.at):''):old?ago(p.at)+' ago':''}</small></span>${cell(p,'h5')}${cell(p,'d7')}</button>`}).join('')
    +`<div class="pft"><button class="pman" data-manage data-tip="Settings for each profile, and what to do when one has a problem">Manage…</button><span>${V.isNew?'':'Applies from your next message.'}</span><span class="pread">${busy?'Reading…':newest?'Updated '+(ago(newest)==='now'?'just now':ago(newest)+' ago'):''}</span><button class="ib rf ${busy?'busy':''}" data-refresh data-tip="Read every profile's limits again, one after another. Nothing is sent to Claude.">${svg('refresh')}</button></div>`;
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
function closePops(){document.querySelectorAll('.pop').forEach(p=>p.hidden=true);$('rwm').hidden=true;$('olm').hidden=true;if(V.rw||V.rp){V.rw=null;V.rp=null;renderThread()}$('mHand').hidden=true;$('pCtx').classList.remove('open');$('gmenu').hidden=true;$('emenu').hidden=true;$('smenu').hidden=true;$('hmenu').hidden=true;$('bMore').classList.remove('on');$('srvm').hidden=true;V.menuFor=null;document.querySelectorAll('.sess.mopen').forEach(b=>b.classList.remove('mopen'));$('menu').hidden=true;document.querySelectorAll('.pick.open').forEach(b=>b.classList.remove('open'));$('bGear').classList.remove('on')}
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
document.addEventListener('pointerdown',e=>{if(!e.target.closest('.pop,.fmenu,.menu,.pick,#bGear,#moreBtn,#bMore,#pcb,[data-dots]'))closePops()});
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
input.addEventListener('keydown',e=>{if(rwPickKey(e))return;if(slashKey(e))return;if(escEsc(e))return;
  if(e.key==='Tab'&&e.shiftKey&&!e.ctrlKey&&!e.altKey&&!e.metaKey){e.preventDefault();const l=modeList().map(x=>x[0]).filter(v=>v!=='bypassPermissions'),i=l.indexOf(shownMode());pickMode(l[(i+1)%l.length]);return}   // as in Claude Code
  if(e.key==='ArrowUp'&&!e.shiftKey&&!e.altKey&&!e.ctrlKey&&!e.metaKey&&queued().length&&input.selectionStart===0&&input.selectionEnd===0){e.preventDefault();takeBack();return}
  if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();if(!isWorking()||hasDraft()||R?.target==='input')$('send').click()}});   // Enter never stops a turn
$('send').onclick=async()=>{
  const b=$('send');
  if(R?.target==='input'){                                                 // still dictating: the message goes once it is written down
    if(b.classList.contains('queued'))return;
    const r=R,fin=stopVoice();b.classList.add('queued');b.dataset.tip='Sends once it is written down';b.dataset.tipK='';$('vtime').textContent='Writing it down, then sending…';
    await fin;b.classList.remove('queued');b.dataset.tip=b.dataset.i==='stop'?'Stop':'Send';b.dataset.tipK=b.dataset.i==='stop'?'':'Enter';fitSend();
    if(r.err)return;                                                       // part of it was not written down: look it over first
  }else if(isWorking()&&!hasDraft()){try{await api(`sessions/${V.sel}/stop`,{})}catch(e){oops(e.message)}return}
  const text=input.value.trim();if(!text&&!V.att.length)return;
  const dk=draftKey();
  // The box empties at once; if the message could not be sent, what you wrote comes back.
  const att=V.att;V.att=[];input.value='';renderAtt();grow();fitSend();
  // One at a time: a message sent while the one before is still on its way goes right after it.
  const go=sendQ.then(()=>sendText(text,undefined,att.map(({name,type,data,path})=>({name,type,data,path}))));sendQ=go.catch(()=>{});
  if(await go)for(const a of att){if(a.url)URL.revokeObjectURL(a.url)}
  else draftBack(dk,text,att);
};
let sendQ=Promise.resolve(),qSeq=0;

/* ---------- the queue: what you wrote while the agent works ---------- */
// It waits here until the agent finishes the step it is on. Until then it can be taken back (↑, or the pencil)
// to change it, or sent now, which cuts the step short.
const queued=()=>V.isNew?[]:[...(V.run?.queued||[]).filter(q=>!V.qGone.has(q.id)),...V.qLocal];
/* ---------- background work: a tray above the message box, a header button, and a side panel with each task's output ---------- */
const bgList=()=>V.isNew?[]:V.run?.bg||[];
const BGI={shell:'term',monitor:'eye',agent:'user'};
window.wwBackground=()=>[...A.sessions.filter(s=>s.bg).map(s=>({title:s.title,n:s.bg})),
  ...Object.entries(A.servers||{}).map(([top,h])=>[top,h.list.filter(s=>s.who==='workwood'&&s.state!=='exited').length]).filter(([,n])=>n).map(([top,n])=>({title:'Servers in '+top.split(/[\\/]/).pop(),n}))];   // asked by the window before it quits
function bgRow(t,sel){
  const sv=srvByTask().get(t.id);
  const [a,l]=t.kind==='agent'?['steps','Steps']:t.kind==='monitor'?['out','Events']:['out','Output'];
  const fresh=t.kind==='monitor'&&t.events>(V.seenEv[t.id]||0);
  const sub=t.kind==='agent'?[t.last,t.steps!=null&&plural(t.steps,'step'),t.tokens&&Math.round(t.tokens/1000)+'k tokens'].filter(Boolean).join(' · ')
    :t.last||(t.kind==='monitor'?'No events yet':t.cmd||'');
  return `<div class="tk ${sel?'on':''}" data-task="${esc(t.id)}"><span class="tki ${sv?'server':t.kind}">${svg(sv?'server':BGI[t.kind]||'term')}</span>
    <div class="tk1"><b>${esc(t.name)}</b>${sv?`<span class="who">agent</span>${portsEl(sv.ports)}`:''}${t.sub?`<span class="stt n">${esc(t.sub)}</span>`:''}${fresh?'<span class="stt mo">new event</span>':''}</div>
    <div class="tka">${clockEl(t.start,'go')}<button class="mini" data-bg${a}="${esc(t.id)}">${l}</button><button class="mini stop" data-bgstop="${esc(t.tool||t.id)}" data-tip="Stop it">${svg('stop')}Stop</button></div>
    <div class="tk2 ${t.kind==='agent'?'':'mono'}">${esc(sub)}</div></div>`;
}
function renderTray(){
  const l=bgList(),sv=srvRows(),link=srvByTask(),tr=$('tray'),b=$('bTasks'),h=srvHere(),can=srvCanStart(),any=l.length+sv.length;
  tr.hidden=!any;hMute(b,!any,'Nothing running in the background','Running in the background');$('tkN').textContent=any||'';renderServe();b.classList.toggle('on',V.side==='tasks'&&!V.pv);
  if(V.side==='tasks'&&!any){V.side=null;renderPanel()}
  if(tr.hidden){tr.innerHTML='';return}
  const it=[...sv.map(s=>['server',s.name]),...l.map(t=>[link.has(t.id)?'server':t.kind,t.name])],up=sv.filter(s=>s.state!=='exited').length+l.length;
  const names=it.slice(0,3).map(([k,n])=>`<span class="tkk ${k}">${esc(n)}</span>`).join('')+(it.length>3?`<span class="tkk">+${it.length-3}</span>`:'');
  const ports=[...new Set([...sv.filter(s=>s.state!=='exited'),...link.values()].flatMap(s=>s.ports))];
  tr.classList.toggle('open',V.trayOpen);
  tr.innerHTML=`<div class="tl" data-tray role="button" tabindex="0"><b>${up?up+' running':plural(it.length,'server')+' stopped'}</b>${names}<span class="gap"></span>${portsEl(ports,PHONE?1:3)}${can.length?`<span class="st" data-srvmenu data-tip="Start this folder's servers">${svg('play')}Start</span>`:''}${svg('chev-d')}</div>${V.trayOpen?`<div class="tasks">${sv.map(s=>srvRow(s)).join('')}${l.map(t=>bgRow(t)).join('')}</div>`:''}`;
  hydrate(tr);
  if(V.side==='tasks'&&!V.pv)renderTasks();
}
/* ---------- servers: a dev server and its companions running in the session's folder, whoever started them ---------- */
// Found by the service in the folder the session works in (a worktree is its own); a repo that lists its servers
// (.workwood/servers.json or a Procfile) can also have Workwood start them.
const srvHere=()=>V.isNew||!V.place?.top?null:A.servers?.[V.place.top]||null;
const srvList=()=>srvHere()?.list||[];
const srvByTask=()=>{const m=new Map();for(const s of srvList())if(s.task?.sessionId===V.sel)m.set(s.task.id,s);return m};   // started by this session's agent: shown on its command's row
const srvRows=()=>{const mine=new Set(bgList().map(t=>t.id));return srvList().filter(s=>!(s.task?.sessionId===V.sel&&mine.has(s.task.id)))};
const srvCanStart=()=>{const h=srvHere();if(!h?.conf?.names?.length)return [];const on=new Set(srvList().filter(s=>s.state!=='exited').flatMap(s=>s.lines||[]));return h.conf.names.filter(n=>!on.has(n))};
const portEl=(p,live=true)=>PHONE?`<span class="prt${live?' live':''}">:${p}</span>`:`<a class="prt${live?' live':''}" href="http://localhost:${p}/" target="_blank" rel="noopener" data-tip="Open localhost:${p}">:${p}${svg('ext')}</a>`;
// a few ports, then how many more (one on the phone, where the row is narrow); the tooltip and the side panel list them all
const portsEl=(ps,max=PHONE?1:4)=>ps.slice(0,max).map(p=>portEl(p)).join('')+(ps.length>max?`<span class="prt n" data-tip="${esc(ps.slice(max).map(p=>':'+p).join(' '))}">+${ps.length-max}</span>`:'');
const WHO={workwood:'Workwood',agent:'agent',you:'yours'};
function srvRow(s,sel){
  const gone=s.state==='exited';
  const sub=s.setup?(gone?`Setup failed · code ${s.code}`:'Setting up this worktree…'):gone?`Exited${s.code!=null?' · code '+s.code:''}`:s.cmd;
  return `<div class="tk ${sel?'on':''} ${gone?'gone':''}" data-srv="${esc(s.id)}"><span class="tki server">${svg('server')}</span>
    <div class="tk1"><b>${esc(s.name)}</b><span class="who">${WHO[s.who]}</span>${gone?'':portsEl(s.ports)}</div>
    <div class="tka">${gone?'':clockEl(s.start,'go')}${s.who==='workwood'?`<button class="mini" data-srvout="${esc(s.id)}">Output</button>`:''}<button class="mini stop" data-srvstop="${esc(s.id)}" data-tip="${gone?'Clear it':'Stop it'}">${gone?'Clear':svg('stop')+'Stop'}</button></div>
    <div class="tk2 mono">${esc(sub)}</div>${s.kids?.length?`<div class="kids">${s.kids.map(k=>`<div class="kid"><b>${esc(k.name)}</b>${k.ports.length?k.ports.map(p=>portEl(p,false)).join(''):'<span class="q">no port</span>'}<code>${esc(k.cmd)}</code></div>`).join('')}</div>`:''}</div>`;
}
function srvPlace(m,el){
  m.hidden=false;const r=(el||$('input')).getBoundingClientRect();
  m.style.left=Math.max(6,Math.min(r.right-m.offsetWidth,innerWidth-m.offsetWidth-6))+'px';m.style.top=(r.top<innerHeight/2?r.bottom+6:Math.max(6,r.top-m.offsetHeight-6))+'px';
}
// Start: all the folder's servers that are not running, or one of them.
function srvMenu(el){
  const h=srvHere(),can=srvCanStart(),m=$('srvm');if(!h?.conf)return;closePops();
  if(!can.length){m.innerHTML=`<div class="sfoot">All of them are running.</div>`;return srvPlace(m,el)}
  m.innerHTML=(can.length>1?`<button data-srvgo="">${svg('server')}All<span>${esc(can.join(' · '))}</span></button>`:'')+can.map(n=>`<button data-srvgo="${esc(n)}">${svg('server')}${esc(n)}</button>`).join('')
    +`<hr><div class="sfoot">${h.conf.setup&&!h.conf.done?'Setup runs first, once for this worktree':'From '+esc(h.conf.file)}</div>`;
  srvPlace(m,el);
}
async function srvGo(names){
  const top=V.place?.top;if(!top)return;$('srvm').hidden=true;
  try{await api('servers/start',{top,names:names?.length?names:null,sessionId:V.sel})}catch(e){oops(e.message)}
}
async function srvStop(s,el,sure){
  if(!sure&&s.who!=='workwood'&&s.state!=='exited'){   // not one Workwood started: ask first
    const m=$('srvm');closePops();
    m.innerHTML=`<div class="sq"><b>Stop ${esc(s.name)}?</b><p>It was started ${s.who==='agent'?'by an agent':'in a terminal, outside Workwood'}.${s.kids?.length?` ${esc(s.kids.map(k=>k.name).join(' and '))} stop with it.`:''}</p><div class="qb"><button data-srvno>Cancel</button><button class="y" data-srvyes="${esc(s.id)}">Stop</button></div></div>`;
    return srvPlace(m,el);
  }
  $('srvm').hidden=true;
  try{await api('servers/stop',{top:s.top,id:s.id})}catch(e){oops(e.message)}
}
$('srvm').onclick=e=>{const b=e.target.closest('[data-srvgo],[data-srvyes],[data-srvno]');if(!b)return;const d=b.dataset;
  if('srvgo' in d)srvGo(d.srvgo?[d.srvgo]:null);
  else if(d.srvyes){const s=srvList().find(x=>x.id===d.srvyes);if(s)srvStop(s,null,true)}
  else $('srvm').hidden=true};
// The side panel for a server: what it is, Open and Restart, and its output when Workwood holds it.
function srvInfo(s){
  const by={workwood:'by Workwood',agent:'by an agent',you:'outside Workwood'}[s.who],gone=s.state==='exited';
  $('tkInfo').innerHTML=[`<span>Command</span><code>${esc(s.cmd)}</code>`,`<span>Folder</span><code>${esc(s.top)}</code>`,
    `<span>Started</span><div>${by} · ${clock(new Date(s.start))}${gone?' · ended':' · running '+clockEl(s.start)}</div>`].join('');
  const open=s.ports[0];
  $('tkAct').innerHTML=(open&&!gone&&!PHONE?`<a class="mini" href="http://localhost:${open}/" target="_blank" rel="noopener">${svg('ext')}Open :${open}</a>`:'')+(s.restart?`<button class="mini" data-srvre="${esc(s.id)}">${svg('refresh')}${gone?'Start again':'Restart'}</button>`:'');
  $('tkAct').hidden=!$('tkAct').innerHTML;
  const out=$('tkOut');out.hidden=false;clearTimeout(tkTimer);
  if(s.who!=='workwood'){out.classList.add('none');out.textContent=s.who==='agent'?'Its output goes to the agent\'s command that started it.':'Its output goes to the terminal it was started in.';return}
  out.classList.remove('none');
  const id='s:'+s.id,sid=V.sel;
  const pull=async()=>{if(V.sel!==sid||V.task!==id||V.side!=='tasks')return;
    try{const d=await api(`servers/output?top=${encodeURIComponent(s.top)}&id=${encodeURIComponent(s.id)}`);const end=out.scrollTop+out.clientHeight>=out.scrollHeight-8;
      if(out.textContent!==d.text){out.textContent=d.text||'Nothing printed yet.';if(end)out.scrollTop=out.scrollHeight}}catch{}
    tkTimer=setTimeout(pull,1500)};
  pull();
}
let tkTimer=null;
function renderTasks(){
  const l=bgList(),sv=srvRows(),ids=[...sv.map(s=>'s:'+s.id),...l.map(t=>t.id)];if(!ids.includes(V.task))V.task=ids[0]||null;
  const t=l.find(x=>x.id===V.task);
  $('tkList').innerHTML=sv.map(s=>srvRow(s,'s:'+s.id===V.task)).join('')+l.map(x=>bgRow(x,x.id===V.task)).join('');hydrate($('tkList'));
  const srv=sv.find(s=>'s:'+s.id===V.task);if(srv)return srvInfo(srv);
  $('tkAct').hidden=true;$('tkOut').classList.remove('none');
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
  if(e.target.closest('a.prt'))return;   // a port: opens the page
  const b=e.target.closest('[data-srvmenu],[data-srvout],[data-srvstop],[data-srvre],[data-srv],[data-tray],[data-bgout],[data-bgsteps],[data-bgstop],[data-task]');if(!b)return;const d=b.dataset;
  if('srvmenu' in d){e.stopPropagation();srvMenu(b)}
  else if(d.srvout)openTask('s:'+d.srvout);
  else if(d.srvstop){const s=srvList().find(x=>x.id===d.srvstop);if(s)srvStop(s,b)}
  else if(d.srvre){b.disabled=true;api('servers/restart',{top:V.place?.top,id:d.srvre,sessionId:V.sel}).catch(err=>oops(err.message)).finally(()=>{b.disabled=false})}
  else if(d.srv){if(e.currentTarget.id==='tkList'){V.task='s:'+d.srv;renderTasks()}}
  else if('tray' in d){V.trayOpen=!V.trayOpen;renderTray()}
  else if(d.bgout)openTask(d.bgout);
  else if(d.bgsteps){const t=bgList().find(x=>x.id===d.bgsteps),it=t&&V.items.find(i=>i.kind==='tools'&&i.tools.some(s=>s.id===t.tool));
    if(it){V.openTools.add(it.n);V.shutTools.delete(it.n);renderThread();document.querySelector(`#thread [data-step="${CSS.escape(t.tool)}"]`)?.scrollIntoView({block:'center',behavior:'smooth'})}}
  else if(d.bgstop){b.disabled=true;api(`sessions/${V.sel}/stop-step`,{id:d.bgstop}).catch(err=>{b.disabled=false;oops(err.message)})}
  else if(d.task&&e.currentTarget.id==='tkList'){V.task=d.task;renderTasks()}
}
$('tray').onclick=bgClick;$('tkList').onclick=bgClick;$('tkAct').onclick=bgClick;
$('tray').onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('.tl')){e.preventDefault();e.target.click()}};
$('bTasks').onclick=()=>{if($('bTasks').classList.contains('mute'))return;if(V.side==='tasks'&&!V.pv)V.side=null;else{V.side='tasks';V.pv=null;V.full=false}renderPanel();renderTray()};
$('tkClose').onclick=()=>{V.side=null;renderPanel();renderTray()};
function renderQueue(){renderTray();
  const q=queued(),el=$('queue'),busy=V.run?.status==='working';
  el.hidden=!q.length||!$('qcard').hidden;
  if(el.hidden){el.innerHTML='';return}
  el.innerHTML=`<div class="qh"><span>${busy?(PHONE?'Queued for the end of this step':'Queued: the agent reads '+(q.length>1?'these':'this')+' when its current step ends'):'Waiting to be sent'}</span><span class="gap"></span><span class="hint"><kbd>↑</kbd> to edit</span></div>`
    +q.map(m=>`<div class="qm${m.tmp||V.qNow===m.id?' going':''}" data-q="${esc(m.id)}"><span class="qt">${esc(m.text.replace(/\s+/g,' ').trim()||'Attached files')}</span>${m.files?.length?`<span class="qf">${svg('file')}${m.files.length}</span>`:''}`
      +(m.tmp?'':`<button class="ib" data-qedit data-tip="Take it back to change it" data-i="pencil"></button><button class="qnow" data-qnow data-tip="${busy?'Send this now: a command it waits on goes on in the background, anything else is cut short':'Send this now'}">Send now</button>`)+'</div>').join('');
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
  if(!V.isNew&&/^\/handoff(\s|$)/.test(text.trim())){   // Workwood's own command: hand off, with what follows as the new session's first message
    if(attachments?.length){oops('Send the files in the new session, after the handoff.');return false}
    if(isWorking()){oops('Hand off once the turn is over.');return false}
    return handOff(text.trim().slice(8).trim());
  }
  if(!V.isNew&&text.trim()==='/rewind'&&!attachments?.length){openPick();return true}
  {const m=/^\/serve(?:\s+(.+))?$/.exec(text.trim());if(!V.isNew&&m&&srvHere()?.conf&&!attachments?.length){srvGo(m[1]?m[1].split(/[\s,]+/):null);return true}}
  if(V.handing&&!V.isNew){oops('The handoff is being written; the conversation goes on in the new session.');return false}
  if(V.focus)V.focus=null;
  if(V.busy)return false;V.busy=true;oops('');
  {const p=profile(asProfile||curProfile());clearTimeout(limT);limT=null;V.limBase=p&&p.h5!=null?{name:p.name,h5:p.h5,d7:p.d7}:null}
  const later=isWorking()&&V.run?.status==='working';   // the agent is busy: it waits in the queue, where it can still be changed
  const tmp=later?{id:'tmp'+(++qSeq),text,files:(attachments||[]).map(a=>a.name),tmp:true}:null;
  if(later){V.qLocal.push(tmp);renderQueue()}
  else V.pend={text,files:(attachments||[]).filter(a=>!(PICS.includes(a.type)&&a.data)).map(a=>a.name),pics:(attachments||[]).filter(a=>PICS.includes(a.type)&&a.data).map(a=>({url:`data:${a.type};base64,${a.data}`,name:a.path?a.name:null})),need:(V.isNew?0:V.items.filter(it=>it.kind==='user').length)+1+(V.pend&&!V.isNew?1:0)};resetJump();render();toBottom(true);
  try{
    if(V.isNew){
      if(!V.project){oops('Pick a project first.');return false}
      $('hello').textContent='Starting…';
      const r=await api('sessions',{cwd:V.project,profile:V.profile,text,attachments,model:curModel(),effort:curEffort(),mode:V.pick.new?.mode||undefined});
      if(V.pick.new){V.pick[r.sessionId]=V.pick.new;delete V.pick.new}
      await openSession(r.sessionId,true);
    }else{
      V.dismissed=null;if(V.rewound){V.rewound=null;renderStrip()}   // the strip goes at your next message, and so does Undo
      if(asProfile)V.pick[V.sel]={...V.pick[V.sel],profile:asProfile};   // continued on another profile: it is this conversation's profile from now on, over one picked before
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

/* ---------- home: where you left off ---------- */
// Shown in place of an empty new session: the message box stays under it, so starting new work is still one step.
// Three views of the same things: what to pick up, each project, and when you worked.
const H={seen:new Set(),d:null,act:null,fresh:false,view:(v=>v==='week'?'time':v)(localStorage.getItem('ww.home')||'pick'),busy:false,again:false,sig:'',actAt:0,actBusy:false};
const HVIEWS=[['pick','Pick up','Where each piece of work was left'],['projects','Projects','Each project at a glance'],['time','Time','When you worked: a day, a week or 30 days'],['wall','Wall','The background and what’s running, to watch from']];
const wallOn=()=>localStorage.getItem('ww.wall')!=='off'&&!PHONE;
const homeViews=()=>HVIEWS.filter(v=>v[0]!=='wall'||wallOn());
const inWall=()=>isHome()&&H.view==='wall'&&wallOn();
// Starting something from the Wall stays on the Wall: the message box slides up from the bottom, over the sky.
// Esc, or a click on the open sky, puts it away again (what you wrote is kept as the new session's draft).
function startNew(project){newSession(project);if(inWall()){H.wc=true;renderHome();$('input').focus()}}
function wallComposeOff(){if(!H.wc)return;H.wc=false;keepDraft();$('input').blur();renderHome()}
document.addEventListener('keydown',e=>{if(e.key!=='Escape'||!H.wc||!inWall()||document.querySelector('.pop:not([hidden])')||!$('slash').hidden||!$('sdim').hidden||!$('dim').hidden||(R&&!R.done))return;
  e.stopPropagation();wallComposeOff()},true);
$('main').addEventListener('pointerdown',e=>{if(H.wc&&inWall()&&!e.target.closest('.composer,button,a,input,#skypop,.pop,.star,[data-nid],[data-tip]'))wallComposeOff()});
// the Wall's clock: while all is quiet (the default), always, or never
const wallClk=()=>({always:'always',never:'never'})[localStorage.getItem('ww.wallclock')]||'quiet';
// What Home showed last time, so it opens with that instead of empty boxes; fresh readings replace it in place.
// Only the very first opening, with nothing remembered, draws skeletons.
const HCACHE='ww.homeCache';
try{const c=JSON.parse(localStorage.getItem(HCACHE)||'null');if(c){H.d=c.d||null;H.act=c.act||null}}catch{}
function saveHome(){try{localStorage.setItem(HCACHE,JSON.stringify({d:H.d,act:H.act}))}catch{}}
const skl=(w,c='')=>`<span class="sk ${c}" style="width:${w}"></span>`;
const isHome=()=>V.isNew&&!V.pend&&A.ready&&A.sessions.length>0;
async function loadHome(){
  if(H.busy){H.again=true;return}H.busy=true;
  try{H.d=await api('home');H.fresh=true;saveHome()}catch{}
  H.busy=false;if(H.again){H.again=false;return loadHome()}
  renderHome();
}
async function loadActivity(force){
  if(H.actBusy||(!force&&H.act&&Date.now()-H.actAt<300000))return;H.actBusy=true;
  try{H.act=await api('home/activity');H.actAt=Date.now();saveHome()}catch{}
  H.actBusy=false;renderHome();
}
// It follows what changes while you look at it: a session's state or time, a profile's reading.
const homeSig=()=>A.sessions.map(s=>s.id+s.mts+s.status+(s.unread?1:0)).join()+A.profiles.map(p=>p.name+p.at+p.h5+p.d7+(p.reading?1:0)).join();
let homeT=null;
function homeSoon(){if(!isHome())return;const g=homeSig();if(g===H.sig&&H.d)return;H.sig=g;clearTimeout(homeT);homeT=setTimeout(()=>{loadHome();loadActivity()},H.fresh?2500:0)}
const homeUrl=f=>`${A.preview}/${f.sessionId}/${f.path.split(/[\\/]/).filter(Boolean).map(encodeURIComponent).join('/')}?v=${f.v}`;
const dayStart=(back=0)=>{const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-back);return d.getTime()/1000};
const dayName=ts=>new Date(ts*1000).toLocaleDateString([],{weekday:'short',day:'numeric',month:'short'});
const hsec=(k,title,right,body)=>[k,`<section class="hs hs-${k}"><h4><span>${title}</span><span class="gap"></span>${right||''}</h4>${body}</section>`];
// Waiting for you first, then the newest.
const pickups=n=>A.sessions.filter(s=>!s.done).sort((a,b)=>(b.status==='wait')-(a.status==='wait')||b.mts-a.mts).slice(0,n);
// What you asked for says what the work is; a question it is waiting on comes first.
function leftCard(s){
  const w=H.d?.words?.[s.id],say=w?.ask||w?.first||w?.text||(s.status==='work'?s.line:'');
  const chip=s.status==='wait'?`<span class="hchip w">${esc(askLabel(s.line))}</span>`:s.status==='work'?`<span class="hchip"><i class="spin"></i>Working</span>`:s.unread?'<span class="hchip">New</span>':'';
  return `<button class="hcard ${s.status==='wait'?'waits':''}" data-sid="${s.id}"><span class="hct">${tile(s.project,'s')}</span><b>${esc(s.title)}</b></span><p>${say?esc(say):H.d?'<em>No reply yet</em>':skl('94%','ln')+skl('86%','ln')+skl('52%','ln')}</p><span class="hcf">${chip}<span class="hpl">${esc(s.branch||s.project)}</span><time>${ago(s.mts)}</time></span></button>`;
}
const leftOff=()=>{const l=pickups(3);return l.length?hsec('left','Left off','',`<div class="hcards">${l.map(leftCard).join('')}</div>`):null};

// Profiles, as the Claudius dashboard draws them: one big number per window, a bar for what is used over a bar for
// how far the window has run, the rate it is used at, and when that rate would reach the limit.
const spark=(pts,from,to)=>{if(!pts||pts.length<2||to<=from)return '<svg class="spk" viewBox="0 0 60 18"></svg>';
  const x=t=>1+Math.min(1,Math.max(0,(t-from)/(to-from)))*58,y=v=>17-Math.min(100,Math.max(0,v))*.16;
  return `<svg class="spk" viewBox="0 0 60 18" preserveAspectRatio="none"><polyline points="${pts.map(([t,v])=>x(t).toFixed(1)+','+y(v).toFixed(1)).join(' ')}"/></svg>`};
function winBlock(p,k,tr){
  const v=p[k],[len,rk]=WIN[k],r=p[rk],now=Date.now()/1000,run=r?Math.min(100,Math.max(0,(1-(r-now)/len)*100)):null,h=k==='h5';
  const rate=tr?.[h?'rate5':'rate7'],eta=tr?.[h?'eta5':'eta7'],pts=tr?.[h?'s5':'s7'];
  const when=eta?(h?clock(eta*1000):new Date(eta*1000).toLocaleDateString([],{weekday:'short'})+' '+clock(eta*1000)):'';
  return `<div class="pw ${lvl(v??0)}"><div class="pwt"><span class="pwl">${h?'5<small>h</small>':'7<small>d</small>'}</span><span class="pwv">${v??'–'}<small>%</small></span><span class="pwr" ${r?`data-tip="${v>=100?'Clears':'Resets'} ${fullAt(r)}"`:''}>${r?`<small>resets in</small>${until(r)}`:''}</span></div>
    <div class="pwb" data-tip="${v??0}% used"><i style="width:${Math.min(100,v||0)}%"></i></div><div class="pwb t" data-tip="${run==null?'':Math.round(run)+'% of the window has run'}"><i style="width:${run??0}%"></i></div>
    <div class="pwf"><span>${rate!=null?(rate>0?'+':'')+rate.toFixed(1)+'%/h':H.d?'no rate yet':skl('52px','ln')}</span>${spark(pts,r?r-len:now-len,r||now)}<span class="gap"></span>${when?`<span class="eta" data-tip="At this rate the ${h?'5-hour':'7-day'} limit is reached then, before it resets">${svg('flag')}${esc(when)}</span>`:''}</div></div>`;
}
function profCard(p,tr){
  const full=Math.max(p.h5||0,p.d7||0)>=100,which=(p.d7||0)>=100?'d7':'h5',rs=p[WIN[which][1]],why=p.failed&&WHY[p.failed];
  const read=p.reading?'<i class="spin"></i>Reading…':why?esc(why)+(p.at?' '+ago(p.at):''):p.at?(ago(p.at)==='now'?'Read just now':`Read ${ago(p.at)} ago`):'Not read yet';
  return `<div class="pcard ${full?'full':''}" data-prof="${esc(p.name)}" data-tip="Settings for ${esc(p.name)}">
    <div class="pch"><b>${esc(p.name)}</b>${p.name===A.next&&!full?'<span class="hchip">Most room</span>':''}</div>
    <div class="pcs">${esc([p.email,p.org].filter(Boolean).join(' · '))||'&nbsp;'}</div>
    ${full?`<div class="pblk"><small>${which==='h5'?'5-hour':'7-day'} limit reached</small><b>${rs?until(rs):'–'}</b><span>until it clears${which==='h5'&&p.d7!=null?` · 7d at ${p.d7}%`:''}</span></div>`:`<div class="pws">${winBlock(p,'h5',tr)}${winBlock(p,'d7',tr)}</div>`}
    <div class="pcf">${read}</div></div>`;
}
const limits=()=>{if(!A.profiles.length)return null;const tr=new Map((H.d?.trends||[]).map(t=>[t.name,t])),busy=A.profiles.some(p=>p.reading);
  return hsec('lim','Limits',`<button class="ib hrf ${busy?'busy':''}" data-limrefresh data-tip="Read every profile's limits again. Nothing is sent to Claude.">${svg('refresh')}</button>`,`<div class="pcards n${Math.min(A.profiles.length,3)}">${A.profiles.map(p=>profCard(p,tr.get(p.name))).join('')}</div>`)};

const where=u=>u.worktree?`${svg('tree')}${esc(u.worktree)}`:u.branch?`${svg('branch')}${esc(u.branch)}`:'';
const notCommitted=()=>{const l=H.d?.uncommitted||[];
  if(!H.d)return hsec('unc','Not committed','',`<div class="hrows">${[0,1].map(()=>`<div class="hrow">${skl('18px','sq')}${skl('90px','ln')}<span class="gap"></span>${skl('120px','ln')}</div>`).join('')}</div>`);
  if(!l.length)return null;
  return hsec('unc','Not committed','',`<div class="hrows">${l.map(u=>`<button class="hrow" data-ch="${u.sessionId}" data-tip="${esc(short(u.cwd))}">${tile(u.project,'s')}</span><b>${esc(u.project)}</b><span class="hbr">${where(u)}</span><span class="gap"></span><span class="hn">${plural(u.count,'file')} · <i>+${u.add}</i> <u>−${u.del}</u></span><time>${ago(u.mts)}</time></button>`).join('')}</div>`)};
const madeLately=()=>{const l=H.d?.made||[];if(!A.preview)return null;
  if(!H.d)return hsec('made','Made lately','',`<div class="hshots">${[0,1,2,3].map(()=>`<div class="hc hshot"><span class="ht">${skl('100%','fill')}</span><span class="cap">${skl('60%','ln')}</span></div>`).join('')}</div>`);
  if(!l.length)return null;
  return hsec('made','Made lately','',`<div class="hshots">${l.slice(0,8).map(f=>{const s=A.sessions.find(x=>x.id===f.sessionId);
    return `<button class="hc hshot" data-made="${esc(f.path)}" data-sid="${f.sessionId}" data-tip-path="${esc(f.path)}"><span class="ht k-${f.kind}">${H.fresh?thumb(f,homeUrl(f)):''}</span><span class="cap"><b>${esc(f.name)}</b><span>${esc(s?.title||'')}</span></span></button>`}).join('')}</div>`)};

function perDay(turns,days,back=0){const base=dayStart(days-1+back),out=new Array(days).fill(0);for(const t of turns){const i=Math.floor((t-base)/86400);if(i>=0&&i<days)out[i]++}return out}
// Projects: each one worked on this month, newest first, with where its latest session was left.
function projectsView(){
  const now=Date.now()/1000,by=new Map();
  for(const s of [...A.sessions].sort((a,b)=>b.mts-a.mts)){const k=s.root||s.cwd;if(now-s.mts>30*86400)continue;if(!by.has(k))by.set(k,{root:k,name:s.project,list:[]});by.get(k).list.push(s)}
  const act=new Map((H.act?.projects||[]).map(p=>[p.root,p]));
  const cards=[...by.values()].slice(0,12).map(g=>{const s=g.list[0],w=H.d?.words?.[s.id],open=g.list.filter(x=>!x.done).length,ask=g.list.some(x=>x.status==='wait');
    const unc=(H.d?.uncommitted||[]).filter(u=>u.root===g.root),files=unc.reduce((n,u)=>n+u.count,0),d=act.has(g.root)?perDay(act.get(g.root).turns,14):null,mx=Math.max(1,...(d||[0]));
    return `<div class="pj ${ask?'waits':''}" data-sid="${s.id}"><div class="pjt">${tile(g.name)}</span><span class="pjn"><b>${esc(g.name)}</b><small>${open?plural(open,'open session'):'nothing open'}</small></span><span class="gap"></span><button class="ib" data-pnew="${esc(g.root)}" data-tip="New session in ${esc(g.name)}">${svg('plus')}</button></div>
      <div class="pjl"><b>${esc(s.title)}</b><time>${ago(s.mts)}</time></div><p>${esc(w?.ask||w?.text||'')}</p>
      <div class="pjm">${s.branch?`<span>${svg('branch')}${esc(s.branch)}</span>`:''}${files?`<span class="w">${plural(files,'file')} not committed</span>`:''}<span class="gap"></span>${d?`<span class="bars" data-tip="${plural(d.reduce((a,b)=>a+b,0),'message')} in the last 2 weeks">${d.map(n=>`<i style="height:${n?3+Math.round(n/mx*17):1}px" class="${n?'':'z'}"></i>`).join('')}</span>`:''}</div></div>`}).join('');
  return [['projects',`<section class="hs"><div class="pjs">${cards}<button class="pj add" data-pnew="">${svg('plus')}<span>New session somewhere else</span></button></div></section>`]];
}

// Time: when you worked, as a day, a week or the last 30 days, in rows per project or per profile. A day and a week
// show each stretch of work; 30 days is a heatmap of the messages you wrote. A click on a day opens that day.
const TV={scale:localStorage.getItem('ww.tscale')||'week',by:localStorage.getItem('ww.tby')||'projects',back:0};
const TSCALES=[['day','Day'],['week','Week'],['30','30 days']],TMAX={day:29,week:3,30:0};
function trange(){const b=TV.back;
  if(TV.scale==='day')return {s:dayStart(b),e:dayStart(b-1),label:b===0?'Today':b===1?'Yesterday':dayName(dayStart(b))};
  if(TV.scale==='week'){const s=dayStart(6+7*b),e=dayStart(7*b-1);return {s,e,label:b===0?'Last 7 days':`${dayName(s)} – ${dayName(e-1)}`}}
  return {s:dayStart(29),e:dayStart(-1),label:'Last 30 days'};
}
const daysBack=t=>Math.round((dayStart(0)-new Date(t*1000).setHours(0,0,0,0)/1000)/86400);
const tclip=(b,r)=>Math.max(0,Math.min(b[1],r.e)-Math.max(b[0],r.s));
function timeView(){
  const a=H.act,r=trange(),now=Date.now()/1000,span=r.e-r.s,profs=A.profiles.length>1;
  const by=profs?TV.by:'projects';
  const rows=(a?.[by]||[]).map(p=>({...p,b:p.blocks.filter(b=>tclip(b,r)>0),t:p.turns.filter(t=>t>=r.s&&t<r.e)}))
    .map(p=>({...p,secs:p.b.reduce((n,b)=>n+tclip(b,r),0)})).filter(p=>p.b.length||p.t.length).sort((x,y)=>y.secs-x.secs||y.t.length-x.t.length).slice(0,8);
  // the numbers
  const secs=rows.reduce((n,p)=>n+p.secs,0),msgs=rows.reduce((n,p)=>n+p.t.length,0),all=rows.flatMap(p=>p.b);
  const perDayS=new Map();for(const p of rows)for(const b of p.b){const k=new Date(Math.max(b[0],r.s)*1000);k.setHours(0,0,0,0);const ks=k.getTime()/1000;perDayS.set(ks,(perDayS.get(ks)||0)+tclip(b,r))}
  const best=[...perDayS].sort((x,y)=>y[1]-x[1])[0];
  const hrs=v=>(v/3600).toFixed(v<36000?1:0);
  const stat=(v,l,c='')=>`<div class="hstat ${c}"><b>${a?esc(String(v)):skl('56px','num')}</b><span>${l}</span></div>`;
  const stats=TV.scale==='day'
    ?[stat(hrs(secs),'hours of work'),stat(msgs,msgs===1?'message':'messages'),stat(all.length,all.length===1?'stretch':'stretches'),stat(all.length?clock(Math.min(...all.map(b=>b[0]))*1000)+'–'+clock(Math.min(r.e,Math.max(...all.map(b=>b[1])))*1000):'–','first to last','rng')]
    :[stat(hrs(secs),'hours of work'),stat(msgs,msgs===1?'message':'messages'),stat(perDayS.size,perDayS.size===1?'day worked':'days worked'),stat(best?dayName(best[0]):'–','busiest day')];
  // the bar above: scale, back and forth, and what the rows are
  const max=TMAX[TV.scale];
  const bar=`<div class="ttb"><div class="dseg">${TSCALES.map(([k,n])=>`<button class="${TV.scale===k?'on':''}" data-tscale="${k}">${n}</button>`).join('')}</div>
    ${max?`<span class="tnav"><button class="ib" data-tstep="1" ${TV.back>=max?'disabled':''} data-tip="Earlier">${svg('chevL')}</button><button class="ib" data-tstep="-1" ${TV.back<=0?'disabled':''} data-tip="Later">${svg('chevR')}</button></span>`:''}
    <b class="tlbl">${esc(r.label)}</b><span class="gap"></span>
    ${profs?`<div class="dseg">${[['projects','Projects'],['profiles','Profiles']].map(([k,n])=>`<button class="${by===k?'on':''}" data-tby="${k}">${n}</button>`).join('')}</div>`:''}</div>`;
  const name=p=>`<span class="hpn">${tile(p.name,'s')}</span>${esc(p.name)}</span>`;
  let body;
  if(!a){   // the first time, before any history has been read: the rows' shape, shimmering
    body=TV.scale==='30'?`<div class="heat">${[0,1,2].map(()=>`<span class="hpn">${skl('70%','ln')}</span>`+'<i class="c sk"></i>'.repeat(30)).join('')}</div>`
      :`<div class="lanes">${[0,1,2].map(i=>`<div class="lane"><span class="hpn">${skl('70%','ln')}</span><span class="ltrk"><span class="sk bar" style="left:${8+i*21}%;width:${18+i*9}%"></span></span></div>`).join('')}</div>`;
  }else if(!rows.length)body=`<div class="hwait">Nothing ${TV.scale==='day'?'on this day':TV.scale==='week'?'in these 7 days':'in the last 30 days'}.</div>`;
  else if(TV.scale==='30'){
    const ds=rows.map(p=>({...p,days:perDay(p.t,30)})),mx=Math.max(1,...ds.flatMap(p=>p.days)),lv=n=>n?Math.max(1,Math.ceil(n/mx*4)):0;
    body=`<div class="heat">${ds.map(p=>name(p)+p.days.map((n,i)=>`<i class="c l${lv(n)}" data-tday="${29-i}" data-tip="${esc(p.name)} · ${dayName(dayStart(29-i))} · ${n?plural(n,'message'):'nothing'}"></i>`).join('')).join('')}
      <span></span><span class="hax">30 days ago</span><span class="hax r">Today</span></div>`;
  }else{
    const pos=t=>((t-r.s)/span*100).toFixed(2)+'%';
    const ticks=TV.scale==='day'?[0,3,6,9,12,15,18,21].map(h=>[r.s+h*3600,String(h).padStart(2,'0')+':00',null])
      :[...Array(7)].map((_,i)=>{const d=dayStart(6+7*TV.back-i);return [d,new Date(d*1000).toLocaleDateString([],{weekday:'short'}),6+7*TV.back-i]});
    body=`<div class="lanes">${rows.map(p=>`<div class="lane">${name(p)}<span class="ltrk" style="--h:${hueOf(p.name)}">${ticks.map(t=>`<u style="left:${pos(t[0])}"></u>`).join('')}${p.b.map(b=>{const s0=Math.max(b[0],r.s),s1=Math.min(b[1],r.e);
        return `<b style="left:${pos(s0)};width:max(3px,${((s1-s0)/span*100).toFixed(2)}%)" ${TV.scale==='week'?`data-tday="${daysBack(s0)}"`:''} data-tip="${esc(p.name)} · ${esc(new Date(s0*1000).toLocaleDateString([],{weekday:'short'}))} ${clock(s0*1000)}–${clock(s1*1000)}${b[2]?' · '+plural(b[2],'message'):''}"></b>`}).join('')}${now>r.s&&now<r.e?`<s style="left:${pos(now)}"></s>`:''}</span></div>`).join('')}
      <div class="lane days"><span></span><span class="ltrk">${ticks.map(t=>`<em style="left:${TV.scale==='day'?pos(t[0]):`calc(${pos(t[0])} + ${(50/7).toFixed(2)}%)`}" ${t[2]!=null?`data-tday="${t[2]}" class="z"`:''}>${t[1]}</em>`).join('')}</span></div></div>`;
  }
  const leg=TV.scale==='30'&&a&&rows.length?`<span class="hleg">Less${[0,1,2,3,4].map(i=>`<i class="c l${i}"></i>`).join('')}More</span>`:'';
  return [['tbar',`<section class="hs">${bar}</section>`],['tstats',`<section class="hs"><div class="hstats">${stats.join('')}</div></section>`],hsec('tbody',TV.scale==='30'?'Messages per day':'Stretches of work',leg,body)];
}
function renderHome(){
  const on=isHome(),d=$('dash');
  d.hidden=!on;$('dseg').hidden=$('hset').hidden=!on;$('main').classList.toggle('home',on);$('main').classList.toggle('wall',on&&H.view==='wall'&&wallOn());if(!inWall())H.wc=false;$('main').classList.toggle('wc',!!H.wc);renderHomeBg();
  renderNow();skyPaint();
  if(!on)return;
  if(H.view==='wall'&&!wallOn())H.view='pick';
  $('dseg').innerHTML=homeViews().map(([k,n,t])=>`<button class="${H.view===k?'on':''}" data-hv="${k}" data-tip="${t}">${n}</button>`).join('');
  const parts=PHONE?[pcLine(),leftOff(),limits()].filter(Boolean):H.view==='wall'?[]:H.view==='projects'?projectsView():H.view==='time'?timeView():[leftOff(),limits(),notCommitted(),madeLately()].filter(Boolean);
  patch(d,parts.map(([k,h])=>[H.view+':'+k,h]));fitThumbs();
  // A section fades in when it first appears, not each time a reading redraws it.
  for(const el of d.children){if(H.seen.has(el.dataset.k))el.style.animation='none';H.seen.add(el.dataset.k)}
}
$('dseg').onclick=e=>{const b=e.target.closest('[data-hv]');if(!b)return;H.view=b.dataset.hv;localStorage.setItem('ww.home',H.view);hideTip();renderHome();$('scroll').scrollTop=0};
$('dash').onclick=async e=>{
  const t=e.target;
  const pn=t.closest('[data-pnew]');if(pn){e.stopPropagation();hideTip();if(pn.dataset.pnew)newSession(pn.dataset.pnew);else{newSession();$('pProject').click()}return}
  const tsc=t.closest('[data-tscale]');if(tsc){TV.scale=tsc.dataset.tscale;TV.back=0;localStorage.setItem('ww.tscale',TV.scale);hideTip();renderHome();return}
  const tby=t.closest('[data-tby]');if(tby){TV.by=tby.dataset.tby;localStorage.setItem('ww.tby',TV.by);hideTip();renderHome();return}
  const tst=t.closest('[data-tstep]');if(tst){TV.back=Math.max(0,Math.min(TMAX[TV.scale],TV.back+ +tst.dataset.tstep));renderHome();return}
  const td=t.closest('[data-tday]');if(td){TV.scale='day';TV.back=+td.dataset.tday;hideTip();renderHome();return}
  if(t.closest('[data-limrefresh]')){api('limits/refresh',{}).catch(err=>oops(err.message));A.profiles.forEach(p=>p.reading=true);renderHome();return}
  const pr=t.closest('[data-prof]');if(pr){if(PHONE)return;hideTip();openSettings(STABS.indexOf('Profiles'),pr.dataset.prof);return}
  const m=t.closest('[data-made]');if(m){hideTip();await openSession(m.dataset.sid);if(V.sel===m.dataset.sid&&V.work.some(f=>f.path===m.dataset.made))showWork(m.dataset.made,true);return}
  const c=t.closest('[data-ch]');if(c){hideTip();await openSession(c.dataset.ch);if(V.sel===c.dataset.ch){V.side='changes';V.pv=null;renderPanel();loadChanges()}return}
  const s=t.closest('[data-sid]');if(s){hideTip();openSession(s.dataset.sid)}
};
new ResizeObserver(fitThumbs).observe($('dash'));

// Backgrounds: one for Home, one behind a session, one behind the sidebar, each chosen under Settings, Look and kept in
// this window. The moving kinds are slow fields in the projects' colours; the calm ones are made for reading. Motion says
// when a background may move (always, only while an agent works, never) and Warn at limits adds a glow near a limit —
// two settings, so any mix works: still with a glow, moving only while working with none, and so on.
const BG=[['aurora','Aurora'],['caustics','Caustics'],['orbits','Orbits'],['constel','Constellation'],['paper','Paper'],['dusk','Dusk'],['edges','Edges'],['lines','Lines'],['none','None']];
const BGMOVE=['aurora','caustics','orbits','constel'],BGCALM=['paper','dusk','edges','lines'],BGSTILL=['paper','lines','none'];
const BGDEF={home:{kind:'aurora',motion:'always',limits:true},session:{kind:'none',motion:'working',limits:true},side:{kind:'none',motion:'working',limits:false}};
const BGPLACES=[['home','Home'],['session','Sessions'],['side','Sidebar']];
// The Home background's old keys carry over once.
{const o=localStorage.getItem('ww.hbg');if(o!=null&&localStorage.getItem('ww.bg.home')==null)localStorage.setItem('ww.bg.home',o);
 if(localStorage.getItem('ww.hlive')==='off'&&localStorage.getItem('ww.limits.home')==null)localStorage.setItem('ww.limits.home','off');
 localStorage.removeItem('ww.hbg');localStorage.removeItem('ww.hlive')}
function bgOf(place){
  const d=BGDEF[place],k=localStorage.getItem('ww.bg.'+place),m=localStorage.getItem('ww.motion.'+place),l=localStorage.getItem('ww.limits.'+place);
  const kind=BG.some(x=>x[0]===k)&&!(k==='constel'&&place!=='home')?k:d.kind;   // the constellation maps the inbox: Home only
  return {kind,motion:['always','working','never'].includes(m)?m:d.motion,limits:l==null?d.limits:l==='on'};
}
const setBg=(place,what,v)=>{localStorage.setItem(`ww.${what}.${place}`,v);renderBgs()};
const seeded=seed=>{let s=seed>>>0||1;return ()=>(s=(s*1664525+1013904223)>>>0)/4294967296};
const inbox=()=>A.sessions.filter(s=>!s.done).sort((a,b)=>b.mts-a.mts);
// Home and the sidebar take the colours of the newest sessions' projects, up to three, as their tiles show them.
function hbgHues(){
  const hs=[];for(const s of inbox()){const h=hueOf(s.project);if(!hs.includes(h))hs.push(h);if(hs.length===3)break}
  if(!hs.length)hs.push(168);while(hs.length<3)hs.push((hs[hs.length-1]+50)%360);return hs;
}
const bgHues=(place,s)=>{if(place!=='session'||!s)return hbgHues();const h=hueOf(s.project);return [h,(h+40)%360,(h+320)%360]};
function hbgHTML(kind){
  if(kind==='aurora')return '<span class="fld blob b1"></span><span class="fld blob b2"></span><span class="fld blob b3"></span>';
  if(kind==='caustics')return '<span class="fld caustic c1"></span><span class="fld caustic c2"></span><span class="fld caustic c3"></span>';
  if(kind==='orbits')return '<span class="fld tone"></span><span class="fld orbits"><i style="--h:var(--h1)"></i><i style="--h:var(--h2)"></i><i style="--h:var(--h3)"></i></span>';
  if(kind==='paper')return '<span class="fld paper"></span><span class="fld fibre"></span>';
  if(kind==='dusk')return '<span class="fld dusk"></span>';
  if(kind==='edges')return '<span class="fld edges"></span>';
  if(kind==='lines')return '<span class="fld lines"></span>';
  return '';
}

/* ---- the constellation: each project a figure, its recent sessions the stars ----
   One SVG, 1000 units high and as wide as its box, so stars stay round, lines meet them and nothing is cropped; the
   Settings tile is the same drawing, smaller. A project keeps a slot in the sky; a session's place in its figure comes
   from its id, and the oldest are placed first, so a new session only adds a star. */
const SLOTS=[[.17,.27],[.82,.25],[.55,.66],[.2,.76],[.84,.77],[.5,.2]];
// The page's sky keeps one scale at any window size (a unit is 0.54px, as the round-41 drawing); the Settings tile
// fits the same sky into its box and draws stars and lines larger (z), so they still read at that size.
const skyDims=(box,tile)=>{const w=Math.max(1,box.clientWidth),h=Math.max(1,box.clientHeight);
  return tile?{W:Math.round(1000*w/h),H:1000,z:5}:{W:Math.round(w/.54),H:Math.round(h/.54),z:1}};
function skyFigures(list,W,H){
  const byP=new Map();list.forEach((s,rank)=>{if(!byP.has(s.project))byP.set(s.project,[]);byP.get(s.project).push({s,rank})});
  const used=new Set(),figs=[];
  for(const [p,ss] of [...byP].slice(0,SLOTS.length)){
    let i=hueOf(p)%SLOTS.length;while(used.has(i))i=(i+1)%SLOTS.length;used.add(i);
    const cx=SLOTS[i][0]*W,cy=SLOTS[i][1]*H,pts=[];
    for(const {s,rank} of ss.slice(0,7).sort((a,b)=>b.rank-a.rank)){
      const r=seeded(hueOf(s.id)*7919+s.id.length);let x,y,n=0;
      do{const a=r()*Math.PI*2,d=(pts.length?55:0)+r()*130;x=Math.max(60,Math.min(W-60,cx+Math.cos(a)*d*1.25));y=Math.max(60,Math.min(H-90,cy+Math.sin(a)*d*.8));n++}
      while(n<30&&pts.some(q=>Math.hypot(q.x-x,q.y-y)<70));
      pts.push({x,y,s,rad:rank<3?5:rank<8?3.8:2.8,old:rank>=8});
    }
    // a minimum spanning tree: each star joins the nearest one already in the figure, as star charts draw them
    const edges=[],inT=[pts[0]],out=pts.slice(1);
    while(out.length){let b=null;for(const a of inT)for(const c of out){const d=Math.hypot(a.x-c.x,a.y-c.y);if(!b||d<b[2])b=[a,c,d]}edges.push(b);inT.push(b[1]);out.splice(out.indexOf(b[1]),1)}
    figs.push({p,h:hueOf(p),pts,edges});
  }
  return figs;
}
function skyFar(W,H,z){const r=seeded(4242),n=Math.round(170*W*H/1.6e6);let s='';
  for(let i=0;i<n;i++){const x=r()*W,y=r()*H,rad=(.6+r()*r()*1.6)*Math.min(z,2.5),tw=r()<.35;
    s+=`<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${rad.toFixed(2)}" ${tw?`class="tw" style="--d:${(3+r()*5).toFixed(1)}s;animation-delay:-${(r()*8).toFixed(1)}s"`:`opacity="${(.25+r()*.5).toFixed(2)}"`}/>`}
  return s}
const skyList=()=>inbox().slice(0,30);
function skySVG(list,{W,H,z},born){
  const f1=n=>n.toFixed(1),isNew=id=>born?.has(id);
  const figs=skyFigures(list,W,H).map(f=>{
    const lines=f.edges.map(([a,b])=>{const d=Math.hypot(b.x-a.x,b.y-a.y),ux=(b.x-a.x)/d,uy=(b.y-a.y)/d,g1=(a.rad+7)*z,g2=(b.rad+7)*z;
      const pth=`M${f1(a.x+ux*g1)} ${f1(a.y+uy*g1)}L${f1(b.x-ux*g2)} ${f1(b.y-uy*g2)}`;
      return `<path class="ln${isNew(a.s.id)||isNew(b.s.id)?' draw':''}" pathLength="100" d="${pth}"/><path class="run" pathLength="100" style="animation-delay:-${(seeded(hueOf(a.s.id+b.s.id))()*2.6).toFixed(2)}s" d="${pth}"/>`}).join('');
    const stars=f.pts.map(p=>`<g class="star${isNew(p.s.id)?' born':''}" data-id="${esc(p.s.id)}"><circle class="halo" cx="${f1(p.x)}" cy="${f1(p.y)}" r="${f1(p.rad*2.8*z)}"/><circle class="ring" style="--r0:${(p.rad+2)*z}px" cx="${f1(p.x)}" cy="${f1(p.y)}" r="${(p.rad+2)*z}"/><circle class="st${p.old?' old':''}" cx="${f1(p.x)}" cy="${f1(p.y)}" r="${p.rad*z}"/></g>`).join('');
    const lx=Math.max(30,Math.min(W-220,Math.min(...f.pts.map(p=>p.x)))),ly=Math.min(H-30,Math.max(...f.pts.map(p=>p.y))+40);
    return `<g class="fig" data-p="${esc(f.p)}" style="--h:${f.h}">${lines}${stars}<text class="lab" x="${lx.toFixed(0)}" y="${ly.toFixed(0)}">${esc(f.p)}</text></g>`;
  }).join('');
  return `<svg class="sky" viewBox="0 0 ${W} ${H}" style="--z:${z}"><defs><linearGradient id="mtr" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs><g class="rot"><g class="far">${skyFar(W,H,z)}</g>${figs}<g class="fx"></g></g></svg>`;
}
// Working state only changes classes, so the sky never restarts: a working star pulses and light runs along its figure.
function skyMark(el){
  const work=new Set(A.sessions.filter(s=>s.status==='work').map(s=>s.id)),wait=new Map(A.sessions.filter(s=>s.status==='wait').map(s=>[s.id,s]));
  const page=el.id==='hbg';
  for(const g of el.querySelectorAll('.star')){const id=g.dataset.id,w=wait.get(id);
    g.classList.toggle('w',work.has(id));g.classList.toggle('a',!!w);g.classList.toggle('g',!w&&!work.has(id)&&NOW.glow.has(id));
    // on Home a waiting star says what it waits on, beside it
    let t=g.querySelector('.askt');
    if(page&&w){const st=g.querySelector('.st'),say=`${w.title} · ${w.line}`;
      if(!t){t=document.createElementNS('http://www.w3.org/2000/svg','text');t.setAttribute('class','askt');g.append(t)}
      t.setAttribute('x',(+st.getAttribute('cx')+22).toFixed(0));t.setAttribute('y',(+st.getAttribute('cy')+7).toFixed(0));if(t.textContent!==say)t.textContent=say}
    else t?.remove()}
  for(const f of el.querySelectorAll('.fig'))f.classList.toggle('w',!!f.querySelector('.star.w'));
}
// A turn that ends: its star flares and a shooting star crosses the sky.
function skyTurnEnds(id){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches||document.hidden)return;
  for(const svg of document.querySelectorAll('#hbg .sky, #spage .sky')){
    if(svg.closest('#hbg')&&bgOf('home').motion==='never')continue;
    const st=svg.querySelector(`.star[data-id="${CSS.escape(id)}"] .st`);if(!st)continue;
    const fx=svg.querySelector('.fx'),vw=svg.viewBox.baseVal.width,r=seeded(Date.now()),mx=vw*.55+r()*vw*.35,my=60+r()*200,h=st.closest('.fig').style.getPropertyValue('--h');
    fx.insertAdjacentHTML('beforeend',`<circle class="flare" style="--h:${h}" cx="${st.getAttribute('cx')}" cy="${st.getAttribute('cy')}" r="6"/><line class="meteor" x1="${mx.toFixed(0)}" y1="${my.toFixed(0)}" x2="${(mx+170).toFixed(0)}" y2="${(my-85).toFixed(0)}"/>`);
    const added=[...fx.children].slice(-2);setTimeout(()=>added.forEach(n=>n.remove()),1800);
  }
}

/* ---- the layers ---- */
const BGL={hbg:{key:'',rate:1,raf:0,ids:null},sbg:{key:'',rate:1,raf:0,ids:null}};
// Speed eases to where it should be, so starting and coming to rest glide over a couple of seconds instead of snapping.
function bgRate(id,to,now){
  const l=BGL[id],el=$(id);cancelAnimationFrame(l.raf);
  const anims=()=>el.getAnimations({subtree:true}).filter(a=>!a.effect?.target?.closest?.('.fx'));
  if(now||Math.abs(l.rate-to)<.001){l.rate=to;for(const a of anims()){if(to<.001)a.pause();else{a.playbackRate=to;if(a.playState==='paused')a.play()}}return}
  const from=l.rate,t0=performance.now(),D=2000;
  const step=t=>{const p=Math.min(1,(t-t0)/D),e=p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2;l.rate=from+(to-from)*e;
    for(const a of anims()){if(l.rate<.001)a.pause();else{a.playbackRate=l.rate;if(a.playState==='paused')a.play()}}
    if(p<1)l.raf=requestAnimationFrame(step)};
  l.raf=requestAnimationFrame(step);
}
function paintBg(id,place,s){
  const el=$(id),l=BGL[id];
  if(!place){el.hidden=true;if(l.key){l.key='';el.innerHTML=''}return}
  const b=bgOf(place),k=b.kind,mine=place==='session'?[s]:A.sessions;
  const working=mine.some(x=>x?.status==='work');
  const p=profile(place==='session'?(s.profile||V.run?.profile):V.profile),use=p?Math.max(p.h5||0,p.d7||0):0,warn=!b.limits?'':use>=100?'hot':use>=80?'warm':'';
  el.hidden=k==='none'&&!warn;if(el.hidden){if(l.key){l.key='';el.innerHTML=''}return}
  const [h1,h2,h3]=bgHues(place,s);
  el.style.cssText=`--h1:${h1};--h2:${h2};--h3:${h3}`;
  const moves=!BGSTILL.includes(k)&&!document.hidden&&(b.motion==='always'||b.motion==='working'&&working);
  el.className='hbg '+({home:'',session:'insession',side:'inside'}[place])+(place==='home'&&!skyLabels()?' nolab':'')+(BGCALM.includes(k)?' calm':'')+(k==='paper'?' paperbg':'')
    +(BGMOVE.includes(k)?' moving-kind':'')+(b.motion==='always'&&working?' working':'')+(moves?' moving':'')+(warn?' '+warn:'');
  let key=place+'|'+k+'|'+h1+h2+h3,born=null;
  if(k==='constel'){const list=skyList(),ids=list.map(x=>x.id);const dm=skyDims(el,false);key+='|'+dm.W+'x'+dm.H+'|'+ids.join();
    if(l.ids&&key!==l.key)born=new Set(ids.filter(i=>!l.ids.includes(i)));l.ids=ids}else l.ids=null;
  if(key!==l.key){l.key=key;el.innerHTML=(k==='constel'?skySVG(skyList(),skyDims(el,false),born):hbgHTML(k)+'<span class="fld grain"></span>')+'<span class="fld glow"></span>';bgRate(id,moves?1:0,true)}
  else bgRate(id,moves?1:0,document.hidden);
  if(k==='constel')skyMark(el);
}
// A turn ends when a session leaves 'work'.
const bgWas=new Map();
function renderBgs(){
  for(const s of A.sessions){const was=bgWas.get(s.id);if(was==='work'&&s.status!=='work')skyTurnEnds(s.id);bgWas.set(s.id,s.status)}
  const s=selSession(),place=isHome()?'home':!V.isNew&&s?'session':null;
  paintBg('hbg',place,s);paintBg('sbg','side',null);
  $('main').classList.toggle('bglane',place==='session'&&BGMOVE.includes(bgOf('session').kind));
}
const renderHomeBg=renderBgs;
document.addEventListener('visibilitychange',renderBgs);   // a hidden window holds still
new ResizeObserver(()=>{if(!$('hbg').hidden&&bgOf('home').kind==='constel'&&isHome())renderBgs()}).observe($('hbg'));
$('hset').onclick=()=>{V.lookEdit='home';openSettings(STABS.indexOf('Look'))};

/* ---------- watching from Home: a dock of what's live, the Wall, stars you can read and answer ----------
   Home's Wall view is only its background and a dock, to watch from: a card per session that works or waits on you,
   where a permission or one short question is answered; a session that starts waiting while it shows
   plays a soft chime. On the constellation each star can be read on hover, and a waiting one answered. */
const NOW={was:new Map(),ended:new Map(),glow:new Map(),busy:new Set(),all:false,ac:null};
const NOW_KEEP=60000,GLOW_KEEP=180000,NOW_MAX=5;
const skyLabels=()=>localStorage.getItem('ww.skylabels')!=='off';
const nowLive=s=>!s.done&&(s.status==='work'||s.status==='wait');   // a session in a terminal too, watch-only
// What changed since the last reading: a turn that ended keeps its card a minute and its star an afterglow.
function nowTrack(){
  const t=performance.now();
  for(const s of A.sessions){const was=NOW.was.get(s.id);
    if(was==='work'&&s.status==='idle'){NOW.ended.set(s.id,t);NOW.glow.set(s.id,t)}
    if(s.status==='work'||s.status==='wait')NOW.ended.delete(s.id);
    if(was&&was!=='wait'&&s.status==='wait'&&inWall())chime();
    NOW.was.set(s.id,s.status)}
  for(const [id,at] of NOW.ended)if(t-at>NOW_KEEP)NOW.ended.delete(id);
  for(const [id,at] of NOW.glow)if(t-at>GLOW_KEEP)NOW.glow.delete(id);
}
const nowList=()=>A.sessions.filter(s=>nowLive(s)||NOW.ended.has(s.id)&&!s.done)
  .sort((a,b)=>(b.status==='wait')-(a.status==='wait')||(b.status==='work')-(a.status==='work')||b.mts-a.mts);
// A card's body: what it waits on and how to answer, or what it is doing.
function nowBody(s){
  if(s.outside||s.term)return `<span class="stp">${esc(s.line||'In a terminal')}</span>`;   // watched here, answered where it runs
  const a=s.ask,w=s.status==='wait',busy=NOW.busy.has(s.id)?' disabled':'';
  if(w&&a?.kind==='permission')return `<span class="stp">${esc(s.line)}</span>${a.what?`<code>${esc(a.what)}</code>`:''}<span class="acts"><button class="nb go" data-nact="allow"${busy}>Allow</button><button class="nb" data-nact="deny"${busy}>Deny</button></span>`;
  if(w&&a?.opts)return `<span class="qq">${esc(a.q)}</span><span class="acts">${a.opts.map((o,i)=>`<button class="nb" data-nopt="${i}"${busy}>${esc(o)}</button>`).join('')}</span>`;
  if(w)return `<span class="stp">${esc(s.line)}</span><span class="acts"><button class="nb" data-nopen>Open</button></span>`;
  return `<span class="stp">${esc(s.status==='work'?s.line:'Done')}</span>`;
}
const nowCard=s=>`<div class="nc ${s.status==='wait'?'ask':s.status==='work'?'work':'gone'}${s.outside||s.term?' wo':''}" data-nid="${esc(s.id)}" style="--h:${hueOf(s.project)}"><span class="tt"><i class="nd"></i><b>${esc(s.title)}</b>${s.outside||s.term?'<span class="tg">&gt;_</span>':''}</span>${nowBody(s)}</div>`;
function renderNow(){
  nowTrack();
  const el=$('now'),on=inWall(),list=on?nowList():[];   // the dock is the Wall's: the other views have their own lists
  const wait=A.sessions.filter(s=>s.status==='wait'&&!s.done).length;
  const tt=document.querySelector('title'),want=wait?`(${wait}) Workwood`:'Workwood';if(tt.textContent!==want)tt.textContent=want;   // the window's title counts what waits
  wallPaint(list);
  if(!list.some(nowLive)){el.hidden=!on;el.innerHTML=on?wallGhost():'';if(NOW.ended.size)setTimeout(()=>{if(isHome())renderNow()},NOW_KEEP+50);return}   // nothing live: what finished last stands for the rest
  el.hidden=false;
  const shown=NOW.all?list:list.slice(0,NOW_MAX),more=list.length-shown.length;
  el.innerHTML=shown.map(nowCard).join('')+(more?`<button class="nmore" data-nmore>+${more}</button>`:NOW.all&&list.length>NOW_MAX?'<button class="nmore" data-nmore>Fewer</button>':'')+'<button class="nmore nnew" data-nnew>+ New</button>';
  if(NOW.ended.size)setTimeout(()=>{if(isHome())renderNow()},NOW_KEEP+50);
}
async function nowClick(e){
  if(e.target.closest('[data-nmore]')){NOW.all=!NOW.all;renderNow();return}
  if(e.target.closest('[data-nnew]')){startNew();return}
  const c=e.target.closest('[data-nid]');if(!c)return;
  const s=A.sessions.find(x=>x.id===c.dataset.nid);if(!s)return;
  const b=e.target.closest('[data-nact],[data-nopt]');
  if(!b){skyUnpin();openSession(s.id);return}
  const a=s.ask;if(!a||NOW.busy.has(s.id))return;
  const payload=b.dataset.nopt!=null?{action:'answer',answers:{[a.q]:a.opts[+b.dataset.nopt]}}:{action:b.dataset.nact};
  NOW.busy.add(s.id);renderNow();skyPaint();
  try{await api(`sessions/${s.id}/answer`,{requestId:a.id,...payload});skyUnpin()}catch(err){oops(err.message)}
  finally{NOW.busy.delete(s.id);renderNow();skyPaint()}
}
$('now').onclick=nowClick;
// A soft two-note chime, made here rather than shipped as a sound.
function chime(){
  try{const c=NOW.ac||=new AudioContext();c.resume();const t=c.currentTime;
    for(const [f,d] of [[660,0],[880,.16]]){const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=f;
      g.gain.setValueAtTime(0,t+d);g.gain.linearRampToValueAtTime(.07,t+d+.02);g.gain.exponentialRampToValueAtTime(.0001,t+d+.9);
      o.connect(g).connect(c.destination);o.start(t+d);o.stop(t+d+1)}}catch{}
}
// The stars: hover one to read it, click a waiting one to answer it, any other to open its session.
const SKY={pin:null,hov:null,raf:0,pop:null};
function skyStar(x,y,target){
  if(!isHome()||PHONE||bgOf('home').kind!=='constel'||$('hbg').hidden)return null;
  if(target&&!(target.closest?.('#now,#skypop')==null&&['scroll','dash','conv','split','main','hello'].includes(target.id)))return null;
  let best=null,bd=18;
  for(const g of $('hbg').querySelectorAll('.star')){const r=g.querySelector('.st').getBoundingClientRect(),d=Math.hypot(r.left+r.width/2-x,r.top+r.height/2-y);if(d<bd){bd=d;best=g}}
  return best;
}
function skyShow(g,pinned){
  const s=A.sessions.find(x=>x.id===g.dataset.id);if(!s)return skyHide();
  const p=SKY.pop||=Object.assign(document.createElement('div'),{id:'skypop'});if(!p.isConnected){document.body.append(p);p.onclick=nowClick}
  const w=H.d?.words?.[s.id],say=s.status==='work'?'':w?.text||w?.first||'';
  const when=s.status==='work'?'working':s.status==='wait'?'waiting':NOW.glow.has(s.id)?'done '+ago(s.mts):ago(s.mts);
  p.className='nc '+(s.status==='wait'?'ask':s.status==='work'?'work':'gone')+(pinned?' pin':'');p.dataset.nid=s.id;p.style.setProperty('--h',hueOf(s.project));
  p.innerHTML=`<span class="tt"><i class="nd"></i><b>${esc(s.title)}</b><span class="t">${esc(when)}</span></span><span class="spj">${esc(s.project)}</span>${nowBody(s)}${say?`<span class="say">${esc(say)}</span>`:''}`;
  p.style.visibility='hidden';p.hidden=false;   // measured while shown: a hidden card is 0 wide and would never move off the edge
  const r=g.querySelector('.st').getBoundingClientRect(),pw=p.offsetWidth,ph=p.offsetHeight,W=document.documentElement.clientWidth,Hh=document.documentElement.clientHeight;
  let x=r.right+14,y=r.top+r.height/2+10;if(x+pw>W-12)x=r.left-14-pw;if(y+ph>Hh-12)y=Hh-12-ph;
  p.style.left=Math.max(12,Math.min(x,W-12-pw))+'px';p.style.top=Math.max(12,y)+'px';p.style.visibility='';
  for(const o of $('hbg').querySelectorAll('.star.hov'))o.classList.remove('hov');g.classList.add('hov');
  SKY.hov=g.dataset.id;if(pinned)SKY.pin=g.dataset.id;
}
function skyHide(){SKY.pin=null;SKY.hov=null;if(SKY.pop)SKY.pop.hidden=true;for(const o of document.querySelectorAll('#hbg .star.hov'))o.classList.remove('hov')}
const skyUnpin=()=>{if(SKY.pin)skyHide()};
function skyPaint(){const id=SKY.pin||SKY.hov;if(!id||!SKY.pop||SKY.pop.hidden)return;const g=$('hbg').querySelector(`.star[data-id="${CSS.escape(id)}"]`);g?skyShow(g,!!SKY.pin):skyHide()}
addEventListener('pointermove',e=>{
  if(SKY.pin||e.pointerType==='touch')return;
  cancelAnimationFrame(SKY.raf);SKY.raf=requestAnimationFrame(()=>{
    if(e.target.closest?.('#skypop'))return;
    const g=skyStar(e.clientX,e.clientY,e.target);
    if(g){if(SKY.hov!==g.dataset.id||SKY.pop?.hidden)skyShow(g,false)}else if(SKY.hov)skyHide()});
},{passive:true});
addEventListener('click',e=>{
  if(e.target.closest?.('#skypop'))return;
  const g=skyStar(e.clientX,e.clientY,e.target);
  if(!g){if(SKY.pin)skyHide();return}
  const s=A.sessions.find(x=>x.id===g.dataset.id);if(!s)return;
  if(s.status==='wait'&&s.ask&&s.ask.kind==='permission'||s.status==='wait'&&s.ask?.opts){skyShow(g,true);return}
  skyHide();openSession(s.id);
});
addEventListener('keydown',e=>{if(e.key==='Escape'&&SKY.pin)skyHide()});

/* ---- the Wall when all is quiet, and the profiles' limits in its scene ----
   Nothing live: the time, the day and one line, and at the dock's place what finished last and New. The clock goes while
   anything runs. The limits are drawn into the background, on the Wall alone: a moon per profile on the constellation
   (its phase what is left of the 5 hours, a faint arc the week), a curtain of light on Aurora and Caustics (as tall as
   what is left), a planet circling the clock on Orbits (where the window's time is, its lit arc what is used); the calm
   backgrounds have one quiet line. Hover any of them for the numbers. */
const WALL_CAP=6;
const lpOut=p=>Math.max(p.h5||0,p.d7||0)>=100;
const lpBack=p=>{const r=p[WIN[(p.d7||0)>=100?'d7':'h5'][1]];return r?clock(r*1000):''};
const lpLeft=p=>p.h5==null?1:Math.max(0,1-Math.max(p.h5,lpOut(p)?100:0)/100);
const lpWarm=p=>!lpOut(p)&&Math.max(p.h5||0,p.d7||0)>=80;
const lpCls=p=>(lpOut(p)?' out':lpWarm(p)?' warm':'')+(p.h5==null?' unk':'');
const lpBk=p=>lpOut(p)&&lpBack(p)?`<em>back ${esc(lpBack(p))}</em>`:'';
const wallKind=()=>{const k=bgOf('home').kind;return k==='constel'?'moons':k==='aurora'||k==='caustics'?'curtains':k==='orbits'?'orbits':'line'};
function wallGhost(){
  const last=A.sessions.filter(s=>!s.done&&s.status==='idle'&&!s.outside&&!s.term).sort((a,b)=>b.mts-a.mts)[0];
  return `<div class="wgh">${last?`<button class="gp" data-nid="${esc(last.id)}" style="--h:${hueOf(last.project)}"><i class="d"></i>Last done <b>${esc(last.title)}</b> ${esc(ago(last.mts))}</button>`:''}<button class="gp new" data-nnew>+ New</button></div>`;
}
function wallMoons(ps){
  return ps.map((p,i)=>{const R=15,left=lpLeft(p),wk=p.d7==null?0:(1-p.d7/100)*2*Math.PI*(R+6),id='wlm'+i;
    return `<div class="wmo${lpCls(p)}" data-lp="${esc(p.name)}" style="--dy:${(Math.pow(i-(ps.length-1)/2,2)*7).toFixed(0)}px"><svg viewBox="-26 -26 52 52"><mask id="${id}"><circle r="${R}" fill="#fff"/><circle cx="${(2*R*left+.5).toFixed(1)}" r="${R+.5}" fill="#000"/></mask>
      <circle class="gl" r="${(R*(.6+left)).toFixed(1)}"/><circle class="dk" r="${R}"/>${lpOut(p)?`<circle class="rim" r="${R}"/>`:`<circle class="lit" mask="url(#${id})" r="${R}"/>`}<circle class="wk" r="${R+6}" stroke-dasharray="${wk.toFixed(1)} 999" transform="rotate(-90)"/></svg><b>${esc(p.name)}</b>${lpBk(p)}</div>`}).join('');
}
function wallCurtains(ps){
  const n=ps.length,w=Math.min(16,72/n),gap=(100-w*n)/(n+1);
  return ps.map((p,i)=>{const x=gap+i*(w+gap),h=lpOut(p)?7:8+lpLeft(p)*72,op=p.d7==null?.8:.45+(1-p.d7/100)*.55;
    return `<div class="wcu${lpCls(p)}" data-lp="${esc(p.name)}" style="left:${x.toFixed(1)}%;width:${w.toFixed(1)}%;height:${h.toFixed(0)}%;--c:${lpOut(p)?20:lpWarm(p)?38:160-i*16};opacity:${op.toFixed(2)}"></div><div class="wcl" style="left:${x.toFixed(1)}%;width:${w.toFixed(1)}%;bottom:calc(${(lpOut(p)?h:h*.6).toFixed(0)}% + 4px)">${esc(p.name)}${lpBk(p)}</div>`}).join('');
}
function wallOrbits(ps){
  const cx=500,cy=300,now=Date.now()/1000;
  return `<svg class="wor" viewBox="0 0 1000 600">${ps.map((p,i)=>{const rx=170+i*46,ry=rx*.42,ang=a=>-Math.PI/2+a*2*Math.PI,pt=a=>[cx+rx*Math.cos(ang(a)),cy+ry*Math.sin(ang(a))];
    const t=p.r5?Math.min(1,Math.max(0,1-(p.r5-now)/18000)):0,used=Math.min((lpOut(p)?100:p.h5||0)/100,.999),[ex,ey]=pt(used),[px,py]=pt(t);
    const ahead=used>t+.05,c=lpOut(p)||ahead&&lpWarm(p)?38:ahead?45:160,f=n=>n.toFixed(1);
    return `<g class="${lpCls(p).trim()}" style="--c:${c}" data-lp="${esc(p.name)}"><ellipse class="rg" cx="${cx}" cy="${cy}" rx="${rx}" ry="${f(ry)}"/>${used>0?`<path class="us" d="M ${cx} ${f(cy-ry)} A ${rx} ${f(ry)} 0 ${used>.5?1:0} 1 ${f(ex)} ${f(ey)}"/>`:''}
      <circle class="plh" cx="${f(px)}" cy="${f(py)}" r="9"/><circle class="pl" cx="${f(px)}" cy="${f(py)}" r="${lpOut(p)?2.5:4}"/>${(([lx,ly])=>`<text x="${f(lx+8)}" y="${f(ly+12)}">${esc(p.name)}</text>${lpOut(p)&&lpBack(p)?`<text class="bk" x="${f(lx+8)}" y="${f(ly+25)}">back ${esc(lpBack(p))}</text>`:''}`)(pt(.3+i*.045))}</g>`}).join('')}</svg>`;
}
const wallLine=ps=>`<div class="wll">${ps.map(p=>`<span data-lp="${esc(p.name)}">${esc(p.name)} ${lpOut(p)?lpBk(p):p.h5==null?'<b>–</b>':`<b>${100-p.h5}%</b> left`}</span>`).join('<i>·</i>')}</div>`;
const WALL={key:'',tick:0};
function wallPaint(list){
  const f=$('wface'),on=inWall()&&!PHONE;
  f.hidden=!on;if(!on){clearInterval(WALL.tick);WALL.tick=0;wallPop();return}
  const quiet=!list.some(nowLive),kind=wallKind(),ps=A.profiles.slice(0,WALL_CAP);
  const ck=wallClk();
  f.className='wface '+kind+(quiet?' q':'')+(ck==='always'?' clk':ck==='never'?' noclk':'')+(bgOf('home').motion==='never'?' still':'');
  const lim=kind==='moons'?`<div class="wmoons">${wallMoons(ps)}</div>`:kind==='curtains'?wallCurtains(ps):kind==='orbits'?wallOrbits(ps):wallLine(ps);
  const key=kind+'|'+lim;if(key!==WALL.key){WALL.key=key;$('wlim').innerHTML=ps.length?lim:''}
  wallClock();if(!WALL.tick)WALL.tick=setInterval(()=>{if(inWall())wallClock();else{clearInterval(WALL.tick);WALL.tick=0}},10000);
}
function wallClock(){
  const d=new Date(),t=d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}),m=t.match(/^(\d+)\D(\d+)\s*(.*)$/)||[t,t,'',''];
  const done=A.sessions.filter(s=>!s.outside&&!s.term&&s.status==='idle'&&s.mts>=dayStart()).length;
  const ck=wallClk(),quiet=!A.sessions.some(nowLive);
  const h=(ck==='never'?'':`<div class="tm">${esc(m[1])}${m[2]?`<span class="c">:</span>${esc(m[2])}`:''}${m[3]?`<small>${esc(m[3])}</small>`:''}</div><div class="dt">${esc(d.toLocaleDateString([],{weekday:'long'}))} · ${esc(d.toLocaleDateString([],{day:'numeric',month:'long'}))}</div>`)
    +(quiet?`<div class="ln1"><i class="ok"></i>All quiet · ${done?`${done} done today`:'nothing yet today'}</div>`:'');
  if($('wq').innerHTML!==h)$('wq').innerHTML=h;
}
// hover a moon, a curtain, a planet or a name for its numbers
function wallPop(el,ev){
  let p=$('wlpop');if(!el){if(p)p.hidden=true;return}
  const pr=profile(el.dataset.lp);if(!pr)return wallPop();
  if(!p){p=Object.assign(document.createElement('div'),{id:'wlpop',className:'wlpop'});document.body.append(p)}
  const r5=pr.r5?clock(pr.r5*1000):'',used=pr.h5,tw=pr.r5?Math.min(100,Math.max(0,100-(pr.r5-Date.now()/1000)/180)):null;
  p.innerHTML=`<b>${esc(pr.name)}</b>${lpOut(pr)?`<div class="r"><span>${(pr.d7||0)>=100?'Week':'5-hour'} limit reached</span><span>back ${esc(lpBack(pr))}</span></div>`:used==null?'<div class="r"><span>Not read yet</span></div>'
    :`<div class="r"><span>5-hour</span><span>${used}%${r5?' · resets '+esc(r5):''}</span></div><div class="bar2"><i style="width:${used}%"></i>${tw!=null?`<u style="left:${tw.toFixed(0)}%"></u>`:''}</div>`}${pr.d7!=null?`<div class="r"><span>Week</span><span>${pr.d7}%</span></div>`:''}`;
  p.hidden=false;const pw=p.offsetWidth,ph=p.offsetHeight;
  let x=ev.clientX+14,y=ev.clientY+18;if(x+pw>innerWidth-12)x=ev.clientX-14-pw;if(y+ph>innerHeight-12)y=ev.clientY-18-ph;
  p.style.left=Math.max(12,x)+'px';p.style.top=Math.max(12,y)+'px';
}
addEventListener('pointermove',e=>{
  if(!inWall()||e.pointerType==='touch'||$('wface').hidden)return;
  if(e.target.closest?.('#now,.pop,.modal,#skypop'))return wallPop();
  let hit=null;for(const el of $('wlim').querySelectorAll('[data-lp]')){const r=(el.querySelector('.pl')||el).getBoundingClientRect(),m=el.querySelector('.pl')?12:2;
    if(e.clientX>=r.left-m&&e.clientX<=r.right+m&&e.clientY>=r.top-m&&e.clientY<=r.bottom+m){hit=el;break}}
  wallPop(hit,e);
},{passive:true});

/* ---------- everything together ---------- */
// Under the title, always starting at the same place: where the work is happening. The worktree when there is one,
// else the branch; the project comes after it.
function renderHead(){
  const nw=V.isNew,s=selSession(),w=$('where');
  $('title').textContent=nw?(isHome()?'Home':'New session'):s?.title||'';
  if(nw||!s){w.innerHTML='';return}
  const pl=V.place||{project:s.project,worktree:null,branch:s.branch,cwd:s.cwd};
  w.dataset.tip=pl.cwd||s.cwd;
  w.innerHTML=(pl.worktree?`<span class="pl1">${svg('tree')}<b>${esc(pl.worktree)}</b><small>worktree</small></span>${pl.branch&&pl.branch!==pl.worktree?`<span>${svg('branch')}${esc(pl.branch)}</span>`:''}`
    :pl.branch?`<span class="pl1">${svg('branch')}<b>${esc(pl.branch)}</b></span>`:'')+`<span class="${pl.worktree||pl.branch?'plp':'pl1'}">${pl.worktree||pl.branch?'':svg('folder')}${pl.worktree||pl.branch?esc(pl.project||s.project):`<b>${esc(pl.project||s.project)}</b>`}</span>`
    +(V.thread?`<button class="chain" data-tbrowse data-tip="This session continues ${V.thread.n>2?V.thread.n-1+' earlier ones':'an earlier one'}" data-tip-d="Browse them in the outline.">${V.thread.n<=4?`<span class="thr">${'<i></i>'.repeat(V.thread.n)}</span>`:''}${V.thread.n} sessions</button>`:'');
  const d=$('bDone');d.innerHTML=`${svg(s.done?'refresh':'check')}<span>${s.done?'Back to inbox':'Done'}</span>`;d.dataset.tip=s.done?'Bring this session back into the sidebar':'Mark done';d.dataset.tipD=s.done?'':'It leaves the sidebar, and search still finds it.';d.dataset.tipK=s.done?'':'Ctrl D';
}
function render(){
  const nw=V.isNew,s=selSession();
  if(s?.unread&&!nw&&!document.hidden){s.unread=false;api(`sessions/${s.id}/seen`,{}).catch(()=>{})}   // you are looking at it
  renderList();renderUpd();renderThread();renderHome();renderCard();renderQueue();renderComposer();renderPanel();renderTerm();renderHead();raSeen();
  $('tools').style.visibility=nw||!s?'hidden':'visible';
  $('main').classList.toggle('newmode',nw&&!V.pend);
  if(PHONE)phRender();
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
$('bOTerm').onclick=()=>api(`sessions/${V.sel}/terminal`,{}).catch(e=>oops(e.message));

/* ---------- the header's actions: what you reach for often stays, the rest is in ⋮ ----------
   Preview and Running are always there, muted with nothing to show, so nothing moves; Serve, in a project that lists
   or runs servers, comes in at the left end, where it moves nothing either. The rest (Changes, Outline, the chat and
   terminal switch, VS Code, a terminal window, Done) is in ⋮, where a pin keeps any of them in the header. */
const hMute=(el,on,tip,tipOn)=>{el.classList.toggle('mute',on);el.dataset.tip=on?tip:tipOn};
const PIN_KEYS=['changes','outline','view','code','oterm','done'];
let pins=(()=>{try{const p=JSON.parse(localStorage.getItem('ww.pins'));if(Array.isArray(p))return new Set(p.filter(k=>PIN_KEYS.includes(k)))}catch{}return new Set(['done'])})();
function applyPins(){for(const el of $('hpins').querySelectorAll('[data-pin]'))el.classList.toggle('np',!pins.has(el.dataset.pin))}
function renderServe(){
  const b=$('bServe'),h=srvHere(),can=srvCanStart(),up=srvList().filter(x=>x.state!=='exited');
  b.hidden=!h?.conf?.names?.length&&!up.length;if(b.hidden)return;
  b.classList.toggle('go',!!up.length);
  if(up.length){const f=up.find(x=>x.ports.length)||up[0];
    b.innerHTML=`<i class="dot"></i><span>${esc(f.name)}</span>${f.ports[0]?`<span class="pt">:${f.ports[0]}</span>`:''}${up.length>1?`<span class="hsvn">+${up.length-1}</span>`:''}`;
    b.dataset.tip=plural(up.length,'server')+' running';b.dataset.tipD=up.map(x=>x.name+(x.ports.length?' :'+x.ports.join(' :'):'')).join(' · ')+(can.length?'. Not running: '+can.join(', ')+'.':'')}
  else{b.innerHTML=`${svg('play')}<span>Serve</span>`;b.dataset.tip="Start this folder's servers";b.dataset.tipD=can.join(' · ')+' · from '+h.conf.file}
}
$('bServe').onclick=()=>{
  if(srvList().some(x=>x.state!=='exited')){V.trayOpen=!V.trayOpen||$('tray').hidden;renderTray();return}
  if($('srvm').hidden)srvMenu($('bServe'));else $('srvm').hidden=true;
};
function hMenuPaint(){
  const s=selSession(),m=$('hmenu');if(!s)return;
  const t=view()==='term',c=V.ch;
  const row=(k,icon,label,meta='',on=false)=>`<button data-h="${k}" class="${on?'cur':''}">${svg(icon)}${label}${meta?`<span class="k">${meta}</span>`:''}<i class="pin ${pins.has(k)?'on':''}" data-hpin="${k}" data-tip="${pins.has(k)?'Unpin from the header':'Pin to the header'}">${svg('pin')}</i></button>`;
  m.innerHTML=(c?.repo?row('changes','diff','Changes',c.count?String(c.count):''):'')
    +row('outline','list','Outline','',V.side==='outline'&&!V.pv)
    +row('view',t?'chat':'term',t?'Back to the chat':'Terminal view')
    +row('code','code','Open in VS Code')+row('oterm','ext','Open in a terminal window')
    +row('done',s.done?'refresh':'check',s.done?'Back to inbox':'Done',s.done?'':'Ctrl D')
    +`<hr><button data-h="rename">${svg('pencil')}Rename</button><button data-h="delete" class="hot">${svg('trash')}Delete…</button>`;
}
$('bMore').onclick=e=>{
  e.stopPropagation();const m=$('hmenu');if(!m.hidden){closePops();return}
  closePops();hideTip();hMenuPaint();m.hidden=false;$('bMore').classList.add('on');
  const r=$('bMore').getBoundingClientRect();m.style.left=Math.max(6,r.right-m.offsetWidth)+'px';m.style.top=r.bottom+6+'px';
};
$('hmenu').onclick=e=>{
  e.stopPropagation();const p=e.target.closest('[data-hpin]');
  if(p){const k=p.dataset.hpin;pins.has(k)?pins.delete(k):pins.add(k);localStorage.setItem('ww.pins',JSON.stringify([...pins]));applyPins();hideTip();hMenuPaint();return}
  const b=e.target.closest('[data-h]'),s=selSession();if(!b||!s)return;const k=b.dataset.h;closePops();
  if(k==='changes')$('bChanges').click();
  else if(k==='outline')$('bOutline').click();
  else if(k==='view')setView(V.sel,view()==='term'?'chat':'term');
  else if(k==='code')$('bCode').click();
  else if(k==='oterm')$('bOTerm').click();
  else if(k==='done')$('bDone').click();
  else sessAct(k,s);
};
applyPins();

const root=document.documentElement;
const themePref=()=>{const t=localStorage.getItem('ww.theme');return ['dark','light','auto'].includes(t)?t:'dark'};
const sysDark=matchMedia('(prefers-color-scheme: dark)');
const setTheme=t=>{localStorage.setItem('ww.theme',t);root.dataset.theme=t==='auto'?(sysDark.matches?'dark':'light'):t;
  $('gThemeV').textContent={dark:'Dark',light:'Light',auto:'Auto'}[t];if(T?.term)T.term.options.theme=termTheme()};
sysDark.addEventListener('change',()=>{if(themePref()==='auto'){setTheme('auto');renderSettings()}});
let gearAt=-1e9;
$('bGear').onclick=e=>{e.stopPropagation();if(e.timeStamp-gearAt<350)return;gearAt=e.timeStamp;$('bGear').blur();const was=$('gmenu').hidden;closePops();if(was){$('gProf').hidden=A.profiles.length<2;$('gProfV').textContent=A.prefs?.defaultProfile||A.profiles.find(p=>p.global)?.name||'';const r=$('bGear').getBoundingClientRect(),m=$('gmenu');m.hidden=false;m.style.left=r.left+'px';m.style.top='auto';m.style.bottom=(innerHeight-r.top+6)+'px';$('bGear').classList.add('on')}};
$('gmenu').onclick=e=>e.stopPropagation();
$('gTheme').onclick=()=>setTheme({dark:'light',light:'auto',auto:'dark'}[themePref()]);   // Dark, Light, Auto in turn
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
    Object.assign(A,JSON.parse(e.data));renderPc();
    if(PHONE&&A.preview)A.preview=location.origin+'/preview'+new URL(A.preview).pathname;   // the phone reaches previews through the app's own address
    if(first&&A.ready){first=false;const s=A.sessions.find(x=>x.id===location.hash.slice(1));if(s)openSession(s.id);else newSession();return}   // home, unless the address names a session
    if(!V.isNew&&V.sel&&A.fresh&&!V.loading&&!A.sessions.some(x=>x.id===V.sel)){leave(V.sel);return} // deleted somewhere else
    if(V.isNew){if(!V.profile)V.profile=startProfile()?.name;if(!V.project)V.project=A.projects[0]?.cwd||null}
    render();homeSoon();{const f=document.activeElement;if(!$('spage').contains(f)||!/^(SELECT|INPUT)$/.test(f.tagName))renderSettings()}if(!$('mProfile').hidden)renderProfiles();
  });
  es.addEventListener('run',take(d=>{if(d.sessionId!==V.sel)return;const end=!awayNow();const was=V.run?.status;V.run=d.run;if(V.ans&&d.run?.pending?.id!==V.ans)V.ans=null;
    if(was==='working'&&d.run?.status!=='working'&&d.run?.status!=='waiting'){const id=V.sel;if(V.ctx?.id===id)V.ctx=null;setTimeout(()=>api('sessions/'+id).then(x=>{if(V.sel===id&&x.place){V.place=x.place;renderHead()}}).catch(()=>{}),900)}   // the agent may have moved to a worktree
    if(d.run?.context)V.context=d.run.context;if(d.run?.model)V.used.model=d.run.model;if(d.run?.effort)V.used.effort=d.run.effort;if(d.run?.mode){V.used.mode=d.run.mode;if(V.pick[d.sessionId])delete V.pick[d.sessionId].mode}if(V.qNow&&!(d.run?.queued||[]).some(q=>q.id===V.qNow))V.qNow=null;checkSoon();changesSoon();renderThread();renderCard();renderQueue();renderComposer();renderTerm();follow(end)}));
  es.addEventListener('item',take(d=>{if(d.sessionId!==V.sel)return;const i=V.items.findIndex(x=>x.n===d.item.n),end=!awayNow();noteArrival(d.item,i<0);if(i>=0)V.items[i]=d.item;else V.items.push(d.item);if(d.item.kind==='work'){addWork(d.item.files);renderPanel()}checkSoon();changesSoon();renderThread();follow(end,i<0&&d.item.kind==='assistant'?d.item.n:null)}));
  es.addEventListener('handoff',take(d=>{if(d.sessionId!==V.sel)return;
    if(d.state==='writing'){V.handing={model:d.model,effort:d.effort,auto:d.auto};renderThread();renderComposer()}
    else if(d.state==='done'){V.handing=null;openSession(d.to)}
    else{V.handing=null;render();oops('The handoff was not written: '+(d.error||'something went wrong'))}}));
  es.onerror=()=>{};
}
/* ---------- the phone: the same app, laid out for one hand (design/round60.html to round69.html). Only a paired phone
   gets it, from the phone port (see service/phone.mjs). Four tabs: Home, Sessions, New and Settings; a session opens
   full screen. Limits and controls sit in one pill in the message box, which opens a drawer. ---------- */
const PH_KINDS=[['needs','A session needs you','A question, a plan or a permission to answer'],['turn','A turn ends','In a session you are not looking at'],['stopped','Work stops mid-turn','A limit, a sign-out or an error'],['cleared','A limit has cleared','A profile has room again'],['near','A limit is near','Above 80% of 5h or 7d'],['cool','The cache is about to cool','Ten minutes before, in a session at rest'],['context','Context is large','Time to continue in a new session']];
const MODE_SAY={default:'asks first',acceptEdits:'edits freely',plan:'plans first',auto:'auto mode',bypassPermissions:'never asks'};
const MODE_SHORT={default:'Ask',acceptEdits:'Edits',plan:'Plan',auto:'Auto',bypassPermissions:'Bypass'};
let PT='home',phMe=null,phDr=null,phAfter=null,phLastV={id:undefined,at:0},phVT=0,phInstall=null,phEdit=false;
const phStandalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
const phIos=()=>/iPhone|iPad|iPod/.test(navigator.userAgent);
const phScreen=()=>PT==='sessions'||PT==='settings'?PT:V.isNew?(PT==='new'?'new':'home'):'session';
function phInit(){
  document.documentElement.classList.add('ph');
  {const m=/^#s=([^&]+)(?:&do=(\w+))?/.exec(location.hash);if(m){phAfter={s:decodeURIComponent(m[1]),act:m[2]||null};PT='session';history.replaceState(null,'','#'+phAfter.s)}}
  const nav=document.createElement('nav');nav.className='ptabs';nav.id='ptabs';
  nav.innerHTML=[['home','home','Home'],['sessions','list','Sessions'],['new','plus','New'],['settings','cog','Settings']].map(([k,i,n])=>`<button data-pt="${k}">${svg(i)}<span>${n}</span><u></u></button>`).join('');
  document.body.appendChild(nav);nav.onclick=e=>{const b=e.target.closest('[data-pt]');if(b)phGo(b.dataset.pt)};
  const back=document.createElement('button');back.className='ib phback';back.id='phBack';back.innerHTML=svg('chev-l');back.onclick=()=>history.state?.ph?history.back():phGo('sessions');
  document.querySelector('.head').prepend(back);
  const cache=document.createElement('div');cache.id='phCache';cache.className='phcache';document.querySelector('.hd').appendChild(cache);
  const pill=document.createElement('button');pill.className='phpill';pill.id='phPill';pill.onclick=e=>{e.stopPropagation();phOpen('main')};$('bAttach').after(pill);
  const use=document.createElement('button');use.className='phuse';use.id='phUse';use.hidden=true;pill.after(use);
  const ring=document.createElement('button');ring.className='ctx phctx';ring.id='phCtx';ring.hidden=true;use.after(ring);ring.onclick=e=>{e.stopPropagation();phOpen('ctx')};
  use.onclick=e=>{e.stopPropagation();const n=use.dataset.to;if(!n)return;if(V.isNew){V.profile=n;loadDefaults()}else choose('profile',n);V.limBase=null;render()};
  const sum=document.createElement('button');sum.className='phsum';sum.id='phSum';sum.onclick=()=>phOpen('main');$('box').after(sum);
  const d=document.createElement('div');d.id='phDim';d.className='phdim';d.hidden=true;d.innerHTML='<div class="phdr" id="phDr"></div>';document.body.appendChild(d);
  d.addEventListener('pointerdown',e=>{if(e.target===d)phClose()});$('phDr').onclick=phDrawerClick;
  const s=document.createElement('div');s.id='phSet';s.className='phset';$('main').appendChild(s);s.onclick=phSetClick;s.addEventListener('change',phSetChange);
  $('hello').textContent='What are we working on?';
  $('bAttach').dataset.i='plus';hydrate($('bAttach').parentNode);
  // The preview's Open in browser would leave the app in a window Back cannot get out of; the phone gets Fit instead:
  // the page laid out at a desktop width and scaled down to the screen, as a browser shows a page made for a computer.
  $('bExt').dataset.i='zoomout';$('bExt').dataset.tip='Fit the whole page';hydrate($('bExt').parentNode);
  V.pvFit=localStorage.getItem('ww.pvFit')==='1';   // Fit stays as you left it, across previews and visits
  $('bExt').onclick=()=>{V.pvFit=!V.pvFit;localStorage.setItem('ww.pvFit',V.pvFit?'1':'0');phFit()};addEventListener('resize',phFit);
  // Zoomed out, a swipe in from the left or right edge goes to the previous or next preview. The page takes its own
  // touches, so two thin strips over its edges catch these.
  for(const d of [-1,1]){const e=document.createElement('div');e.className='phedge '+(d<0?'l':'r');e.innerHTML=`<i>${svg(d<0?'chev-l':'chev-r')}</i>`;$('pvw').appendChild(e);
    let x0=null,dx=0;const pull=v=>{e.style.setProperty('--dx',v+'px');e.classList.toggle('arm',Math.abs(v)>=56)};
    e.addEventListener('touchstart',t=>{x0=t.touches[0].clientX;dx=0;e.classList.add('drag')},{passive:true});
    e.addEventListener('touchmove',t=>{if(x0==null)return;t.preventDefault();dx=t.touches[0].clientX-x0;pull(Math.max(0,Math.min(80,-d*dx))*-d)},{passive:false});
    const end=()=>{if(x0==null)return;x0=null;e.classList.remove('drag');const go=-d*dx>=56;pull(0);if(go)step(d)()};
    e.addEventListener('touchend',end,{passive:true});e.addEventListener('touchcancel',()=>{x0=null;e.classList.remove('drag');pull(0)},{passive:true})}   // the phone's own picker offers the camera, photos and files
  // Swipe up on the box, or on the line under it, opens the drawer. It opens while the finger moves, so a gesture the
  // browser takes over (a focused box, the keyboard moving the page) still counts. Text that scrolls keeps its swipe.
  for(const el of [$('box'),sum]){let y0=null;
    el.addEventListener('touchstart',e=>{const ta=e.target.closest('textarea');y0=ta&&ta.scrollHeight>ta.clientHeight+1?null:e.touches[0].clientY},{passive:true});
    el.addEventListener('touchmove',e=>{if(y0!=null&&y0-e.touches[0].clientY>40){y0=null;phOpen('main')}},{passive:true});
    el.addEventListener('touchend',()=>{y0=null},{passive:true});el.addEventListener('touchcancel',()=>{y0=null},{passive:true})}
  phDrag();phSwipeDone();
  $('list').addEventListener('click',e=>{const b=e.target.closest('.sess[data-id]');if(b&&!e.target.closest('[data-dots]'))PT='session'},true);
  $('dash').addEventListener('click',e=>{if(e.target.closest('[data-sid],[data-made],[data-ch]'))PT='session'},true);
  // Back closes an open preview (or other panel) first, and only then leaves the session
  addEventListener('popstate',()=>{if(phSkipPop){phSkipPop=false;return}
    if(!$('panel').hidden&&!history.state?.pane){V.pv=null;V.full=false;V.side=null;renderPanel();return}
    if(!V.isNew&&PT==='session'){PT='sessions';render()}});
  addEventListener('beforeinstallprompt',e=>{e.preventDefault();phInstall=e;phSettings();phAddUi()});
  addEventListener('appinstalled',()=>{phAdded=true;phAsk=false;phSettings();phAddUi()});
  const strip=document.createElement('div');strip.id='phStrip';strip.className='phstrip';strip.hidden=true;$('dash').before(strip);strip.onclick=phAddClick;
  phAsk=!phStandalone()&&!sessionStorage.getItem('ww.addAsked');phAddUi();
  navigator.serviceWorker?.addEventListener('message',e=>{if(e.data?.ww==='open')phFromNote(e.data.session,e.data.act)});
  navigator.serviceWorker?.register('/sw.js').then(()=>phResubscribe()).catch(()=>{});
  api('phone/me').then(m=>{phMe=m;phRender()}).catch(()=>{});
  setInterval(()=>{phViewing();phCache()},30000);document.addEventListener('visibilitychange',phViewing);
}
// On the phone the panel covers the screen, so it gets its own step in the history: Back closes it. Closed another
// way (its ×), that step is taken back so the next Back leaves the session.
let phSkipPop=false;
function phPane(){const on=!$('panel').hidden&&phScreen()==='session',st=history.state;
  if(on&&!st?.pane){if(st?.ph!==V.sel)history.pushState({ph:V.sel},'','#'+V.sel);history.pushState({ph:V.sel,pane:1},'','#'+V.sel)}
  else if(!on&&st?.pane){phSkipPop=true;history.back()}}
const PH_FIT=980;
function phFit(){const st=$('stage'),on=!!V.pvFit;$('pvw').classList.toggle('fit',on);$('bExt').classList.toggle('on',on);
  $('pvw').classList.toggle('many',pvList().length>1);$('pvw').style.setProperty('--st',st.offsetTop+'px');
  if(on&&st.clientWidth){const k=st.clientWidth/PH_FIT;st.style.setProperty('--fs',k);st.style.setProperty('--fh',st.clientHeight/k+'px')}}
function phGo(k){phClose();if(k==='home'||k==='new'){PT=k;newSession();if(k==='home')$('input').blur()}else{PT=k;render()}if(k==='settings')phSettings();$('scroll').scrollTop=0}
function phFromNote(sid,act){if(!sid)return;phAfter={s:sid,act};PT='session';openSession(sid)}
function phRender(){
  const sc=phScreen();document.documentElement.dataset.pt=sc;phAddUi();
  $('ptabs').querySelectorAll('[data-pt]').forEach(b=>b.classList.toggle('on',b.dataset.pt===sc));
  $('ptabs').querySelector('[data-pt=sessions] u').textContent=A.sessions.filter(s=>s.status==='wait').length||'';
  if(sc==='session'&&history.state?.ph!==V.sel)history.pushState({ph:V.sel},'','#'+V.sel);
  if(sc==='new')$('title').textContent='New session';
  if(sc==='settings')$('title').textContent='Settings';
  if(phAfter&&V.sel===phAfter.s&&!V.loading){const {s,act}=phAfter;phAfter=null;if(act==='stay')api(`sessions/${s}/stay`,{}).catch(()=>{});if(act==='go')api(`sessions/${s}/go-now`,{}).catch(err=>oops(err.message))}
  phPill();phCache();clearTimeout(phVT);phVT=setTimeout(phViewing,300);
  if(sc==='settings'&&document.activeElement?.id!=='phName')phSettings();
  if(!$('phDim').hidden)phDrawer();
}
// The one window that matters in the pill: 5h, unless 7d is closer to its limit. Amber or red always shows; amber shows
// when it resets instead of a bar; full shows when it clears, and the profile with the most room next to it.
function phPill(){
  // the context, as a ring beside the pill; from 80% with its number, and the pill gives up its bar to make room
  const c=!V.isNew&&V.context,cp=c?Math.min(100,Math.round(c.used/c.window*100)):0,full=cp>=80,rg=$('phCtx');
  rg.hidden=!c;rg.className='ctx phctx'+(full?' mid':'');rg.innerHTML=c?`<i class="ring" style="--p:${cp}"></i>${full?`<span class="pct">${cp}%</span>`:''}`:'';
  rg.setAttribute('aria-label',c?`Context ${cp}% used`:'');
  const cur=profile(curProfile()),h5=cur?.h5,d7=cur?.d7;let k='5h',v=h5,r=cur?.r5;
  if(d7!=null&&(h5==null||d7>=80&&d7>h5)){k='7d';v=d7;r=cur?.r7}   // the 5h window, unless the week is near its end and closer than it
  const m=shownModel()?modelName(shownModel()).split(' ')[0]:'Default';
  const lim=v==null?'':v>=100?`<b>${k} full</b>${r?`<small> · clears ${clock(r*1000)}</small>`:''}`:v>=80?`<b>${k} ${Math.round(v)}%</b>${r?`<small> · ${clock(r*1000)}</small>`:''}`
    :`<span class="pk">${k}</span>${full?'':`<span class="pbr"><i style="width:${Math.max(4,v)}%"></i></span>`}${Math.round(v)}%`;
  $('phPill').innerHTML=(lim?`<span class="pl">${lim}</span><i class="pdot">·</i>`:'')+`<span>${esc(m)}</span>${svg('chev-d','cv')}`;
  $('phPill').className='phpill '+lvl(v??0);
  const alt=v>=100?roomOrder(A.profiles).find(p=>p.name!==cur?.name&&Math.max(p.h5||0,p.d7||0)<100):null,u=$('phUse');
  u.hidden=!alt;if(alt){u.dataset.to=alt.name;u.innerHTML=`Use ${esc(alt.name)} ${svg('chev-r')}`}
  if(V.isNew){const pr=A.projects.find(p=>p.cwd===V.project),eff=EFFORTS.find(x=>x[0]===shownEffort())?.[1];
    $('phSum').innerHTML=`<b>${esc(pr?.name||'Pick a project')}</b> on <b>${esc(curProfile()||'a profile')}</b>, ${esc(shownModel()?modelName(shownModel()):'default model')}${eff&&eff!=='Default'?' '+esc(eff.toLowerCase()):''}, ${esc(MODE_SAY[shownMode()]||modeName(shownMode()))} ${svg('chev-d','cv')}`}
}
// Under the session's title: whether its prompt cache is still warm.
function phCache(){
  const el=$('phCache'),s=selSession();if(!el)return;
  if(V.isNew||!s){el.innerHTML='';return}
  const end=s.status!=='idle'?null:coldAt(s.reply),left=end?warmLeft(end):0;
  el.className='phcache '+(s.status!=='idle'?'go':left>600000?'go':left>0?'mid':'');
  el.innerHTML=s.status==='work'?'<i></i>Working':s.status==='wait'?'<i></i>Waiting for you':left>600000?`<i></i>Warm · ${hm(left)}`:left>0?`<i></i>Cools in ${hm(left)}`:'<i></i>Cache cold';
}
function phViewing(){const id=!document.hidden&&!V.isNew&&V.sel?V.sel:null;if(id===phLastV.id&&performance.now()-phLastV.at<25000)return;phLastV={id,at:performance.now()};api('phone/viewing',{sessionId:id}).catch(()=>{})}

/* the drawer: "Start in" for a new session, "This session" for one open; the context page behind it */
function phOpen(k){if(phScreen()==='home')return;phDr=k;$('phDim').hidden=false;if(k==='ctx')phCtxLoad();phDrawer();if(k==='main')loadDefaults()}
function phCtxLoad(){phDr='ctx';const id=V.sel;V.ctx={id,at:performance.now()};
  api(`sessions/${id}/context`).then(r=>{V.ctx={id,at:performance.now(),rows:r.rows}},err=>{V.ctx={id,at:-Infinity,err:'The breakdown is not available ('+err.message+')'}}).then(()=>{if(phDr==='ctx'&&V.sel===id)phDrawer()})}
function phClose(){phDr=null;$('phDim').hidden=true;const dr=$('phDr');dr.style.transform=dr.style.transition='';$('phDim').style.background=''}
// Pulled down from its top (or from anywhere once its list is scrolled to the top), the drawer follows the finger and
// closes past a third of its height or on a quick flick; short of that it springs back.
// Swiped left in the Sessions list, a row is marked done (or, when done, goes back to the inbox), as in a mail app.
function phSwipeDone(){
  const L=$('list');let row=null,x0=0,y0=0,dx=0,dir=null,bg=null,swiped=-1e9;
  L.addEventListener('click',e=>{if(performance.now()-swiped<400){e.stopPropagation();e.preventDefault()}},true);
  const reset=()=>{if(bg)bg.remove();if(row){row.style.transform=row.style.transition='';row.classList.remove('swp')}row=bg=null;dir=null};
  L.addEventListener('touchstart',e=>{reset();const r=e.target.closest('.sess[data-id]');if(!r||r.classList.contains('ren'))return;row=r;x0=e.touches[0].clientX;y0=e.touches[0].clientY;dx=0},{passive:true});
  L.addEventListener('touchmove',e=>{if(!row)return;const t=e.touches[0],mx=t.clientX-x0,my=t.clientY-y0;
    if(!dir){if(Math.abs(mx)<8&&Math.abs(my)<8)return;dir=Math.abs(mx)>Math.abs(my)&&mx<0?'x':'y';if(dir==='y'){row=null;return}
      const s=A.sessions.find(x=>x.id===row.dataset.id);bg=document.createElement('div');bg.className='phswipe'+(s?.done?' back':'');
      bg.innerHTML=`${svg(s?.done?'refresh':'check')}<span>${s?.done?'Inbox':'Done'}</span>`;
      row.classList.add('swp');bg.style.top=row.offsetTop+'px';bg.style.left=row.offsetLeft+'px';bg.style.width=row.offsetWidth+'px';bg.style.height=row.offsetHeight+'px';row.before(bg)}
    e.preventDefault();dx=Math.min(0,mx);row.style.transform=`translateX(${dx}px)`;bg.classList.toggle('arm',-dx>row.offsetWidth*.3)},{passive:false});
  const end=()=>{if(!row||dir!=='x')return reset();const r=row,b=bg,go=-dx>r.offsetWidth*.3;
    swiped=performance.now();   // the lift is not a tap
    r.style.transition='transform .2s ease-out';r.style.transform=go?'translateX(-100%)':'';row=bg=null;dir=null;
    setTimeout(()=>{b.remove();r.style.transform=r.style.transition='';r.classList.remove('swp');if(go){const s=A.sessions.find(x=>x.id===r.dataset.id);if(s){s.done=!s.done;s.unread=false;api(`sessions/${s.id}/done`,{on:s.done}).catch(err=>{s.done=!s.done;oops(err.message);render()});render()}}},200)};
  L.addEventListener('touchend',end,{passive:true});L.addEventListener('touchcancel',()=>reset(),{passive:true});
}
function phDrag(){
  const dr=$('phDr'),dim=$('phDim');let y0=null,dy=0,t0=0,on=false;
  const set=y=>{dr.style.transform=y?`translateY(${y}px)`:'';dim.style.background=y?`rgba(0,0,0,${.45*Math.max(0,1-y/dr.offsetHeight)})`:''};
  dr.addEventListener('touchstart',e=>{y0=dr.scrollTop<=0?e.touches[0].clientY:null;dy=0;on=false;t0=performance.now();dr.style.transition=''},{passive:true});
  dr.addEventListener('touchmove',e=>{if(y0==null)return;dy=e.touches[0].clientY-y0;
    if(!on&&dy<=6){if(dy<-6)y0=null;return}   // an upward move is the list scrolling
    on=true;e.preventDefault();set(Math.max(0,dy))},{passive:false});
  const end=()=>{if(!on){y0=null;return}on=false;y0=null;const fast=dy/(performance.now()-t0)>.6&&dy>30;
    dr.style.transition='transform .2s ease-out';dim.style.transition='background .2s';
    if(fast||dy>dr.offsetHeight/3){set(dr.offsetHeight);setTimeout(()=>{dim.style.transition='';phClose()},200)}else{set(0);setTimeout(()=>{dr.style.transition=dim.style.transition=''},200)}};
  dr.addEventListener('touchend',end,{passive:true});dr.addEventListener('touchcancel',end,{passive:true});
}
const phBar=(v,r)=>`<span class="dbar ${lvl(v??0)}"><span class="db"><i style="width:${Math.min(100,v||0)}%"></i></span><span class="dv">${v==null?'–':Math.round(v)+'%'}</span><small>${r?until(r):''}</small></span>`;
function phDrawer(){
  const nw=V.isNew,dr=$('phDr'),c=!nw&&V.context;
  if(phDr==='ctx'&&c){
    const d=V.ctx?.id===V.sel?V.ctx:null,pct=Math.min(100,Math.round(c.used/c.window*100)),COL=['var(--accent)','var(--warn)','var(--go)','var(--dim)','var(--hot)'],rows=d?.rows||[];
    dr.innerHTML=`<div class="pdg"></div><div class="pdh"><button class="ib" data-dback>${svg('chev-l')}</button><b>What fills the context</b></div>
      <div class="pbig"><b>${kTok(c.used)}</b><small>of ${kTok(c.window)}</small><em>${pct}%</em></div>`
      +(rows.length?`<div class="cbar">${rows.slice(0,5).map((r,i)=>`<i style="width:${Math.min(100,r.tokens/c.window*100)}%;background:${COL[i]}"></i>`).join('')}</div>`+rows.map((r,i)=>`<div class="pit"><i style="background:${COL[i%5]}"></i><span>${esc(r.name)}</span><b>${kTok(r.tokens)}</b></div>`).join('')
        :`<div class="cbar"><i style="width:${pct}%;background:var(--accent)"></i></div><div class="cap2">${d?.err?esc(d.err):'Counting what fills it…'}</div>`);
    return}
  const seg=(k,list,cur)=>`<div class="pseg">${list.map(([v,n])=>`<button class="${v===cur?'on':''}" data-${k}="${esc(v)}">${esc(n)}</button>`).join('')}</div>`;
  const dm=V.def.model,de=V.def.effort,cur=curProfile();
  const models=MODELS.filter(x=>x[0]||!dm).map(([v,n])=>[v,n.split(' ')[0]]),effs=EFFORTS.filter(x=>x[0]||!de).map(([v,n])=>[v,n==='Medium'?'Med':n]);
  const recent=[...A.projects].sort((a,b)=>(b.recent?1:0)-(a.recent?1:0)).slice(0,8);
  const off=isWorking()||!!V.handing;
  dr.innerHTML=`<div class="pdg"></div><div class="pdh"><b>${nw?'Start in':'This session'}</b></div>`
    +(nw?`<div class="pdl">Project</div><div class="pchips">${recent.map(p=>`<button class="${p.cwd===V.project?'on':''}" data-dproj="${esc(p.cwd)}">${esc(p.name)}</button>`).join('')}</div>`:'')
    +`<div class="pdl">Profile</div>`+roomOrder(A.profiles).map(p=>`<button class="prw ${p.name===cur?'on':''}" data-dprof="${esc(p.name)}">${p.name===cur?svg('check','ck'):'<span class="ck"></span>'}<b>${esc(p.name)}</b><span class="pk">5h</span>${phBar(p.h5,p.r5)}<span class="pk">7d</span>${phBar(p.d7,p.r7)}</button>`).join('')
    +`<div class="pdl">Model</div>${seg('dm',models,shownModel())}<div class="pdl">Effort</div>${seg('de',effs,shownEffort())}<div class="pdl">Permissions</div>${seg('dmode',modeList().map(([v])=>[v,MODE_SHORT[v]||v]),shownMode())}`
    +(c?`<div class="pdl">Context</div><button class="pctx" data-dctx><i class="ring" style="--p:${Math.min(100,Math.round(c.used/c.window*100))}"></i><b>${kTok(c.used)}</b><span>${Math.min(100,Math.round(c.used/c.window*100))}%</span><span class="gap"></span><em>What fills it</em>${svg('chev-r')}</button>
      <div class="pact"><button class="pri" data-dho ${off?'disabled':''}>${svg('arrow-r')}<span><b>Continue in a new session</b><small>A handoff carries the work over</small></span></button><button data-dcompact ${off?'disabled':''}>${svg('compress')}<span><b>Summarise to make room</b><small>Compact · earlier detail fades</small></span></button></div>`:'')
    +(!nw&&selSession()?`<div class="pact"><button data-ddone>${svg(selSession().done?'refresh':'check')}<span><b>${selSession().done?'Back to the inbox':'Mark done'}</b><small>${selSession().done?'It shows in Sessions again':'It leaves Sessions; search still finds it'}</small></span></button></div>`:'');
}
async function phDrawerClick(e){
  const t=e.target.closest('button');if(!t)return;const d=t.dataset;
  if('dback' in d){phDr='main';return phDrawer()}
  if(d.dproj){V.project=d.dproj;render();await loadDefaults()}
  else if(d.dprof){if(V.isNew){V.profile=d.dprof;await loadDefaults()}else{choose('profile',d.dprof);V.limBase=null}render()}
  else if('dm' in d){choose('model',d.dm);renderComposer()}
  else if('de' in d){choose('effort',d.de);renderComposer()}
  else if(d.dmode){await pickMode(d.dmode)}
  else if('dctx' in d)phCtxLoad()
  else if('ddone' in d){const s=selSession();phClose();if(!s)return;const on=!s.done;await setDone(s,on);if(on)phGo('sessions');return}
  else if('dho' in d){if(isWorking()||V.handing)return;phClose();handOff();return}
  else if('dcompact' in d){if(isWorking())return;phClose();sendText('/compact');return}
  phRender();phDrawer();
}

/* Not on the Home Screen yet: in a browser tab, each visit asks right where the phone lands (Chrome's own install box
   once it offers one, until then where its menu has it), then a strip on Home stays until it is added or put off for a
   week. Chrome leaves the tab open after adding it, so the tab then says where Workwood is now. */
let phAsk=false,phAdded=false;
const PH_LATER='ww.addLater';
function phAddUi(){
  const el=$('phAdd')||Object.assign(document.createElement('div'),{id:'phAdd',onclick:phAddClick}),sa=phStandalone(),icon='<img src="/icon-192.png" alt="">';
  if(!el.isConnected)document.body.appendChild(el);
  if(phAdded&&phAdded!=='kept'&&!sa){el.className='phok';el.hidden=false;
    if(!el.querySelector('[data-padd-keep]'))el.innerHTML=`${icon}<h2>Workwood is on your Home Screen</h2><p>Open it from there. You can close this tab.</p><button data-padd-keep>Keep using the browser</button>`}
  else if(phAsk&&!phAdded&&!sa){el.className='phdim';el.hidden=false;const k=phInstall?'go':phIos()?'ios':'menu';
    if(el.dataset.k!==k){el.dataset.k=k;el.innerHTML=`<div class="phdr phadd"><div class="pdg"></div><div class="pah">${icon}<span><b>Add Workwood</b><small>to your Home Screen</small></span></div>${
      k==='go'?'<p>Opens full screen like an app, and can tell you when a session needs you.</p>'
      :k==='ios'?'<div class="pahow">Tap <b>Share</b> › <b>Add to Home Screen</b>, then open Workwood from there. Notifications need it.</div>'
      :'<div class="pahow">Tap <b>⋮</b> at the top › <b>Add to Home screen</b> or <b>Install app</b></div>'
    }<div class="pabt"><button data-padd-no>Not now</button>${k==='go'?'<button class="y" data-padd-go>Add</button>':''}</div></div>`}}
  else{el.hidden=true;el.dataset.k=''}
  const st=$('phStrip');if(!st)return;
  const show=!sa&&!phAdded&&!phAsk&&!(Number(localStorage.getItem(PH_LATER))>Date.now());
  st.hidden=!show;if(show&&!st.innerHTML)st.innerHTML=`${icon}<span>Add to Home Screen<small>Full screen, with notifications</small></span><button class="y" data-padd-strip>Add</button><button class="ib" data-padd-later aria-label="Not this week">${svg('x')}</button>`;
}
async function phAddNow(){
  const e=phInstall;if(!e){phAsk=true;phAddUi();return}
  phInstall=null;e.prompt();const c=await e.userChoice.catch(()=>null);
  if(c?.outcome==='accepted')phAdded=true;phAskDone();phSettings();
}
function phAskDone(){phAsk=false;sessionStorage.setItem('ww.addAsked','1');phAddUi()}
function phAddClick(e){const t=e.target;
  if(t.closest('[data-padd-go],[data-padd-strip]'))return phAddNow();
  if(t.closest('[data-padd-no]')||t.id==='phAdd'&&t.classList.contains('phdim'))return phAskDone();
  if(t.closest('[data-padd-keep]')){phAdded='kept';phAddUi();return}
  if(t.closest('[data-padd-later]')){localStorage.setItem(PH_LATER,String(Date.now()+7*864e5));phAddUi()}}

/* this phone's settings: its name, what it is told, and unpairing. Until it is set up, how to finish. */
function phSettings(){
  const el=$('phSet');if(!el||PT!=='settings')return;const me=phMe;
  if(!me){el.innerHTML='<div class="cap2">Loading…</div>';return}
  const sa=phStandalone(),perm=typeof Notification==='undefined'?'none':Notification.permission,pushOk=me.push&&perm==='granted';
  const sw=(on,attr)=>`<i class="stog ${on?'on':''}" ${attr}></i>`;
  const setup=sa&&pushOk?'':`<div class="pgl">Finish setting up</div><div class="pgrp">
    <div class="pitm"><span class="pn2 ${sa?'ok':''}">${sa?svg('check'):'1'}</span><span class="tx">Add to Home Screen<small>${sa?'Done':phAdded?'Added. Open it from your Home Screen.':phInstall?'Opens like an app.':phIos()?'Share › Add to Home Screen, then open it from there.':'Browser menu › Add to Home screen.'}</small></span>${!sa&&!phAdded&&phInstall?'<button class="sval pri" data-pinstall>Add</button>':''}</div>
    <div class="pitm"><span class="pn2 ${pushOk?'ok':''}">${pushOk?svg('check'):'2'}</span><span class="tx">Allow notifications<small>${pushOk?'Done':perm==='denied'?'Blocked. Allow them for Workwood in the phone\'s settings.':phIos()&&!sa?'Open Workwood from your Home Screen first.':'When a session needs you or a turn ends.'}</small></span>${!pushOk&&perm!=='denied'&&!(phIos()&&!sa)?'<button class="sval pri" data-ppush>Allow</button>':''}</div></div>`;
  el.innerHTML=setup+`<div class="pgl">This phone</div><div class="pgrp"><div class="pitm"><span class="tx">Name</span>${phEdit?`<input class="sval sin" id="phName" value="${esc(me.name)}" maxlength="40">`:`<button class="pval" data-pname>${esc(me.name)}</button>`}</div>
    <div class="pitm"><span class="tx">Connected to</span><span class="pval">${esc(me.pc||'')}</span></div></div>
    <div class="pgl">Notify me when</div><div class="pgrp">${PH_KINDS.map(([k,n,dd])=>`<div class="pitm"><span class="tx">${n}<small>${dd}</small></span>${sw(me.kinds?.[k],`data-pkind="${k}"`)}</div>`).join('')}</div>
    ${!pushOk?'<div class="cap2" style="padding:0 6px 14px">Notifications start once they are allowed above.</div>':''}
    <div class="pgrp"><button class="pitm red" data-punpair>Unpair this phone</button></div>`;
}
const b64bytes=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-s.length%4)%4)),c=>c.charCodeAt(0));
async function phSubscribe(){
  const reg=await navigator.serviceWorker.ready;
  const sub=await reg.pushManager.getSubscription()||await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64bytes(phMe.vapid)});
  phMe=await api('phone/me',{push:sub.toJSON()});
}
// Permission given before (or the app installed again): keep the PC's copy of the subscription in step, quietly.
async function phResubscribe(){try{if(typeof Notification!=='undefined'&&Notification.permission==='granted'){await (phMe?Promise.resolve():api('phone/me').then(m=>{phMe=m}));await phSubscribe();phSettings()}}catch{}}
async function phSetClick(e){
  const t=e.target;
  try{
    if(t.closest('[data-pinstall]')){await phAddNow();return}
    if(t.closest('[data-ppush]')){const p=await Notification.requestPermission();if(p==='granted')await phSubscribe();phSettings();return}
    const k=t.closest('[data-pkind]');if(k){const kinds={...phMe.kinds,[k.dataset.pkind]:!phMe.kinds[k.dataset.pkind]};phMe={...phMe,kinds};phSettings();phMe=await api('phone/me',{kinds});return}
    if(t.closest('[data-pname]')){phEdit=true;phSettings();const i=$('phName');i.focus();i.select();return}
    if(t.closest('[data-punpair]')){if(!confirm('Unpair this phone? Scan the code on the PC again to use it.'))return;await api('phone/unpair',{});phGone();return}
  }catch(err){oops(err.message)}
}
async function phSetChange(e){if(e.target.id==='phName'){phEdit=false;try{phMe=await api('phone/me',{name:e.target.value})}catch(err){oops(err.message)}phSettings()}}
function phGone(){document.body.innerHTML='<div class="phgone"><h1>This phone is not paired</h1><p>Open Settings › Phone in Workwood on your PC and scan the code with this phone.</p></div>'}

hydrate();setTheme(themePref());if(PHONE)phInit();render();connect();
