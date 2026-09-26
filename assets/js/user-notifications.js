(()=>{
  const API=window.DAppsPlatformConfig.apiBase;
  const token=localStorage.getItem('dapps:token');
  let items=[],open=false,timer=null;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const headers=()=>({'Authorization':'Bearer '+token,'Content-Type':'application/json'});
  async function api(path,opt={}){
    if(!token)throw new Error('Authentication required');
    const r=await fetch(API+path,{cache:'no-store',...opt,headers:{...headers(),...(opt.headers||{})}});
    const d=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(d.error||'Request failed');
    return d;
  }
  async function mark(type,sourceId,seenAt){
    if(!token||!type||!sourceId)return;
    try{
      await api('/api/notifications/read',{method:'POST',body:JSON.stringify({sourceType:type,sourceId,seenAt:seenAt||new Date().toISOString()})});
      items=items.filter(x=>!(x.type===type&&x.sourceId===sourceId));
      render();
    }catch{}
  }
  window.userMarkNotification=mark;
  window.userNotificationsRefresh=()=>refresh();

  function mount(){
    const btn=document.querySelector('.notification-btn');if(!btn)return null;
    let wrap=btn.parentElement?.classList.contains('user-notify-wrap')?btn.parentElement:null;
    if(!wrap){
      wrap=document.createElement('span');wrap.className='user-notify-wrap';
      btn.parentNode.insertBefore(wrap,btn);wrap.appendChild(btn);
    }
    let panel=wrap.querySelector('.user-notify-panel');
    if(!panel){
      panel=document.createElement('div');panel.className='user-notify-panel';
      panel.innerHTML='<div class="user-notify-head">Notifications</div><div class="user-notify-list"></div>';
      wrap.appendChild(panel);
      btn.addEventListener('click',e=>{e.stopPropagation();if(!token){location.href='login.html';return}open=!open;panel.classList.toggle('open',open);if(open)refresh()});
      panel.addEventListener('click',e=>e.stopPropagation());
      document.addEventListener('click',()=>{open=false;panel.classList.remove('open')});
    }
    return {btn,panel};
  }
  function render(){
    const ui=mount();if(!ui)return;
    ui.btn.classList.toggle('has-unread',items.length>0);
    const list=ui.panel.querySelector('.user-notify-list');
    list.innerHTML=items.length?items.map((x,i)=>`<button class="user-notify-item" type="button" data-i="${i}"><b>${esc(x.title)}</b><span>${esc(x.text||'')}</span><small>${new Date(x.createdAt).toLocaleString('en-US',{timeZone:'America/New_York',timeZoneName:'short'})}</small></button>`).join(''):'<div class="user-notify-empty">No unread notifications</div>';
    list.querySelectorAll('[data-i]').forEach(b=>b.onclick=async()=>{const x=items[Number(b.dataset.i)];await mark(x.type,x.sourceId,x.createdAt);location.href=x.href||'profile.html'});
  }
  async function refresh(){
    if(!token){items=[];render();return}
    try{const d=await api('/api/notifications');items=Array.isArray(d.items)?d.items:[];render()}catch{}
  }
  function start(){
    const ui=mount();
    if(!ui)return;
    refresh();
    clearInterval(timer);timer=setInterval(()=>{if(!document.hidden)refresh()},5000);
    window.addEventListener('focus',refresh);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();