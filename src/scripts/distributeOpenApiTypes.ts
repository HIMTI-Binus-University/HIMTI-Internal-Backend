import { copyFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const source = fileURLToPath(
   new URL('../generated/openapi.ts', import.meta.url),
);
const targets = process.argv.slice(2);

if (!targets.length) {
   throw new Error(
      'Pass existing frontend contract paths: npm run contract:distribute -- <path-to-src/generated/openapi.ts> [more paths]',
   );
}

const destinations = targets.map((target) => resolve(target));
for (const destination of destinations) {
   if (destination === source || !(await stat(destination)).isFile()) {
      throw new Error(
         'Expected an existing frontend contract file: ' + destination,
      );
   }
}

await Promise.all(
   destinations.map((destination) => copyFile(source, destination)),
);
