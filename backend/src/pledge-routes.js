import crypto from 'crypto';

const money=v=>Number(Number(v).toFixed(2));
const makeRef=()=>`PLG-${new Date().toISOString().slice(0,10).replaceAll('-','')}-${crypto.randomInt(100000,999999)}`;
const PRODUCTS={
  '1-day':{name:'1-Day Pledge',termDays:1,dailyRate:.30,minimum:1000},
  '7-day':{name:'7-Day Pledge',termDays:7,dailyRate:.36,minimum:10000},
  '15-day':{name:'15-Day Pledge',termDays:15,dailyRate:.40,minimum:50000},
  '30-day':{name:'30-Day Pledge',termDays:30,dailyRate:.42,minimum:100000},
  '90-day':{name:'90-Day Pledge',termDays:90,dailyRate:.48,minimum:500000}
};

export async function initializePledgeSchema(pool){
  await pool.query(`CREATE TABLE IF NOT EXISTS pledge_orders(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_no VARCHAR(32) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_code VARCHAR(40) NOT NULL,
    product_name VARCHAR(80) NOT NULL,
    term_days INTEGER NOT NULL,
    daily_rate NUMERIC(8,4) NOT NULL,
    principal NUMERIC(20,2) NOT NULL,
    settled_days INTEGER NOT NULL DEFAULT 0,
    total_profit NUMERIC(20,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_pledge_orders_user_status ON pledge_orders(user_id,status,started_at DESC)`);
}

async function ensureBalance(client,userId){
  await client.query(`INSERT INTO account_balances(user_id) VALUES($1) ON CONFLICT(user_id) DO NOTHING`,[userId]);
  return (await client.query(`SELECT available_balance,locked_balance FROM account_balances WHERE user_id=$1 FOR UPDATE`,[userId])).rows[0];
}

async function settleUser(pool,userId){
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    await ensureBalance(client,userId);
    const q=await client.query(`SELECT * FROM pledge_orders WHERE user_id=$1 AND status='active' ORDER BY started_at FOR UPDATE`,[userId]);
    const now=Date.now();
    for(const o of q.rows){
      const started=new Date(o.started_at).getTime();
      const elapsed=Math.max(0,Math.floor((now-started)/86400000));
      const dueDays=Math.min(Number(o.term_days),elapsed);
      const already=Number(o.settled_days)||0;
      const newDays=Math.max(0,dueDays-already);
      if(newDays>0){
        const profit=money(Number(o.principal)*Number(o.daily_rate)/100*newDays);
        await client.query(`UPDATE account_balances SET available_balance=available_balance+$1,updated_at=NOW() WHERE user_id=$2`,[profit,userId]);
        const b=(await client.query(`SELECT available_balance,locked_balance FROM account_balances WHERE user_id=$1`,[userId])).rows[0];
        await client.query(`INSERT INTO wallet_ledger(user_id,entry_type,amount,available_after,locked_after,reference_type,reference_id,note) VALUES($1,'pledge_daily_profit',$2,$3,$4,'pledge',$5,$6)`,[userId,profit,b.available_balance,b.locked_balance,o.order_no,`${newDays} day pledge profit settled`]);
        await client.query(`UPDATE pledge_orders SET settled_days=$1,total_profit=total_profit+$2,updated_at=NOW() WHERE id=$3`,[dueDays,profit,o.id]);
      }
      if(dueDays>=Number(o.term_days)){
        const principal=money(o.principal);
        await client.query(`UPDATE account_balances SET available_balance=available_balance+$1,locked_balance=GREATEST(0,locked_balance-$1),updated_at=NOW() WHERE user_id=$2`,[principal,userId]);
        const b=(await client.query(`SELECT available_balance,locked_balance FROM account_balances WHERE user_id=$1`,[userId])).rows[0];
        await client.query(`INSERT INTO wallet_ledger(user_id,entry_type,amount,available_after,locked_after,reference_type,reference_id,note) VALUES($1,'pledge_principal_return',$2,$3,$4,'pledge',$5,'Pledge matured; principal returned')`,[userId,principal,b.available_balance,b.locked_balance,o.order_no]);
        await client.query(`UPDATE pledge_orders SET status='completed',completed_at=NOW(),updated_at=NOW() WHERE id=$1`,[o.id]);
      }
    }
    await client.query('COMMIT');
  }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
}

