// Tiny Chrome DevTools Protocol client used by the QA scripts (no dependencies).
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const BROWSERS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function launch({ port = 9333 } = {}) {
  const exe = BROWSERS.find(existsSync);
  if (!exe) throw new Error('No Chrome/Edge found');
  const profile = join(tmpdir(), `edge-qa-${Date.now()}`);
  const proc = spawn(exe, [
    '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--disable-gpu',
  ], { stdio: 'ignore' });

  let url;
  for (let i = 0; i < 50 && !url; i++) {
    try {
      url = (await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()).webSocketDebuggerUrl;
    } catch {
      await sleep(200);
    }
  }
  if (!url) throw new Error('Browser did not start');

  const ws = new WebSocket(url);
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  let seq = 0;
  const pending = new Map();
  const listeners = new Set();
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    } else {
      listeners.forEach((fn) => fn(msg));
    }
  });
  const send = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      const id = ++seq;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params, sessionId }));
    });

  function waitFor(sessionId, method, timeout = 15000) {
    return new Promise((resolve) => {
      const t = setTimeout(() => { listeners.delete(fn); resolve(null); }, timeout);
      const fn = (msg) => {
        if (msg.sessionId === sessionId && msg.method === method) {
          clearTimeout(t);
          listeners.delete(fn);
          resolve(msg.params);
        }
      };
      listeners.add(fn);
    });
  }

  async function openPage() {
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    const s = (m, p) => send(m, p, sessionId);
    await Promise.all(['Page.enable', 'Runtime.enable', 'Network.enable'].map((m) => s(m)));
    const evaluate = async (expression) =>
      (await s('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result.value;
    const close = () => send('Target.closeTarget', { targetId });
    return { s, sessionId, targetId, evaluate, close, waitFor: (m, t) => waitFor(sessionId, m, t) };
  }

  async function shutdown() {
    ws.close();
    proc.kill();
    await sleep(300);
    await rm(profile, { recursive: true, force: true }).catch(() => {});
  }

  return { send, listeners, openPage, shutdown };
}
