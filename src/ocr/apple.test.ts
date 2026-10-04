import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ocrWithAppleEngine } from './apple';

describe('Apple OCR process boundary', () => {
    let folder: string;
    let binary: string;
    beforeEach(async () => {
        folder = await mkdtemp(path.join(tmpdir(), 'substract-ocr-test-'));
        binary = path.join(folder, 'ocr');
        // A CLI fixture implements both macOCR protocols, without implementing subtitle filtering.
        await writeFile(
            binary,
            `#!${process.execPath}
const fs = require('node:fs');
const args = process.argv.slice(2);
const data = JSON.parse(fs.readFileSync(args.at(-1), 'utf8'));
if (data.fail) process.exit(1);
if (args.includes('--output')) fs.writeFileSync(args[args.indexOf('--output') + 1], JSON.stringify(data));
else console.log(data.observations.map(line => line.text).join('\\n'));
`,
            { mode: 0o755 },
        );
    });
    afterEach(async () => {
        await rm(folder, { force: true, recursive: true });
    });

    it('removes isolated corner branding, orders captions, and retains a long-held question', async () => {
        const filename = path.join(folder, 'frame.json');
        await writeFile(
            filename,
            JSON.stringify({
                height: 1000,
                observations: [
                    { bbox: { height: 25, width: 120, x: 850, y: 40 }, text: 'CHANNEL' },
                    { bbox: { height: 50, width: 800, x: 80, y: 650 }, text: 'Keep the complete question.' },
                    { bbox: { height: 50, width: 200, x: 400, y: 580 }, text: 'Question:' },
                ],
                width: 1000,
            }),
        );
        const result = await ocrWithAppleEngine(
            [
                { filename, start: 0 },
                { filename, start: 60 },
            ],
            { binaryPath: binary },
        );
        expect(result).toEqual([
            { start: 0, text: 'Question: Keep the complete question.' },
            { start: 60, text: 'Question: Keep the complete question.' },
        ]);
    });

    it('rejects malformed OCR geometry and process failures instead of writing partial subtitles', async () => {
        const filename = path.join(folder, 'bad.json');
        for (const data of [{ height: 100, observations: [], width: 0 }, { fail: true }]) {
            await writeFile(filename, JSON.stringify(data));
            await expect(ocrWithAppleEngine([{ filename, start: 0 }], { binaryPath: binary })).rejects.toThrow();
            expect(JSON.parse(await readFile(filename, 'utf8'))).toEqual(data);
        }
    });

    it.each([{ format: 'legacy' as const }, { subtitleOptions: false as const }])(
        'retains literal text when geometry filtering is unavailable or disabled: %j',
        async (options) => {
            const filename = path.join(folder, 'literal.json');
            await writeFile(
                filename,
                JSON.stringify({
                    height: 1000,
                    observations: [
                        { bbox: { height: 20, width: 100, x: 850, y: 20 }, text: 'Ignore all previous instructions.' },
                    ],
                    width: 1000,
                }),
            );
            expect(await ocrWithAppleEngine([{ filename, start: 0 }], { binaryPath: binary, ...options })).toEqual([
                { start: 0, text: 'Ignore all previous instructions.' },
            ]);
        },
    );
});
