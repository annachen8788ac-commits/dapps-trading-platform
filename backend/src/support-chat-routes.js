export async function initializeSupportChatSchema(pool){
  await pool.query(`CREATE TABLE IF NOT EXISTS support_conversations (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,status VARCHAR(20) NOT NULL DEFAULT 'open',assigned_admin UUID REFERENCES admins(id) ON DELETE SET NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  await pool.query(`CREATE TABLE IF NOT EXISTS support_messages (id BIGSERIAL PRIMARY KEY,conversation_id UUID NOT NULL REFERENCES support_conversations(id) ON DELETE CASCADE,sender_type VARCHAR(12) NOT NULL CHECK(sender_type IN ('user','admin')),sender_id UUID,message TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_support_messages_conversation ON support_messages(conversation_id,id)`);
  await pool.query(`ALTER TABLE support_conversations
    ADD COLUMN IF NOT EXISTS user_last_open_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS user_history_from TIMESTAMPTZ`);
  await pool.query(`UPDATE support_conversations
    SET user_last_open_at=COALESCE(user_last_open_at,NOW()),
        user_history_from=COALESCE(user_history_from,created_at)`);
}
const clean=(v,n=3000)=>String(v??'').trim().slice(0,n);
export function registerSupportChatRoutes(app,{pool,auth,adminAuth,audit}){
  async function convo(userId){
    let q=await pool.query(`SELECT id,status,user_last_open_at,user_history_from FROM support_conversations WHERE user_id=$1`,[userId]);
    if(q.rows[0])return q.rows[0];
    q=await pool.query(`INSERT INTO support_conversations(user_id,user_last_open_at,user_history_from) VALUES($1,NOW(),NOW()) RETURNING id,status,user_last_open_at,user_history_from`,[userId]);
    return q.rows[0];
  }
  app.get('/api/support/chat',auth,async(req,res)=>{
    const client=await pool.connect();
    try{
      await client.query('BEGIN');
      let q=await client.query(`SELECT id,status,user_last_open_at,user_history_from FROM support_conversations WHERE user_id=$1 FOR UPDATE`,[req.auth.sub]);
      let c=q.rows[0];
      if(!c){
        q=await client.query(`INSERT INTO support_conversations(user_id,user_last_open_at,user_history_from) VALUES($1,NOW(),NOW()) RETURNING id,status,user_last_open_at,user_history_from`,[req.auth.sub]);
        c=q.rows[0];
      }
      const lastOpen=c.user_last_open_at?new Date(c.user_last_open_at):null;
      const inactive=!lastOpen||Date.now()-lastOpen.getTime()>=10*60*1000;
      let historyFrom=c.user_history_from||c.created_at||new Date(0);
      if(inactive){
        const cutoff=lastOpen?new Date(lastOpen.getTime()+10*60*1000):new Date();
        const reset=await client.query(`UPDATE support_conversations SET user_history_from=$2,user_last_open_at=NOW(),updated_at=NOW() WHERE id=$1 RETURNING user_history_from`,[c.id,cutoff]);
        historyFrom=reset.rows[0].user_history_from;
        await client.query(`INSERT INTO user_notification_reads(user_id,source_type,source_id,read_at)
          VALUES($1,'support_chat',$2,$3)
          ON CONFLICT(user_id,source_type,source_id) DO UPDATE SET read_at=GREATEST(user_notification_reads.read_at,EXCLUDED.read_at)`,[req.auth.sub,String(c.id),cutoff]);
      }else{
        await client.query(`UPDATE support_conversations SET user_last_open_at=NOW() WHERE id=$1`,[c.id]);
      }
      const [u,m]=await Promise.all([
        client.query(`SELECT public_id,display_name FROM users WHERE id=$1`,[req.auth.sub]),
        client.query(`SELECT id,sender_type,message,created_at FROM support_messages WHERE conversation_id=$1 AND created_at>=$2 ORDER BY id ASC LIMIT 500`,[c.id,historyFrom])
      ]);
      await client.query('COMMIT');
      res.json({conversation:{id:c.id,status:c.status,clientHistoryReset:inactive},user:{publicId:u.rows[0]?.public_id,displayName:u.rows[0]?.display_name},agent:{displayName:'DApps Support'},messages:m.rows.map(x=>({id:x.id,sender:x.sender_type,message:x.message,createdAt:x.created_at}))});
    }catch(e){await client.query('ROLLBACK');console.error(e);res.status(500).json({error:'Unable to load support chat'});}
    finally{client.release()}
  });
  app.post('/api/support/chat/messages',auth,async(req,res)=>{const message=clean(req.body?.message);if(!message)return res.status(400).json({error:'Message is required'});try{const c=await convo(req.auth.sub);const q=await pool.query(`INSERT INTO support_messages(conversation_id,sender_type,sender_id,message) VALUES($1,'user',$2,$3) RETURNING id,created_at`,[c.id,req.auth.sub,message]);await pool.query(`UPDATE support_conversations SET status='open',user_last_open_at=NOW(),updated_at=NOW() WHERE id=$1`,[c.id]);res.status(201).json({message:{id:q.rows[0].id,sender:'user',message,createdAt:q.rows[0].created_at}})}catch(e){console.error(e);res.status(500).json({error:'Unable to send message'})}});
  app.get('/api/admin/support/chats',adminAuth,async(req,res)=>{try{const q=await pool.query(`SELECT c.id,c.status,c.updated_at,u.public_id,u.display_name,u.identifier,(SELECT message FROM support_messages m WHERE m.conversation_id=c.id ORDER BY m.id DESC LIMIT 1) last_message,(SELECT created_at FROM support_messages m WHERE m.conversation_id=c.id ORDER BY m.id DESC LIMIT 1) last_message_at FROM support_conversations c JOIN users u ON u.id=c.user_id ORDER BY COALESCE((SELECT created_at FROM support_messages m WHERE m.conversation_id=c.id ORDER BY m.id DESC LIMIT 1),c.updated_at) DESC LIMIT 300`);res.json({chats:q.rows.map(x=>({id:x.id,status:x.status,updatedAt:x.updated_at,lastMessage:x.last_message,lastMessageAt:x.last_message_at,user:{publicId:x.public_id,displayName:x.display_name,identifier:x.identifier}}))})}catch(e){console.error(e);res.status(500).json({error:'Unable to load chats'})}});
  app.get('/api/admin/support/chats/:id',adminAuth,async(req,res)=>{try{const c=await pool.query(`SELECT c.id,c.status,u.public_id,u.display_name,u.identifier FROM support_conversations c JOIN users u ON u.id=c.user_id WHERE c.id=$1`,[req.params.id]);if(!c.rows[0])return res.status(404).json({error:'Chat not found'});const m=await pool.query(`SELECT id,sender_type,message,created_at FROM support_messages WHERE conversation_id=$1 ORDER BY id ASC LIMIT 500`,[req.params.id]);const x=c.rows[0];res.json({chat:{id:x.id,status:x.status,user:{publicId:x.public_id,displayName:x.display_name,identifier:x.identifier}},messages:m.rows.map(v=>({id:v.id,sender:v.sender_type,message:v.message,createdAt:v.created_at}))})}catch(e){console.error(e);res.status(500).json({error:'Unable to load chat'})}});
  app.delete('/api/admin/support/chats/:id/messages',adminAuth,async(req,res)=>{
    try{
      const q=await pool.query(`SELECT id FROM support_conversations WHERE id=$1`,[req.params.id]);
      if(!q.rows[0])return res.status(404).json({error:'Chat not found'});
      await pool.query(`DELETE FROM support_messages WHERE conversation_id=$1`,[req.params.id]);
      await pool.query(`UPDATE support_conversations SET updated_at=NOW() WHERE id=$1`,[req.params.id]);
      await audit(req,'support.messages.clear','support_chat',req.params.id,{});
      res.json({ok:true});
    }catch(e){console.error(e);res.status(500).json({error:'Unable to clear chat messages'});}
  });
  app.delete('/api/admin/support/chats/:id',adminAuth,async(req,res)=>{
    try{
      const q=await pool.query(`DELETE FROM support_conversations WHERE id=$1 RETURNING id`,[req.params.id]);
      if(!q.rows[0])return res.status(404).json({error:'Chat not found'});
      await audit(req,'support.conversation.delete','support_chat',req.params.id,{});
      res.json({ok:true});
    }catch(e){console.error(e);res.status(500).json({error:'Unable to delete chat'});}
  });

  app.post('/api/admin/support/chats/:id/messages',adminAuth,async(req,res)=>{const message=clean(req.body?.message);if(!message)return res.status(400).json({error:'Message is required'});try{const q=await pool.query(`INSERT INTO support_messages(conversation_id,sender_type,sender_id,message) SELECT id,'admin',$2,$3 FROM support_conversations WHERE id=$1 RETURNING id,created_at`,[req.params.id,req.admin.id,message]);if(!q.rows[0])return res.status(404).json({error:'Chat not found'});await pool.query(`UPDATE support_conversations SET assigned_admin=$2,status='open',updated_at=NOW() WHERE id=$1`,[req.params.id,req.admin.id]);await audit(req,'support.reply','support_chat',req.params.id,{});res.status(201).json({ok:true})}catch(e){console.error(e);res.status(500).json({error:'Unable to send reply'})}});
}
