import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import pg from 'pg';

const { Pool } = pg;
const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-change-me';
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || JWT_SECRET;
const allowedOrigins = (process.env.CORS_ORIGIN || '*').split(',').map(x => x.trim()).filter(Boolean);

app.disable('x-powered-by');
app.use(cors({ origin(origin, cb){ if(!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) return cb(null,true); return cb(new Error('Origin not allowed')); } }));
app.use(express.json({ limit:'200kb' }));

async function initializeDatabase(){
  if(!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured');
  await pool.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
  await pool.query(`CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    public_id VARCHAR(16) UNIQUE NOT NULL,
    registration_type VARCHAR(16) NOT NULL CHECK (registration_type IN ('email','mobile')),
    identifier VARCHAR(190) UNIQUE NOT NULL,
    display_name VARCHAR(80) NOT NULL,
    password_hash TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_no VARCHAR(24) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(40) NOT NULL,
    subject VARCHAR(120) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'open',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_support_tickets_user_created ON support_tickets(user_id, created_at DESC)`);

  await pool.query(`CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(190) UNIQUE NOT NULL,
    display_name VARCHAR(80) NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'super_admin',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    admin_id UUID REFERENCES admins(id) ON DELETE SET NULL,
    action VARCHAR(80) NOT NULL,
    target_type VARCHAR(60) NOT NULL,
    target_id VARCHAR(190),
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address VARCHAR(80),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON admin_audit_logs(created_at DESC)`);

  await pool.query(`CREATE TABLE IF NOT EXISTS platform_settings (
    setting_key VARCHAR(80) PRIMARY KEY,
    setting_value JSONB NOT NULL,
    updated_by UUID REFERENCES admins(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS trade_products (
    duration_seconds INTEGER PRIMARY KEY,
    minimum_amount NUMERIC(20,2) NOT NULL,
    profit_rate NUMERIC(8,2) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    updated_by UUID REFERENCES admins(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS pledge_products (
    product_code VARCHAR(40) PRIMARY KEY,
    product_name VARCHAR(80) NOT NULL,
    term_days INTEGER NOT NULL,
    apy NUMERIC(8,2) NOT NULL,
    minimum_amount NUMERIC(20,2) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    updated_by UUID REFERENCES admins(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS market_settings (
    symbol VARCHAR(30) PRIMARY KEY,
    display_name VARCHAR(60) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    updated_by UUID REFERENCES admins(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);

  const tradeDefaults = [[30,200,21],[60,1000,29],[90,10000,37],[180,50000,45],[360,250000,53]];
  for(const [duration,min,rate] of tradeDefaults){
    await pool.query(`INSERT INTO trade_products(duration_seconds,minimum_amount,profit_rate) VALUES($1,$2,$3) ON CONFLICT(duration_seconds) DO NOTHING`,[duration,min,rate]);
  }
  const pledgeDefaults = [
    ['flexible','Flexible',0,4.80,100],
    ['30-day','30-Day',30,6.50,500],
    ['90-day','90-Day',90,8.20,1000]
  ];
  for(const item of pledgeDefaults){
    await pool.query(`INSERT INTO pledge_products(product_code,product_name,term_days,apy,minimum_amount) VALUES($1,$2,$3,$4,$5) ON CONFLICT(product_code) DO NOTHING`,item);
  }
  const marketDefaults = ['BTC/USDT','ETH/USDT','XAU/USDT','XAG/USDT','XRP/USDT','LTC/USDT','BNB/USDT','SOL/USDT','DOGE/USDT','TRX/USDT'];
  for(let i=0;i<marketDefaults.length;i++){
    await pool.query(`INSERT INTO market_settings(symbol,display_name,sort_order) VALUES($1,$1,$2) ON CONFLICT(symbol) DO NOTHING`,[marketDefaults[i],i+1]);
  }
  await pool.query(`INSERT INTO platform_settings(setting_key,setting_value) VALUES('general',$1::jsonb) ON CONFLICT(setting_key) DO NOTHING`,[JSON.stringify({ platformName:'DApps Platform', announcement:'', maintenanceMode:false })]);
  await bootstrapAdmin();
}

async function bootstrapAdmin(){
  const email = String(process.env.ADMIN_BOOTSTRAP_EMAIL || '').trim().toLowerCase();
  const password = String(process.env.ADMIN_BOOTSTRAP_PASSWORD || '');
  if(!email || !password) return;
  if(password.length < 12) throw new Error('ADMIN_BOOTSTRAP_PASSWORD must be at least 12 characters');
  const exists = await pool.query(`SELECT id FROM admins WHERE email=$1`,[email]);
  if(exists.rows[0]) return;
  const hash = await bcrypt.hash(password,12);
  await pool.query(`INSERT INTO admins(email,display_name,password_hash,role) VALUES($1,$2,$3,'super_admin')`,[email,'Super Admin',hash]);
  console.log('Bootstrap super admin created');
}

function normalizeIdentifier(type, value=''){
  const v = String(value).trim();
  return type === 'email' ? v.toLowerCase() : v.replace(/\s+/g,'');
}
function maskIdentifier(type, value=''){
  if(type === 'email'){
    const [a,b] = value.split('@');
    if(!b) return value;
    return `${a.slice(0,2)}***@${b}`;
  }
  return value.length > 4 ? `${value.slice(0,3)}****${value.slice(-3)}` : value;
}
function makePublicId(){ return 'DP' + crypto.randomInt(1000000000, 9999999999).toString(); }
function makeTicketNo(){ return 'TKT-' + new Date().toISOString().slice(0,10).replaceAll('-','') + '-' + crypto.randomInt(100000,999999); }
function signUser(user){ return jwt.sign({ sub:user.id, publicId:user.public_id, type:'user' }, JWT_SECRET, { expiresIn:'7d' }); }
function signAdmin(admin){ return jwt.sign({ sub:admin.id, role:admin.role, type:'admin' }, ADMIN_JWT_SECRET, { expiresIn:'8h' }); }
function userPayload(row){ return { publicId:row.public_id, displayName:row.display_name, registrationType:row.registration_type, identifierMasked:maskIdentifier(row.registration_type,row.identifier), status:row.status, createdAt:row.created_at }; }
function auth(req,res,next){
  const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null;
  if(!token) return res.status(401).json({ error:'Authentication required' });
  try{
    const decoded = jwt.verify(token, JWT_SECRET);
    if(decoded.type && decoded.type !== 'user') throw new Error('wrong token type');
    req.auth = decoded; next();
  }catch{ return res.status(401).json({ error:'Invalid or expired session' }); }
}
async function adminAuth(req,res,next){
  const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null;
  if(!token) return res.status(401).json({ error:'Admin authentication required' });
  try{
    const decoded = jwt.verify(token, ADMIN_JWT_SECRET);
    if(decoded.type !== 'admin') throw new Error('wrong token type');
    const q = await pool.query(`SELECT id,email,display_name,role,status FROM admins WHERE id=$1`,[decoded.sub]);
    const admin = q.rows[0];
    if(!admin || admin.status !== 'active') return res.status(403).json({ error:'Admin account is not active' });
    req.admin = admin;
    next();
  }catch{ return res.status(401).json({ error:'Invalid or expired admin session' }); }
}
function requireRole(...roles){ return (req,res,next)=> roles.includes(req.admin.role) ? next() : res.status(403).json({ error:'Insufficient permission' }); }
async function audit(req,action,targetType,targetId=null,details={}){
  await pool.query(`INSERT INTO admin_audit_logs(admin_id,action,target_type,target_id,details,ip_address) VALUES($1,$2,$3,$4,$5::jsonb,$6)`,[
    req.admin?.id || null, action, targetType, targetId, JSON.stringify(details), String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').slice(0,80)
  ]);
}

app.get('/api/health', async (req,res)=>{
  try{ await pool.query('SELECT 1'); res.json({ ok:true, service:'dapps-platform-backend', database:'connected' }); }
  catch{ res.status(503).json({ ok:false, service:'dapps-platform-backend', database:'unavailable' }); }
});

app.post('/api/auth/register', async (req,res)=>{
  const { registrationType, identifier, displayName, password } = req.body || {};
  if(!['email','mobile'].includes(registrationType)) return res.status(400).json({ error:'Choose email or mobile registration' });
  const normalized = normalizeIdentifier(registrationType, identifier);
  if(!normalized || !displayName || !password) return res.status(400).json({ error:'All fields are required' });
  if(password.length < 8) return res.status(400).json({ error:'Password must be at least 8 characters' });
  if(registrationType === 'email' && !/^\S+@\S+\.\S+$/.test(normalized)) return res.status(400).json({ error:'Enter a valid email address' });
  if(registrationType === 'mobile' && !/^\+?[0-9]{7,15}$/.test(normalized)) return res.status(400).json({ error:'Enter a valid mobile number' });
  try{
    const passwordHash = await bcrypt.hash(password, 12);
    let row;
    for(let i=0;i<5;i++){
      try{
        const q = await pool.query('INSERT INTO users(public_id,registration_type,identifier,display_name,password_hash) VALUES($1,$2,$3,$4,$5) RETURNING *',[makePublicId(),registrationType,normalized,String(displayName).trim().slice(0,80),passwordHash]);
        row = q.rows[0]; break;
      }catch(e){ if(e.code === '23505' && e.constraint?.includes('public_id')) continue; throw e; }
    }
    if(!row) throw new Error('Unable to allocate account ID');
    res.status(201).json({ token:signUser(row), user:userPayload(row) });
  }catch(e){
    if(e.code === '23505') return res.status(409).json({ error:'This email or mobile number is already registered' });
    console.error(e); res.status(500).json({ error:'Registration failed' });
  }
});

app.post('/api/auth/login', async (req,res)=>{
  const identifierRaw = String(req.body?.identifier || '').trim();
  const password = String(req.body?.password || '');
  if(!identifierRaw || !password) return res.status(400).json({ error:'Identifier and password are required' });
  const candidates = [identifierRaw.toLowerCase(), identifierRaw.replace(/\s+/g,'')];
  try{
    const q = await pool.query('SELECT * FROM users WHERE identifier = ANY($1::text[]) LIMIT 1',[candidates]);
    const row = q.rows[0];
    if(!row || !(await bcrypt.compare(password,row.password_hash))) return res.status(401).json({ error:'Incorrect account or password' });
    if(row.status !== 'active') return res.status(403).json({ error:'Account is not active' });
    res.json({ token:signUser(row), user:userPayload(row) });
  }catch(e){ console.error(e); res.status(500).json({ error:'Sign in failed' }); }
});

app.get('/api/me', auth, async (req,res)=>{
  try{
    const q = await pool.query('SELECT * FROM users WHERE id=$1',[req.auth.sub]);
    if(!q.rows[0]) return res.status(404).json({ error:'Account not found' });
    res.json({ user:userPayload(q.rows[0]) });
  }catch(e){ console.error(e); res.status(500).json({ error:'Unable to load profile' }); }
});

app.get('/api/support/tickets', auth, async (req,res)=>{
  try{
    const q = await pool.query('SELECT ticket_no,category,subject,status,created_at,updated_at FROM support_tickets WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100',[req.auth.sub]);
    res.json({ tickets:q.rows.map(r=>({ ticketNo:r.ticket_no, category:r.category, subject:r.subject, status:r.status, createdAt:r.created_at, updatedAt:r.updated_at })) });
  }catch(e){ console.error(e); res.status(500).json({ error:'Unable to load tickets' }); }
});

app.post('/api/support/tickets', auth, async (req,res)=>{
  const category = String(req.body?.category || '').trim();
  const subject = String(req.body?.subject || '').trim();
  const message = String(req.body?.message || '').trim();
  if(!category || !subject || !message) return res.status(400).json({ error:'Category, subject and message are required' });
  if(subject.length > 120 || message.length > 3000) return res.status(400).json({ error:'Ticket content is too long' });
  try{
    const q = await pool.query('INSERT INTO support_tickets(ticket_no,user_id,category,subject,message) VALUES($1,$2,$3,$4,$5) RETURNING ticket_no,status,created_at',[makeTicketNo(),req.auth.sub,category.slice(0,40),subject,message]);
    const r=q.rows[0];
    res.status(201).json({ ticket:{ ticketNo:r.ticket_no, status:r.status, createdAt:r.created_at } });
  }catch(e){ console.error(e); res.status(500).json({ error:'Unable to submit ticket' }); }
});

app.post('/api/admin/auth/login', async (req,res)=>{
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  if(!email || !password) return res.status(400).json({ error:'Email and password are required' });
  try{
    const q = await pool.query(`SELECT * FROM admins WHERE email=$1 LIMIT 1`,[email]);
    const row=q.rows[0];
    if(!row || !(await bcrypt.compare(password,row.password_hash))) return res.status(401).json({ error:'Invalid admin credentials' });
    if(row.status !== 'active') return res.status(403).json({ error:'Admin account is not active' });
    await pool.query(`UPDATE admins SET last_login_at=NOW(),updated_at=NOW() WHERE id=$1`,[row.id]);
    res.json({ token:signAdmin(row), admin:{ email:row.email,displayName:row.display_name,role:row.role } });
  }catch(e){ console.error(e); res.status(500).json({ error:'Admin sign in failed' }); }
});

app.get('/api/admin/me', adminAuth, (req,res)=>res.json({ admin:{ email:req.admin.email,displayName:req.admin.display_name,role:req.admin.role } }));

app.get('/api/admin/dashboard', adminAuth, async (req,res)=>{
  try{
    const [users,tickets,openTickets,admins] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int count FROM users`),
      pool.query(`SELECT COUNT(*)::int count FROM support_tickets`),
      pool.query(`SELECT COUNT(*)::int count FROM support_tickets WHERE status='open'`),
      pool.query(`SELECT COUNT(*)::int count FROM admins WHERE status='active'`)
    ]);
    res.json({ users:users.rows[0].count,tickets:tickets.rows[0].count,openTickets:openTickets.rows[0].count,activeAdmins:admins.rows[0].count });
  }catch(e){ console.error(e); res.status(500).json({ error:'Unable to load dashboard' }); }
});

