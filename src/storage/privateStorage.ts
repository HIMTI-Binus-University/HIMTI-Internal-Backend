import { constants } from 'node:fs';
import { access, mkdir, open, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const root = path.resolve(
   process.env.PRIVATE_UPLOAD_ROOT ??
      path.join(process.cwd(), '.private-uploads'),
);

const resolveKey = (key: string) => {
   if (!/^[a-f0-9-]{36}\/[a-f0-9-]{36}$/.test(key))
      throw new Error('Invalid private storage key');
   const resolved = path.resolve(root, key);
   if (!resolved.startsWith(`${root}${path.sep}`))
      throw new Error('Private storage path escapes its root');
   return resolved;
};

export type StagedPrivateFile = {
   key: string;
   commit(): Promise<void>;
   discard(): Promise<void>;
};

export const stagePrivateFile = async (
   contents: Buffer,
): Promise<StagedPrivateFile> => {
   const directory = randomUUID();
   const key = `${directory}/${randomUUID()}`;
   const finalPath = resolveKey(key);
   const quarantine = `${finalPath}.quarantine`;
   await mkdir(path.dirname(finalPath), { recursive: true, mode: 0o700 });
   const handle = await open(quarantine, 'wx', 0o600);
   try {
      await handle.writeFile(contents);
      await handle.sync();
   } finally {
      await handle.close();
   }
   return {
      key,
      commit: () => rename(quarantine, finalPath),
      discard: async () => {
         await rm(path.dirname(finalPath), { recursive: true, force: true });
      },
   };
};

export const openPrivateFile = async (key: string) => {
   const filePath = resolveKey(key);
   await access(filePath, constants.R_OK);
   return (await open(filePath, 'r')).createReadStream();
};

export const getPrivateFilePath = resolveKey;
