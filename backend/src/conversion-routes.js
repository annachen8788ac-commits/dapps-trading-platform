const ASSET_RE=/^[A-Z0-9.-]{2,16}$/;
const cache={at:0,prices:new Map()};
const stable=new Set(['USDT','USDC','DAI','FDUSD','TUSD']);
const n=v=>Number(v);
const roundAsset=v=>Number(Number(v).toFixed(12));

const aliases={BTC:'bitcoin',ETH:'ethereum',SOL:'solana',BNB:'binancecoin',XRP:'ripple',DOGE:'dogecoin',ADA:'cardano',TRX:'tron',LTC:'litecoin',USDT:'tether',USDC:'usd-coin',DAI:'dai'};

async function fetchJson(url,timeout=5500){
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeout);
  try{const r=await fetch(url,{headers:{accept:'application/json','user-agent':'DAppsPlatform/1.0'},signal:controller.signal});if(!r.ok)throw new Error(`HTTP ${r.status}`);return await r.json()}finally{clearTimeout(timer)}
}
function addStable(map){for(const s of stable)map.set(s,1);return map}
async function pricesFromCoinGecko(){
  const rows=await fetchJson('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false');
  const map=new Map();for(const row of rows){const s=String(row.symbol||'').toUpperCase(),p=Number(row.current_price);if(s&&Number.isFinite(p)&&p>0&&!map.has(s))map.set(s,p)}return addStable(map)
}
async function pricesFromBinance(){
  const rows=await fetchJson('https://api.binance.com/api/v3/ticker/price');const map=new Map();
  for(const row of rows){const pair=String(row.symbol||'').toUpperCase();let asset='';if(pair.endsWith('USDT'))asset=pair.slice(0,-4);else if(pair.endsWith('USDC'))asset=pair.slice(0,-4);else continue;const p=Number(row.price);if(asset&&Number.isFinite(p)&&p>0&&!map.has(asset))map.set(asset,p)}return addStable(map)
}
async function refreshPrices(force=false){
  if(!force&&Date.now()-cache.at<30000&&cache.prices.size)return cache.prices;
  const errors=[];
  for(const provider of [pricesFromCoinGecko,pricesFromBinance]){try{const next=await provider();if(next.size>stable.size){cache.at=Date.now();cache.prices=next;return next}}catch(e){errors.push(e.message)}}
  if(cache.prices.size)return cache.prices;
  throw new Error('Market price service temporarily unavailable');
}
async function directCoinGecko(asset){
  const id=aliases[asset];if(!id)return null;
  try{const d=await fetchJson(`https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(id)}&vs_currencies=usd`);const p=Number(d?.[id]?.usd);return Number.isFinite(p)&&p>0?p:null}catch{return null}
}
async function directBinance(asset){
  if(stable.has(asset))return 1;
  try{const d=await fetchJson(`https://api.binance.com/api/v3/ticker/price?symbol=${encodeURIComponent(asset+'USDT')}`);const p=Number(d?.price);return Number.isFinite(p)&&p>0?p:null}catch{return null}
}
async function priceFor(asset){
  if(stable.has(asset))return 1;
  try{const prices=await refreshPrices();const p=prices.get(asset);if(p)return p}catch{}
  const [cg,bn]=await Promise.all([directCoinGecko(asset),directBinance(asset)]);const p=cg||bn;if(p){cache.prices.set(asset,p);cache.at=Date.now();return p}
  throw new Error(`No current market price for ${asset}`)
}

export async function initializeConversionSchema(pool){
  await pool.query(`CREATE TABLE IF NOT EXISTS user_asset_balances (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    asset VARCHAR(16) NOT NULL,
    available_balance NUMERIC(36,18) NOT NULL DEFAULT 0,
    locked_balance NUMERIC(36,18) NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY(user_id,asset)
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS asset_conversion_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    from_asset VARCHAR(16) NOT NULL,to_asset VARCHAR(16) NOT NULL,
    from_amount NUMERIC(36,18) NOT NULL,to_amount NUMERIC(36,18) NOT NULL,
    from_price_usd NUMERIC(28,10) NOT NULL,to_price_usd NUMERIC(28,10) NOT NULL,
    fee_amount NUMERIC(36,18) NOT NULL DEFAULT 0,status VARCHAR(20) NOT NULL DEFAULT 'completed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_asset_conversion_user_created ON asset_conversion_history(user_id,created_at DESC)`);
  await pool.query(`INSERT INTO user_asset_balances(user_id,asset,available_balance,locked_balance)
    SELECT user_id,COALESCE(asset,'USDT'),available_balance,locked_balance FROM account_balances
    ON CONFLICT(user_id,asset) DO NOTHING`);
}