app.get('/api/admin/users', adminAuth, async (req,res)=>{
  const search = String(req.query.search || '').trim();
  try{
    const values=[]; let where='';
    if(search){ values.push(`%${search}%`); where=`WHERE public_id ILIKE $1 OR identifier ILIKE $1 OR display_name ILIKE $1`; }
    const q = await pool.query(`SELECT public_id,registration_type,identifier,display_name,status,created_at,updated_at FROM users ${where} ORDER BY created_at DESC LIMIT 200`,values);
    res.json({ users:q.rows.map(r=>({ publicId:r.public_id,registrationType:r.registration_type,identifier:r.identifier,displayName:r.display_name,status:r.status,createdAt:r.created_at,updatedAt:r.updated_at })) });
  }catch(e){ console.error(e); res.status(500).json({ error:'Unable to load users' }); }
});

app.patch('/api/admin/users/:publicId/status', adminAuth, requireRole('super_admin','operations','compliance'), async (req,res)=>{
  const status = String(req.body?.status || '');
  if(!['active','frozen','disabled'].includes(status)) return res.status(400).json({ error:'Invalid user status' });
  try{
    const q=await pool.query(`UPDATE users SET status=$1,updated_at=NOW() WHERE public_id=$2 RETURNING public_id,status`,[status,req.params.publicId]);
    if(!q.rows[0]) return res.status(404).json({ error:'User not found' });
    await audit(req,'user.status.update','user',req.params.publicId,{ status });
    res.json({ user:{ publicId:q.rows[0].public_id,status:q.rows[0].status } });
  }catch(e){ console.error(e); res.status(500).json({ error:'Unable to update user' }); }
});

