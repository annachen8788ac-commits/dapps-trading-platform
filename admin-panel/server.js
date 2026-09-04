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
app.all('/admin-api/*',requireSession,async(req,res)=>{const token=sessionToken(req),path=req.originalUrl.replace(/^\/admin-api/,'/api/admin'),headers={authorization:`Bearer ${token}`};let body;if(!['GET','HEAD'].includes(req.method)){headers['content-type']='application/json';body=JSON.stringify(req.body||{})}try{const result=await backend(path,{method:req.method,headers,body});if(result.status===401)clearSession(req,res);res.status(result.status).json(result.data)}catch(e){console.error(e);res.status(502).json({error:'Admin backend unavailable'})}});
async function localizedHtml(name){const file=new URL('./public/'+name,import.meta.url).pathname;let html=await readFile(file,'utf8');html=html.replace(/<html lang="en">/,'<html lang="zh-CN">');if(!html.includes('/admin-zh.js'))html=html.replace('</body>','<script src="/admin-zh.js"></script></body>');return html}
app.get('/',async(req,res,next)=>{try{let html=await localizedHtml('index.html');if(!html.includes("location.href='/trades'")){html=html.replace(`<button class="external" onclick="location.href='/kyc'">KYC Management</button>`,`<button class="external" onclick="location.href='/kyc'">KYC Management</button><button class="external" onclick="location.href='/trades'">交易控制</button>`);html=html.replace(`<a href="/kyc"><b>KYC Management →</b><span class="muted">Review identity applications and approve or reject submissions</span></a>`,`<a href="/kyc"><b>KYC Management →</b><span class="muted">Review identity applications and approve or reject submissions</span></a><a href="/trades"><b>交易控制 →</b><span class="muted">查看全部账户交易，并在到期前设置自动 / 赢 / 输</span></a>`)}res.type('html').send(html)}catch(e){next(e)}});
for(const [route,file] of [['/wallet','wallet.html'],['/kyc','kyc.html'],['/trades','trades.html'],['/user','user.html']])app.get(route,async(req,res,next)=>{try{res.type('html').send(await localizedHtml(file))}catch(e){next(e)}});
app.use(express.static('public',{extensions:['html']}));
app.get('/health',(req,res)=>res.json({ok:true,service:'dapps-platform-admin'}));
app.get('*',async(req,res,next)=>{try{res.type('html').send(await localizedHtml('index.html'))}catch(e){next(e)}});
app.listen(PORT,'0.0.0.0',()=>console.log(`DApps admin panel listening on ${PORT}`));