export function registerConversionRoutes(app,{pool,auth}){
  app.get('/api/assets',auth,async(req,res)=>{
    try{
      const q=await pool.query(`SELECT asset,available_balance,locked_balance FROM user_asset_balances WHERE user_id=$1 ORDER BY asset`,[req.auth.sub]);
      const prices=await refreshPrices().catch(()=>new Map());
      const assets=q.rows.map(r=>{const asset=r.asset,available=n(r.available_balance)||0,locked=n(r.locked_balance)||0,price=prices.get(asset)||null;return {asset,available,locked,priceUsd:price,valueUsd:price?roundAsset((available+locked)*price):null}});
      res.json({assets});
    }catch(e){console.error(e);res.status(500).json({error:'Unable to load asset balances'});}
  });

  app.get('/api/convert/quote',auth,async(req,res)=>{
    const from=String(req.query.from||'').trim().toUpperCase(),to=String(req.query.to||'').trim().toUpperCase(),amount=n(req.query.amount);
    if(!ASSET_RE.test(from)||!ASSET_RE.test(to)||from===to||!Number.isFinite(amount)||amount<=0)return res.status(400).json({error:'Choose two different assets and a valid amount'});
    try{const [fromPrice,toPrice]=await Promise.all([priceFor(from),priceFor(to)]);const receive=roundAsset(amount*fromPrice/toPrice);res.json({quote:{from,to,amount,receive,fromPriceUsd:fromPrice,toPriceUsd:toPrice,fee:0,expiresInSeconds:30}})}catch(e){console.error('conversion quote price error',e);res.status(503).json({error:e.message||'Unable to quote conversion'})}
  });

  app.post('/api/convert',auth,async(req,res)=>{
    const from=String(req.body?.from||'').trim().toUpperCase(),to=String(req.body?.to||'').trim().toUpperCase(),amount=n(req.body?.amount);
    if(!ASSET_RE.test(from)||!ASSET_RE.test(to)||from===to||!Number.isFinite(amount)||amount<=0)return res.status(400).json({error:'Choose two different assets and a valid amount'});
    let fromPrice,toPrice;try{[fromPrice,toPrice]=await Promise.all([priceFor(from),priceFor(to)])}catch(e){return res.status(503).json({error:e.message||'Unable to price conversion'})}
    const receive=roundAsset(amount*fromPrice/toPrice);const client=await pool.connect();
    try{
      await client.query('BEGIN');
      await client.query(`INSERT INTO user_asset_balances(user_id,asset) VALUES($1,$2),($1,$3) ON CONFLICT(user_id,asset) DO NOTHING`,[req.auth.sub,from,to]);
      const src=(await client.query(`SELECT available_balance FROM user_asset_balances WHERE user_id=$1 AND asset=$2 FOR UPDATE`,[req.auth.sub,from])).rows[0];
      await client.query(`SELECT 1 FROM user_asset_balances WHERE user_id=$1 AND asset=$2 FOR UPDATE`,[req.auth.sub,to]);
      if(!src||n(src.available_balance)<amount){await client.query('ROLLBACK');return res.status(400).json({error:`Insufficient ${from} balance`})}
      await client.query(`UPDATE user_asset_balances SET available_balance=available_balance-$1,updated_at=NOW() WHERE user_id=$2 AND asset=$3`,[amount,req.auth.sub,from]);
      await client.query(`UPDATE user_asset_balances SET available_balance=available_balance+$1,updated_at=NOW() WHERE user_id=$2 AND asset=$3`,[receive,req.auth.sub,to]);
      const h=await client.query(`INSERT INTO asset_conversion_history(user_id,from_asset,to_asset,from_amount,to_amount,from_price_usd,to_price_usd) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id,created_at`,[req.auth.sub,from,to,amount,receive,fromPrice,toPrice]);
      await client.query('COMMIT');
      res.status(201).json({conversion:{id:h.rows[0].id,from,to,amount,receive,fromPriceUsd:fromPrice,toPriceUsd:toPrice,createdAt:h.rows[0].created_at}});
    }catch(e){await client.query('ROLLBACK');console.error(e);res.status(500).json({error:'Unable to complete conversion'})}finally{client.release()}
  });

  app.get('/api/convert/history',auth,async(req,res)=>{
    try{const q=await pool.query(`SELECT id,from_asset,to_asset,from_amount,to_amount,from_price_usd,to_price_usd,status,created_at FROM asset_conversion_history WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100`,[req.auth.sub]);res.json({items:q.rows.map(r=>({id:r.id,from:r.from_asset,to:r.to_asset,amount:n(r.from_amount),receive:n(r.to_amount),fromPriceUsd:n(r.from_price_usd),toPriceUsd:n(r.to_price_usd),status:r.status,createdAt:r.created_at}))})}catch(e){res.status(500).json({error:'Unable to load conversion history'})}
  });
}
