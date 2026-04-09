#!/usr/bin/env node

import { spawn } from 'child_process';
import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const ENV_FILE = path.resolve(ROOT_DIR, '.env.local');
const CONFIG_OUTPUT = path.resolve(ROOT_DIR, '.dev-ngrok-config.json');

// Загружаем .env.local
function loadEnv() {
  if (fs.existsSync(ENV_FILE)) {
    const content = fs.readFileSync(ENV_FILE, 'utf-8');
    content.split('\n').forEach((line) => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim();
        if (key && !process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  }
}

loadEnv();

const CONFIG = {
  API_PORT: 3001,
  NGROK_API_PORT: 4040,
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
  BOT_NAME: 'Bible Memory',
  BOT_USERNAME: 'bible_memory_bot',
};

const TIMEOUTS = {
  NGROK_CHECK_INITIAL: 1500,
  NGROK_CHECK_INTERVAL: 500,
  NGROK_MAX_ATTEMPTS: 30,
  API_START_DELAY: 3000,
};

const C = { R: '\x1b[0m', B: '\x1b[1m', G: '\x1b[32m', Y: '\x1b[33m', R_: '\x1b[31m', C_: '\x1b[36m' };

function log(type, msg) {
  const t = new Date().toLocaleTimeString('ru-RU', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const p = `[${t}]`;
  const prefix = type === 'e' ? `${C.R_}${p} ❌${C.R}` : type === 's' ? `${C.G}${p} ✅${C.R}` : type === 'w' ? `${C.Y}${p} ⚠️ ${C.R}` : `${C.C_}${p} ℹ️ ${C.R}`;
  console.log(`${prefix} ${msg}`);
}

function box(title, content) {
  console.log(`\n${C.B}${C.G}┌${'─'.repeat(title.length + 4)}┐${C.R}`);
  console.log(`${C.B}${C.G}│${C.R}  ${title}  ${C.B}${C.G}│${C.R}`);
  console.log(`${C.B}${C.G}└${'─'.repeat(title.length + 4)}┘${C.R}\n${content}`);
}

function httpReq(opts, data = null) {
  return new Promise((res, rej) => {
    const client = opts.port === 443 ? https : http;
    const req = client.request(opts, (r) => {
      let body = '';
      r.on('data', (c) => (body += c));
      r.on('end', () => {
        try {
          res({ status: r.statusCode, data: JSON.parse(body) });
        } catch {
          res({ status: r.statusCode, data: body });
        }
      });
    });
    req.on('error', rej);
    req.setTimeout(5000, () => {
      req.destroy();
      rej(new Error('Timeout'));
    });
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function getNgrokUrl() {
  log('i', 'Получаю ngrok URL...');
  let attempts = 0;
  const maxAttempts = TIMEOUTS.NGROK_MAX_ATTEMPTS;
  await new Promise((r) => setTimeout(r, TIMEOUTS.NGROK_CHECK_INITIAL));

  while (attempts < maxAttempts) {
    try {
      const res = await httpReq({
        hostname: 'localhost',
        port: CONFIG.NGROK_API_PORT,
        path: '/api/tunnels',
        method: 'GET',
      });
      if (res.status === 200 && res.data.tunnels?.length > 0) {
        const tunnel = res.data.tunnels.find((t) => t.public_url?.startsWith('https://'));
        if (tunnel?.public_url) {
          log('s', `ngrok URL: ${C.B}${tunnel.public_url}${C.R}`);
          return tunnel.public_url;
        }
      }
    } catch (e) {
      // retry
    }
    attempts++;
    if (attempts < maxAttempts) {
      await new Promise((r) => setTimeout(r, TIMEOUTS.NGROK_CHECK_INTERVAL));
    }
  }
  throw new Error('Не удалось получить URL от ngrok');
}

async function shortenUrl(longUrl) {
  log('i', 'Сокращаю URL через TinyURL...');
  try {
    const res = await httpReq({
      hostname: 'tinyurl.com',
      path: `/api-create.php?url=${encodeURIComponent(longUrl)}`,
      method: 'GET',
    });
    if (res.status === 200 && typeof res.data === 'string') {
      const shortUrl = res.data.trim();
      if (shortUrl.startsWith('https://') || shortUrl.startsWith('http://')) {
        log('s', `URL сокращён: ${C.B}${shortUrl}${C.R}`);
        return shortUrl;
      }
    }
    log('w', 'TinyURL недоступен, используется оригинальный URL');
    return longUrl;
  } catch (e) {
    log('w', `Ошибка TinyURL, используется оригинальный URL`);
    return longUrl;
  }
}

async function updateBot(miniAppUrl) {
  if (!CONFIG.TELEGRAM_BOT_TOKEN) {
    log('w', 'TELEGRAM_BOT_TOKEN не установлен');
    return false;
  }
  log('i', 'Обновляю бота...');
  try {
    const res = await httpReq(
      {
        hostname: 'api.telegram.org',
        port: 443,
        path: `/bot${CONFIG.TELEGRAM_BOT_TOKEN}/setChatMenuButton`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      {
        menu_button: {
          type: 'web_app',
          text: CONFIG.BOT_NAME,
          web_app: { url: miniAppUrl },
        },
      }
    );
    if (res.status === 200 && res.data?.ok === true) {
      log('s', 'Бот обновлён!');
      return true;
    } else {
      log('e', `Ошибка Telegram: ${res.data?.description || 'Unknown'}`);
      return false;
    }
  } catch (e) {
    log('e', `Ошибка обновления бота: ${e.message}`);
    return false;
  }
}

const PROCESSES = [];

function spawn_proc(cmd, args) {
  return new Promise((res, rej) => {
    log('i', `Запускаю: ${C.B}${cmd} ${args.join(' ')}${C.R}`);
    const proc = spawn(cmd, args, {
      stdio: 'inherit',
      shell: true,
      cwd: ROOT_DIR,
    });
    PROCESSES.push(proc);
    proc.on('error', rej);
    setTimeout(() => (proc.killed ? null : res(proc)), TIMEOUTS.API_START_DELAY);
  });
}

async function cleanup() {
  log('i', 'Останавливаю процессы...');
  PROCESSES.forEach((p) => {
    if (p && !p.killed) {
      try {
        process.kill(-p.pid);
      } catch (e) {
        // ignore
      }
    }
  });
  await new Promise((r) => setTimeout(r, 1000));
  log('s', 'Готово');
}

function saveConfig(cfg) {
  try {
    fs.writeFileSync(CONFIG_OUTPUT, JSON.stringify(cfg, null, 2));
  } catch (e) {
    log('w', `Не удалось сохранить конфиг`);
  }
}

async function main() {
  console.clear();
  console.log(`${C.B}${C.G}╔${'═'.repeat(70)}╗${C.R}`);
  console.log(`${C.B}${C.G}║${C.R} 🚀 Bible Memory - Telegram Mini App Development${' '.repeat(10)}${C.B}${C.G}║${C.R}`);
  console.log(`${C.B}${C.G}╚${'═'.repeat(70)}╝${C.R}\n`);

  if (!CONFIG.TELEGRAM_BOT_TOKEN) {
    log('e', 'TELEGRAM_BOT_TOKEN не установлен!');
    log('i', 'Добавьте в .env.local: TELEGRAM_BOT_TOKEN=ваш_токен');
    process.exit(1);
  }

  try {
    log('s', `Bot Token: ${CONFIG.TELEGRAM_BOT_TOKEN.substring(0, 20)}...`);

    log('i', '▶ Запуск API...');
    await spawn_proc('npm', ['run', 'dev:prod-api']);
    log('s', `API готов: http://localhost:${CONFIG.API_PORT}`);

    log('i', '▶ Запуск ngrok...');
    await spawn_proc('ngrok', ['http', CONFIG.API_PORT.toString()]);
    log('s', 'ngrok готов');

    const ngrokUrl = await getNgrokUrl();
    const miniAppUrl = `${ngrokUrl}?tgWebAppStartParam=mock`;
    const shortenedUrl = await shortenUrl(miniAppUrl);

    await updateBot(shortenedUrl);

    const cfg = {
      timestamp: new Date().toISOString(),
      status: 'ready',
      ngrokUrl,
      miniAppUrl,
      shortenedUrl,
      telegramBot: `https://t.me/${CONFIG.BOT_USERNAME}`,
      apiPort: CONFIG.API_PORT,
    };

    saveConfig(cfg);

    console.log('\n' + '═'.repeat(70));
    console.log(`\n${C.B}${C.G}✨ ГОТОВО К РАЗРАБОТКЕ!${C.R}\n`);
    console.log(`${C.B}📱 Mini App URL:${C.R}`);
    console.log(`   ${C.B}${C.G}${shortenedUrl}${C.R}\n`);
    console.log(`${C.B}🔗 Полный URL:${C.R}`);
    console.log(`   ${shortenedUrl}\n`);
    console.log(`${C.B}🤖 Telegram:${C.R}`);
    console.log(`   https://t.me/${CONFIG.BOT_USERNAME}\n`);
    console.log(`${C.B}${C.Y}⏹️  Ctrl+C для остановки${C.R}\n`);
    console.log('═'.repeat(70) + '\n');
  } catch (e) {
    log('e', `Ошибка: ${e.message}`);
    await cleanup();
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  console.log('');
  log('i', 'Остановка...');
  await cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await cleanup();
  process.exit(0);
});

main();
