#!/usr/bin/env node
/**
 * Bible Memory — Dev tunnel via ngrok
 *
 * Поддерживает несколько аккаунтов ngrok. Когда квота одного заканчивается —
 * просто добавь следующий аккаунт в .env.local и смени NGROK_ACTIVE_ACCOUNT.
 *
 * .env.local:
 *   NGROK_ACTIVE_ACCOUNT=1          ← какой аккаунт использовать (1, 2, 3…)
 *   NGROK_TOKEN_1=xxxx
 *   NGROK_DOMAIN_1=my-app.ngrok-free.app
 *   NGROK_TOKEN_2=yyyy
 *   NGROK_DOMAIN_2=my-app-2.ngrok-free.app
 */

import { spawn, exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ENV_FILE = path.resolve(ROOT, '.env.local');
const CONFIG_FILE = path.resolve(ROOT, '.dev-config.json');

// ─── Загрузка .env.local ─────────────────────────────────────────────────────
const env = {};
if (fs.existsSync(ENV_FILE)) {
  fs.readFileSync(ENV_FILE, 'utf-8').split('\n').forEach(line => {
    const m = line.match(/^([^=#][^=]*)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim();
  });
}

// ─── Конфиг ──────────────────────────────────────────────────────────────────
const PORT = 3001;
const API_URL = env.NEXT_PUBLIC_API_BASE_URL || 'https://bible-memory-db-production.up.railway.app';
const BOT_TOKEN = env.TELEGRAM_BOT_TOKEN || '';
const BOT_NAME = 'Bible Memory';

const ACTIVE = parseInt(env.NGROK_ACTIVE_ACCOUNT || '1', 10);
const NGROK_TOKEN = env[`NGROK_TOKEN_${ACTIVE}`] || env.NGROK_AUTHTOKEN || '';
const NGROK_DOMAIN = (env[`NGROK_DOMAIN_${ACTIVE}`] || env.NGROK_DOMAIN || '')
  .replace(/\/$/, '')
  .replace(/^https?:\/\//, '');

// ─── Цвета и логгер ──────────────────────────────────────────────────────────
const c = {
  reset: '\x1b[0m',
  bold:  '\x1b[1m',
  dim:   '\x1b[2m',
  green: '\x1b[32m',
  yellow:'\x1b[33m',
  red:   '\x1b[31m',
  cyan:  '\x1b[36m',
  white: '\x1b[37m',
};

const timestamp = () => new Date().toLocaleTimeString('ru-RU');
const log  = (icon, msg) => console.log(`${c.dim}${timestamp()}${c.reset}  ${icon}  ${msg}`);
const ok   = (msg) => log('✅', `${c.green}${msg}${c.reset}`);
const info = (msg) => log('ℹ️ ', `${c.cyan}${msg}${c.reset}`);
const warn = (msg) => log('⚠️ ', `${c.yellow}${msg}${c.reset}`);
const err  = (msg) => log('❌', `${c.red}${msg}${c.reset}`);
const step = (msg) => log('▶️ ', `${c.bold}${msg}${c.reset}`);

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─── Утилиты ─────────────────────────────────────────────────────────────────
async function killPort(port) {
  step(`Очистка порта ${port}...`);
  return new Promise(r => {
    const cmd = `powershell -Command "Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }"`;
    spawn(cmd, { shell: true }).on('exit', r);
  });
}

function killNgrok() {
  exec('taskkill /f /im ngrok.exe 2>nul', () => {});
}

async function waitForLocalServer(port, maxSec = 60) {
  step('Ожидание Next.js...');
  for (let i = 0; i < maxSec; i++) {
    try {
      const r = await fetch(`http://localhost:${port}/`);
      if (r.status < 500) { ok('Next.js готов!'); return; }
    } catch {}
    await sleep(1000);
  }
  err('Next.js не запустился за 60 секунд');
  process.exit(1);
}

async function getNgrokUrl(maxSec = 20) {
  for (let i = 0; i < maxSec; i++) {
    try {
      const res = await fetch('http://localhost:4040/api/tunnels');
      const { tunnels } = await res.json();
      const url = tunnels?.find(t => t.proto === 'https')?.public_url
               ?? tunnels?.[0]?.public_url;
      if (url) return url;
    } catch {}
    await sleep(1000);
  }
  return null;
}

async function updateBot(url) {
  if (!BOT_TOKEN) { warn('TELEGRAM_BOT_TOKEN не задан — бот не обновлён'); return; }
  step('Обновление Telegram бота...');
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setChatMenuButton`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      menu_button: { type: 'web_app', text: BOT_NAME, web_app: { url } },
    }),
  });
  const data = await res.json();
  if (data.ok) ok('Бот обновлён');
  else err(`Telegram API: ${data.description}`);
}

function openBrowser(url) {
  exec(`start "" "${url}"`);
}

function saveConfig(data) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

// ─── Запуск процессов ────────────────────────────────────────────────────────
function startNextJs() {
  step('Запуск Next.js...');
  return spawn(`npx next dev --hostname 0.0.0.0 --port ${PORT} --turbo`, {
    shell: true,
    stdio: 'inherit',
    cwd: ROOT,
    env: { ...process.env, NEXT_PUBLIC_API_BASE_URL: API_URL },
  });
}

function startNgrok() {
  if (!NGROK_TOKEN) {
    err(`NGROK_TOKEN_${ACTIVE} не задан в .env.local`);
    process.exit(1);
  }

  step(`Запуск ngrok (аккаунт #${ACTIVE})...`);

  const args = NGROK_DOMAIN
    ? `http --authtoken=${NGROK_TOKEN} --domain=${NGROK_DOMAIN} ${PORT}`
    : `http --authtoken=${NGROK_TOKEN} ${PORT}`;

  return spawn(`ngrok ${args}`, { shell: true, stdio: 'ignore' });
}

// ─── Основной процесс ────────────────────────────────────────────────────────
async function main() {
  console.clear();
  console.log(`\n${c.bold}${c.green}  🚀  Bible Memory — Dev Mode${c.reset}`);
  console.log(`${c.dim}  Аккаунт ngrok: #${ACTIVE}${NGROK_DOMAIN ? `  ·  домен: ${NGROK_DOMAIN}` : '  ·  случайный домен'}${c.reset}\n`);

  if (!NGROK_TOKEN) {
    err(`Добавь NGROK_TOKEN_${ACTIVE}=<token> в .env.local`);
    info('Токен: https://dashboard.ngrok.com/get-started/your-authtoken');
    process.exit(1);
  }

  await killPort(PORT);
  killNgrok();
  await sleep(500);

  startNextJs();
  await waitForLocalServer(PORT);

  startNgrok();
  const tunnelUrl = await getNgrokUrl();

  if (!tunnelUrl) {
    err('ngrok не запустился. Возможно квота исчерпана.');
    warn(`Смени аккаунт: NGROK_ACTIVE_ACCOUNT=${ACTIVE + 1} в .env.local`);
    info('Добавить аккаунт: https://dashboard.ngrok.com → Authtokens');
    process.exit(1);
  }

  ok(`Туннель: ${c.bold}${tunnelUrl}${c.reset}`);

  await updateBot(tunnelUrl);

  // Dev URL с Telegram mock-данными
  const devUrl = [
    tunnelUrl,
    '?tgWebAppStartParam=mock',
    '#tgWebAppData=',
    'query_id%3DAAE13yY1AAAAADXfJjU1Js_c',
    '%26user%3D%257B%2522id%2522%253A891739957%252C%2522first_name%2522%253A%2522%25D0%259C%25D0%25B0%25D1%2580%25D0%25BA%2522%252C%2522last_name%2522%253A%2522%25D0%2591%25D0%25B0%25D0%25BB%25D1%2582%25D0%25B5%25D0%25BD%25D0%25BA%25D0%25BE%2522%252C%2522username%2522%253A%2522BaltenkoMark%2522%252C%2522language_code%2522%253A%2522ru%2522%252C%2522allows_write_to_pm%2522%253Atrue%252C%2522photo_url%2522%253A%2522https%253A%255C%252F%255C%252Ft.me%255C%252Fi%255C%252Fuserpic%255C%252F320%255C%252F_TQMTDI2tuSQqgwIkgmH7bh5HFjuJkKF9-1bSvCXGC8.svg%2522%257D',
    '%26auth_date%3D1775814019',
    '%26signature%3DTwki4DdMF97QAWJZjMNg61cxWLwlQvL3KLhhFcjZs5y7K4CvAj7RS5NI03S1Y3I5qEPTALG8z136R8oUlzjYAQ',
    '%26hash%3Dac44e4f18068880fa30f693182766a1f3c25bd34360130946299824b45c40074',
    '&tgWebAppVersion=9.6&tgWebAppPlatform=ios',
    '&tgWebAppThemeParams=%7B%22section_bg_color%22%3A%22%232c2c2c%22%2C%22bg_color%22%3A%22%232c2c2c%22%2C%22text_color%22%3A%22%23ffffff%22%7D',
  ].join('');

  saveConfig({ timestamp: new Date().toISOString(), tunnelUrl, devUrl, account: ACTIVE });

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  ${c.bold}📱 Бот:${c.reset}              ${c.cyan}${tunnelUrl}${c.reset}`);
  console.log(`  ${c.bold}🧪 Dev (mock):${c.reset}       ${c.dim}${devUrl.slice(0, 60)}…${c.reset}`);
  console.log(`${'─'.repeat(60)}\n`);

  openBrowser(devUrl);

  process.on('SIGINT', () => {
    console.log(`\n${c.dim}Завершение...${c.reset}`);
    killNgrok();
    process.exit(0);
  });
}

main().catch(e => { err(e.message); process.exit(1); });
