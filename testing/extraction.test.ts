import { execFile } from 'node:child_process';
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';
import sharp from 'sharp';
import { expect, it } from 'vitest';

import { substract } from '../src/index';

it('extracts frames with modern FFmpeg, preserves crop percentages/timestamps, and cleans up', async () => {
    const folder = await mkdtemp(path.join(tmpdir(), 'substract-native-test-'));
    const video = path.join(folder, 'video with spaces.mp4');
    const binary = path.join(folder, 'ocr');
    const outputFile = path.join(folder, 'output.json');
    let framesFolder = '';
    try {
        await promisify(execFile)('ffmpeg', [
            '-v',
            'error',
            '-f',
            'lavfi',
            '-i',
            'color=black:size=320x180:rate=25',
            '-t',
            '3',
            video,
        ]);
        await writeFile(
            binary,
            `#!${process.execPath}
const fs = require('node:fs');
const args = process.argv.slice(2);
fs.writeFileSync(args[args.indexOf('--output') + 1], JSON.stringify({
    width: 288, height: 126, observations: [{text: 'A caption.', bbox: {x: 30, y: 40, width: 220, height: 10}}]
}));
`,
            { mode: 0o755 },
        );
        await substract(video, {
            callbacks: {
                onGenerateFramesFinished: async (frames) => {
                    framesFolder = path.dirname(frames[0].filename);
                    expect(frames.map((frame) => frame.start)).toEqual([0, 1, 2]);
                    const metadata = await sharp(frames[0].filename).metadata();
                    expect([metadata.width, metadata.height]).toEqual([288, 126]);
                },
            },
            frameOptions: { cropOptions: { bottom: 20, right: 10, top: 10 } },
            ocrOptions: { appleBinaryPath: binary },
            outputOptions: { outputFile },
        });
        expect(JSON.parse(await readFile(outputFile, 'utf8'))).toEqual([{ start: 0, text: 'A caption.' }]);
        await expect(access(framesFolder)).rejects.toThrow();
    } finally {
        await rm(folder, { force: true, recursive: true });
    }
}, 30_000);
