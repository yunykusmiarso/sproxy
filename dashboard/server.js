const http = require('http');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Load config
const configPath = path.join(__dirname, 'config.json');
let config = {
  port: 9000,
  restartAllPin: '7777'
};

if (fs.existsSync(configPath)) {
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (err) {
    console.error('Error loading config.json, using defaults:', err.message);
  }
}

const PORT = config.port;
const PREFIX = 'siak-proxy-';
const RESTART_ALL_PIN = config.restartAllPin;

// =======================
// UTIL
// =======================
function runPS(cmd) {
  return new Promise(resolve => {
    exec(
      `powershell -NoProfile -Command "${cmd}"`,
      { maxBuffer: 1024 * 1024 },
      (_, stdout) => resolve(stdout.trim())
    );
  });
}

// =======================
// DATA
// =======================
async function getServices() {
  const raw = await runPS(
    'Get-Service | Select Name,Status | ConvertTo-Json'
  );
  if (!raw) return [];
  try {
    const j = JSON.parse(raw);
    return Array.isArray(j) ? j : [j];
  } catch {
    return [];
  }
}

async function getDashboardData() {
  const services = await getServices();

  const proxies = services
    .filter(s => s.Name && s.Name.startsWith(PREFIX))
    .map(s => ({
      port: s.Name.replace(PREFIX, ''),
      service: s.Name,
      status: s.Status === 4 ? 'Running' : 'Stopped'
    }));

  return { proxies };
}

// =======================
// SERVICE CONTROL
// =======================
async function restartService(name) {
  await runPS(`Restart-Service -Name "${name}" -Force`);
}

async function restartAllProxies() {
  const services = await getServices();
  for (const s of services) {
    if (s.Name.startsWith(PREFIX)) {
      await restartService(s.Name);
    }
  }
}

