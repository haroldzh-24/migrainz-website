import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

if (fs.existsSync('.env.local')) throw new Error('.env.local already exists; refusing to overwrite configuration.');
const home = path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), '.local/share'), 'StudioMigrainz', 'cms');
fs.mkdirSync(path.join(home, 'media'), { recursive: true });
fs.writeFileSync('.env.local', [
  'CMS_DATABASE=sqlite',
  `DATABASE_URL=${pathToFileURL(path.join(home, 'studio.db')).href}`,
  `CMS_MEDIA_DIR=${path.join(home, 'media').replaceAll('\\', '/')}`,
  `PAYLOAD_SECRET=${crypto.randomBytes(32).toString('hex')}`,
  '',
].join('\n'), { flag: 'wx' });
console.log('Development CMS configuration created. Private data directory:', home);
console.log('Start npm run dev, then visit /admin to create your administrator. No password is seeded.');
