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
const allowedOrigins = (process.env.CORS_ORIGIN || '*').split(',').map(x => x.trim());

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
function sign(user){ return jwt.sign({ sub:user.id, publicId:user.public_id }, JWT_SECRET, { expiresIn:'7d' }); }
function userPayload(row){ return { publicId:row.public_id, displayName:row.display_name, registrationType:row.registration_type, identifierMasked:maskIdentifier(row.registration_type,row.identifier), status:row.status, createdAt:row.created_at }; }
function auth(req,res,next){
  const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null;
  if(!token) return res.status(401).json({ error:'Authentication required' });
  try{ req.auth = jwt.verify(token, JWT_SECRET); next(); }catch{ return res.status(401).json({ error:'Invalid or expired session' }); }
}

app.get('/api/health', async (req,res)=>{
  try{
    await pool.query('SELECT 1');
    res.json({ ok:true, service:'dapps-platform-backend', database:'connected' });
  }catch{
    res.status(503).json({ ok:false, service:'dapps-platform-backend', database:'unavailable' });
  }
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
    res.status(201).json({ token:sign(row), user:userPayload(row) });
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
    res.json({ token:sign(row), user:userPayload(row) });
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