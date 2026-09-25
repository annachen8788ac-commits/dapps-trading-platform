(()=>{
  const params=new URLSearchParams(location.search);
  const isDemo=Boolean(params.get('demo'));
  const hasRegisteredSession=Boolean(localStorage.getItem('dapps:token')) && !isDemo;

  function applyAccountMode(){
    document.documentElement.dataset.accountMode=isDemo?'simulation':hasRegisteredSession?'registered':'guest';

    const tradeCard=document.querySelector('#page-trade .short-trade-card');
    if(tradeCard){
      const eyebrow=tradeCard.querySelector('.eyebrow');
      if(eyebrow)eyebrow.textContent=isDemo?'SIMULATION TRADE':'SHORT-TERM TRADE';
      const heading=tradeCard.querySelector('h3');
      if(heading)heading.textContent='Trade Direction';
    }

    const place=document.querySelector('#place-trade');
    if(place)place.textContent=isDemo?'Open Simulation Trade':'Open Trade';

    document.querySelectorAll('.demo-pill').forEach(el=>{
      if(isDemo){el.hidden=false;el.textContent='SIMULATION'}else el.remove();
    });

    document.querySelectorAll('.fine-print').forEach(el=>{
      if(isDemo){el.hidden=false;el.textContent='Simulation account. No deposit or withdrawal is used in this mode.'}
      else el.remove();
    });

    const portfolioNote=document.querySelector('.positions-heading .muted');
    if(portfolioNote)portfolioNote.textContent=isDemo?'Simulation account':'Account portfolio';

    const assetNote=document.querySelector('.asset-main small');
    if(assetNote && !isDemo){
      assetNote.textContent=hasRegisteredSession?'Account balance':'Sign in to view account balance';
      assetNote.className='muted';
    }

    if(hasRegisteredSession){
      const replacements=[
        ['Open Demo Trade','Open Trade'],['Demo Trade','Trade'],['DEMO',''],['Demo portfolio','Account portfolio'],
        ['Simulation only.',''],['Simulation Account',''],['simulation account','account']
      ];
      const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
      const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
      nodes.forEach(node=>{let v=node.nodeValue;replacements.forEach(([a,b])=>{v=v.split(a).join(b)});node.nodeValue=v});
    }
  }

  applyAccountMode();
  window.addEventListener('pageshow',applyAccountMode);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)applyAccountMode()});
  setTimeout(applyAccountMode,100);
})();