app.get('/api/admin/tickets', adminAuth, async (req,res)=>{
  try{
    const q=await pool.query(`SELECT t.ticket_no,t.category,t.subject,t.message,t.status,t.created_at,t.updated_at,u.public_id,u.display_name,u.identifier FROM support_tickets t JOIN users u ON u.id=t.user_id ORDER BY t.created_at DESC LIMIT 300`);
    res.json({ tickets:q.rows.map(r=>({ ticketNo:r.ticket_no,category:r.category,subject:r.subject,message:r.message,status:r.status,createdAt:r.created_at,updatedAt:r.updated_at,user:{ publicId:r.public_id,displayName:r.display_name,identifier:r.identifier } })) });
  }catch(e){ console.error(e); res.status(500).json({ error:'Unable to load tickets' }); }
});

app.patch('/api/admin/tickets/:ticketNo/status', adminAuth, requireRole('super_admin','customer_support','operations'), async (req,res)=>{
  const status=String(req.body?.status || '');
  if(!['open','in_progress','resolved','closed'].includes(status)) return res.status(400).json({ error:'Invalid ticket status' });
  try{
    const q=await pool.query(`UPDATE support_tickets SET status=$1,updated_at=NOW() WHERE ticket_no=$2 RETURNING ticket_no,status`,[status,req.params.ticketNo]);
    if(!q.rows[0]) return res.status(404).json({ error:'Ticket not found' });
    await audit(req,'ticket.status.update','support_ticket',req.params.ticketNo,{ status });
    res.json({ ticket:{ ticketNo:q.rows[0].ticket_no,status:q.rows[0].status } });
  }catch(e){ console.error(e); res.status(500).json({ error:'Unable to update ticket' }); }
});

