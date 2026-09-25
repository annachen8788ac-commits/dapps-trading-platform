(()=>{
  const API='/admin-api';
  let items=[],firstLoad=true,lastKeys=new Set(),timer=null,open=false;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const dt=v=>{try{return new Date(v).toLocaleString('zh-CN',{timeZone:'America/New_York',timeZoneName:'short',hour12:false})}catch{return ''}};
  async function api(path,opt={}){
    const r=await fetch(API+path,{cache:'no-store',...opt,headers:{'content-type':'application/json',...(opt.headers||{})}});
    const d=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(d.error||'请求失败');
    return d;
  }
  function style(){
    if(document.getElementById('admin-notify-style'))return;
    const s=document.createElement('style');s.id='admin-notify-style';s.textContent=`
      .admin-notify{position:relative;display:none;align-items:center;z-index:9998}
      .admin-notify-btn{position:relative;border:1px solid #2a3955;background:#152036;color:#eef4ff;border-radius:10px;padding:9px 12px;font:700 13px Inter,system-ui,sans-serif;cursor:pointer}
      .admin-notify-btn:hover{background:#1b2a45}
      .admin-notify-badge{position:absolute;right:-7px;top:-7px;min-width:19px;height:19px;padding:0 5px;border-radius:999px;background:#ff4058;color:#fff;border:2px solid #0b111b;font-size:10px;font-weight:900;display:flex;align-items:center;justify-content:center}
      .admin-notify-badge.hidden{display:none}
      .admin-notify-target{position:relative!important}
      .admin-section-badge{position:absolute;right:8px;top:50%;transform:translateY(-50%);min-width:18px;height:18px;padding:0 5px;border-radius:999px;background:#ff4058;color:#fff;border:2px solid #06101c;font-size:10px;font-weight:900;line-height:14px;text-align:center;box-shadow:0 0 0 1px rgba(255,64,88,.18)}
      .tabs .admin-section-badge{right:-7px;top:-7px;transform:none}
      .quick a.admin-notify-target .admin-section-badge{right:10px;top:10px;transform:none}
      .admin-notify-menu{position:absolute;right:0;top:calc(100% + 10px);width:min(390px,calc(100vw - 28px));max-height:520px;overflow:auto;background:#0e1624;border:1px solid #2a3955;border-radius:14px;box-shadow:0 22px 60px rgba(0,0,0,.5);display:none}
      .admin-notify-menu.open{display:block}
      .admin-notify-head{position:sticky;top:0;background:#0e1624;border-bottom:1px solid #202d43;padding:12px 14px;font-size:13px;font-weight:800;z-index:1}
      .admin-notify-empty{padding:24px 14px;text-align:center;color:#8092ad;font-size:12px}
      .admin-notify-item{width:100%;display:block;text-align:left;border:0;border-bottom:1px solid #1b283d;background:transparent;color:#eaf1fd;padding:12px 14px;cursor:pointer}
      .admin-notify-item:hover{background:#162238}
      .admin-notify-title{font-size:13px;font-weight:800;margin-bottom:4px}
      .admin-notify-text{font-size:12px;color:#a7b5c9;line-height:1.45;word-break:break-word}
      .admin-notify-time{font-size:10px;color:#667b99;margin-top:6px}
      .admin-notify-toast{position:fixed;right:22px;top:78px;z-index:10000;width:min(360px,calc(100vw - 28px));background:#142138;border:1px solid #36537a;color:#f3f7ff;padding:13px 15px;border-radius:12px;box-shadow:0 18px 48px rgba(0,0,0,.45);animation:adminNotifyIn .18s ease-out}
      .admin-notify-toast b{display:block;font-size:13px;margin-bottom:4px}.admin-notify-toast span{font-size:12px;color:#b8c7dc}
      @keyframes adminNotifyIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
      @media(max-width:720px){.admin-notify-menu{position:fixed;right:14px;top:64px}.admin-notify-toast{left:14px;right:14px;width:auto}}
    `;document.head.appendChild(s);
  }
  function mount(){
    if(document.getElementById('adminNotifications'))return;
    style();
    const wrap=document.createElement('div');wrap.id='adminNotifications';wrap.className='admin-notify';
    wrap.innerHTML='<button type="button" class="admin-notify-btn" aria-label="后台通知">通知<span class="admin-notify-badge hidden">0</span></button><div class="admin-notify-menu"><div class="admin-notify-head">未读通知</div><div class="admin-notify-list"></div></div>';
    const target=document.querySelector('.top .actions')||document.querySelector('.top');
    if(target)target.appendChild(wrap);else{wrap.style.position='fixed';wrap.style.top='14px';wrap.style.right='14px';document.body.appendChild(wrap)}
    wrap.querySelector('.admin-notify-btn').onclick=async e=>{e.stopPropagation();open=!open;wrap.querySelector('.admin-notify-menu').classList.toggle('open',open);if(open)await refresh(false)};
    wrap.querySelector('.admin-notify-menu').onclick=e=>e.stopPropagation();
    document.addEventListener('click',()=>{open=false;wrap.querySelector('.admin-notify-menu')?.classList.remove('open')});
  }
  function toast(item){
    document.querySelector('.admin-notify-toast')?.remove();
    const n=document.createElement('div');n.className='admin-notify-toast';n.innerHTML='<b>'+esc(item.title)+'</b><span>'+esc(item.text)+'</span>';document.body.appendChild(n);
    setTimeout(()=>n.remove(),4500);
  }
  function targetType(el){
    const raw=[el.dataset?.section||'',el.dataset?.tab||'',el.getAttribute?.('href')||'',el.getAttribute?.('onclick')||'',el.textContent||''].join(' ').toLowerCase();
    if(raw.includes('deposits')||raw.includes('充值审核'))return 'deposit';
    if(raw.includes('withdrawals')||raw.includes('提现审核'))return 'withdrawal';
    if(raw.includes('/kyc')||raw.includes('身份审核'))return 'kyc';
    if(raw.includes('support-chat')||raw.includes('在线客服'))return 'support_chat';
    if(raw.includes('tickets')||raw.includes('客服工单'))return 'ticket';
    if(raw.includes('recovery')||raw.includes('账号找回'))return 'recovery';
    return '';
  }
  function renderCategoryBadges(){
    const counts={};for(const item of items)counts[item.type]=(counts[item.type]||0)+1;
    document.querySelectorAll('.admin-section-badge').forEach(x=>x.remove());
    document.querySelectorAll('.nav button,.quick a,.tabs button').forEach(el=>{
      const type=targetType(el),count=counts[type]||0;if(!count)return;
      el.classList.add('admin-notify-target');
      const badge=document.createElement('span');badge.className='admin-section-badge';badge.textContent=count>99?'99+':String(count);badge.setAttribute('aria-label',count+' 条未读');el.appendChild(badge);
    });
    const card=[...document.querySelectorAll('.card')].find(x=>/待处理工单|Open Tickets/i.test(x.textContent||''));
    if(card&&(counts.ticket||0)){card.classList.add('admin-notify-target');const badge=document.createElement('span');badge.className='admin-section-badge';badge.textContent=String(counts.ticket);card.appendChild(badge)}
  }
  function render(){
    mount();
    const wrap=document.getElementById('adminNotifications');if(!wrap)return;
    const badge=wrap.querySelector('.admin-notify-badge'),list=wrap.querySelector('.admin-notify-list');
    badge.textContent=items.length>99?'99+':String(items.length);badge.classList.toggle('hidden',items.length===0);
    list.innerHTML=items.length?items.map((x,i)=>`<button type="button" class="admin-notify-item" data-i="${i}"><div class="admin-notify-title">${esc(x.title)}</div><div class="admin-notify-text">${esc(x.text)}</div><div class="admin-notify-time">${esc(dt(x.createdAt))}</div></button>`).join(''):'<div class="admin-notify-empty">暂无未读通知</div>';
    list.querySelectorAll('[data-i]').forEach(btn=>btn.onclick=()=>openItem(items[Number(btn.dataset.i)]));
    renderCategoryBadges();
  }
  async function openItem(item){
    try{await api('/notifications/read',{method:'POST',body:JSON.stringify({sourceType:item.type,sourceId:item.sourceId,seenAt:item.createdAt})})}catch{}
    items=items.filter(x=>!(x.type===item.type&&x.sourceId===item.sourceId));render();
    location.href=item.href||'/';
  }
  async function refresh(showNew=true){
    try{
      const d=await api('/notifications');
      const next=Array.isArray(d.items)?d.items:[];
      const keys=new Set(next.map(x=>x.type+':'+x.sourceId+':'+x.createdAt));
      if(!firstLoad&&showNew){const fresh=next.find(x=>!lastKeys.has(x.type+':'+x.sourceId+':'+x.createdAt));if(fresh)toast(fresh)}
      items=next;lastKeys=keys;firstLoad=false;render();const wrap=document.getElementById('adminNotifications');if(wrap)wrap.style.display='inline-flex';
    }catch{}
  }
  window.adminNotificationsRefresh=()=>refresh(false);
  window.adminMarkNotification=async(type,sourceId,seenAt=new Date().toISOString())=>{try{await api('/notifications/read',{method:'POST',body:JSON.stringify({sourceType:type,sourceId,seenAt})});await refresh(false)}catch{}};
  const start=()=>{mount();refresh(false);clearInterval(timer);timer=setInterval(()=>{if(!document.hidden)refresh(true)},5000)};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
  window.addEventListener('focus',()=>refresh(false));
})();