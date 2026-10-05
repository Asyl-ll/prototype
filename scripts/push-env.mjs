import { spawn } from 'node:child_process';
const names = ['GROQ_API_KEY', 'APP_ACCESS_CODE'];
if (!process.env.GROQ_API_KEY || process.env.APP_ACCESS_CODE?.length < 12) throw new Error('Complete local setup first.');
for (const name of names) {
  await new Promise((resolve, reject) => {
    const child = spawn('vercel', ['env', 'add', name, 'production', '--sensitive', '--yes'], { shell: process.platform === 'win32', stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    let output = '';
    child.stdout.on('data', data => output += data); child.stderr.on('data', data => output += data);
    child.on('error', reject);
    child.on('close', code => {
      if (code === 0) { console.log(`${name}: saved as a Vercel production secret.`); resolve(); }
      else {
        for (const secret of names.map(n => process.env[n])) output = output.split(secret).join('[REDACTED]');
        reject(new Error(`${name}: failed (${code}). ${output.replace(/gsk_[A-Za-z0-9]+/g, '[REDACTED]').slice(-1800)}`));
      }
    });
    child.stdin.end(process.env[name]);
  });
}
