import crypto from 'crypto';

const money=v=>Number(Number(v).toFixed(2));
const makeTradeNo=()=>`TRD-${new Date().toISOString().slice(0,10).replaceAll('-','')}-${crypto.randomInt(100000,999999)}`;

export async function initializeTradeSchema(pool){
  await pool.query(`CREATE TABLE IF NOT EXISTS trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trade_no VARCHAR(32) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    symbol VARCHAR(30) NOT NULL,
    direction VARCHAR(8) NOT NULL CHECK(direction IN ('up','down')),
    duration_seconds INTEGER NOT NULL,
    amount NUMERIC(20,2) NOT NULL,
    profit_rate NUMERIC(8,2) NOT NULL,
    entry_price NUMERIC(30,10) NOT NULL,
    exit_price NUMERIC(30,10),
    result_control VARCHAR(12) NOT NULL DEFAULT 'auto' CHECK(result_control IN ('auto','win','loss')),
    result VARCHAR(12) NOT NULL DEFAULT 'pending' CHECK(result IN ('pending','won','lost')),
    profit_amount NUMERIC(20,2),
    opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    settled_at TIMESTAMPTZ,
    override_by UUID REFERENCES admins(id) ON DELETE SET NULL,
    override_note VARCHAR(300),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_trades_user_opened ON trades(user_id,opened_at DESC)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_trades_result_expires ON trades(result,expires_at)`);
}

