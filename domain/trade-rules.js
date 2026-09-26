(() => {
  const minimums = window.DAppsTradeSpec.minimums;
  const rates = window.DAppsTradeSpec.rates;
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

  

  function minForDuration(){ return minimums[Number(duration)] ?? 200; }
  function rateForDuration(){ return rates[Number(duration)] ?? 29; }
  function nextMinForDuration(){ return window.DAppsTradeSpec.nextMinimum(Number(duration)); }
  function isSimulation(){ return Boolean(new URLSearchParams(location.search).get('demo')); }

  function validateTrade(){
    const raw=amountInput.value.trim();
    const amount = raw==='' ? 0 : Number(raw)||0;
    const hasDuration=[30,60,90,180,360].includes(Number(duration));
    const min = hasDuration?minForDuration():0;
    const nextMin = hasDuration?nextMinForDuration():null;
    const rate = hasDuration?rateForDuration():0;
    const available = Number(balance) || 0;
    amountInput.min = hasDuration?min:0;
    if(hasDuration&&nextMin!=null)amountInput.max=Math.max(min,nextMin-0.01);else amountInput.removeAttribute('max');
    amountInput.placeholder = hasDuration?(nextMin==null?`Minimum ${fmt(min,0)} USDT`:`${fmt(min,0)} – under ${fmt(nextMin,0)} USDT`):'Choose duration first';
    ruleLine.innerHTML = hasDuration?(nextMin==null
      ? `<span>Minimum order</span><strong>${fmt(min,0)} USDT</strong>`
      : `<span>Order range</span><strong>${fmt(min,0)} – &lt;${fmt(nextMin,0)} USDT</strong>`):'<span>Duration</span><strong>Choose 30s / 60s / 90s / 180s / 360s</strong>';

    const empty = raw==='';
    const underMinimum = !empty && amount < min;
    const reachesNextTier = !empty && nextMin!=null && amount >= nextMin;
    const insufficient = !empty && amount > available;
    const invalid = empty || underMinimum || reachesNextTier || insufficient;
    amountInput.closest('.input-wrap')?.classList.toggle('trade-invalid', !empty && invalid);
    placeBtn.disabled = empty;

    if(!hasDuration){
      eligibility.className = 'trade-eligibility';
      eligibility.textContent = 'Choose a trade duration before opening a trade.';
      placeBtn.textContent = 'Choose Duration';
    }else if(empty){
      eligibility.className = 'trade-eligibility';
      eligibility.textContent = `Enter an order amount. Minimum for ${duration}s is ${fmt(min,0)} USDT.`;
      placeBtn.textContent = 'Enter Amount';
    }else if(underMinimum){
      eligibility.className = 'trade-eligibility';
      eligibility.textContent = `Order not eligible — ${duration}s requires at least ${fmt(min,0)} USDT.`;
      placeBtn.textContent = `Minimum ${fmt(min,0)} USDT Required`;
    }else if(reachesNextTier){
      eligibility.className = 'trade-eligibility';
      eligibility.textContent = `Order not eligible — ${fmt(nextMin,0)} USDT starts the next duration tier.`;
      placeBtn.textContent = 'Choose Next Duration';
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

  // Trade execution is owned by platform-ui.js; this module only validates and presents eligibility.
  const originalUpdateBalances = window.updateBalances;
  if(typeof originalUpdateBalances === 'function'){
    window.updateBalances = function(){ const result = originalUpdateBalances(); validateTrade(); return result; };
  }

  window.addEventListener('dapps:market-config',validateTrade);
  validateTrade();
})();