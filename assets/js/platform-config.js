(()=>{
  const fallbackApiBase='https://dapps-trading-platform-production.up.railway.app';
  const platformConfig={};
  Object.defineProperty(platformConfig,'apiBase',{
    enumerable:true,
    get(){return localStorage.getItem('dapps:apiBase')||fallbackApiBase;}
  });
  window.DAppsPlatformConfig=Object.freeze(platformConfig);

  const durations=Object.freeze([30,60,90,180,360]);
  const minimums={30:200,60:1000,90:10000,180:50000,360:250000};
  const rates={30:21,60:29,90:37,180:45,360:53};
  const enabled={30:true,60:true,90:true,180:true,360:true};

  function applyProducts(products){
    if(!Array.isArray(products))return;
    for(const p of products){
      const d=Number(p?.duration);
      if(!durations.includes(d))continue;
      const min=Number(p?.minimumAmount),rate=Number(p?.profitRate);
      if(Number.isFinite(min)&&min>=0)minimums[d]=min;
      if(Number.isFinite(rate)&&rate>=0)rates[d]=rate;
      enabled[d]=p?.enabled!==false;
    }
  }

  function nextMinimum(duration){
    const d=Number(duration),i=durations.indexOf(d);
    if(i<0||i>=durations.length-1)return null;
    const n=Number(minimums[durations[i+1]]);
    return Number.isFinite(n)?n:null;
  }

  window.DAppsTradeSpec=Object.freeze({
    durations,
    minimums,
    rates,
    enabled,
    applyProducts,
    nextMinimum
  });
})();