export function registerTradeRoutes(app,{pool,auth,adminAuth,requireRole,audit}){
  const mapTrade=r=>({
    tradeNo:r.trade_no,symbol:r.symbol,direction:r.direction,duration:Number(r.duration_seconds),amount:Number(r.amount),profitRate:Number(r.profit_rate),
    entryPrice:Number(r.entry_price),exitPrice:r.exit_price==null?null:Number(r.exit_price),resultControl:r.result_control,result:r.result,
    profitAmount:r.profit_amount==null?null:Number(r.profit_amount),openedAt:r.opened_at,expiresAt:r.expires_at,settledAt:r.settled_at,
    overrideNote:r.override_note||null
  });

  app.get('/api/trades',auth,async(req,res)=>{
    try{
      const q=await pool.query(`SELECT * FROM trades WHERE user_id=$1 ORDER BY opened_at DESC LIMIT 200`,[req.auth.sub]);
      res.json({trades:q.rows.map(mapTrade)});
    }catch(e){console.error(e);res.status(500).json({error:'Unable to load trades'});}
  });

  app.post('/api/trades',auth,async(req,res)=>{
    const symbol=String(req.body?.symbol||'').trim().toUpperCase();
    const direction=String(req.body?.direction||'').trim().toLowerCase();
    const duration=Number(req.body?.duration);
    const amount=money(req.body?.amount);
    const entryPrice=Number(req.body?.entryPrice);
    if(!symbol||!['up','down'].includes(direction)||!Number.isFinite(amount)||amount<=0||!Number.isFinite(entryPrice)||entryPrice<=0)
      return res.status(400).json({error:'Invalid trade request'});
    const client=await pool.connect();
    try{
      await client.query('BEGIN');
      const product=(await client.query(`SELECT minimum_amount,profit_rate,enabled FROM trade_products WHERE duration_seconds=$1`,[duration])).rows[0];
      if(!product||!product.enabled){await client.query('ROLLBACK');return res.status(400).json({error:'Selected duration is unavailable'});}
      if(amount<Number(product.minimum_amount)){await client.query('ROLLBACK');return res.status(400).json({error:`Minimum for ${duration}s is ${Number(product.minimum_amount)} USDT`});}
      const market=(await client.query(`SELECT enabled FROM market_settings WHERE symbol=$1`,[symbol])).rows[0];
      if(!market?.enabled){await client.query('ROLLBACK');return res.status(400).json({error:'Selected market is unavailable'});}
      await client.query(`INSERT INTO account_balances(user_id) VALUES($1) ON CONFLICT(user_id) DO NOTHING`,[req.auth.sub]);
      const b=(await client.query(`SELECT available_balance,locked_balance FROM account_balances WHERE user_id=$1 FOR UPDATE`,[req.auth.sub])).rows[0];
      if(Number(b.available_balance)<amount){await client.query('ROLLBACK');return res.status(400).json({error:'Insufficient available balance'});}
      const tradeNo=makeTradeNo();
      await client.query(`UPDATE account_balances SET available_balance=available_balance-$1,locked_balance=locked_balance+$1,updated_at=NOW() WHERE user_id=$2`,[amount,req.auth.sub]);
      const q=await client.query(`INSERT INTO trades(trade_no,user_id,symbol,direction,duration_seconds,amount,profit_rate,entry_price,expires_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,NOW()+($5||' seconds')::interval) RETURNING *`,[tradeNo,req.auth.sub,symbol,direction,duration,amount,Number(product.profit_rate),entryPrice]);
      const after=(await client.query(`SELECT available_balance,locked_balance FROM account_balances WHERE user_id=$1`,[req.auth.sub])).rows[0];
      await client.query(`INSERT INTO wallet_ledger(user_id,entry_type,amount,available_after,locked_after,reference_type,reference_id,note)
        VALUES($1,'trade_hold',$2,$3,$4,'trade',$5,'Trade opened')`,[req.auth.sub,-amount,after.available_balance,after.locked_balance,tradeNo]);
      await client.query('COMMIT');
      res.status(201).json({trade:mapTrade(q.rows[0]),balance:{available:Number(after.available_balance),locked:Number(after.locked_balance)}});
    }catch(e){await client.query('ROLLBACK');console.error(e);res.status(500).json({error:'Unable to open trade'});}finally{client.release();}
  });

  app.post('/api/trades/:tradeNo/settle',auth,async(req,res)=>{
    const exitPrice=Number(req.body?.exitPrice);
    if(!Number.isFinite(exitPrice)||exitPrice<=0)return res.status(400).json({error:'Valid exit price is required'});
    const client=await pool.connect();
    try{
      await client.query('BEGIN');
      const q=await client.query(`SELECT * FROM trades WHERE trade_no=$1 AND user_id=$2 FOR UPDATE`,[req.params.tradeNo,req.auth.sub]);
      const t=q.rows[0];
      if(!t){await client.query('ROLLBACK');return res.status(404).json({error:'Trade not found'});}
      if(t.result!=='pending'){
        const b=(await client.query(`SELECT available_balance,locked_balance FROM account_balances WHERE user_id=$1`,[req.auth.sub])).rows[0];
        await client.query('COMMIT');return res.json({trade:mapTrade(t),balance:{available:Number(b.available_balance),locked:Number(b.locked_balance)}});
      }
      if(Date.now()<new Date(t.expires_at).getTime()){await client.query('ROLLBACK');return res.status(409).json({error:'Trade has not expired yet'});}
      let won;
      if(t.result_control==='win')won=true;
      else if(t.result_control==='loss')won=false;
      else won=t.direction==='up'?exitPrice>=Number(t.entry_price):exitPrice<=Number(t.entry_price);
      const amount=Number(t.amount),profitRate=Number(t.profit_rate),profit=won?money(amount*profitRate/100):-amount;
      const credit=won?money(amount+profit):0;
      await client.query(`UPDATE account_balances SET locked_balance=GREATEST(0,locked_balance-$1),available_balance=available_balance+$2,updated_at=NOW() WHERE user_id=$3`,[amount,credit,req.auth.sub]);
      const updated=(await client.query(`UPDATE trades SET exit_price=$1,result=$2,profit_amount=$3,settled_at=NOW(),updated_at=NOW() WHERE id=$4 RETURNING *`,[exitPrice,won?'won':'lost',profit,t.id])).rows[0];
      const b=(await client.query(`SELECT available_balance,locked_balance FROM account_balances WHERE user_id=$1`,[req.auth.sub])).rows[0];
      await client.query(`INSERT INTO wallet_ledger(user_id,entry_type,amount,available_after,locked_after,reference_type,reference_id,note)
        VALUES($1,$2,$3,$4,$5,'trade',$6,$7)`,[req.auth.sub,won?'trade_win':'trade_loss',won?credit:0,b.available_balance,b.locked_balance,t.trade_no,won?'Trade settled as win':'Trade settled as loss']);
      await client.query('COMMIT');
      res.json({trade:mapTrade(updated),balance:{available:Number(b.available_balance),locked:Number(b.locked_balance)}});
    }catch(e){await client.query('ROLLBACK');console.error(e);res.status(500).json({error:'Unable to settle trade'});}finally{client.release();}
  });

  app.get('/api/admin/trades',adminAuth,requireRole('super_admin','operations','compliance'),async(req,res)=>{
    const result=String(req.query.result||'').trim();
    const search=String(req.query.search||'').trim();
    try{
      const vals=[];const where=[];
      if(result){vals.push(result);where.push(`t.result=$${vals.length}`);}
      if(search){vals.push(`%${search}%`);where.push(`(t.trade_no ILIKE $${vals.length} OR t.symbol ILIKE $${vals.length} OR u.public_id ILIKE $${vals.length} OR u.display_name ILIKE $${vals.length})`);}
      const q=await pool.query(`SELECT t.*,u.public_id,u.display_name,u.identifier FROM trades t JOIN users u ON u.id=t.user_id ${where.length?'WHERE '+where.join(' AND '):''} ORDER BY t.opened_at DESC LIMIT 500`,vals);
      res.json({trades:q.rows.map(r=>({...mapTrade(r),user:{publicId:r.public_id,displayName:r.display_name,identifier:r.identifier}}))});
    }catch(e){console.error(e);res.status(500).json({error:'Unable to load trade control'});}
  });

  app.patch('/api/admin/trades/:tradeNo/control',adminAuth,requireRole('super_admin','operations'),async(req,res)=>{
    const control=String(req.body?.control||'').toLowerCase();
    const note=String(req.body?.note||'').trim().slice(0,300);
    if(!['auto','win','loss'].includes(control))return res.status(400).json({error:'Control must be auto, win or loss'});
    if(control!=='auto'&&!note)return res.status(400).json({error:'Reason is required for forced outcomes'});
    try{
      const q=await pool.query(`UPDATE trades SET result_control=$1,override_by=$2,override_note=$3,updated_at=NOW() WHERE trade_no=$4 AND result='pending' RETURNING trade_no,result_control`,[control,req.admin.id,note||null,req.params.tradeNo]);
      if(!q.rows[0])return res.status(409).json({error:'Trade is not pending or was not found'});
      await audit(req,'trade.outcome.control','trade',req.params.tradeNo,{control,note});
      res.json({ok:true,tradeNo:req.params.tradeNo,resultControl:control});
    }catch(e){console.error(e);res.status(500).json({error:'Unable to update trade control'});}
  });
}
