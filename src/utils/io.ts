import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const createTempDir = async () => {
    const tempDirBase = path.join(os.tmpdir(), `substract_${Date.now().toString()}`);
    return fs.mkdtemp(tempDirBase);
};

export const fileExists = async (path: string) => !!(await fs.stat(path).catch(() => false));
