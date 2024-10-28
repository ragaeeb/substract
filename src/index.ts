import { getFrames } from 'ffmpeg-simplified';
import { promises as fs } from 'fs';

import { ocrWithAppleEngine } from './ocr/apple.js';
import { SubstractOptions } from './types.js';
import { createTempDir } from './utils/io.js';
import logger from './utils/logger.js';
import { writeOcrResults } from './utils/outputWriter.js';
import { filterOutDuplicateFrames, filterOutDuplicates } from './utils/postProcessing.js';

export const substract = async (videoFile: string, options: SubstractOptions): Promise<null | string> => {
    const outputFolder = await createTempDir();
    logger.info(`Using temp folder to: ${outputFolder} to process ${videoFile}`);

    try {
        logger.info(`Generating frames... ${JSON.stringify(options)}`);

        if (options.callbacks?.onGenerateFramesStarted) {
            await options.callbacks?.onGenerateFramesStarted(videoFile);
        }

        let frames = await getFrames(videoFile, {
            cropOptions: { bottom: 10, top: 30 },
            frequency: 10,
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

        logger.info(`${frames.length} frames generated, starting image comparisons for duplication...`);

        frames = await filterOutDuplicateFrames(frames);

        logger.info(`Filtered down to ${frames.length} frames, starting OCR...`);

        let result = await ocrWithAppleEngine(frames, {
            binaryPath: options.ocrOptions?.appleBinaryPath as string,
            callbacks: options.callbacks,
            concurrency: options.concurrency,
        });

        if (options.callbacks?.onOcrFinished) {
            options.callbacks?.onOcrFinished(result);
        }

        result = filterOutDuplicates(result, options.duplicateTextThreshold);

        const outputFile = await writeOcrResults(result, options.outputOptions);

        return outputFile;
    } finally {
        await fs.rm(outputFolder, { recursive: true });
    }
};

export * from './types';
export type { CropOptions, CropPreset, Frame } from 'ffmpeg-simplified';