app.get('/api/admin/config', adminAuth, async (req,res)=>{
  try{
    const [general,trades,pledges,markets] = await Promise.all([
      pool.query(`SELECT setting_value FROM platform_settings WHERE setting_key='general'`),
      pool.query(`SELECT duration_seconds,minimum_amount,profit_rate,enabled FROM trade_products ORDER BY duration_seconds`),
      pool.query(`SELECT product_code,product_name,term_days,apy,minimum_amount,enabled FROM pledge_products ORDER BY term_days,product_code`),
      pool.query(`SELECT symbol,display_name,enabled,sort_order FROM market_settings ORDER BY sort_order,symbol`)
    ]);
    res.json({ general:general.rows[0]?.setting_value || {}, trades:trades.rows, pledges:pledges.rows, markets:markets.rows });
  }catch(e){ console.error(e); res.status(500).json({ error:'Unable to load configuration' }); }
});

app.put('/api/admin/config/general', adminAuth, requireRole('super_admin','operations'), async (req,res)=>{
  const platformName=String(req.body?.platformName || 'DApps Platform').trim().slice(0,80);
  const announcement=String(req.body?.announcement || '').trim().slice(0,500);
  const maintenanceMode=Boolean(req.body?.maintenanceMode);
  const value={ platformName,announcement,maintenanceMode };
  try{
    await pool.query(`INSERT INTO platform_settings(setting_key,setting_value,updated_by,updated_at) VALUES('general',$1::jsonb,$2,NOW()) ON CONFLICT(setting_key) DO UPDATE SET setting_value=EXCLUDED.setting_value,updated_by=EXCLUDED.updated_by,updated_at=NOW()`,[JSON.stringify(value),req.admin.id]);
    await audit(req,'platform.settings.update','platform_settings','general',value);
    res.json({ general:value });
  }catch(e){ console.error(e); res.status(500).json({ error:'Unable to update settings' }); }
});