// =======================
// HTTP SERVER
// =======================
const server = http.createServer(async (req, res) => {

  // ---------- API ----------
  if (req.url === '/api') {
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify(await getDashboardData()));
  }

  if (req.url.startsWith('/restart/') && req.method === 'GET') {
    const svc = decodeURIComponent(req.url.replace('/restart/', ''));
    if (!svc.startsWith(PREFIX)) {
      res.statusCode = 400;
      return res.end('Invalid service');
    }
    await restartService(svc);
    return res.end('OK');
  }

  if (req.url === '/restart-all' && req.method === 'POST') {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', async () => {
      try {
        const { pin } = JSON.parse(body);
        if (pin !== RESTART_ALL_PIN) {
          res.statusCode = 403;
          return res.end('INVALID PIN');
        }

        await restartAllProxies();
        res.end('OK');
      } catch {
        res.statusCode = 400;
        res.end('BAD REQUEST');
      }
    });
    return;
  }

  // ---------- UI ----------
  if (req.url === '/') {
    res.setHeader('Content-Type', 'text/html');
    return res.end(`
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>SIAK Proxy Dashboard</title>
<style>
body { margin:0; font-family:Segoe UI; background:#020617; color:#e5e7eb }
header {
  padding:20px 30px;
  border-bottom:1px solid #1e293b;
  display:flex;
  justify-content:space-between;
  align-items:center;
}
main { padding:30px }

button.main {
  padding:8px 16px;
  background:#7c2d12;
  border:1px solid #ef4444;
  color:#fff;
  border-radius:8px;
  cursor:pointer;
}
button.main:hover { background:#991b1b }

canvas {
  width:100%;
  height:160px;
  background:#0f172a;
  border-radius:12px;
  margin-bottom:30px;
}

.grid {
  display:grid;
  grid-template-columns:repeat(auto-fill,minmax(260px,1fr));
  gap:16px;
}

.card {
  background:#0f172a;
  border:1px solid #1e293b;
  border-radius:14px;
  padding:16px;
}

.card.stopped {
  border-color:#ef4444;
  box-shadow:0 0 0 1px #ef444433,0 0 18px #ef444422;
}

.badge {
  display:inline-block;
  margin-top:8px;
  padding:5px 12px;
  border-radius:999px;
  font-size:12px;
}

.running { background:#22c55e33; color:#22c55e }
.stopped { background:#ef444433; color:#ef4444 }

button.restart {
  margin-top:10px;
  padding:7px 14px;
  background:transparent;
  border:1px solid #ef4444;
  color:#ef4444;
  border-radius:8px;
  cursor:pointer;
}
</style>

<script>
// =======================
// LIVE AGGREGATE
// =======================
const history = [];
const MAX_POINTS = 100;
const PADDING = { top:28, right:20, bottom:26, left:30 };

function drawAggregate(canvas, points) {
  const ctx = canvas.getContext('2d');
  const w = canvas.offsetWidth;
  const h = 160;

  canvas.width = w;
  canvas.height = h;

  ctx.clearRect(0,0,w,h);
  if (points.length === 0) return;

  const plotW = w - PADDING.left - PADDING.right;
  const plotH = h - PADDING.top - PADDING.bottom;
  const max = Math.max(...points,1);
  const stepX = points.length > 1 ? plotW / (points.length-1) : plotW;

  ctx.strokeStyle = '#22c55e';
  ctx.lineWidth = 2;
  ctx.beginPath();

  points.forEach((v,i)=>{
    const x = PADDING.left + (points.length===1 ? plotW/2 : i*stepX);
    const y = PADDING.top + plotH - (v/max)*plotH;
    i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
  });
  ctx.stroke();

  ctx.fillStyle = '#22c55e';
  ctx.font = '12px Segoe UI';
  ctx.textAlign = 'center';

  points.forEach((v,i)=>{
    const x = PADDING.left + (points.length===1 ? plotW/2 : i*stepX);
    const y = PADDING.top + plotH - (v/max)*plotH;
    ctx.beginPath();
    ctx.arc(x,y,4,0,Math.PI*2);
    ctx.fill();
    ctx.fillText(v,x,y-8);
  });

  ctx.fillStyle = '#94a3b8';
  ctx.textAlign = 'left';
  ctx.fillText('Jumlah proxy RUNNING (live)', PADDING.left, 16);
}

async function load() {
  const r = await fetch('/api');
  const d = await r.json();

  const running = d.proxies.filter(p=>p.status==='Running').length;
  history.push(running);
  if (history.length > MAX_POINTS) history.shift();

  drawAggregate(document.getElementById('agg'), history);

  const root = document.getElementById('grid');
  root.innerHTML = '';

  d.proxies.forEach(p=>{
    const c = document.createElement('div');
    c.className = 'card ' + (p.status==='Stopped'?'stopped':'');
    c.innerHTML = \`
      <b>Port \${p.port}</b><br>
      <small>\${p.service}</small><br>
      <span class="badge \${p.status==='Running'?'running':'stopped'}">\${p.status}</span>
      \${p.status==='Stopped'
        ? '<br><button class="restart" onclick="restartOne(\\''+p.service+'\\')">Restart</button>'
        : ''}
    \`;
    root.appendChild(c);
  });
}

async function restartOne(svc) {
  if (!confirm('Restart '+svc+'?')) return;
  await fetch('/restart/'+encodeURIComponent(svc));
  setTimeout(load,1500);
}

async function restartAll() {
  const pin = prompt('Masukkan PIN 4 digit:');
  if (!pin) return;

  const res = await fetch('/restart-all', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({pin})
  });

  if (!res.ok) {
    alert('PIN SALAH');
    return;
  }
  alert('SEMUA PROXY DIRESTART');
  setTimeout(load,3000);
}

setInterval(load,3000);
window.onload = load;
</script>
</head>

<body>
<header>
  <h2>SIAK Proxy Dashboard</h2>
  <button class="main" onclick="restartAll()">Restart ALL Proxy</button>
</header>

<main>
  <canvas id="agg"></canvas>
  <div id="grid" class="grid"></div>
</main>
</body>
</html>
`);
  }

  res.statusCode = 404;
  res.end('Not Found');
});

server.listen(PORT, () =>
  console.log('Dashboard running on http://0.0.0.0:'+PORT)
);
