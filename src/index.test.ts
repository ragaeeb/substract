import { getFrames } from 'ffmpeg-simplified';
import { promises as fs } from 'fs';
import { afterEach, beforeEach, describe, expect, it, Mock, vi } from 'vitest';

import { substract } from './index.js';
import { ocrWithAppleEngine } from './ocr/apple.js';
import { createTempDir } from './utils/io.js';

vi.mock('ffmpeg-simplified');
vi.mock('./ocr/apple.js');
vi.mock('./utils/postProcessing.js');

describe('index', () => {
    describe('substract', () => {
        let outputFolder;

        beforeEach(async () => {
            vi.resetAllMocks();
            outputFolder = await createTempDir();
        });

        afterEach(async () => {
            await fs.rm(outputFolder);
        });

        it('should extract out the subtitles', async () => {
            (getFrames as Mock).mockResolvedValue([
                { filePath: 'frame1.jpg', start: 0 },
                { filePath: 'frame2.jpg', start: 10 },
                { filePath: 'frame3.jpg', start: 20 },
            ]);

            (ocrWithAppleEngine as Mock).mockResolvedValue([
                { start: 0, text: 'Hello world' },
                { start: 10, text: 'Hello world' },
                { start: 20, text: 'Goodbye' },
            ]);

            const outputFile = `${outputFolder}/test.json`;

            const result = (await substract(`${outputFolder}/video.mp4`, {
                ocrOptions: { appleBinaryPath: '/path/to/ocr/binary' },
                outputOptions: { outputFile },
            })) as string;

            expect(result).toEqual(outputFile);

            const outputJson = JSON.parse(await fs.readFile(result, 'utf8'));

            // Assert that the output matches expected output
            expect(outputJson).toEqual([
                { start: 0, text: 'Hello world' },
                { start: 20, text: 'Goodbye' },
            ]);
        });
    });
});
