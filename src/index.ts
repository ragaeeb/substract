import { getFrames } from 'ffmpeg-simplified';
import { promises as fs } from 'fs';

import { ocrWithAppleEngine } from './ocr/apple.js';
import { SubstractOptions } from './types.js';
import { createTempDir } from './utils/io.js';
import logger from './utils/logger.js';
import { filterOutDuplicates } from './utils/postProcessing.js';

export const substract = async (videoFile: string, options: SubstractOptions): Promise<string> => {
    const outputFolder = await createTempDir();
    logger.info(`Using temp folder to: ${outputFolder} to process ${videoFile}`);

    try {
        logger.info(`Generating frames... ${JSON.stringify(options)}`);

        if (options.callbacks?.onGenerateFramesStarted) {
            await options.callbacks?.onGenerateFramesStarted(videoFile);
        }

        const frames = await getFrames(videoFile, {
            cropOptions: { bottom: 10, top: 30 },
            frequency: 10,
            outputFolder,
            ...options.frameOptions,
        });

        if (options.callbacks?.onGenerateFramesFinished) {
            await options.callbacks?.onGenerateFramesFinished(frames);
        }

        logger.info(`${frames.length} frames generated...`);

        let result = await ocrWithAppleEngine(frames, {
            callbacks: options.callbacks,
            concurrency: options.concurrency,
        });

        if (options.callbacks?.onOcrFinished) {
            options.callbacks?.onOcrFinished(result);
        }

        result = filterOutDuplicates(result, options.duplicateTextThreshold);

        await fs.writeFile(options.outputOptions.outputFile, JSON.stringify(result, null, 2));

        return options.outputOptions.outputFile;
    } finally {
        await fs.rm(outputFolder, { recursive: true });
    }
};
