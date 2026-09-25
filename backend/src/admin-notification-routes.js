const TYPES=new Set(['support_chat','deposit','withdrawal','kyc','ticket','recovery']);
const NOTIFICATION_LAUNCH_AT='2026-09-25T00:09:39.000Z';

export async function initializeAdminNotificationSchema(pool){
  await pool.query(`CREATE TABLE IF NOT EXISTS admin_notification_reads (
    admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    source_type VARCHAR(32) NOT NULL,
    source_id VARCHAR(190) NOT NULL,
    read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY(admin_id,source_type,source_id)
  )`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_admin_notification_reads_admin ON admin_notification_reads(admin_id,read_at DESC)`);
  await pool.query(`DELETE FROM admin_notification_reads r
    WHERE r.source_type='ticket'
      AND NOT EXISTS (SELECT 1 FROM support_tickets t WHERE t.ticket_no=r.source_id)`);
  const baseline=(await pool.query(`SELECT 1 FROM platform_settings WHERE setting_key='notification_ticket_baseline_v1'`)).rows[0];
  if(!baseline){
    await pool.query(`INSERT INTO admin_notification_reads(admin_id,source_type,source_id,read_at)
      SELECT a.id,'ticket',t.ticket_no,NOW()
      FROM admins a CROSS JOIN support_tickets t
      ON CONFLICT(admin_id,source_type,source_id)
      DO UPDATE SET read_at=NOW()`);
    await pool.query(`INSERT INTO platform_settings(setting_key,setting_value)
      VALUES('notification_ticket_baseline_v1',$1::jsonb)
      ON CONFLICT(setting_key) DO NOTHING`,[JSON.stringify({appliedAt:new Date().toISOString()})]);
  }
}

export function registerAdminNotificationRoutes(app,{pool,adminAuth}){
  app.get('/api/admin/notifications',adminAuth,async(req,res)=>{
    try{
      res.set('Cache-Control','no-store');
      const adminId=req.admin.id;
      const [support,deposits,withdrawals,kyc,tickets,recovery]=await Promise.all([
        pool.query(`SELECT c.id::text source_id,u.public_id,u.display_name,m.message,m.created_at
          FROM support_conversations c
          JOIN users u ON u.id=c.user_id
          JOIN LATERAL (
            SELECT message,created_at FROM support_messages
            WHERE conversation_id=c.id AND sender_type='user'
            ORDER BY created_at DESC,id DESC LIMIT 1
          ) m ON TRUE
          LEFT JOIN admin_notification_reads r
            ON r.admin_id=$1 AND r.source_type='support_chat' AND r.source_id=c.id::text
          WHERE r.read_at IS NULL OR m.created_at>r.read_at
          ORDER BY m.created_at DESC LIMIT 50`,[adminId]),
        pool.query(`SELECT d.request_no source_id,d.asset,d.amount,d.created_at,u.public_id,u.display_name
          FROM deposit_requests d JOIN users u ON u.id=d.user_id
          LEFT JOIN admin_notification_reads r
            ON r.admin_id=$1 AND r.source_type='deposit' AND r.source_id=d.request_no
          WHERE d.status='pending' AND (r.read_at IS NULL OR d.created_at>r.read_at)
          ORDER BY d.created_at DESC LIMIT 50`,[adminId]),
        pool.query(`SELECT w.request_no source_id,w.asset,w.amount,w.created_at,u.public_id,u.display_name
          FROM withdrawal_requests w JOIN users u ON u.id=w.user_id
          LEFT JOIN admin_notification_reads r
            ON r.admin_id=$1 AND r.source_type='withdrawal' AND r.source_id=w.request_no
          WHERE w.status='pending' AND (r.read_at IS NULL OR w.created_at>r.read_at)
          ORDER BY w.created_at DESC LIMIT 50`,[adminId]),
        pool.query(`SELECT k.id::text source_id,k.full_name,k.submitted_at created_at,u.public_id,u.display_name
          FROM kyc_profiles k JOIN users u ON u.id=k.user_id
          LEFT JOIN admin_notification_reads r
            ON r.admin_id=$1 AND r.source_type='kyc' AND r.source_id=k.id::text
          WHERE k.status='pending' AND (r.read_at IS NULL OR k.submitted_at>r.read_at)
          ORDER BY k.submitted_at DESC LIMIT 50`,[adminId]),
        pool.query(`SELECT t.ticket_no source_id,t.category,t.subject,t.created_at,u.public_id,u.display_name
          FROM support_tickets t JOIN users u ON u.id=t.user_id
          LEFT JOIN admin_notification_reads r
            ON r.admin_id=$1 AND r.source_type='ticket' AND r.source_id=t.ticket_no
          WHERE t.status='open' AND t.created_at>=$2::timestamptz AND (r.read_at IS NULL OR t.created_at>r.read_at)
          ORDER BY t.created_at DESC LIMIT 50`,[adminId,NOTIFICATION_LAUNCH_AT]),
        pool.query(`SELECT a.request_no source_id,a.recovery_type,a.lookup_value,a.created_at
          FROM account_recovery_requests a
          LEFT JOIN admin_notification_reads r
            ON r.admin_id=$1 AND r.source_type='recovery' AND r.source_id=a.request_no
          WHERE a.status='pending' AND (r.read_at IS NULL OR a.created_at>r.read_at)
          ORDER BY a.created_at DESC LIMIT 50`,[adminId])
      ]);
      const items=[
        ...support.rows.map(x=>({type:'support_chat',sourceId:x.source_id,title:'客服新消息',text:`${x.display_name||x.public_id}: ${String(x.message||'').slice(0,120)}`,createdAt:x.created_at,href:`/support-chat?chat=${encodeURIComponent(x.source_id)}`})),
        ...deposits.rows.map(x=>({type:'deposit',sourceId:x.source_id,title:'新的充值申请',text:`${x.display_name||x.public_id} · ${Number(x.amount)} ${x.asset}`,createdAt:x.created_at,href:`/wallet?tab=deposits&request=${encodeURIComponent(x.source_id)}`})),
        ...withdrawals.rows.map(x=>({type:'withdrawal',sourceId:x.source_id,title:'新的提现申请',text:`${x.display_name||x.public_id} · ${Number(x.amount)} ${x.asset}`,createdAt:x.created_at,href:`/wallet?tab=withdrawals`})),
        ...kyc.rows.map(x=>({type:'kyc',sourceId:x.source_id,title:'新的身份认证',text:`${x.display_name||x.public_id} · ${x.full_name||''}`,createdAt:x.created_at,href:`/kyc?id=${encodeURIComponent(x.source_id)}`})),
        ...tickets.rows.map(x=>({type:'ticket',sourceId:x.source_id,title:'新的 Support 工单',text:`${x.display_name||x.public_id} · ${x.subject||x.category||''}`,createdAt:x.created_at,href:`/?section=tickets`})),
        ...recovery.rows.map(x=>({type:'recovery',sourceId:x.source_id,title:'新的账号找回申请',text:`${x.recovery_type==='username'?'忘记用户名':'忘记登录密码'} · ${String(x.lookup_value||'').slice(0,80)}`,createdAt:x.created_at,href:`/?section=recovery`}))
      ].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,100);
      res.json({unreadCount:items.length,items});
    }catch(e){console.error(e);res.status(500).json({error:'Unable to load admin notifications'});}
  });

  app.post('/api/admin/notifications/read',adminAuth,async(req,res)=>{
    const sourceType=String(req.body?.sourceType||'').trim();
    const sourceId=String(req.body?.sourceId||'').trim().slice(0,190);
    if(!TYPES.has(sourceType)||!sourceId)return res.status(400).json({error:'Invalid notification'});
    try{
      await pool.query(`INSERT INTO admin_notification_reads(admin_id,source_type,source_id,read_at)
        VALUES($1,$2,$3,NOW())
        ON CONFLICT(admin_id,source_type,source_id)
        DO UPDATE SET read_at=GREATEST(admin_notification_reads.read_at,NOW())`,[req.admin.id,sourceType,sourceId]);
      res.json({ok:true});
    }catch(e){console.error(e);res.status(500).json({error:'Unable to mark notification as read'});}
  });
}
