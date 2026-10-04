import { promises as fs } from 'node:fs';

import { ocrWithAppleEngine } from './ocr/apple.js';
import type { SubstractOptions } from './types.js';
import { getFrames } from './utils/frames.js';
import { createTempDir } from './utils/io.js';
import logger from './utils/logger.js';
import { writeOcrResults } from './utils/outputWriter.js';
import { filterOutDuplicates } from './utils/postProcessing.js';

export const substract = async (videoFile: string, options: SubstractOptions): Promise<null | string> => {
    if (!Number.isFinite(options.frameOptions?.frequency ?? 1) || (options.frameOptions?.frequency ?? 1) <= 0) {
        throw new Error('Frame frequency must be positive');
    }
    const outputFolder = await createTempDir();
    logger.info(`Using temp folder to: ${outputFolder} to process ${videoFile}`);

    try {
        logger.info(`Generating frames... ${JSON.stringify(options)}`);

        if (options.callbacks?.onGenerateFramesStarted) {
            await options.callbacks?.onGenerateFramesStarted(videoFile);
        }

        const frames = await getFrames(videoFile, {
            frequency: 1,
            outputFolder: outputFolder,
            ...options.frameOptions,
        });

        if (options.callbacks?.onGenerateFramesFinished) {
            await options.callbacks?.onGenerateFramesFinished(frames);
        }

        if (frames.length === 0) {
            logger.warn(`${frames.length} frames generated, aborting...`);
            return null;
        }

        logger.info(`${frames.length} frames generated, starting OCR...`);

        let result = await ocrWithAppleEngine(frames, {
            binaryPath: options.ocrOptions?.appleBinaryPath as string,
            callbacks: options.callbacks,
            concurrency: options.concurrency,
            format: options.ocrOptions.format,
            languages: options.ocrOptions.languages,
            subtitleOptions: options.subtitleOptions,
            timeoutMs: options.ocrOptions.timeoutMs,
        });

        if (options.callbacks?.onOcrFinished) {
            options.callbacks?.onOcrFinished(result.filter((frame) => frame.text));
        }

        result = filterOutDuplicates(result, options.duplicateTextThreshold);

        const outputFile = await writeOcrResults(result, options.outputOptions);

        return outputFile;
    } finally {
        await fs.rm(outputFolder, { recursive: true });
    }
};

export type { CropPreset } from './types';
export * from './types';
