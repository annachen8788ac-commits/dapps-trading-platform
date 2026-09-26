import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import pg from 'pg';
import { initializeWalletSchema, registerWalletRoutes } from './wallet-routes.js';
import { initializeKycSchema, registerKycRoutes } from './kyc-routes.js';
import { initializeBusinessSchemas, registerBusinessRoutes } from './business-routes.js';
import { initializeAdminNotificationSchema, registerAdminNotificationRoutes } from './admin-notification-routes.js';
import { initializeUserNotificationSchema, registerUserNotificationRoutes } from './user-notification-routes.js';

const { Pool } = pg;
const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET;
if(!JWT_SECRET||!ADMIN_JWT_SECRET)throw new Error('JWT_SECRET and ADMIN_JWT_SECRET are required');
const allowedOrigins = (process.env.CORS_ORIGIN || '*').split(',').map(x=>x.trim()).filter(Boolean);
const trustedFrontendOrigins = new Set(['https://futures.dappsplatformusa.com','https://annachen8788ac-commits.github.io']);
const demoSessions=new Map();
const DEMO_SESSION_TTL_MS=90000;
function validDemoSessionId(value){const id=String(value||'').trim();return /^[A-Za-z0-9-]{12,80}$/.test(id)?id:null}
function pruneDemoSessions(){const cutoff=Date.now()-DEMO_SESSION_TTL_MS;for(const[id,s]of demoSessions)if(Number(s.lastSeen||0)<cutoff)demoSessions.delete(id)}
function demoSessionView(s){return{sessionId:s.sessionId,label:s.label,createdAt:new Date(s.createdAt).toISOString(),lastSeen:new Date(s.lastSeen).toISOString(),page:s.page||'trade',balance:Number(s.balance||0),activeTrades:Number(s.activeTrades||0),pledged:Number(s.pledged||0),pledgeCount:Number(s.pledgeCount||0),control:s.control||'auto',forceQueue:Array.isArray(s.forceQueue)?s.forceQueue:[]}}

app.disable('x-powered-by');
app.use(cors({origin(origin,cb){if(!origin||allowedOrigins.includes('*')||allowedOrigins.includes(origin)||trustedFrontendOrigins.has(origin))return cb(null,true);return cb(new Error('Origin not allowed'));}}));
app.use(express.json({limit:'6mb'}));
const demoPruneTimer=setInterval(pruneDemoSessions,10000);demoPruneTimer.unref?.();

async function bootstrapAdmin(){
  const email=String(process.env.ADMIN_BOOTSTRAP_EMAIL||'').trim().toLowerCase();
  const password=String(process.env.ADMIN_BOOTSTRAP_PASSWORD||'');
  if(!email||!password)return;
  if(password.length<12)throw new Error('ADMIN_BOOTSTRAP_PASSWORD must be at least 12 characters');
  const exists=await pool.query(`SELECT id FROM admins WHERE email=$1`,[email]);
  if(exists.rows[0])return;
  const hash=await bcrypt.hash(password,12);
  await pool.query(`INSERT INTO admins(email,display_name,password_hash,role) VALUES($1,$2,$3,'super_admin')`,[email,'Super Admin',hash]);
}

