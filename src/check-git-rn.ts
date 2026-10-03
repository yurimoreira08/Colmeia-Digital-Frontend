import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

try {
  console.log('--- GIT BRANCHES ---');
  console.log(execSync('git branch -a', { encoding: 'utf8' }));

  console.log('--- GIT SHOW VOICE COMMIT ---');
  const show = execSync('git log --grep="voice" --oneline', { encoding: 'utf8' });
  console.log(show);

  console.log('--- GIT SHOW COMMIT b99dd0ac (HEAD OF YURI / ORIGINAL) VOICE FILES ---');
  const ls = execSync('git ls-tree -r --name-only b99dd0ac', { encoding: 'utf8' });
  const voiceFiles = ls.split('\n').filter(f => f.toLowerCase().includes('voice') || f.toLowerCase().includes('speech'));
  console.log('Voice related files in original:', voiceFiles);
} catch (err: any) {
  console.error('Error running git/file commands:', err.message || err);
}
