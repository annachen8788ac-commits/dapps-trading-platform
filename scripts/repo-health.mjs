import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const failures=[];
const notes=[];
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const exists=p=>fs.existsSync(path.join(root,p));
const check=(ok,msg)=>{if(!ok)failures.push(msg);else notes.push(msg)};

const required=[
  'index.html',
  'assets/js/platform-config.js',
  'assets/js/platform-core.js',
  'assets/js/platform-ui.js',
  'domain/trade-rules.js',
  'backend/package.json',
  'backend/package-lock.json',
  'backend/src/business-routes.js',
  'backend/src/trade-routes.js',
  'admin-panel/package.json',
  'admin-panel/package-lock.json'
];
for(const p of required)check(exists(p),`required file exists: ${p}`);

const retired=[
  'account-mode.js',
  'domain/trade-ledger.js',
  'backend/src/schema.sql',
  'assets/js/trade-spec.js'
];
for(const p of retired)check(!exists(p),`retired file stays removed: ${p}`);

const config=read('assets/js/platform-config.js');
check(config.includes('const durations=Object.freeze([30,60,90,180,360]);'),'protected trade durations unchanged');
check(config.includes('const minimums={30:200,60:1000,90:10000,180:50000,360:250000};'),'protected default trade minimums unchanged');
check(config.includes('const rates={30:21,60:29,90:37,180:45,360:53};'),'protected default trade profit rates unchanged');
check(config.includes('function nextMinimum(duration)'),'next-tier amount boundary remains enabled');

const server=read('backend/src/server.js');
check(server.includes('[[30,200,21],[60,1000,29],[90,10000,37],[180,50000,45],[360,250000,53]]'),'backend default trade product seed unchanged');
check(server.includes('await initializeKycSchema(pool);\n  await initializeBusinessSchemas(pool);'),'backend composition order keeps KYC before business modules');

const trade=read('backend/src/trade-routes.js');
check(trade.includes("kyc?.status!=='approved'"),'KYC approval remains required before trading');
check(trade.includes('WHERE duration_seconds>$1 ORDER BY duration_seconds ASC LIMIT 1'),'next duration minimum remains the current tier ceiling');
check(trade.includes('nextProduct&&amount>=Number(nextProduct.minimum_amount)'),'next-tier amount ceiling remains enforced');
check(trade.includes('available_balance=available_balance-$1,locked_balance=locked_balance+$1'),'trade opening still moves principal from available to locked');
check(trade.includes("if(t.result_control==='win')won=true;else if(t.result_control==='loss')won=false"),'Win/Loss trade controls remain present');
check(trade.includes("else won=t.direction==='up'?exitPrice>=Number(t.entry_price):exitPrice<=Number(t.entry_price)"),'Auto settlement direction rule remains unchanged');
check(trade.includes("/api/admin/trade-users/:publicId/control"),'user-level trade control endpoint remains present');
check(trade.includes("/api/admin/trade-users/:publicId/sequence"),'trade result sequence endpoint remains present');
check(trade.includes("/api/admin/trades/:tradeNo/control"),'single-trade control endpoint remains present');
check(trade.includes("['auto','win','loss']"),'Auto/Win/Loss control modes remain present');

const core=read('assets/js/platform-core.js');
const rules=read('domain/trade-rules.js');
const ui=read('assets/js/platform-ui.js');
check(!core.includes("$('#place-trade').onclick="),'platform-core does not regain legacy local trade execution');
check(!rules.includes('placeBtn.onclick ='),'trade-rules remains validation-only');
check((ui.match(/placeBtn\.onclick=/g)||[]).length>=1,'platform-ui owns trade execution');

const runtimeJs=[
  'assets/js/platform-core.js',
  'assets/js/platform-ui.js',
  'assets/js/user-notifications.js',
  'assets/js/pledge-ui.js',
  'assets/js/hero-ui.js',
  'domain/trade-rules.js'
];
for(const p of runtimeJs)check(!read(p).includes("createElement('style')"),`runtime CSS is not injected from ${p}`);

const index=read('index.html');
check(!/<style\b/i.test(index),'index.html has no inline style block');

const prodApi='https://dapps-trading-platform-production.up.railway.app';
for(const p of runtimeJs){
  check(!read(p).includes(prodApi),`production API URL is centralized outside ${p}`);
}
check(config.includes(prodApi),'platform-config owns the production API fallback');

const scripts=[...index.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map(m=>m[1]);
check(new Set(scripts).size===scripts.length,'index.html has no duplicate external script references');

const routeFiles=fs.readdirSync(path.join(root,'backend/src'))
  .filter(p=>p.endsWith('.js'))
  .map(p=>'backend/src/'+p);
const routeMap=new Map();
const routeRe=/app\.(get|post|put|patch|delete)\(\s*["'`]([^"'`]+)["'`]/g;
for(const p of routeFiles){
  const source=read(p);
  let m;
  while((m=routeRe.exec(source))){
    const key=`${m[1].toUpperCase()} ${m[2]}`;
    if(!routeMap.has(key))routeMap.set(key,[]);
    routeMap.get(key).push(p);
  }
}
const duplicateRoutes=[...routeMap].filter(([,owners])=>owners.length>1);
check(duplicateRoutes.length===0,`backend routes are unique (${routeMap.size} routes)`);
if(duplicateRoutes.length){
  for(const [route,owners] of duplicateRoutes)failures.push(`duplicate route ${route}: ${owners.join(', ')}`);
}

for(const p of ['assets/css/app.css','assets/css/utility-ui.css','assets/css/account.css','assets/css/wallet.css','admin-panel/public/admin-brand.css']){
  const css=read(p);
  let depth=0;
  for(const ch of css){if(ch==='{')depth++;else if(ch==='}')depth--;}
  check(depth===0,`CSS braces are balanced: ${p}`);
  const stripped=css.replace(/\/\*[\s\S]*?\*\//g,'');
  check(!/[^{}]+\{\s*\}/.test(stripped),`CSS contains no empty rule: ${p}`);
}

const backendPkg=JSON.parse(read('backend/package.json'));
const adminPkg=JSON.parse(read('admin-panel/package.json'));
check(backendPkg.engines?.node==='22.x','backend Node engine is pinned to 22.x');
check(adminPkg.engines?.node==='22.x','admin Node engine is pinned to 22.x');

if(failures.length){
  console.error('\nRepository health check FAILED:');
  for(const item of failures)console.error(' - '+item);
  process.exit(1);
}

console.log(`Repository health check passed: ${notes.length} assertions, ${routeMap.size} unique backend routes.`);