app.put('/api/admin/config/trades/:duration', adminAuth, requireRole('super_admin','operations'), async (req,res)=>{
  const duration=Number(req.params.duration), minimumAmount=Number(req.body?.minimumAmount), profitRate=Number(req.body?.profitRate), enabled=Boolean(req.body?.enabled);
  if(![30,60,90,180,360].includes(duration) || !Number.isFinite(minimumAmount) || minimumAmount<0 || !Number.isFinite(profitRate) || profitRate<0 || profitRate>100) return res.status(400).json({ error:'Invalid trade configuration' });
  try{
    await pool.query(`UPDATE trade_products SET minimum_amount=$1,profit_rate=$2,enabled=$3,updated_by=$4,updated_at=NOW() WHERE duration_seconds=$5`,[minimumAmount,profitRate,enabled,req.admin.id,duration]);
    await audit(req,'trade.settings.update','trade_product',String(duration),{ minimumAmount,profitRate,enabled });
    res.json({ ok:true });
  }catch(e){ console.error(e); res.status(500).json({ error:'Unable to update trade configuration' }); }
});

app.put('/api/admin/config/pledges/:code', adminAuth, requireRole('super_admin','operations'), async (req,res)=>{
  const code=String(req.params.code), apy=Number(req.body?.apy), minimumAmount=Number(req.body?.minimumAmount), enabled=Boolean(req.body?.enabled);
  if(!Number.isFinite(apy) || apy<0 || apy>1000 || !Number.isFinite(minimumAmount) || minimumAmount<0) return res.status(400).json({ error:'Invalid pledge configuration' });
  try{
    const q=await pool.query(`UPDATE pledge_products SET apy=$1,minimum_amount=$2,enabled=$3,updated_by=$4,updated_at=NOW() WHERE product_code=$5 RETURNING product_code`,[apy,minimumAmount,enabled,req.admin.id,code]);
    if(!q.rows[0]) return res.status(404).json({ error:'Pledge product not found' });
    await audit(req,'pledge.settings.update','pledge_product',code,{ apy,minimumAmount,enabled });
    res.json({ ok:true });
  }catch(e){ console.error(e); res.status(500).json({ error:'Unable to update pledge configuration' }); }
});

