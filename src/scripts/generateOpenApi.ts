import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serializeOpenApiDocument } from '@/docs/openapi.js';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, '../..');
const outputPath = resolve(projectRoot, 'openapi.json');

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, serializeOpenApiDocument(), 'utf8');
