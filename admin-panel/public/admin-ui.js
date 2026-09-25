(()=>{const nativeAlert=window.alert.bind(window);let pending=0,lastClicked=null,lastClickedAt=0,lastAlertAt=0,progressTimer=null,genericTimer=null;
function ready(){if(document.querySelector('.admin-toast-stack'))return;const p=document.createElement('div');p.className='admin-progress';document.body.appendChild(p);const s=document.createElement('div');s.className='admin-toast-stack';s.setAttribute('aria-live','polite');document.body.appendChild(s);const h=document.createElement('div');h.className='admin-action-hint';h.textContent='操作处理中…';document.body.appendChild(h)}
function progress(on){ready();const p=document.querySelector('.admin-progress'),h=document.querySelector('.admin-action-hint');if(on){pending++;p.classList.add('show');p.style.width=Math.min(86,22+pending*14)+'%';h.classList.add('show');clearTimeout(progressTimer)}else{pending=Math.max(0,pending-1);if(!pending){p.style.width='100%';h.classList.remove('show');progressTimer=setTimeout(()=>{p.classList.remove('show');p.style.width='0'},220)}}}
function classify(m){const s=String(m||'');if(/失败|错误|无效|过期|拒绝|未找到|incorrect|invalid|failed|error|unable|expired|not found/i.test(s))return'error';if(/成功|已保存|已通过|已更新|已完成|已启用|已解锁|已重置|success|saved|approved|updated|completed|enabled|unlocked|reset/i.test(s))return'success';return'info'}
function notify(message,type=classify(message),title){ready();const stack=document.querySelector('.admin-toast-stack'),n=document.createElement('div');n.className='admin-toast '+type;const icon=type==='success'?'✓':type==='error'?'!':'i';n.innerHTML='<div class="admin-toast-icon">'+icon+'</div><div><div class="admin-toast-title">'+(title||(type==='success'?'操作成功':type==='error'?'操作失败':'操作提示'))+'</div><div class="admin-toast-text"></div></div>';n.querySelector('.admin-toast-text').textContent=String(message||'');stack.appendChild(n);const close=()=>{if(n.classList.contains('out'))return;n.classList.add('out');setTimeout(()=>n.remove(),190)};n.onclick=close;setTimeout(close,type==='error'?5000:2800);return n}
window.adminToast=notify;
window.alert=m=>{lastAlertAt=Date.now();const s=String(m??'');if(/RECOVERY CODE|一次性恢复码|恢复码：/i.test(s))return nativeAlert(s);notify(s)};
document.addEventListener('click',e=>{const b=e.target.closest('button,.btn');if(b&&!b.disabled){lastClicked=b;lastClickedAt=Date.now()}});
const rawFetch=window.fetch.bind(window);
window.fetch=async(input,init={})=>{const url=typeof input==='string'?input:String(input?.url||''),method=String(init?.method||input?.method||'GET').toUpperCase(),adminReq=url.includes('/admin-api'),mutation=adminReq&&!['GET','HEAD'].includes(method);let btn=null,original='',ok=false;
if(mutation){progress(true);if(lastClicked&&Date.now()-lastClickedAt<1000){btn=lastClicked;original=btn.textContent;btn.disabled=true;btn.classList.add('is-processing');btn.textContent='处理中…'}}
try{const r=await rawFetch(input,init);if(mutation){ok=r.ok;if(!r.ok){let data={};try{data=await r.clone().json()}catch{}notify(data?.error||('请求失败（'+r.status+'）'),'error')}}return r}
catch(err){if(mutation)notify(err?.message||'网络请求失败','error');throw err}
finally{if(btn){btn.classList.remove('is-processing','is-complete');btn.disabled=false;btn.textContent=original}if(mutation)progress(false)}};
function consumeEscape(e){e.preventDefault();e.stopPropagation()}
function goAdminBack(){try{const ref=document.referrer?new URL(document.referrer):null;if(ref&&ref.origin===location.origin&&ref.href!==location.href&&history.length>1){history.back();return}}catch{}location.href='/'}
function handleEscape(e){if(e.key!=='Escape')return;
  if(window.adminCloseNotifications?.()){consumeEscape(e);return}
  if(window.adminEscapeBack?.()){consumeEscape(e);return}
  const modal=[...document.querySelectorAll('.modal.open,[aria-modal="true"].open')].pop();if(modal){const close=modal.querySelector('[data-close],.modal-close,#closeProof,.close');if(close instanceof HTMLElement)close.click();else{modal.classList.remove('open');modal.setAttribute('aria-hidden','true')}consumeEscape(e);return}
  const detail=[...document.querySelectorAll('.detail.open')].pop();if(detail){detail.classList.remove('open');consumeEscape(e);return}
  const notice=document.querySelector('.admin-notify-toast');if(notice){notice.remove();consumeEscape(e);return}
  if(document.activeElement&&/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)){document.activeElement.blur();consumeEscape(e);return}
  if(location.pathname==='/'||location.pathname.endsWith('/index.html')){const active=document.querySelector('.section.active');if(active&&active.id!=='dashboard'){document.querySelector('.nav [data-section="dashboard"]')?.click();consumeEscape(e);return}}
  if(['/wallet','/kyc','/trades','/support-chat','/user'].includes(location.pathname)){consumeEscape(e);goAdminBack()}
}
document.addEventListener('keydown',handleEscape,true);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready()})();