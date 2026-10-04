import { promises as fs } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

import { substract } from './index.js';
import { ocrWithAppleEngine } from './ocr/apple.js';
import { getFrames } from './utils/frames.js';
import { createTempDir } from './utils/io.js';
import { filterOutDuplicates } from './utils/postProcessing.js';

vi.mock('./utils/frames.js');
vi.mock('./ocr/apple.js');
vi.mock('./utils/postProcessing.js');

describe('index', () => {
    describe('substract', () => {
        let outputFolder: string;

        beforeEach(async () => {
            vi.resetAllMocks();
            outputFolder = await createTempDir();
        });

        afterEach(async () => {
            await fs.rm(outputFolder, { recursive: true });
        });

        it('should extract out the subtitles', async () => {
            (getFrames as Mock).mockResolvedValue([
                { filename: 'frame1.jpg', start: 0 },
                { filename: 'frame1.5.jpg', start: 5 },
                { filename: 'frame2.jpg', start: 10 },
                { filename: 'frame3.jpg', start: 20 },
                { filename: 'frame4.jpg', start: 30 },
            ]);

            (ocrWithAppleEngine as Mock).mockResolvedValue([
                { start: 0, text: 'Hello world' },
                { start: 10, text: 'Hello world' },
                { start: 20, text: 'Goodbye' },
            ]);

            (filterOutDuplicates as Mock).mockReturnValue([
                { start: 0, text: 'Hello world' },
                { start: 20, text: 'Goodbye' },
            ]);

            const outputFile = `${outputFolder}/test.json`;

            const result = (await substract(`${outputFolder}/video.mp4`, {
                ocrOptions: { appleBinaryPath: '/path/to/ocr/binary' },
                outputOptions: { outputFile },
            })) as string;

            expect(result).toEqual(outputFile);

            const outputJson = JSON.parse(await fs.readFile(result, 'utf8'));

            expect(outputJson).toEqual([
                { start: 0, text: 'Hello world' },
                { start: 20, text: 'Goodbye' },
            ]);
        });

        it('should trigger callbacks correctly', async () => {
            (getFrames as Mock).mockResolvedValue([
                { filename: 'frame1.jpg', start: 0 },
                { filename: 'frame2.jpg', start: 10 },
            ]);

            (ocrWithAppleEngine as Mock).mockResolvedValue([
                { start: 0, text: 'Hello world' },
                { start: 10, text: 'Goodbye' },
            ]);

            (filterOutDuplicates as Mock).mockReturnValue([
                { start: 0, text: 'Hello world' },
                { start: 10, text: 'Goodbye' },
            ]);

            const onGenerateFramesStarted = vi.fn();
            const onGenerateFramesFinished = vi.fn();
            const onOcrFinished = vi.fn();

            const outputFile = `${outputFolder}/test.json`;

            const result = (await substract(`${outputFolder}/video.mp4`, {
                callbacks: {
                    onGenerateFramesFinished,
                    onGenerateFramesStarted,
                    onOcrFinished,
                },
                ocrOptions: { appleBinaryPath: '/path/to/ocr/binary' },
                outputOptions: { outputFile },
            })) as string;

            expect(result).toEqual(outputFile);

            expect(onGenerateFramesStarted).toHaveBeenCalledWith(`${outputFolder}/video.mp4`);
            expect(onGenerateFramesFinished).toHaveBeenCalledWith([
                { filename: 'frame1.jpg', start: 0 },
                { filename: 'frame2.jpg', start: 10 },
            ]);
            expect(onOcrFinished).toHaveBeenCalledWith([
                { start: 0, text: 'Hello world' },
                { start: 10, text: 'Goodbye' },
            ]);
        });

        it('should return null when no frames are generated', async () => {
            (getFrames as Mock).mockResolvedValue([]);

            const outputFile = `${outputFolder}/test.json`;

            const result = await substract(`${outputFolder}/video.mp4`, {
                ocrOptions: { appleBinaryPath: '/path/to/ocr/binary' },
                outputOptions: { outputFile },
            });

            expect(result).toBeNull();
        });

        it('should not proceed to OCR when frames array is empty', async () => {
            (getFrames as Mock).mockResolvedValue([]);

            const outputFile = `${outputFolder}/test.json`;

            await substract(`${outputFolder}/video.mp4`, {
                ocrOptions: { appleBinaryPath: '/path/to/ocr/binary' },
                outputOptions: { outputFile },
            });

            expect(ocrWithAppleEngine).not.toHaveBeenCalled();
        });

        it('should use provided frameOptions', async () => {
            (getFrames as Mock).mockResolvedValue([{ filename: 'frame1.jpg', start: 0 }]);
            (ocrWithAppleEngine as Mock).mockResolvedValue([{ start: 0, text: 'Hello world' }]);
            (filterOutDuplicates as Mock).mockReturnValue([{ start: 0, text: 'Hello world' }]);

            const outputFile = `${outputFolder}/test.json`;

            const frameOptions = {
                cropOptions: { bottom: 20, top: 10 },
                frequency: 5,
            };

            const result = (await substract(`${outputFolder}/video.mp4`, {
                frameOptions,
                ocrOptions: { appleBinaryPath: '/path/to/ocr/binary' },
                outputOptions: { outputFile },
            })) as string;

            expect(result).toEqual(outputFile);

            expect(getFrames).toHaveBeenCalledWith(`${outputFolder}/video.mp4`, {
                cropOptions: { bottom: 20, top: 10 },
                frequency: 5,
                outputFolder: expect.any(String),
            });
        });

        it('forwards concurrency and OCR filtering options to ocrWithAppleEngine', async () => {
            (getFrames as Mock).mockResolvedValue([{ filename: 'frame1.jpg', start: 0 }]);

            (ocrWithAppleEngine as Mock).mockResolvedValue([{ start: 0, text: 'Hello world' }]);

            (filterOutDuplicates as Mock).mockReturnValue([{ start: 0, text: 'Hello world' }]);

            const outputFile = `${outputFolder}/test.json`;

            const concurrency = 3;

            const result = (await substract(`${outputFolder}/video.mp4`, {
                concurrency,
                ocrOptions: {
                    appleBinaryPath: '/path/to/ocr/binary',
                    format: 'json',
                    languages: ['en', 'ar'],
                    timeoutMs: 12_000,
                },
                subtitleOptions: { filterPersistentText: false, maxLineHeight: 0.2 },
                outputOptions: { outputFile },
            })) as string;

            expect(result).toEqual(outputFile);

            expect(ocrWithAppleEngine).toHaveBeenCalledWith([{ filename: 'frame1.jpg', start: 0 }], {
                binaryPath: '/path/to/ocr/binary',
                callbacks: undefined,
                concurrency,
                format: 'json',
                languages: ['en', 'ar'],
                subtitleOptions: { filterPersistentText: false, maxLineHeight: 0.2 },
                timeoutMs: 12_000,
            });
        });

        it('should use duplicateTextThreshold in filterOutDuplicates', async () => {
            (getFrames as Mock).mockResolvedValue([
                { filename: 'frame1.jpg', start: 0 },
                { filename: 'frame2.jpg', start: 10 },
            ]);

            (ocrWithAppleEngine as Mock).mockResolvedValue([
                { start: 0, text: 'Hello world' },
                { start: 10, text: 'Hello World' },
            ]);

            (filterOutDuplicates as Mock).mockReturnValue([{ start: 0, text: 'Hello world' }]);

            const outputFile = `${outputFolder}/test.json`;

            const duplicateTextThreshold = 0.9;

            const result = (await substract(`${outputFolder}/video.mp4`, {
                duplicateTextThreshold,
                ocrOptions: { appleBinaryPath: '/path/to/ocr/binary' },
                outputOptions: { outputFile },
            })) as string;

            expect(result).toEqual(outputFile);

            expect(filterOutDuplicates).toHaveBeenCalledWith(
                [
                    { start: 0, text: 'Hello world' },
                    { start: 10, text: 'Hello World' },
                ],
                duplicateTextThreshold,
            );
        });
    });
});
