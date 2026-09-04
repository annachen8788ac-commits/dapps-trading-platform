(()=>{
  const API=localStorage.getItem('dapps:apiBase')||'https://dapps-trading-platform-production.up.railway.app';
  const token=localStorage.getItem('dapps:token');
  const demoMode=Boolean(new URLSearchParams(location.search).get('demo'));
  const configs=[
    {product:'1-Day',code:'1-day',term:1,rate:.30,min:1000},
    {product:'7-Day',code:'7-day',term:7,rate:.36,min:10000},
    {product:'15-Day',code:'15-day',term:15,rate:.40,min:50000},
    {product:'30-Day',code:'30-day',term:30,rate:.42,min:100000},
    {product:'90-Day',code:'90-day',term:90,rate:.48,min:500000}
  ];
  const list=document.querySelector('#pledge-list');
  const amountInput=document.querySelector('#pledge-amount');
  const confirmBtn=document.querySelector('#confirm-pledge');
  if(!list||!amountInput||!confirmBtn)return;
  let selected=configs[0];
  const nfmt=n=>Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  const ifmt=n=>Number(n||0).toLocaleString('en-US',{maximumFractionDigits:0});
  const headers=()=>({Authorization:'Bearer '+token,'Content-Type':'application/json'});

  document.querySelectorAll('#page-pledge .pledge-card').forEach((card,i)=>{
    const c=configs[i];if(!c)return;
    const btn=card.querySelector('.pledge-btn');
    const meta=[...card.querySelectorAll('.pledge-meta>div')];
    if(meta[1])meta[1].innerHTML=`<span>Minimum</span><strong>${ifmt(c.min)} USDT</strong>`;
    if(btn){btn.dataset.product=c.product;btn.dataset.min=String(c.min);btn.dataset.code=c.code;btn.onclick=()=>open(c)}
  });

  function open(c){
    selected=c;
    const modal=document.querySelector('#pledge-modal');
    document.querySelector('#modal-title').textContent=`${c.product} Pledge`;
    amountInput.value='';amountInput.min=String(c.min);amountInput.placeholder=`Minimum ${ifmt(c.min)} USDT`;
    modal.classList.add('open');modal.setAttribute('aria-hidden','false');
  }

  function renderOrders(orders=[]){
    const active=orders.filter(o=>o.status==='active');
    const completed=orders.filter(o=>o.status==='completed');
    const all=[...active,...completed];
    totalPledged=active.reduce((s,o)=>s+Number(o.principal||0),0);
    list.innerHTML=all.length?all.map(o=>{
      const end=new Date(o.endAt).toLocaleString('en-US');
      const status=o.status==='active'?'Active':'Completed';
      return `<div class="pledge-row"><span><strong>${o.productName}</strong><small style="display:block;color:#8fa0bc;margin-top:3px">${Number(o.dailyRate).toFixed(2)}% daily · ${o.settledDays}/${o.termDays} days settled</small></span><strong>${nfmt(o.principal)} USDT</strong><span>Profit ${nfmt(o.totalProfit)} USDT</span><span class="${o.status==='active'?'positive':'muted'}">${status}<small style="display:block;margin-top:3px">Ends ${end}</small></span></div>`;
    }).join(''):'<div class="empty-state" style="padding:18px">No pledge orders yet.</div>';
    if(typeof updateBalances==='function')updateBalances();
  }

  async function loadOrders(){
    if(!token||demoMode)return;
    try{
      const r=await fetch(API+'/api/pledges',{headers:headers()});
      const d=await r.json();if(!r.ok)throw new Error(d.error||'Unable to load pledge orders');
      balance=Number(d.balance?.available)||0;
      renderOrders(d.orders||[]);
    }catch(e){console.error(e)}
  }

  confirmBtn.onclick=async()=>{
    const amount=Number(amountInput.value)||0;
    if(amount<selected.min)return showToast(`Minimum for ${selected.product} is ${ifmt(selected.min)} USDT.`);
    if(demoMode)return showToast('Pledge settlement for simulation accounts is not enabled in this flow.');
    if(!token)return showToast('Sign in to create a pledge order.');
    confirmBtn.disabled=true;confirmBtn.textContent='Processing…';
    try{
      const r=await fetch(API+'/api/pledges',{method:'POST',headers:headers(),body:JSON.stringify({productCode:selected.code,amount})});
      const d=await r.json();if(!r.ok)throw new Error(d.error||'Unable to create pledge order');
      balance=Number(d.balance?.available)||0;
      document.querySelector('#pledge-modal').classList.remove('open');
      document.querySelector('#pledge-modal').setAttribute('aria-hidden','true');
      amountInput.value='';showToast('Pledge order created. Daily profit will settle to available balance.');
      await loadOrders();
    }catch(e){showToast(e.message)}finally{confirmBtn.disabled=false;confirmBtn.textContent='Confirm Pledge'}
  };

  // Settlement is backend-authoritative. Loading the pledge page settles all full daily cycles due.
  loadOrders();
  setInterval(()=>{if(document.querySelector('#page-pledge')?.classList.contains('active'))loadOrders()},60000);
})();