export function registerPledgeRoutes(app,{pool,auth}){
  app.get('/api/pledge/products',async(req,res)=>{
    res.json({products:Object.entries(PRODUCTS).map(([code,p])=>({code,...p}))});
  });

  app.get('/api/pledges',auth,async(req,res)=>{
    try{
      await settleUser(pool,req.auth.sub);
      const [orders,b]=await Promise.all([
        pool.query(`SELECT order_no,product_code,product_name,term_days,daily_rate,principal,settled_days,total_profit,status,started_at,end_at,completed_at FROM pledge_orders WHERE user_id=$1 ORDER BY started_at DESC LIMIT 100`,[req.auth.sub]),
        pool.query(`SELECT available_balance,locked_balance FROM account_balances WHERE user_id=$1`,[req.auth.sub])
      ]);
      res.json({orders:orders.rows.map(o=>({orderNo:o.order_no,productCode:o.product_code,productName:o.product_name,termDays:Number(o.term_days),dailyRate:Number(o.daily_rate),principal:Number(o.principal),settledDays:Number(o.settled_days),totalProfit:Number(o.total_profit),status:o.status,startedAt:o.started_at,endAt:o.end_at,completedAt:o.completed_at})),balance:{available:Number(b.rows[0]?.available_balance||0),locked:Number(b.rows[0]?.locked_balance||0)}});
    }catch(e){console.error(e);res.status(500).json({error:'Unable to load pledge orders'})}
  });

  app.post('/api/pledges',auth,async(req,res)=>{
    const code=String(req.body?.productCode||'').trim();
    const product=PRODUCTS[code];
    const amount=money(req.body?.amount);
    if(!product)return res.status(400).json({error:'Invalid pledge product'});
    if(!Number.isFinite(amount)||amount<product.minimum)return res.status(400).json({error:`Minimum pledge is ${product.minimum.toLocaleString('en-US')} USDT`});
    const client=await pool.connect();
    try{
      await client.query('BEGIN');
      const before=await ensureBalance(client,req.auth.sub);
      if(Number(before.available_balance)<amount){await client.query('ROLLBACK');return res.status(400).json({error:'Insufficient available balance'})}
      const orderNo=makeRef();
      await client.query(`UPDATE account_balances SET available_balance=available_balance-$1,locked_balance=locked_balance+$1,updated_at=NOW() WHERE user_id=$2`,[amount,req.auth.sub]);
      const b=(await client.query(`SELECT available_balance,locked_balance FROM account_balances WHERE user_id=$1`,[req.auth.sub])).rows[0];
      const endAt=new Date(Date.now()+product.termDays*86400000);
      await client.query(`INSERT INTO pledge_orders(order_no,user_id,product_code,product_name,term_days,daily_rate,principal,end_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,[orderNo,req.auth.sub,code,product.name,product.termDays,product.dailyRate,amount,endAt]);
      await client.query(`INSERT INTO wallet_ledger(user_id,entry_type,amount,available_after,locked_after,reference_type,reference_id,note) VALUES($1,'pledge_lock',$2,$3,$4,'pledge',$5,$6)`,[req.auth.sub,-amount,b.available_balance,b.locked_balance,orderNo,`${product.name} principal locked`]);
      await client.query('COMMIT');
      res.status(201).json({order:{orderNo,productCode:code,productName:product.name,termDays:product.termDays,dailyRate:product.dailyRate,principal:amount,status:'active',endAt:endAt.toISOString()},balance:{available:Number(b.available_balance),locked:Number(b.locked_balance)}});
    }catch(e){await client.query('ROLLBACK');console.error(e);res.status(500).json({error:'Unable to create pledge order'})}finally{client.release()}
  });
}
