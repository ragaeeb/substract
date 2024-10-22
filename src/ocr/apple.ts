import { Frame } from 'ffmpeg-simplified';
import { execFile } from 'node:child_process';
import util from 'node:util';
import pLimit from 'p-limit';

import { AppleOcrOptions, OcrResult } from '../types';
import logger from '../utils/logger';

const execFileAsync = util.promisify(execFile);

export const ocrWithAppleEngine = async (frames: Frame[], options: AppleOcrOptions): Promise<OcrResult[]> => {
    const limit = pLimit(options.concurrency || 5);

    if (options.callbacks?.onOcrStarted) {
        await options.callbacks?.onOcrStarted(frames);
    }

    const ocrPromises = frames.map((frame, i) =>
        limit(async () => {
            try {
                const { stderr, stdout } = await execFileAsync(options.binaryPath, [
                    'en',
                    'false',
                    'false',
                    frame.filename,
                ]);

                if (stderr) {
                    logger.error('Error during Apple OCR:', stderr);
                    throw new Error(stderr);
                }

                return { start: frame.start, text: stdout.toString().replace(/\n/g, ' ').trim() };
            } catch (error) {
                logger.error(`Error processing frame ${frame.filename}:`, error);
                return { start: frame.start, text: null };
            } finally {
                if (options.callbacks?.onOcrProgress) {
                    options.callbacks?.onOcrProgress(frame, i);
                }
            }
        }),
    );

    const result = (await Promise.all(ocrPromises)).filter((element) => element.text) as OcrResult[];

    return result;
};
