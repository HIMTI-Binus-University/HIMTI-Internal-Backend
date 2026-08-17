import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, '../..');
const webDevRoot = resolve(projectRoot, '..');
const source = resolve(projectRoot, 'src/generated/openapi.ts');
const destinations = [
   resolve(webDevRoot, 'HIMTI-Internal-Frontend/src/generated/openapi.ts'),
   resolve(webDevRoot, 'himti-regist-frontend/src/generated/openapi.ts'),
];

for (const destination of destinations) {
   await mkdir(dirname(destination), { recursive: true });
   await copyFile(source, destination);
}
