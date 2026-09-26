(()=>{
  const minimums=Object.freeze({30:200,60:1000,90:10000,180:50000,360:250000});
  const rates=Object.freeze({30:21,60:29,90:37,180:45,360:53});
  window.DAppsTradeSpec=Object.freeze({
    durations:Object.freeze([30,60,90,180,360]),
    minimums,
    rates
  });
})();
