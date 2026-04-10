#!/usr/bin/env node

import { spawn, exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const ENV_FILE = path.resolve(ROOT_DIR, '.env.local');

// ─── Загрузка окружения ──────────────────────────────────────────────────────
const env = {};
if (fs.existsSync(ENV_FILE)) {
  fs.readFileSync(ENV_FILE, 'utf-8').split('\n').forEach(line => {
    const m = line.match(/^([^=#][^=]*)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim();
  });
}

const CONFIG = {
  PORT: 3000,
  BOT_TOKEN: env.TELEGRAM_BOT_TOKEN || '',
  BOT_NAME: 'Bible Memory',
  DOMAIN: (env.NGROK_DOMAIN || '').replace(/\/$/, '').replace(/^https?:\/\//, ''),
};

const C = { G: '\x1b[32m', Y: '\x1b[33m', R: '\x1b[31m', B: '\x1b[1m', CL: '\x1b[0m' };
const log = (i, m) => console.log(`${C.B}[${new Date().toLocaleTimeString()}]${C.CL} ${i} ${m}`);

// ─── Служебные функции ────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function killPort(port) {
  log('🔧', `Очистка порта ${port}...`);
  const cmd = process.platform === 'win32' 
    ? `powershell -Command "Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }"`
    : `fuser -k ${port}/tcp`;
  return new Promise(r => spawn(cmd, { shell: true }).on('exit', r));
}

async function getNgrokUrl() {
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch('http://localhost:4040/api/tunnels');
      const data = await res.json();
      const url = data.tunnels?.[0]?.public_url;
      if (url) return url;
    } catch {}
    await sleep(1000);
  }
  throw new Error('ngrok не запустился');
}

async function shorten(url) {
  log('🔗', 'Сокращение ссылки...');
  try {
    const res = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`);
    return await res.text();
  } catch {
    return url;
  }
}

async function updateBot(url) {
  if (!CONFIG.BOT_TOKEN) return log('⚠️', 'Токен бота не найден');
  log('🤖', 'Обновление бота...');
  const res = await fetch(`https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/setChatMenuButton`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ menu_button: { type: 'web_app', text: CONFIG.BOT_NAME, web_app: { url } } })
  });
  const data = await res.json();
  if (data.ok) log('✅', 'Бот обновлен!');
}

function openBrowser(url) {
  const cmd = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  exec(`${cmd} "${url}"`);
}

// ─── Основной процесс ────────────────────────────────────────────────────────
async function main() {
  console.clear();
  console.log(`${C.B}${C.G}🚀 Bible Memory — Professional Dev Mode${C.CL}\n`);

  await killPort(CONFIG.PORT);
  exec(process.platform === 'win32' ? 'taskkill /f /im ngrok.exe' : 'pkill -9 ngrok');
  await sleep(1000);

  // Запуск API
  log('▶️', 'Запуск API...');
  spawn('npm run dev:prod-api', { shell: true, stdio: 'inherit', cwd: ROOT_DIR });

  // Запуск ngrok
  log('▶️', 'Запуск ngrok...');
  const ngrokArgs = CONFIG.DOMAIN ? `http --domain ${CONFIG.DOMAIN} ${CONFIG.PORT}` : `http ${CONFIG.PORT}`;
  spawn(`ngrok ${ngrokArgs}`, { shell: true, stdio: 'ignore' });

  const url = await getNgrokUrl();
  log('🌐', `ngrok: ${C.G}${url}${C.CL}`);

  const shortUrl = await shorten(url);
  await updateBot(shortUrl);

  const devSuffix = `?tgWebAppStartParam=mock#tgWebAppData=query_id%3DAAE13yY1AAAAADXfJjU1Js_c%26user%3D%257B%2522id%2522%253A891739957%252C%2522first_name%2522%253A%2522%25D0%259C%25D0%25B0%25D1%2580%25D0%25BA%2522%252C%2522last_name%2522%253A%2522%25D0%2591%25D0%25B0%25D0%25BB%25D1%2582%25D0%25B5%25D0%25BD%25D0%25BA%25D0%25BE%2522%252C%2522username%2522%253A%2522BaltenkoMark%2522%252C%2522language_code%2522%253A%2522ru%2522%252C%2522allows_write_to_pm%2522%253Atrue%252C%2522photo_url%2522%253A%2522https%253A%255C%252F%255C%252Ft.me%255C%252Fi%255C%252Fuserpic%255C%252F320%255C%252F_TQMTDI2tuSQqgwIkgmH7bh5HFjuJkKF9-1bSvCXGC8.svg%2522%257D%26auth_date%3D1775814019%26signature%3DTwki4DdMF97QAWJZjMNg61cxWLwlQvL3KLhhFcjZs5y7K4CvAj7RS5NI03S1Y3I5qEPTALG8z136R8oUlzjYAQ%26hash%3Dac44e4f18068880fa30f693182766a1f3c25bd34360130946299824b45c40074&tgWebAppVersion=9.6&tgWebAppPlatform=ios&tgWebAppThemeParams=%7B%22section_bg_color%22%3A%22%232c2c2c%22%2C%22bg_color%22%3A%22%232c2c2c%22%2C%22text_color%22%3A%22%23ffffff%22%7D`;
  const devUrl = `${url}${devSuffix}`;

  console.log(`\n${C.B}📱 Ссылка для бота:${C.CL}   ${shortUrl}`);
  console.log(`${C.B}🖥️  Ссылка для теста:${C.CL}  ${url}`);
  console.log(`${C.B}🧪 Dev URL с мок-данными:${C.CL} ${devUrl}\n`);

  openBrowser(devUrl);
}

main().catch(e => log('❌', e.message));
