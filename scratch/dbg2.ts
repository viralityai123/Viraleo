import { readFileSync } from 'node:fs';
for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([^=]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
console.log('url:', process.env.UPSTASH_REDIS_REST_URL?.length, 'tok:', process.env.UPSTASH_REDIS_REST_TOKEN?.length);
