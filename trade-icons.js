// Resolution-independent market marks. Every shape is drawn locally as SVG.
(()=>{
  const marks={
    BTC:`<text x="32" y="44" text-anchor="middle" font-size="43" font-weight="800" fill="#fff">₿</text>`,
    ETH:`<path d="M32 8 17 33l15 8 15-8L32 8Z" fill="#eef3ff"/><path d="m17 37 15 19 15-19-15 8-15-8Z" fill="#bac7ff"/><path d="m32 8 15 25-15 8V8Zm0 37 15-8-15 19V45Z" fill="#8ea5ff"/>`,
    SOL:`<path d="M17 16h33l-7 7H10l7-7Zm4 13h33l-7 7H14l7-7Zm-7 13h33l-7 7H7l7-7Z" fill="#9cfbd0"/><path d="m10 23 7-7h33l-7 7H10Zm4 13 7-7h33l-7 7H14Zm-7 13 7-7h33l-7 7H7Z" fill="#b185ff" opacity=".7"/>`,
    BNB:`<path d="m32 11 8 8-8 8-8-8 8-8Zm-13 13 8 8-8 8-8-8 8-8Zm26 0 8 8-8 8-8-8 8-8Zm-13 13 8 8-8 8-8-8 8-8Zm0-12 7 7-7 7-7-7 7-7Z" fill="#fff1a7"/>`,
    XRP:`<path d="M13 19h9l10 10 10-10h9L37 33a7 7 0 0 1-10 0L13 19Zm0 26h9l10-10 10 10h9L37 31a7 7 0 0 0-10 0L13 45Z" fill="#fff"/>`,
    TRX:`<path d="M12 12 51 20 39 52 12 12Zm5 5 18 28 9-21-27-7Zm0 0 28 7-18 8-10-15Z" fill="none" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"/>`,
    XAU:`<path d="m12 38 5-15h29l6 15-6 6H18l-6-6Zm5-15 5 14h25l-5-14H17Z" fill="#fff1a5"/><path d="M15 42h34M24 29h16" stroke="#b87110" stroke-width="2" stroke-linecap="round"/>`,
    XAG:`<path d="m12 38 5-15h29l6 15-6 6H18l-6-6Zm5-15 5 14h25l-5-14H17Z" fill="#f5faff"/><path d="M15 42h34M24 29h16" stroke="#8cacc2" stroke-width="2" stroke-linecap="round"/>`,
    LTC:`<text x="32" y="45" text-anchor="middle" font-size="43" font-weight="800" fill="#fff">Ł</text>`,
    DOGE:`<text x="32" y="44" text-anchor="middle" font-size="42" font-weight="800" fill="#fff">Ð</text>`,
    USDT:`<path d="M12 18h40v9H37v4c12 .6 19 2.1 19 5s-10 5.6-24 5.6S8 38.9 8 36s7-4.4 19-5v-4H12v-9Zm15 16c-6 .3-10 1-10 2s6 2 15 2 15-1 15-2-4-1.7-10-2v2H27v-2Z" fill="#fff"/>`
  };
  const colors={BTC:['#f5a523','#cb6d0e'],ETH:['#8b9df8','#4859aa'],SOL:['#623fd0','#172c4c'],BNB:['#e9b923','#a8750b'],XRP:['#242f42','#09121f'],TRX:['#ed424a','#a4112a'],XAU:['#efc85a','#926010'],XAG:['#b7c9d8','#667b8f'],LTC:['#4c86d5','#214b88'],DOGE:['#c4a957','#7e6625'],USDT:['#34bd9d','#167d68']};
  function icon(m){
    if(m?.cgId){const src=(localStorage.getItem('dapps:apiBase')||'https://dapps-trading-platform-production.up.railway.app')+'/api/market/icon?id='+encodeURIComponent(m.cgId);return `<img class="market-symbol-img" src="${src}" alt="" loading="lazy" onerror="this.replaceWith(document.createRange().createContextualFragment(window.__tradeFallbackIcon('${String(m?.symbol||'').split('/')[0].replace(/'/g,'')}','${String(m?.bg||'').replace(/'/g,'')}')))"/>`}
    const code=String(m?.symbol||'').split('/')[0].toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,5)||'?';
    const [light,dark]=colors[code]||[/^#[0-9a-f]{6}$/i.test(m?.bg||'')?m.bg:'#3579c4','#11233c'];
    const mark=marks[code]||`<text x="32" y="40" text-anchor="middle" font-size="${code.length>3?17:code.length>2?22:29}" font-weight="800" fill="#fff">${code}</text>`;
    return `<svg class="market-symbol-svg" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><circle cx="32" cy="32" r="30" fill="${light}"/><path d="M5 39q25 17 54-13a30 30 0 0 1-54 13Z" fill="${dark}" opacity=".62"/><circle cx="32" cy="32" r="29" fill="none" stroke="#fff" stroke-opacity=".28"/><path d="M14 15Q31 3 49 17" fill="none" stroke="#fff" stroke-opacity=".24" stroke-width="2" stroke-linecap="round"/>${mark}</svg>`;
  }
  window.__tradeFallbackIcon=(code,bg)=>{const m={symbol:String(code||'?')+'/USDT',bg:bg||'#3579c4'};const saved=m.cgId;delete m.cgId;return icon(m)};
  window.tradeIconHTML=icon;
  window.paintTradeIcon=(el,m)=>{if(el){el.textContent='';el.style.background='transparent';el.innerHTML=icon(m)}};
  const style=document.createElement('style');
  style.textContent=`.market-symbol-svg,.market-symbol-img{display:block;width:100%;height:100%;flex:none;overflow:visible;shape-rendering:geometricPrecision}.market-symbol-img{object-fit:cover;border-radius:50%}.coin-icon:has(.market-symbol-svg),.mini-icon:has(.market-symbol-svg){background:transparent!important;overflow:visible!important}.coin-icon.large{width:48px!important;height:48px!important;box-shadow:none!important}.trade-quick-market{display:inline-flex;align-items:center;gap:7px}.trade-quick-market .market-symbol-svg{width:20px;height:20px}.pair-item .mini-icon{overflow:visible!important}.direction-btn span svg{display:block;width:24px;height:24px}.mobile-nav .trade-center span svg{display:block;width:27px;height:27px;margin:auto}@media(max-width:720px){.coin-icon.large{width:42px!important;height:42px!important}}`;
  document.head.appendChild(style);
})();
