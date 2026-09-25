(() => {
  const minimums = {30:200,60:1000,90:10000,180:50000,360:250000};
  const rates = {30:21,60:29,90:37,180:45,360:53};
  const amountInput = document.querySelector('#trade-amount');
  const placeBtn = document.querySelector('#place-trade');
  const durationButtons = [...document.querySelectorAll('[data-duration]')];
  const estimate = document.querySelector('.trade-estimate');
  if(!amountInput || !placeBtn || !estimate) return;

  // Never prefill an order amount. The customer must choose or enter it.
  amountInput.value='';
  amountInput.min='200';
  amountInput.placeholder='Enter amount';

  // Remove invalid quick amounts below the platform minimum and keep useful presets.
  const quick=document.querySelector('.quick-amounts');
  if(quick){
    quick.innerHTML='<button data-amount="200">200</button><button data-amount="500">500</button><button data-amount="1000">1,000</button><button data-amount="5000">5,000</button>';
  }

  let ruleLine = document.querySelector('#trade-rule-line');
  if(!ruleLine){
    ruleLine = document.createElement('div');
    ruleLine.id = 'trade-rule-line';
    ruleLine.className = 'trade-rule-line';
    amountInput.closest('.input-wrap')?.insertAdjacentElement('afterend', ruleLine);
  }

  let eligibility = document.querySelector('#trade-eligibility');
  if(!eligibility){
    eligibility = document.createElement('div');
    eligibility.id = 'trade-eligibility';
    eligibility.className = 'trade-eligibility';
    estimate.insertAdjacentElement('beforebegin', eligibility);
  }

  const style = document.createElement('style');
  style.textContent = `
    .trade-rule-line{margin:-2px 18px 12px;display:flex;justify-content:space-between;gap:10px;font-size:11px;color:#8e96aa}
    .trade-rule-line strong{color:#dfe6f5;font-weight:600}
    .trade-eligibility{margin:0 18px 12px;padding:10px 12px;border-radius:9px;border:1px solid rgba(255,91,103,.28);background:rgba(255,91,103,.07);color:#ff8b94;font-size:12px;line-height:1.45}
    .trade-eligibility.ready{border-color:rgba(40,199,124,.28);background:rgba(40,199,124,.07);color:#65d99c}
    .input-wrap.trade-invalid{border-color:rgba(255,91,103,.65);box-shadow:0 0 0 2px rgba(255,91,103,.08)}
    .submit-trade:disabled{cursor:not-allowed;opacity:.48;filter:saturate(.45);box-shadow:none}
    .duration-grid button small{display:block;margin-top:4px;font-size:9px;color:inherit;opacity:.78}
    @media(max-width:720px){.trade-rule-line,.trade-eligibility{margin-left:18px;margin-right:18px}.trade-eligibility{font-size:11px}}
  `;
  document.head.appendChild(style);

  function minForDuration(){ return minimums[Number(duration)] ?? 200; }
  function rateForDuration(){ return rates[Number(duration)] ?? 29; }
  function isSimulation(){ return Boolean(new URLSearchParams(location.search).get('demo')); }

  function validateTrade(){
    const raw=amountInput.value.trim();
    const amount = raw==='' ? 0 : Number(raw)||0;
    const min = minForDuration();
    const rate = rateForDuration();
    const available = Number(balance) || 0;
    amountInput.min = min;
    amountInput.placeholder = `Minimum ${fmt(min,0)} USDT`;
    ruleLine.innerHTML = `<span>Minimum order</span><strong>${fmt(min,0)} USDT</strong>`;

    const empty = raw==='';
    const underMinimum = !empty && amount < min;
    const insufficient = !empty && amount > available;
    const invalid = empty || underMinimum || insufficient;
    amountInput.closest('.input-wrap')?.classList.toggle('trade-invalid', !empty && invalid);
    placeBtn.disabled = invalid;

    if(empty){
      eligibility.className = 'trade-eligibility';
      eligibility.textContent = `Enter an order amount. Minimum for ${duration}s is ${fmt(min,0)} USDT.`;
      placeBtn.textContent = 'Enter Amount';
    }else if(underMinimum){
      eligibility.className = 'trade-eligibility';
      eligibility.textContent = `Order not eligible — ${duration}s requires at least ${fmt(min,0)} USDT.`;
      placeBtn.textContent = `Minimum ${fmt(min,0)} USDT Required`;
    }else if(insufficient){
      eligibility.className = 'trade-eligibility';
      eligibility.textContent = `Insufficient available balance. Required ${fmt(amount)} USDT, available ${fmt(available)} USDT.`;
      placeBtn.textContent = 'Insufficient Balance';
    }else{
      eligibility.className = 'trade-eligibility ready';
      eligibility.textContent = `Order eligible · ${duration}s · +${rate}% potential profit.`;
      placeBtn.textContent = isSimulation()?'Open Simulation Trade':'Open Trade';
    }
  }

  amountInput.addEventListener('input', validateTrade);
  document.querySelectorAll('[data-amount]').forEach(btn => btn.addEventListener('click',()=>{amountInput.value=btn.dataset.amount;validateTrade();if(typeof updatePotential==='function')updatePotential();}));

  durationButtons.forEach(btn => {
    btn.onclick = () => {
      duration = Number(btn.dataset.duration);
      durationButtons.forEach(x => x.classList.remove('active'));
      btn.classList.add('active');
      // Do not auto-fill the new minimum when duration changes.
      if(typeof updatePotential === 'function') updatePotential();
      validateTrade();
    };
  });

  placeBtn.onclick = () => {
    const amount = Number(amountInput.value) || 0;
    const min = minForDuration();
    if(amount < min){ validateTrade(); showToast(`Order blocked: minimum for ${duration}s is ${fmt(min,0)} USDT.`); return; }
    if(amount > balance){ validateTrade(); showToast('Order blocked: insufficient available balance.'); return; }
    const rate = rateForDuration();
    balance -= amount;
    activeTrades.push({id:Date.now(),market:currentMarket,dir:direction,entry:currentMarket.price,amount,duration,profitRate:rate,end:Date.now()+duration*1000});
    updateBalances(); renderPositions();
    amountInput.value='';
    if(typeof updatePotential==='function')updatePotential();
    validateTrade();
    showToast(`${direction==='up'?'Up':'Down'} ${duration}s ${isSimulation()?'simulation ':''}trade opened · +${rate}% potential profit.`);
  };

  const originalUpdateBalances = window.updateBalances;
  if(typeof originalUpdateBalances === 'function'){
    window.updateBalances = function(){ const result = originalUpdateBalances(); validateTrade(); return result; };
  }

  validateTrade();
})();