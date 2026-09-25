const TYPES=new Set(['support_chat','kyc','deposit','withdrawal']);

export async function initializeUserNotificationSchema(pool){
  await pool.query(`CREATE TABLE IF NOT EXISTS user_notification_reads (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source_type VARCHAR(32) NOT NULL,
    source_id VARCHAR(190) NOT NULL,
    read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY(user_id,source_type,source_id)
  )`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_user_notification_reads_user ON user_notification_reads(user_id,read_at DESC)`);
  const baseline=(await pool.query(`SELECT 1 FROM platform_settings WHERE setting_key='user_notification_baseline_v1'`)).rows[0];
  if(!baseline){
    await pool.query(`INSERT INTO user_notification_reads(user_id,source_type,source_id,read_at)
      SELECT user_id,'kyc','kyc',COALESCE(reviewed_at,NOW()) FROM kyc_profiles WHERE reviewed_at IS NOT NULL
      ON CONFLICT(user_id,source_type,source_id) DO UPDATE SET read_at=GREATEST(user_notification_reads.read_at,EXCLUDED.read_at)`);
    await pool.query(`INSERT INTO user_notification_reads(user_id,source_type,source_id,read_at)
      SELECT user_id,'deposit',request_no,COALESCE(reviewed_at,NOW()) FROM deposit_requests WHERE reviewed_at IS NOT NULL
      ON CONFLICT(user_id,source_type,source_id) DO UPDATE SET read_at=GREATEST(user_notification_reads.read_at,EXCLUDED.read_at)`);
    await pool.query(`INSERT INTO user_notification_reads(user_id,source_type,source_id,read_at)
      SELECT user_id,'withdrawal',request_no,COALESCE(reviewed_at,NOW()) FROM withdrawal_requests WHERE reviewed_at IS NOT NULL
      ON CONFLICT(user_id,source_type,source_id) DO UPDATE SET read_at=GREATEST(user_notification_reads.read_at,EXCLUDED.read_at)`);
    await pool.query(`INSERT INTO user_notification_reads(user_id,source_type,source_id,read_at)
      SELECT c.user_id,'support_chat',c.id::text,MAX(m.created_at)
      FROM support_conversations c JOIN support_messages m ON m.conversation_id=c.id AND m.sender_type='admin'
      GROUP BY c.user_id,c.id
      ON CONFLICT(user_id,source_type,source_id) DO UPDATE SET read_at=GREATEST(user_notification_reads.read_at,EXCLUDED.read_at)`);
    await pool.query(`INSERT INTO platform_settings(setting_key,setting_value)
      VALUES('user_notification_baseline_v1',$1::jsonb)
      ON CONFLICT(setting_key) DO NOTHING`,[JSON.stringify({appliedAt:new Date().toISOString()})]);
  }
}

export function registerUserNotificationRoutes(app,{pool,auth}){
  app.get('/api/notifications',auth,async(req,res)=>{
    try{
      res.set('Cache-Control','no-store');
      const userId=req.auth.sub;
      const [support,kyc,deposits,withdrawals]=await Promise.all([
        pool.query(`SELECT c.id::text source_id,m.message,m.created_at
          FROM support_conversations c
          JOIN LATERAL (
            SELECT message,created_at FROM support_messages
            WHERE conversation_id=c.id AND sender_type='admin'
            ORDER BY created_at DESC,id DESC LIMIT 1
          ) m ON TRUE
          LEFT JOIN user_notification_reads r
            ON r.user_id=$1 AND r.source_type='support_chat' AND r.source_id=c.id::text
          WHERE c.user_id=$1 AND (r.read_at IS NULL OR m.created_at>r.read_at)
          ORDER BY m.created_at DESC LIMIT 20`,[userId]),
        pool.query(`SELECT k.status,k.review_note,k.reviewed_at
          FROM kyc_profiles k
          LEFT JOIN user_notification_reads r
            ON r.user_id=$1 AND r.source_type='kyc' AND r.source_id='kyc'
          WHERE k.user_id=$1 AND k.reviewed_at IS NOT NULL AND k.status IN ('approved','rejected')
            AND (r.read_at IS NULL OR k.reviewed_at>r.read_at)
          LIMIT 1`,[userId]),
        pool.query(`SELECT d.request_no source_id,d.asset,d.amount,d.status,d.review_note,d.reviewed_at
          FROM deposit_requests d
          LEFT JOIN user_notification_reads r
            ON r.user_id=$1 AND r.source_type='deposit' AND r.source_id=d.request_no
          WHERE d.user_id=$1 AND d.reviewed_at IS NOT NULL AND d.status IN ('approved','rejected')
            AND (r.read_at IS NULL OR d.reviewed_at>r.read_at)
          ORDER BY d.reviewed_at DESC LIMIT 30`,[userId]),
        pool.query(`SELECT w.request_no source_id,w.asset,w.amount,w.status,w.review_note,w.reviewed_at
          FROM withdrawal_requests w
          LEFT JOIN user_notification_reads r
            ON r.user_id=$1 AND r.source_type='withdrawal' AND r.source_id=w.request_no
          WHERE w.user_id=$1 AND w.reviewed_at IS NOT NULL AND w.status IN ('approved','rejected')
            AND (r.read_at IS NULL OR w.reviewed_at>r.read_at)
          ORDER BY w.reviewed_at DESC LIMIT 30`,[userId])
      ]);
      const items=[
        ...support.rows.map(x=>({type:'support_chat',sourceId:x.source_id,title:'Support replied',text:String(x.message||'').slice(0,140),createdAt:x.created_at,href:'support.html'})),
        ...kyc.rows.map(x=>({type:'kyc',sourceId:'kyc',title:x.status==='approved'?'Identity verification approved':'Identity verification needs attention',text:x.review_note||'',createdAt:x.reviewed_at,href:'kyc.html'})),
        ...deposits.rows.map(x=>({type:'deposit',sourceId:x.source_id,title:x.status==='approved'?'Deposit approved':'Deposit rejected',text:`${Number(x.amount)} ${x.asset}${x.review_note?' · '+x.review_note:''}`,createdAt:x.reviewed_at,href:'deposit.html'})),
        ...withdrawals.rows.map(x=>({type:'withdrawal',sourceId:x.source_id,title:x.status==='approved'?'Withdrawal approved':'Withdrawal rejected',text:`${Number(x.amount)} ${x.asset}${x.review_note?' · '+x.review_note:''}`,createdAt:x.reviewed_at,href:'withdraw.html'}))
      ].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,60);
      res.json({unreadCount:items.length,items});
    }catch(e){console.error(e);res.status(500).json({error:'Unable to load notifications'});}
  });

  app.post('/api/notifications/read',auth,async(req,res)=>{
    const sourceType=String(req.body?.sourceType||'').trim();
    const sourceId=String(req.body?.sourceId||'').trim().slice(0,190);
    if(!TYPES.has(sourceType)||!sourceId)return res.status(400).json({error:'Invalid notification'});
    try{
      await pool.query(`INSERT INTO user_notification_reads(user_id,source_type,source_id,read_at)
        VALUES($1,$2,$3,NOW())
        ON CONFLICT(user_id,source_type,source_id)
        DO UPDATE SET read_at=GREATEST(user_notification_reads.read_at,NOW())`,[req.auth.sub,sourceType,sourceId]);
      res.json({ok:true});
    }catch(e){console.error(e);res.status(500).json({error:'Unable to mark notification as read'});}
  });
}
