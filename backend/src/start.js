const requiredOrigins = [
  'https://annachen8788ac-commits.github.io',
  'https://dappsplatformusa.com',
  'https://www.dappsplatformusa.com'
];

const configured = String(process.env.CORS_ORIGIN || '')
  .split(',')
  .map(v => v.trim())
  .filter(Boolean);

if (!configured.includes('*')) {
  process.env.CORS_ORIGIN = [...new Set([...configured, ...requiredOrigins])].join(',');
}

await import('./server.js');