async function initializeDatabase(){
  if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL is not configured');
  await pool.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
  await pool.query(`CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),public_id VARCHAR(16) UNIQUE NOT NULL,
    registration_type VARCHAR(16) NOT NULL,identifier VARCHAR(190) UNIQUE NOT NULL,
    display_name VARCHAR(80) NOT NULL,password_hash TEXT NOT NULL,status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  await pool.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_registration_type_check`);
  await pool.query(`ALTER TABLE users ADD CONSTRAINT users_registration_type_check CHECK (registration_type IN ('email','mobile','username')) NOT VALID`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 1`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS withdrawal_hold_until TIMESTAMPTZ`);
  await pool.query(`CREATE TABLE IF NOT EXISTS account_recovery_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_no VARCHAR(32) UNIQUE NOT NULL,
    recovery_type VARCHAR(20) NOT NULL CHECK (recovery_type IN ('username','password')),
    lookup_value VARCHAR(190) NOT NULL,
    contact_value VARCHAR(190) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    recovery_code_hash TEXT,
    recovery_code_expires_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES admins(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_account_recovery_status_created ON account_recovery_requests(status,created_at DESC)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),ticket_no VARCHAR(24) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,category VARCHAR(40) NOT NULL,
    subject VARCHAR(120) NOT NULL,message TEXT NOT NULL,status VARCHAR(24) NOT NULL DEFAULT 'open',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_support_tickets_user_created ON support_tickets(user_id,created_at DESC)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),email VARCHAR(190) UNIQUE NOT NULL,display_name VARCHAR(80) NOT NULL,
    password_hash TEXT NOT NULL,role VARCHAR(32) NOT NULL DEFAULT 'super_admin',status VARCHAR(20) NOT NULL DEFAULT 'active',
    last_login_at TIMESTAMPTZ,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  await pool.query(`CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id BIGSERIAL PRIMARY KEY,admin_id UUID REFERENCES admins(id) ON DELETE SET NULL,action VARCHAR(80) NOT NULL,
    target_type VARCHAR(60) NOT NULL,target_id VARCHAR(190),details JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address VARCHAR(80),created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON admin_audit_logs(created_at DESC)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS platform_settings (
    setting_key VARCHAR(80) PRIMARY KEY,setting_value JSONB NOT NULL,updated_by UUID REFERENCES admins(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  await pool.query(`CREATE TABLE IF NOT EXISTS trade_products (
    duration_seconds INTEGER PRIMARY KEY,minimum_amount NUMERIC(20,2) NOT NULL,profit_rate NUMERIC(8,2) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,updated_by UUID REFERENCES admins(id) ON DELETE SET NULL,updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  await pool.query(`CREATE TABLE IF NOT EXISTS pledge_products (
    product_code VARCHAR(40) PRIMARY KEY,product_name VARCHAR(80) NOT NULL,term_days INTEGER NOT NULL,apy NUMERIC(8,2) NOT NULL,
    minimum_amount NUMERIC(20,2) NOT NULL,enabled BOOLEAN NOT NULL DEFAULT TRUE,updated_by UUID REFERENCES admins(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  await pool.query(`CREATE TABLE IF NOT EXISTS market_settings (
    symbol VARCHAR(30) PRIMARY KEY,display_name VARCHAR(60) NOT NULL,enabled BOOLEAN NOT NULL DEFAULT TRUE,sort_order INTEGER NOT NULL DEFAULT 0,
    updated_by UUID REFERENCES admins(id) ON DELETE SET NULL,updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  for(const [d,m,r] of [[30,200,21],[60,1000,29],[90,10000,37],[180,50000,45],[360,250000,53]])
    await pool.query(`INSERT INTO trade_products(duration_seconds,minimum_amount,profit_rate) VALUES($1,$2,$3) ON CONFLICT(duration_seconds) DO NOTHING`,[d,m,r]);
  for(const item of [['flexible','Flexible',0,4.8,100],['30-day','30-Day',30,6.5,500],['90-day','90-Day',90,8.2,1000]])
    await pool.query(`INSERT INTO pledge_products(product_code,product_name,term_days,apy,minimum_amount) VALUES($1,$2,$3,$4,$5) ON CONFLICT(product_code) DO NOTHING`,item);
  const marketSymbols=marketControlCodes.map(code=>code+'/USDT');
  for(let i=0;i<marketSymbols.length;i++)await pool.query(`INSERT INTO market_settings(symbol,display_name,sort_order) VALUES($1,$1,$2) ON CONFLICT(symbol) DO NOTHING`,[marketSymbols[i],i+1]);
  await pool.query(`INSERT INTO platform_settings(setting_key,setting_value) VALUES('general',$1::jsonb) ON CONFLICT(setting_key) DO NOTHING`,[JSON.stringify({platformName:'DApps Platform',announcement:'',maintenanceMode:false})]);
  await bootstrapAdmin();
  await initializeAdminNotificationSchema(pool);
  await initializeWalletSchema(pool);
  await initializeKycSchema(pool);
  await initializeBusinessSchemas(pool);
  await initializeUserNotificationSchema(pool);
}

function normalizeIdentifier(type,value=''){const v=String(value||'').trim();return type==='email'?v.toLowerCase():v.replace(/\s+/g,'');}
function maskIdentifier(type,value=''){if(type==='email'){const [a,b]=String(value).split('@');return b?`${a.slice(0,2)}***@${b}`:value;}if(type==='mobile')return String(value).length>5?`${String(value).slice(0,3)}****${String(value).slice(-3)}`:value;return value;}
function makePublicId(){return 'DP'+crypto.randomInt(1000000000,9999999999).toString();}
function makeTicketNo(){return 'TKT-'+new Date().toISOString().slice(0,10).replaceAll('-','')+'-'+crypto.randomInt(100000,999999);}
function makeRecoveryNo(){return 'RCV-'+new Date().toISOString().slice(0,10).replaceAll('-','')+'-'+crypto.randomInt(100000,999999);}
function makeRecoveryCode(){return crypto.randomBytes(6).toString('base64url').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8).padEnd(8,'7');}
const recoveryRate=new Map();
function allowRecoveryRequest(req){const key=String(req.headers['x-forwarded-for']||req.socket.remoteAddress||'unknown').split(',')[0].trim(),now=Date.now(),windowMs=15*60*1000;let row=recoveryRate.get(key);if(!row||now-row.start>windowMs)row={start:now,count:0};row.count++;recoveryRate.set(key,row);return row.count<=5;}
function signUser(u){return jwt.sign({sub:u.id,publicId:u.public_id,type:'user',sv:Number(u.session_version||1)},JWT_SECRET,{expiresIn:'7d'});}
function signAdmin(a){return jwt.sign({sub:a.id,role:a.role,type:'admin'},ADMIN_JWT_SECRET);}
function userPayload(r){return {publicId:r.public_id,displayName:r.display_name,registrationType:r.registration_type,identifierMasked:maskIdentifier(r.registration_type,r.identifier),status:r.status,createdAt:r.created_at};}
async function auth(req,res,next){const token=req.headers.authorization?.startsWith('Bearer ')?req.headers.authorization.slice(7):null;if(!token)return res.status(401).json({error:'Authentication required'});let d;try{d=jwt.verify(token,JWT_SECRET);if(d.type&&d.type!=='user')throw 0;}catch{return res.status(401).json({error:'Invalid or expired session'});}try{const q=await pool.query(`SELECT id,status,session_version FROM users WHERE id=$1`,[d.sub]);const u=q.rows[0];if(!u)return res.status(401).json({error:'Account not found'});if(Number(d.sv??1)!==Number(u.session_version||1))return res.status(401).json({error:'Session has been invalidated. Please sign in again.'});if(!['active','frozen'].includes(u.status))return res.status(403).json({error:'Account is disabled. Account functions are currently unavailable.'});req.auth=d;req.user=u;next();}catch(e){console.error(e);return res.status(500).json({error:'Unable to verify account status'});}}
async function adminAuth(req,res,next){const token=req.headers.authorization?.startsWith('Bearer ')?req.headers.authorization.slice(7):null;if(!token)return res.status(401).json({error:'Admin authentication required'});try{const d=jwt.verify(token,ADMIN_JWT_SECRET);if(d.type!=='admin')throw 0;const q=await pool.query(`SELECT id,email,display_name,role,status FROM admins WHERE id=$1`,[d.sub]);const a=q.rows[0];if(!a||a.status!=='active')return res.status(403).json({error:'Admin account is not active'});req.admin=a;next();}catch{return res.status(401).json({error:'Invalid or expired admin session'});}}
function requireRole(...roles){return (req,res,next)=>roles.includes(req.admin.role)?next():res.status(403).json({error:'Insufficient permission'});}
async function audit(req,action,targetType,targetId=null,details={}){await pool.query(`INSERT INTO admin_audit_logs(admin_id,action,target_type,target_id,details,ip_address) VALUES($1,$2,$3,$4,$5::jsonb,$6)`,[req.admin?.id||null,action,targetType,targetId,JSON.stringify(details),String(req.headers['x-forwarded-for']||req.socket.remoteAddress||'').slice(0,80)]);}

const marketJson=async(url,timeout=9000)=>{
  const upstream=await fetch(url,{headers:{'user-agent':'DAppsPlatformMarketData/1.0','accept':'application/json'},signal:AbortSignal.timeout(timeout)});
  if(!upstream.ok)throw Error(String(upstream.status));
  return upstream.json();
};
const marketControlCodes=['BTC','ETH','USDT','BNB','SOL','XRP','DOGE','ADA','AVAX','LINK','LTC','TRX','BCH','UNI','DOT','ATOM','XLM','ETC','FIL','NEAR','APT','ARB','OP','SUI','SHIB','AAVE','MKR','INJ','RENDER','FET','TON','HBAR','ICP','VET','ALGO','SEI','IMX','GRT','LDO'];
const marketControlSet=new Set(marketControlCodes);
const marketControlNames={BTC:'Bitcoin',ETH:'Ethereum',USDT:'Tether',BNB:'BNB',SOL:'Solana',XRP:'XRP',DOGE:'Dogecoin',ADA:'Cardano',AVAX:'Avalanche',LINK:'Chainlink',LTC:'Litecoin',TRX:'TRON',BCH:'Bitcoin Cash',UNI:'Uniswap',DOT:'Polkadot',ATOM:'Cosmos',XLM:'Stellar',ETC:'Ethereum Classic',FIL:'Filecoin',NEAR:'NEAR Protocol',APT:'Aptos',ARB:'Arbitrum',OP:'Optimism',SUI:'Sui',SHIB:'Shiba Inu',AAVE:'Aave',MKR:'Maker',INJ:'Injective',RENDER:'Render',FET:'Artificial Superintelligence Alliance',TON:'Toncoin',HBAR:'Hedera',ICP:'Internet Computer',VET:'VeChain',ALGO:'Algorand',SEI:'Sei',IMX:'Immutable',GRT:'The Graph',LDO:'Lido DAO'};
const marketControlColors={BTC:'#f7931a',ETH:'#627eea',USDT:'#26a17b',BNB:'#c99b14',SOL:'#6d4cd8',XRP:'#111111',DOGE:'#9f842c',ADA:'#3468d4',AVAX:'#e84142',LINK:'#2a5ada',LTC:'#345d9d',TRX:'#d71920',BCH:'#8dc351',UNI:'#ff007a',DOT:'#e6007a',ATOM:'#5064fb',XLM:'#232323'};
const marketControlStaticIds={BTC:'bitcoin',ETH:'ethereum',USDT:'tether',BNB:'binancecoin',SOL:'solana',XRP:'ripple',DOGE:'dogecoin',ADA:'cardano',AVAX:'avalanche-2',LINK:'chainlink',LTC:'litecoin',TRX:'tron',BCH:'bitcoin-cash',UNI:'uniswap',DOT:'polkadot',ATOM:'cosmos',XLM:'stellar',ETC:'ethereum-classic',FIL:'filecoin',NEAR:'near',APT:'aptos',ARB:'arbitrum',OP:'optimism',SUI:'sui',SHIB:'shiba-inu',AAVE:'aave',MKR:'maker',INJ:'injective-protocol',TON:'the-open-network',HBAR:'hedera-hashgraph',ICP:'internet-computer',VET:'vechain',ALGO:'algorand',SEI:'sei-network',IMX:'immutable-x',GRT:'the-graph',LDO:'lido-dao'};
const marketControlPeriods={
  '1H':{coinbase:60,kraken:1,count:60,seconds:60,days:1},
  '24H':{coinbase:300,kraken:5,count:288,seconds:300,days:1},
  '7D':{coinbase:3600,kraken:60,count:168,seconds:3600,days:7},
  '30D':{coinbase:21600,kraken:240,count:180,seconds:21600,days:30}
};
const marketControlCache=new Map();
let marketDirectoryCache={at:0,byCode:new Map(),byId:new Map()};

async function loadMarketDirectory(){
  if(Date.now()-marketDirectoryCache.at<300000&&marketDirectoryCache.byCode.size)return marketDirectoryCache;
  const all=[];
  try{
    for(let page=1;page<=4;page++){
      const rows=await marketJson(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=${page}&sparkline=false&price_change_percentage=24h`,12000);
      if(Array.isArray(rows))all.push(...rows);
    }
  }catch(_){}
  if(all.length){
    const byCode=new Map(),byId=new Map();
    for(const row of all){
      const code=String(row?.symbol||'').toUpperCase();
      if(code&&!byCode.has(code))byCode.set(code,row);
      if(row?.id)byId.set(String(row.id),row);
    }
    marketDirectoryCache={at:Date.now(),byCode,byId};
  }
  return marketDirectoryCache;
}
async function marketControlMeta(code){
  const directory=await loadMarketDirectory();
  const staticId=marketControlStaticIds[code];
  const row=(staticId&&directory.byId.get(staticId))||directory.byCode.get(code)||null;
  return {code,cgId:staticId||row?.id||null,row};
}
async function marketControlQuote(code){
  if(code==='USDT')return {symbol:'USDT',price:1,time:new Date().toISOString(),change24h:0,high24h:1,low24h:1,volume24h:0};
  const key='market-control-quote:'+code,hit=marketControlCache.get(key),age=hit?Date.now()-hit.at:Infinity;
  const ttl=hit?.source==='coinbase'?1200:15000;
  if(hit&&age<ttl)return hit.data;

  let data=null,source='coinbase';
  if(code!=='USDT'){
    try{
      const [ticker,stats]=await Promise.all([
        marketJson(`https://api.exchange.coinbase.com/products/${code}-USD/ticker`,5000),
        marketJson(`https://api.exchange.coinbase.com/products/${code}-USD/stats`,5000)
      ]);
      const price=Number(ticker.price);
      if(Number.isFinite(price)&&price>0){
        const open=Number(stats.open),high=Number(stats.high),low=Number(stats.low);
        data={symbol:code,price,time:ticker.time||new Date().toISOString(),change24h:Number.isFinite(open)&&open>0?(price/open-1)*100:0,high24h:high,low24h:low,volume24h:Number(stats.volume)||0};
      }
    }catch(_){}
  }

  if(!data){
    source='fallback';
    const meta=await marketControlMeta(code);
    if(meta.cgId){
      try{
        const rows=await marketJson(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${encodeURIComponent(meta.cgId)}&sparkline=false&price_change_percentage=24h`,9000);
        const row=Array.isArray(rows)?rows[0]:null,price=Number(row?.current_price);
        if(Number.isFinite(price)&&price>0)data={symbol:code,price,time:new Date().toISOString(),change24h:Number(row?.price_change_percentage_24h)||0,high24h:Number(row?.high_24h)||price,low24h:Number(row?.low_24h)||price,volume24h:Number(row?.total_volume)||0};
      }catch(_){}
    }
    if(!data&&meta.row){
      const row=meta.row,price=Number(row.current_price);
      if(Number.isFinite(price)&&price>0)data={symbol:code,price,time:new Date().toISOString(),change24h:Number(row.price_change_percentage_24h)||0,high24h:Number(row.high_24h)||price,low24h:Number(row.low_24h)||price,volume24h:Number(row.total_volume)||0,stale:true};
    }
  }

  if(!data&&hit&&age<120000)return {...hit.data,stale:true};
  if(!data)throw new Error('Market quote unavailable');
  marketControlCache.set(key,{at:Date.now(),data,source});
  return data;
}
async function marketControlCandles(code,period){
  const spec=marketControlPeriods[period];
  if(!spec)throw new Error('Unsupported period');
  if(code==='USDT'){
    const now=Math.floor(Date.now()/1000/spec.seconds)*spec.seconds;
    const rows=Array.from({length:spec.count},(_,i)=>({time:now-(spec.count-1-i)*spec.seconds,open:1,high:1,low:1,close:1,volume:0}));
    return {symbol:'USDT',period,candles:rows};
  }
  const key=`market-control-candles:${code}:${period}`,hit=marketControlCache.get(key);
  if(hit&&Date.now()-hit.at<5000)return hit.data;
  let rows=[];
  if(code!=='USDT'){
    try{
      const d=await marketJson(`https://api.exchange.coinbase.com/products/${code}-USD/candles?granularity=${spec.coinbase}`,9000);
      rows=(Array.isArray(d)?d:[]).slice(0,spec.count).map(v=>({time:Number(v[0]),open:Number(v[3]),high:Number(v[2]),low:Number(v[1]),close:Number(v[4]),volume:Number(v[5]||0)})).filter(v=>[v.time,v.open,v.high,v.low,v.close].every(Number.isFinite)).sort((a,b)=>a.time-b.time);
    }catch(_){}
  }
  if(!rows.length&&code!=='USDT'){
    const bases=[code,code==='BTC'?'XBT':code];
    for(const base of [...new Set(bases)]){
      try{
        const since=Math.floor(Date.now()/1000)-spec.kraken*60*spec.count;
        const d=await marketJson(`https://api.kraken.com/0/public/OHLC?pair=${encodeURIComponent(base+'/USD')}&interval=${spec.kraken}&since=${since}`,9000);
        if((d.error||[]).length)continue;
        const raw=Object.entries(d.result||{}).find(([k])=>k!=='last')?.[1]||[];
        rows=raw.slice(-spec.count).map(v=>({time:Number(v[0]),open:Number(v[1]),high:Number(v[2]),low:Number(v[3]),close:Number(v[4]),volume:Number(v[6]||0)})).filter(v=>[v.time,v.open,v.high,v.low,v.close].every(Number.isFinite));
        if(rows.length)break;
      }catch(_){}
    }
  }
  if(!rows.length){
    try{
      const meta=await marketControlMeta(code);
      if(meta.cgId){
        const d=await marketJson(`https://api.coingecko.com/api/v3/coins/${encodeURIComponent(meta.cgId)}/market_chart?vs_currency=usd&days=${spec.days}`,12000);
        const points=(Array.isArray(d.prices)?d.prices:[]).map(v=>({ts:Number(v[0]),price:Number(v[1])})).filter(v=>Number.isFinite(v.ts)&&Number.isFinite(v.price)&&v.price>0);
        const step=spec.seconds*1000,grouped=[];
        for(const p of points){
          const bucket=Math.floor(p.ts/step)*step,last=grouped[grouped.length-1];
          if(last&&last.bucket===bucket){last.high=Math.max(last.high,p.price);last.low=Math.min(last.low,p.price);last.close=p.price}
          else grouped.push({bucket,time:Math.floor(bucket/1000),open:p.price,high:p.price,low:p.price,close:p.price,volume:0});
        }
        rows=grouped.slice(-spec.count).map(({bucket,...v})=>v);
      }
    }catch(_){}
  }
  if(!rows.length&&hit)return hit.data;
  if(!rows.length)throw new Error('Market candles unavailable');
  const data={symbol:code,period,candles:rows};
  marketControlCache.set(key,{at:Date.now(),data});
  return data;
}

app.get('/api/market/config',async(req,res)=>{
  try{
    const [settings,directory,tradeProducts]=await Promise.all([pool.query(`SELECT symbol,enabled,sort_order FROM market_settings`),loadMarketDirectory(),pool.query(`SELECT duration_seconds,minimum_amount,profit_rate,enabled FROM trade_products ORDER BY duration_seconds`)]);
    const overrides=new Map(settings.rows.map(r=>[String(r.symbol).split('/')[0].toUpperCase(),r]));
    const markets=[];
    for(let i=0;i<marketControlCodes.length;i++){
      const code=marketControlCodes[i],override=overrides.get(code);
      if(override&&override.enabled===false)continue;
      const meta=await marketControlMeta(code),row=meta.row;
      const price=code==='USDT'?1:(Number(row?.current_price)||0);
      const change=code==='USDT'?0:(Number(row?.price_change_percentage_24h)||0);
      const high=code==='USDT'?1:(Number(row?.high_24h)||price);
      const low=code==='USDT'?1:(Number(row?.low_24h)||price);
      markets.push({symbol:code+'/USDT',code,name:marketControlNames[code]||row?.name||code,type:'crypto',bg:marketControlColors[code]||'#24344d',price,change,high,low,sortOrder:Number.isFinite(Number(override?.sort_order))?Number(override.sort_order):100+i});
    }
    markets.sort((a,b)=>a.sortOrder-b.sortOrder||a.symbol.localeCompare(b.symbol));
    res.json({quoteIntervalMs:1200,periods:Object.entries(marketControlPeriods).map(([id,v])=>({id,seconds:v.seconds,count:v.count})),tradeProducts:tradeProducts.rows.map(x=>({duration:Number(x.duration_seconds),minimumAmount:Number(x.minimum_amount),profitRate:Number(x.profit_rate),enabled:Boolean(x.enabled)})),markets});
  }catch(e){console.error(e);res.status(503).json({error:'Market configuration unavailable'})}
});
app.get('/api/market/quote',async(req,res)=>{
  const code=String(req.query.symbol||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
  if(!marketControlSet.has(code))return res.status(400).json({error:'Unsupported market'});
  try{res.json(await marketControlQuote(code))}catch(e){res.status(503).json({error:'Market quote unavailable'})}
});
app.get('/api/market/chart',async(req,res)=>{
  const code=String(req.query.symbol||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
  const period=String(req.query.period||'24H').toUpperCase();
  if(!marketControlSet.has(code)||!marketControlPeriods[period])return res.status(400).json({error:'Unsupported market request'});
  try{res.json(await marketControlCandles(code,period))}catch(e){res.status(503).json({error:'Market candles unavailable'})}
});

app.get('/api/health',async(req,res)=>{try{await pool.query('SELECT 1');res.json({ok:true,service:'dapps-platform-backend',database:'connected'});}catch{res.status(503).json({ok:false,service:'dapps-platform-backend',database:'unavailable'});}});
app.post('/api/auth/register',async(req,res)=>{const {registrationType,identifier,displayName,password}=req.body||{};if(!['email','mobile','username'].includes(registrationType))return res.status(400).json({error:'Choose email, mobile or username registration'});const normalized=normalizeIdentifier(registrationType,identifier);if(!normalized||!String(displayName||'').trim()||!password)return res.status(400).json({error:'All fields are required'});if(String(password).length<8)return res.status(400).json({error:'Password must be at least 8 characters'});if(registrationType==='email'&&!/^\S+@\S+\.\S+$/.test(normalized))return res.status(400).json({error:'Enter a valid email address'});if(registrationType==='mobile'&&!/^\+?[0-9]{7,15}$/.test(normalized))return res.status(400).json({error:'Enter a valid mobile number with country code'});if(registrationType==='username'&&!/^[A-Za-z0-9_.-]{4,32}$/.test(normalized))return res.status(400).json({error:'Username must be 4-32 characters using letters, numbers, ., _ or -'});try{const hash=await bcrypt.hash(String(password),12);let row;for(let i=0;i<5;i++){try{const q=await pool.query(`INSERT INTO users(public_id,registration_type,identifier,display_name,password_hash) VALUES($1,$2,$3,$4,$5) RETURNING *`,[makePublicId(),registrationType,normalized,String(displayName).trim().slice(0,80),hash]);row=q.rows[0];break;}catch(e){if(e.code==='23505'&&e.constraint?.includes('public_id'))continue;throw e;}}if(!row)throw new Error('Unable to allocate account ID');await pool.query(`INSERT INTO account_balances(user_id) VALUES($1) ON CONFLICT(user_id) DO NOTHING`,[row.id]);res.status(201).json({token:signUser(row),user:userPayload(row)});}catch(e){if(e.code==='23505')return res.status(409).json({error:'This email, mobile number or username is already registered'});console.error(e);res.status(500).json({error:'Registration failed'});}});
app.post('/api/auth/login',async(req,res)=>{const id=String(req.body?.identifier||'').trim(),password=String(req.body?.password||'');if(!id||!password)return res.status(400).json({error:'Identifier and password are required'});try{const q=await pool.query(`SELECT * FROM users WHERE identifier=ANY($1::text[]) LIMIT 1`,[[id.toLowerCase(),id.replace(/\s+/g,'')]]);const r=q.rows[0];if(!r||!(await bcrypt.compare(password,r.password_hash)))return res.status(401).json({error:'Incorrect account or password'});if(!['active','frozen'].includes(r.status))return res.status(403).json({error:'Account is disabled'});res.json({token:signUser(r),user:userPayload(r)});}catch(e){console.error(e);res.status(500).json({error:'Sign in failed'});}});
app.post('/api/auth/recovery/request',async(req,res)=>{
  if(!allowRecoveryRequest(req))return res.status(429).json({error:'Too many recovery requests. Try again later.'});
  const recoveryType=String(req.body?.recoveryType||''),lookup=String(req.body?.lookup||'').trim().slice(0,190),contact=String(req.body?.contact||'').trim().slice(0,190);
  if(!['username','password'].includes(recoveryType)||!lookup||!contact)return res.status(400).json({error:'Recovery type, account information and contact information are required.'});
  try{
    const forms=[lookup,lookup.toLowerCase(),lookup.replace(/\s+/g,'')];
    const q=await pool.query(`SELECT id FROM users WHERE public_id=ANY($1::text[]) OR identifier=ANY($1::text[]) LIMIT 1`,[forms]);
    const requestNo=makeRecoveryNo();
    await pool.query(`INSERT INTO account_recovery_requests(request_no,recovery_type,lookup_value,contact_value,user_id) VALUES($1,$2,$3,$4,$5)`,[requestNo,recoveryType,lookup,contact,q.rows[0]?.id||null]);
    res.status(201).json({requestNo,message:'Recovery request received. For your security, account details are not disclosed until identity verification is completed.'});
  }catch(e){console.error(e);res.status(500).json({error:'Unable to submit recovery request'})}
});
app.post('/api/auth/recovery/complete',async(req,res)=>{
  const requestNo=String(req.body?.requestNo||'').trim().slice(0,32),code=String(req.body?.recoveryCode||'').trim().toUpperCase(),newPassword=String(req.body?.newPassword||'');
  if(!requestNo||!code)return res.status(400).json({error:'Recovery request number and recovery code are required.'});
  try{
    const q=await pool.query(`SELECT r.*,u.identifier,u.registration_type,u.public_id FROM account_recovery_requests r LEFT JOIN users u ON u.id=r.user_id WHERE r.request_no=$1`,[requestNo]);
    const r=q.rows[0];
    if(!r||r.status!=='approved'||!r.recovery_code_hash||!r.user_id)return res.status(400).json({error:'Recovery request is not ready or is no longer valid.'});
    if(r.used_at||!r.recovery_code_expires_at||new Date(r.recovery_code_expires_at).getTime()<Date.now())return res.status(400).json({error:'Recovery code has expired or was already used.'});
    if(!(await bcrypt.compare(code,r.recovery_code_hash)))return res.status(403).json({error:'Invalid recovery code.'});
    if(r.recovery_type==='username'){
      await pool.query(`UPDATE account_recovery_requests SET status='completed',used_at=NOW(),updated_at=NOW() WHERE id=$1`,[r.id]);
      return res.json({recoveryType:'username',identifier:r.identifier,registrationType:r.registration_type,publicId:r.public_id});
    }
    if(newPassword.length<8)return res.status(400).json({error:'New password must be at least 8 characters.'});
    const hash=await bcrypt.hash(newPassword,12);
    const client=await pool.connect();
    try{
      await client.query('BEGIN');
      await client.query(`UPDATE users SET password_hash=$1,session_version=session_version+1,withdrawal_hold_until=NOW()+INTERVAL '24 hours',updated_at=NOW() WHERE id=$2`,[hash,r.user_id]);
      await client.query(`UPDATE account_recovery_requests SET status='completed',used_at=NOW(),updated_at=NOW() WHERE id=$1`,[r.id]);
      await client.query('COMMIT');
    }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
    res.json({recoveryType:'password',message:'Password reset successfully. Existing sessions have been signed out. Withdrawals are protected for 24 hours.'});
  }catch(e){console.error(e);res.status(500).json({error:'Unable to complete account recovery'})}
});

app.get('/api/me',auth,async(req,res)=>{try{const q=await pool.query(`SELECT * FROM users WHERE id=$1`,[req.auth.sub]);if(!q.rows[0])return res.status(404).json({error:'Account not found'});res.json({user:userPayload(q.rows[0])});}catch(e){console.error(e);res.status(500).json({error:'Unable to load profile'});}});
app.get('/api/support/tickets',auth,async(req,res)=>{try{const q=await pool.query(`SELECT ticket_no,category,subject,status,created_at,updated_at FROM support_tickets WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100`,[req.auth.sub]);res.json({tickets:q.rows.map(r=>({ticketNo:r.ticket_no,category:r.category,subject:r.subject,status:r.status,createdAt:r.created_at,updatedAt:r.updated_at}))});}catch(e){console.error(e);res.status(500).json({error:'Unable to load tickets'});}});
app.post('/api/support/tickets',auth,async(req,res)=>{const category=String(req.body?.category||'').trim(),subject=String(req.body?.subject||'').trim(),message=String(req.body?.message||'').trim();if(!category||!subject||!message)return res.status(400).json({error:'Category, subject and message are required'});try{const q=await pool.query(`INSERT INTO support_tickets(ticket_no,user_id,category,subject,message) VALUES($1,$2,$3,$4,$5) RETURNING ticket_no,status,created_at`,[makeTicketNo(),req.auth.sub,category.slice(0,40),subject.slice(0,120),message.slice(0,3000)]);res.status(201).json({ticket:{ticketNo:q.rows[0].ticket_no,status:q.rows[0].status,createdAt:q.rows[0].created_at}});}catch(e){console.error(e);res.status(500).json({error:'Unable to submit ticket'});}});

app.post('/api/admin/auth/login',async(req,res)=>{const email=String(req.body?.email||'').trim().toLowerCase(),password=String(req.body?.password||'');if(!email||!password)return res.status(400).json({error:'Email and password are required'});try{const q=await pool.query(`SELECT * FROM admins WHERE email=$1 LIMIT 1`,[email]);const r=q.rows[0];if(!r||!(await bcrypt.compare(password,r.password_hash)))return res.status(401).json({error:'Invalid admin credentials'});if(r.status!=='active')return res.status(403).json({error:'Admin account is not active'});await pool.query(`UPDATE admins SET last_login_at=NOW(),updated_at=NOW() WHERE id=$1`,[r.id]);res.json({token:signAdmin(r),admin:{email:r.email,displayName:r.display_name,role:r.role}});}catch(e){console.error(e);res.status(500).json({error:'Admin sign in failed'});}});
app.get('/api/admin/me',adminAuth,(req,res)=>res.json({admin:{email:req.admin.email,displayName:req.admin.display_name,role:req.admin.role}}));
app.get('/api/admin/dashboard',adminAuth,async(req,res)=>{try{const [users,tickets,openTickets,admins,pendingDeposits,pendingWithdrawals]=await Promise.all([pool.query(`SELECT COUNT(*)::int count FROM users`),pool.query(`SELECT COUNT(*)::int count FROM support_tickets`),pool.query(`SELECT COUNT(*)::int count FROM support_tickets WHERE status='open'`),pool.query(`SELECT COUNT(*)::int count FROM admins WHERE status='active'`),pool.query(`SELECT COUNT(*)::int count FROM deposit_requests WHERE status='pending'`),pool.query(`SELECT COUNT(*)::int count FROM withdrawal_requests WHERE status='pending'`)]);res.json({users:users.rows[0].count,tickets:tickets.rows[0].count,openTickets:openTickets.rows[0].count,activeAdmins:admins.rows[0].count,pendingDeposits:pendingDeposits.rows[0].count,pendingWithdrawals:pendingWithdrawals.rows[0].count});}catch(e){console.error(e);res.status(500).json({error:'Unable to load dashboard'});}});
app.get('/api/admin/users',adminAuth,async(req,res)=>{const search=String(req.query.search||'').trim();try{const values=[];let where='';if(search){values.push(`%${search}%`);where=`WHERE u.public_id ILIKE $1 OR u.identifier ILIKE $1 OR u.display_name ILIKE $1`;}const q=await pool.query(`SELECT u.public_id,u.registration_type,u.identifier,u.display_name,u.status,u.created_at,u.updated_at,COALESCE(b.available_balance,0) available_balance,COALESCE(b.locked_balance,0) locked_balance FROM users u LEFT JOIN account_balances b ON b.user_id=u.id ${where} ORDER BY u.created_at DESC LIMIT 200`,values);res.json({users:q.rows.map(r=>({publicId:r.public_id,registrationType:r.registration_type,identifier:r.identifier,displayName:r.display_name,status:r.status,createdAt:r.created_at,updatedAt:r.updated_at,available:Number(r.available_balance),locked:Number(r.locked_balance)}))});}catch(e){console.error(e);res.status(500).json({error:'Unable to load users'});}});
app.patch('/api/admin/users/:publicId/status',adminAuth,requireRole('super_admin','operations','compliance'),async(req,res)=>{const status=String(req.body?.status||'');if(!['active','frozen','disabled'].includes(status))return res.status(400).json({error:'Invalid user status'});try{const q=await pool.query(`UPDATE users SET status=$1,updated_at=NOW() WHERE public_id=$2 RETURNING public_id,status`,[status,req.params.publicId]);if(!q.rows[0])return res.status(404).json({error:'User not found'});await audit(req,'user.status.update','user',req.params.publicId,{status});res.json({user:{publicId:q.rows[0].public_id,status:q.rows[0].status}});}catch(e){console.error(e);res.status(500).json({error:'Unable to update user'});}});
app.get('/api/admin/recovery-requests',adminAuth,async(req,res)=>{const status=String(req.query.status||'').trim();try{const values=[];let where='';if(status){values.push(status);where='WHERE r.status=$1'}const q=await pool.query(`SELECT r.request_no,r.recovery_type,r.lookup_value,r.contact_value,r.status,r.recovery_code_expires_at,r.created_at,r.reviewed_at,r.used_at,u.public_id,u.identifier,u.registration_type,u.display_name FROM account_recovery_requests r LEFT JOIN users u ON u.id=r.user_id ${where} ORDER BY r.created_at DESC LIMIT 300`,values);res.json({requests:q.rows.map(x=>({requestNo:x.request_no,recoveryType:x.recovery_type,lookup:x.lookup_value,contact:x.contact_value,status:x.status,codeExpiresAt:x.recovery_code_expires_at,createdAt:x.created_at,reviewedAt:x.reviewed_at,usedAt:x.used_at,user:x.public_id?{publicId:x.public_id,identifier:x.identifier,registrationType:x.registration_type,displayName:x.display_name}:null}))})}catch(e){console.error(e);res.status(500).json({error:'Unable to load recovery requests'})}});
app.post('/api/admin/recovery-requests/:requestNo/approve',adminAuth,requireRole('super_admin','customer_support','operations'),async(req,res)=>{try{const q=await pool.query(`SELECT r.id,r.status,r.user_id,r.recovery_type,u.public_id FROM account_recovery_requests r LEFT JOIN users u ON u.id=r.user_id WHERE r.request_no=$1`,[req.params.requestNo]);const r=q.rows[0];if(!r)return res.status(404).json({error:'Recovery request not found'});if(r.status!=='pending')return res.status(409).json({error:'Recovery request has already been reviewed'});if(!r.user_id)return res.status(400).json({error:'No matching account was found. Verify the information before proceeding.'});const code=makeRecoveryCode(),hash=await bcrypt.hash(code,12);await pool.query(`UPDATE account_recovery_requests SET status='approved',recovery_code_hash=$1,recovery_code_expires_at=NOW()+INTERVAL '30 minutes',reviewed_by=$2,reviewed_at=NOW(),updated_at=NOW() WHERE id=$3`,[hash,req.admin.id,r.id]);await audit(req,'account_recovery.approve','user',r.public_id,{requestNo:req.params.requestNo,recoveryType:r.recovery_type,expiresInMinutes:30});res.json({requestNo:req.params.requestNo,recoveryCode:code,expiresInMinutes:30})}catch(e){console.error(e);res.status(500).json({error:'Unable to approve recovery request'})}});
app.post('/api/admin/recovery-requests/:requestNo/reject',adminAuth,requireRole('super_admin','customer_support','operations'),async(req,res)=>{try{const q=await pool.query(`UPDATE account_recovery_requests SET status='rejected',reviewed_by=$1,reviewed_at=NOW(),updated_at=NOW() WHERE request_no=$2 AND status='pending' RETURNING request_no`,[req.admin.id,req.params.requestNo]);if(!q.rows[0])return res.status(404).json({error:'Pending recovery request not found'});await audit(req,'account_recovery.reject','account_recovery',req.params.requestNo,{});res.json({ok:true})}catch(e){console.error(e);res.status(500).json({error:'Unable to reject recovery request'})}});

app.get('/api/admin/tickets',adminAuth,async(req,res)=>{try{const q=await pool.query(`SELECT t.ticket_no,t.category,t.subject,t.message,t.status,t.created_at,t.updated_at,u.public_id,u.display_name,u.identifier FROM support_tickets t JOIN users u ON u.id=t.user_id ORDER BY t.created_at DESC LIMIT 300`);res.json({tickets:q.rows.map(r=>({ticketNo:r.ticket_no,category:r.category,subject:r.subject,message:r.message,status:r.status,createdAt:r.created_at,updatedAt:r.updated_at,user:{publicId:r.public_id,displayName:r.display_name,identifier:r.identifier}}))});}catch(e){console.error(e);res.status(500).json({error:'Unable to load tickets'});}});
app.patch('/api/admin/tickets/:ticketNo/status',adminAuth,requireRole('super_admin','customer_support','operations'),async(req,res)=>{const status=String(req.body?.status||'');if(!['open','in_progress','resolved','closed'].includes(status))return res.status(400).json({error:'Invalid ticket status'});try{const q=await pool.query(`UPDATE support_tickets SET status=$1,updated_at=NOW() WHERE ticket_no=$2 RETURNING ticket_no,status`,[status,req.params.ticketNo]);if(!q.rows[0])return res.status(404).json({error:'Ticket not found'});await audit(req,'ticket.status.update','support_ticket',req.params.ticketNo,{status});res.json({ticket:{ticketNo:q.rows[0].ticket_no,status:q.rows[0].status}});}catch(e){console.error(e);res.status(500).json({error:'Unable to update ticket'});}});
app.get('/api/admin/config',adminAuth,async(req,res)=>{try{const [general,trades,pledges,markets]=await Promise.all([pool.query(`SELECT setting_value FROM platform_settings WHERE setting_key='general'`),pool.query(`SELECT duration_seconds,minimum_amount,profit_rate,enabled FROM trade_products ORDER BY duration_seconds`),pool.query(`SELECT product_code,product_name,term_days,apy,minimum_amount,enabled FROM pledge_products ORDER BY term_days,product_code`),pool.query(`SELECT symbol,display_name,enabled,sort_order FROM market_settings ORDER BY sort_order,symbol`)]);res.json({general:general.rows[0]?.setting_value||{},trades:trades.rows,pledges:pledges.rows,markets:markets.rows});}catch(e){console.error(e);res.status(500).json({error:'Unable to load configuration'});}});
app.put('/api/admin/config/general',adminAuth,requireRole('super_admin','operations'),async(req,res)=>{const value={platformName:String(req.body?.platformName||'DApps Platform').trim().slice(0,80),announcement:String(req.body?.announcement||'').trim().slice(0,500),maintenanceMode:Boolean(req.body?.maintenanceMode)};try{await pool.query(`INSERT INTO platform_settings(setting_key,setting_value,updated_by,updated_at) VALUES('general',$1::jsonb,$2,NOW()) ON CONFLICT(setting_key) DO UPDATE SET setting_value=EXCLUDED.setting_value,updated_by=EXCLUDED.updated_by,updated_at=NOW()`,[JSON.stringify(value),req.admin.id]);await audit(req,'platform.settings.update','platform_settings','general',value);res.json({general:value});}catch(e){console.error(e);res.status(500).json({error:'Unable to update settings'});}});
app.put('/api/admin/config/trades/:duration',adminAuth,requireRole('super_admin','operations'),async(req,res)=>{const duration=Number(req.params.duration),minimumAmount=Number(req.body?.minimumAmount),profitRate=Number(req.body?.profitRate),enabled=Boolean(req.body?.enabled);if(![30,60,90,180,360].includes(duration)||!Number.isFinite(minimumAmount)||minimumAmount<0||!Number.isFinite(profitRate)||profitRate<0||profitRate>100)return res.status(400).json({error:'Invalid trade configuration'});try{await pool.query(`UPDATE trade_products SET minimum_amount=$1,profit_rate=$2,enabled=$3,updated_by=$4,updated_at=NOW() WHERE duration_seconds=$5`,[minimumAmount,profitRate,enabled,req.admin.id,duration]);await audit(req,'trade.settings.update','trade_product',String(duration),{minimumAmount,profitRate,enabled});res.json({ok:true});}catch(e){console.error(e);res.status(500).json({error:'Unable to update trade configuration'});}});
app.put('/api/admin/config/pledges/:code',adminAuth,requireRole('super_admin','operations'),async(req,res)=>{const code=String(req.params.code),apy=Number(req.body?.apy),minimumAmount=Number(req.body?.minimumAmount),enabled=Boolean(req.body?.enabled);if(!Number.isFinite(apy)||apy<0||apy>1000||!Number.isFinite(minimumAmount)||minimumAmount<0)return res.status(400).json({error:'Invalid pledge configuration'});try{const q=await pool.query(`UPDATE pledge_products SET apy=$1,minimum_amount=$2,enabled=$3,updated_by=$4,updated_at=NOW() WHERE product_code=$5 RETURNING product_code`,[apy,minimumAmount,enabled,req.admin.id,code]);if(!q.rows[0])return res.status(404).json({error:'Pledge product not found'});await audit(req,'pledge.settings.update','pledge_product',code,{apy,minimumAmount,enabled});res.json({ok:true});}catch(e){console.error(e);res.status(500).json({error:'Unable to update pledge configuration'});}});
app.put('/api/admin/config/markets/:symbol',adminAuth,requireRole('super_admin','operations'),async(req,res)=>{const symbol=decodeURIComponent(req.params.symbol),enabled=Boolean(req.body?.enabled),sortOrder=Number(req.body?.sortOrder);if(!Number.isInteger(sortOrder)||sortOrder<0)return res.status(400).json({error:'Invalid market configuration'});try{const q=await pool.query(`UPDATE market_settings SET enabled=$1,sort_order=$2,updated_by=$3,updated_at=NOW() WHERE symbol=$4 RETURNING symbol`,[enabled,sortOrder,req.admin.id,symbol]);if(!q.rows[0])return res.status(404).json({error:'Market not found'});await audit(req,'market.settings.update','market',symbol,{enabled,sortOrder});res.json({ok:true});}catch(e){console.error(e);res.status(500).json({error:'Unable to update market configuration'});}});
app.get('/api/admin/audit-logs',adminAuth,requireRole('super_admin','compliance'),async(req,res)=>{try{const q=await pool.query(`SELECT l.id,l.action,l.target_type,l.target_id,l.details,l.ip_address,l.created_at,a.email admin_email FROM admin_audit_logs l LEFT JOIN admins a ON a.id=l.admin_id ORDER BY l.created_at DESC LIMIT 500`);res.json({logs:q.rows});}catch(e){console.error(e);res.status(500).json({error:'Unable to load audit logs'});}});

app.post('/api/demo/presence',(req,res)=>{const sessionId=validDemoSessionId(req.body?.sessionId);if(!sessionId)return res.status(400).json({error:'Invalid simulation session'});pruneDemoSessions();const now=Date.now(),existing=demoSessions.get(sessionId),s=existing||{sessionId,label:'SIM-'+sessionId.replace(/[^A-Za-z0-9]/g,'').slice(0,8).toUpperCase(),createdAt:now,control:'auto',forceQueue:[]};s.lastSeen=now;s.page=['trade','pledge'].includes(String(req.body?.page))?String(req.body.page):'trade';for(const key of ['balance','activeTrades','pledged','pledgeCount']){const n=Number(req.body?.[key]);if(Number.isFinite(n)&&n>=0)s[key]=Math.min(n,1e12)}demoSessions.set(sessionId,s);res.json({ok:true,control:s.control,forceQueue:s.forceQueue,expiresInMs:DEMO_SESSION_TTL_MS})});
app.post('/api/demo/leave',(req,res)=>{const sessionId=validDemoSessionId(req.body?.sessionId||req.query?.sessionId);if(sessionId)demoSessions.delete(sessionId);res.json({ok:true})});
app.post('/api/demo/settle',(req,res)=>{const sessionId=validDemoSessionId(req.body?.sessionId);if(!sessionId)return res.status(400).json({error:'Invalid simulation session'});pruneDemoSessions();const s=demoSessions.get(sessionId);if(!s)return res.status(404).json({error:'Simulation session is no longer active'});s.lastSeen=Date.now();const naturalWon=Boolean(req.body?.naturalWon);let won=naturalWon,applied='market';if(s.control==='win'){won=true;applied='win'}else if(s.control==='loss'){won=false;applied='loss'}else{const q=Array.isArray(s.forceQueue)?s.forceQueue:[],head=q[0],count=Number(head?.count||0);if(count>0&&['win','loss'].includes(head?.result)){won=head.result==='win';applied=head.result;s.forceQueue=count<=1?q.slice(1):[{result:head.result,count:count-1},...q.slice(1)]}}res.json({won,applied,control:s.control,forceQueue:s.forceQueue})});
app.get('/api/admin/demo-sessions',adminAuth,async(req,res)=>{pruneDemoSessions();res.json({sessions:[...demoSessions.values()].sort((a,b)=>b.lastSeen-a.lastSeen).map(demoSessionView)})});
app.patch('/api/admin/demo-sessions/:sessionId/control',adminAuth,requireRole('super_admin','operations'),async(req,res)=>{const sessionId=validDemoSessionId(req.params.sessionId),control=String(req.body?.control||'');if(!sessionId||!['auto','win','loss'].includes(control))return res.status(400).json({error:'Invalid simulation control'});pruneDemoSessions();const s=demoSessions.get(sessionId);if(!s)return res.status(404).json({error:'Simulation session is no longer online'});s.control=control;s.forceQueue=[];await audit(req,'demo.control.update','demo_session',s.label,{control});res.json({session:demoSessionView(s)})});
app.patch('/api/admin/demo-sessions/:sessionId/sequence',adminAuth,requireRole('super_admin','operations'),async(req,res)=>{const sessionId=validDemoSessionId(req.params.sessionId),result=String(req.body?.result||''),count=Number(req.body?.count);if(!sessionId||!['win','loss'].includes(result)||!Number.isInteger(count)||count<1||count>999)return res.status(400).json({error:'Invalid simulation sequence'});pruneDemoSessions();const s=demoSessions.get(sessionId);if(!s)return res.status(404).json({error:'Simulation session is no longer online'});s.control='auto';s.forceQueue=Array.isArray(s.forceQueue)?s.forceQueue:[];const tail=s.forceQueue[s.forceQueue.length-1];if(tail?.result===result)tail.count=Number(tail.count||0)+count;else s.forceQueue.push({result,count});await audit(req,'demo.sequence.update','demo_session',s.label,{result,count});res.json({session:demoSessionView(s)})});

registerWalletRoutes(app,{pool,auth,adminAuth,requireRole,audit});
registerKycRoutes(app,{pool,auth,adminAuth,requireRole,audit});
registerBusinessRoutes(app,{pool,auth,adminAuth,requireRole,audit});
registerAdminNotificationRoutes(app,{pool,adminAuth});
registerUserNotificationRoutes(app,{pool,auth});
app.use((err,req,res,next)=>{console.error(err);res.status(500).json({error:'Server error'});});

async function start(){try{await initializeDatabase();app.listen(PORT,'0.0.0.0',()=>console.log(`DApps backend listening on ${PORT}; database schema ready`));}catch(error){console.error('Backend startup failed:',error);process.exit(1);}}
start();
