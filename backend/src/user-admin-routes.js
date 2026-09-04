const clean=(v,n=400)=>String(v??'').trim().slice(0,n);

export async function initializeUserAdminSchema(pool){
  await pool.query(`CREATE TABLE IF NOT EXISTS user_admin_notes (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    admin_id UUID REFERENCES admins(id) ON DELETE SET NULL,
    note TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_user_admin_notes_user_created ON user_admin_notes(user_id,created_at DESC)`);
}

export function registerUserAdminRoutes(app,{pool,adminAuth,requireRole,audit}){
  app.patch('/api/admin/users/:publicId/status',adminAuth,requireRole('super_admin','operations'),async(req,res)=>{
    const status=String(req.body?.status||'').trim().toLowerCase();
    if(!['active','frozen'].includes(status))return res.status(400).json({error:'Status must be active or frozen'});
    try{
      const q=await pool.query(`UPDATE users SET status=$1,updated_at=NOW() WHERE public_id=$2 RETURNING public_id,status`,[status,req.params.publicId]);
      if(!q.rows[0])return res.status(404).json({error:'User not found'});
      await audit(req,'user.status.update','user',req.params.publicId,{status});
      res.json({ok:true,publicId:q.rows[0].public_id,status:q.rows[0].status});
    }catch(e){console.error(e);res.status(500).json({error:'Unable to update account status'});}
  });

  app.get('/api/admin/users/:publicId/detail',adminAuth,async(req,res)=>{
    try{
      const uq=await pool.query(`SELECT id,public_id,registration_type,identifier,display_name,status,created_at,updated_at FROM users WHERE public_id=$1`,[req.params.publicId]);
      const u=uq.rows[0];
      if(!u)return res.status(404).json({error:'User not found'});
      const [balance,kyc,deposits,withdrawals,trades,ledger,tickets,notes]=await Promise.all([
        pool.query(`SELECT asset,available_balance,locked_balance,updated_at FROM account_balances WHERE user_id=$1`,[u.id]),
        pool.query(`SELECT id,full_name,country,document_type,status,review_note,submitted_at,reviewed_at FROM kyc_profiles WHERE user_id=$1`,[u.id]),
        pool.query(`SELECT request_no,asset,network,amount,status,review_note,created_at,reviewed_at FROM deposit_requests WHERE user_id=$1 ORDER BY created_at DESC LIMIT 30`,[u.id]),
        pool.query(`SELECT request_no,asset,network,destination_address,amount,status,review_note,created_at,reviewed_at FROM withdrawal_requests WHERE user_id=$1 ORDER BY created_at DESC LIMIT 30`,[u.id]),
        pool.query(`SELECT trade_no,symbol,direction,duration_seconds,amount,profit_rate,entry_price,exit_price,result_control,result,profit_amount,opened_at,expires_at,settled_at,override_note FROM trades WHERE user_id=$1 ORDER BY opened_at DESC LIMIT 50`,[u.id]),
        pool.query(`SELECT entry_type,amount,available_after,locked_after,reference_type,reference_id,note,created_at FROM wallet_ledger WHERE user_id=$1 ORDER BY created_at DESC LIMIT 60`,[u.id]),
        pool.query(`SELECT ticket_no,category,subject,status,created_at,updated_at FROM support_tickets WHERE user_id=$1 ORDER BY created_at DESC LIMIT 30`,[u.id]),
        pool.query(`SELECT n.id,n.note,n.created_at,a.email admin_email,a.display_name admin_name FROM user_admin_notes n LEFT JOIN admins a ON a.id=n.admin_id WHERE n.user_id=$1 ORDER BY n.created_at DESC LIMIT 50`,[u.id])
      ]);
      const b=balance.rows[0]||{asset:'USDT',available_balance:0,locked_balance:0,updated_at:null};
      res.json({
        user:{publicId:u.public_id,registrationType:u.registration_type,identifier:u.identifier,displayName:u.display_name,status:u.status,createdAt:u.created_at,updatedAt:u.updated_at},
        balance:{asset:b.asset,available:Number(b.available_balance),locked:Number(b.locked_balance),updatedAt:b.updated_at},
        kyc:kyc.rows[0]?{id:kyc.rows[0].id,fullName:kyc.rows[0].full_name,country:kyc.rows[0].country,documentType:kyc.rows[0].document_type,status:kyc.rows[0].status,reviewNote:kyc.rows[0].review_note,submittedAt:kyc.rows[0].submitted_at,reviewedAt:kyc.rows[0].reviewed_at}:{status:'not_submitted'},
        deposits:deposits.rows.map(x=>({requestNo:x.request_no,asset:x.asset,network:x.network,amount:Number(x.amount),status:x.status,reviewNote:x.review_note,createdAt:x.created_at,reviewedAt:x.reviewed_at})),
        withdrawals:withdrawals.rows.map(x=>({requestNo:x.request_no,asset:x.asset,network:x.network,address:x.destination_address,amount:Number(x.amount),status:x.status,reviewNote:x.review_note,createdAt:x.created_at,reviewedAt:x.reviewed_at})),
        trades:trades.rows.map(x=>({tradeNo:x.trade_no,symbol:x.symbol,direction:x.direction,duration:Number(x.duration_seconds),amount:Number(x.amount),profitRate:Number(x.profit_rate),entryPrice:Number(x.entry_price),exitPrice:x.exit_price==null?null:Number(x.exit_price),resultControl:x.result_control,result:x.result,profitAmount:x.profit_amount==null?null:Number(x.profit_amount),openedAt:x.opened_at,expiresAt:x.expires_at,settledAt:x.settled_at,overrideNote:x.override_note})),
        ledger:ledger.rows.map(x=>({entryType:x.entry_type,amount:Number(x.amount),availableAfter:Number(x.available_after),lockedAfter:Number(x.locked_after),referenceType:x.reference_type,referenceId:x.reference_id,note:x.note,createdAt:x.created_at})),
        tickets:tickets.rows.map(x=>({ticketNo:x.ticket_no,category:x.category,subject:x.subject,status:x.status,createdAt:x.created_at,updatedAt:x.updated_at})),
        notes:notes.rows.map(x=>({id:x.id,note:x.note,createdAt:x.created_at,adminEmail:x.admin_email,adminName:x.admin_name}))
      });
    }catch(e){console.error(e);res.status(500).json({error:'Unable to load user detail'});}
  });

  app.post('/api/admin/users/:publicId/notes',adminAuth,requireRole('super_admin','operations','compliance','customer_support'),async(req,res)=>{
    const note=clean(req.body?.note,1200);
    if(!note)return res.status(400).json({error:'Note is required'});
    try{
      const uq=await pool.query(`SELECT id FROM users WHERE public_id=$1`,[req.params.publicId]);
      if(!uq.rows[0])return res.status(404).json({error:'User not found'});
      const q=await pool.query(`INSERT INTO user_admin_notes(user_id,admin_id,note) VALUES($1,$2,$3) RETURNING id,created_at`,[uq.rows[0].id,req.admin.id,note]);
      await audit(req,'user.note.add','user',req.params.publicId,{note});
      res.status(201).json({note:{id:q.rows[0].id,note,createdAt:q.rows[0].created_at,adminName:req.admin.display_name}});
    }catch(e){console.error(e);res.status(500).json({error:'Unable to add internal note'});}
  });
}