app.put('/api/admin/config/markets/:symbol', adminAuth, requireRole('super_admin','operations'), async (req,res)=>{
  const symbol=decodeURIComponent(req.params.symbol), enabled=Boolean(req.body?.enabled), sortOrder=Number(req.body?.sortOrder);
  if(!Number.isInteger(sortOrder) || sortOrder<0) return res.status(400).json({ error:'Invalid market configuration' });
  try{
    const q=await pool.query(`UPDATE market_settings SET enabled=$1,sort_order=$2,updated_by=$3,updated_at=NOW() WHERE symbol=$4 RETURNING symbol`,[enabled,sortOrder,req.admin.id,symbol]);
    if(!q.rows[0]) return res.status(404).json({ error:'Market not found' });
    await audit(req,'market.settings.update','market',symbol,{ enabled,sortOrder });
    res.json({ ok:true });
  }catch(e){ console.error(e); res.status(500).json({ error:'Unable to update market configuration' }); }
});

app.get('/api/admin/audit-logs', adminAuth, requireRole('super_admin','compliance'), async (req,res)=>{
  try{
    const q=await pool.query(`SELECT l.id,l.action,l.target_type,l.target_id,l.details,l.ip_address,l.created_at,a.email admin_email FROM admin_audit_logs l LEFT JOIN admins a ON a.id=l.admin_id ORDER BY l.created_at DESC LIMIT 500`);
    res.json({ logs:q.rows });
  }catch(e){ console.error(e); res.status(500).json({ error:'Unable to load audit logs' }); }
});

app.use((err,req,res,next)=>{ console.error(err); res.status(500).json({ error:'Server error' }); });

async function start(){
  try{
    await initializeDatabase();
    app.listen(PORT, '0.0.0.0', ()=>console.log(`DApps backend listening on ${PORT}; database schema ready`));
  }catch(error){
    console.error('Backend startup failed:', error);
    process.exit(1);
  }
}
start();