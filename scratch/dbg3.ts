import { readFileSync } from 'node:fs';
const txt = readFileSync('.env.local', 'utf8');
console.log('len:', txt.length, 'hasBOM:', txt.charCodeAt(0) === 0xFEFF);
const lines = txt.split('\n');
for (const line of lines.slice(0, 4)) console.log(JSON.stringify(line.slice(0, 30)));
