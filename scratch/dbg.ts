import { readFileSync } from 'node:fs';
for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([^=]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const { getKv } = await import('../src/lib/kv');
const kv = getKv();
console.log('kv:', !!kv);
const raw = await kv?.get('threads:credentials');
console.log('raw:', JSON.stringify(raw));
const { getCredentials } = await import('../src/lib/threads/session');
console.log('creds:', JSON.stringify(await getCredentials()));
