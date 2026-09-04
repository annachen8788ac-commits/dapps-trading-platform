import express from 'express';
import crypto from 'crypto';
import { readFile } from 'fs/promises';

const app = express();
const PORT = Number(process.env.PORT || 3000);
const BACKEND_URL = String(process.env.BACKEND_URL || 'http://localhost:3000').replace(/\/$/,'');
const COOKIE_NAME = 'dapps_admin_session';
const sessions = new Map();

app.disable('x-powered-by');
app.use(express.json({ limit:'100kb' }));

function cookieMap(req){const raw=req.headers.cookie||'';return Object.fromEntries(raw.split(';').map(v=>v.trim()).filter(Boolean).map(v=>{const i=v.indexOf('=');return[decodeURIComponent(v.slice(0,i)),decodeURIComponent(v.slice(i+1))]}))}
function sessionToken(req){const sid=cookieMap(req)[COOKIE_NAME];return sid?sessions.get(sid):null}
function setSession(res,token){const sid=crypto.randomBytes(32).toString('hex');sessions.set(sid,token);res.setHeader('Set-Cookie',`${COOKIE_NAME}=${sid}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800`)}
function clearSession(req,res){const sid=cookieMap(req)[COOKIE_NAME];if(sid)sessions.delete(sid);res.setHeader('Set-Cookie',`${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`)}
async function backend(path,options={}){const r=await fetch(`${BACKEND_URL}${path}`,options);const text=await r.text();let data;try{data=text?JSON.parse(text):{}}catch{data={error:'Invalid backend response'}}return{status:r.status,data}}
function requireSession(req,res,next){if(!sessionToken(req))return res.status(401).json({error:'Admin authentication required'});next()}
app.post('/session/login',async(req,res)=>{const{email,password}=req.body||{};const result=await backend('/api/admin/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,password})});if(result.status>=400)return res.status(result.status).json(result.data);setSession(res,result.data.token);res.json({admin:result.data.admin})});
app.post('/session/logout',(req,res)=>{clearSession(req,res);res.json({ok:true})});
app.get('/session/me',requireSession,async(req,res)=>{try{const result=await backend('/api/admin/me',{headers:{authorization:`Bearer ${sessionToken(req)}`}});if(result.status===401)clearSession(req,res);res.status(result.status).json(result.data)}catch(e){console.error(e);res.status(502).json({error:'Admin backend unavailable'})}});
app.all('/admin-api/*',requireSession,async(req,res)=>{const token=sessionToken(req),path=req.originalUrl.replace(/^\/admin-api/,'/api/admin'),headers={authorization:`Bearer ${token}`};let body;if(!['GET','HEAD'].includes(req.method)){headers['content-type']='application/json';body=JSON.stringify(req.body||{})}try{const result=await backend(path,{method:req.method,headers,body});if(result.status===401)clearSession(req,res);res.set('Cache-Control','no-store');res.status(result.status).json(result.data)}catch(e){console.error(e);res.status(502).json({error:'Admin backend unavailable'})}});
async function localizedHtml(name){const file=new URL('./public/'+name,import.meta.url).pathname;let html=await readFile(file,'utf8');html=html.replace(/<html lang="en">/,'<html lang="zh-CN">');if(!html.includes('/admin-zh.js'))html=html.replace('</body>','<script src="/admin-zh.js"></script></body>');return html}
app.get('/',async(req,res,next)=>{try{let html=await localizedHtml('index.html');
  const nav=`<nav class="nav admin-nav-clean">
    <div class="nav-group">运营总览</div>
    <button data-section="dashboard" class="active">仪表盘</button>
    <button data-section="users">用户管理</button>
    <div class="nav-group">审核中心</div>
    <button class="external" onclick="location.href='/wallet?tab=deposits'">充值审核</button>
    <button class="external" onclick="location.href='/wallet?tab=withdrawals'">提现审核</button>
    <button class="external" onclick="location.href='/kyc'">身份审核</button>
    <div class="nav-group">业务管理</div>
    <button class="external" onclick="location.href='/wallet?tab=balances'">账户余额</button>
    <button class="external" onclick="location.href='/trades'">交易控制</button>
    <button class="external" onclick="location.href='/support-chat'">在线客服</button>
    <button data-section="settings">系统设置</button>
    <div class="nav-group">系统</div>
    <button data-section="audit">审计日志</button>
    <button id="logoutBtn">退出登录</button>
  </nav>`;
  html=html.replace(/<nav class="nav">[\s\S]*?<\/nav>/,nav);
  html=html.replace('</head>',`<style>.admin-nav-clean{gap:4px!important}.admin-nav-clean .nav-group{margin:14px 10px 4px;color:#5f7393;font-size:11px;font-weight:800;letter-spacing:.12em}.admin-nav-clean .nav-group:first-child{margin-top:0}.admin-nav-clean button{padding:10px 12px!important}.admin-nav-clean .external{border:0!important}</style></head>`);
  html=html.replace(/<div class="quick">[\s\S]*?<\/div><\/section>\s*<section id="users"/,`<div class="quick"><a href="/wallet?tab=deposits"><b>充值审核 →</b><span class="muted">审核客户充值申请并确认入账</span></a><a href="/wallet?tab=withdrawals"><b>提现审核 →</b><span class="muted">处理提现申请与审核状态</span></a><a href="/kyc"><b>身份审核 →</b><span class="muted">查看证件资料并修改审核状态</span></a><a href="/trades"><b>交易控制 →</b><span class="muted">查看账户交易和交易控制</span></a><a href="/support-chat"><b>在线客服 →</b><span class="muted">查看客户会话并直接回复</span></a><a href="/wallet?tab=balances"><b>账户余额 →</b><span class="muted">查看用户余额和资金变动</span></a></div></section><section id="users"`);
  res.type('html').send(html)}catch(e){next(e)}});
for(const [route,file] of [['/wallet','wallet.html'],['/kyc','kyc.html'],['/trades','trades.html'],['/support-chat','support-chat.html'],['/user','user.html']])app.get(route,async(req,res,next)=>{try{res.type('html').send(await localizedHtml(file))}catch(e){next(e)}});
app.use(express.static('public',{extensions:['html']}));
app.get('/health',(req,res)=>res.json({ok:true,service:'dapps-platform-admin'}));
app.get('*',async(req,res,next)=>{try{res.type('html').send(await localizedHtml('index.html'))}catch(e){next(e)}});
app.listen(PORT,'0.0.0.0',()=>console.log(`DApps admin panel listening on ${PORT}`));