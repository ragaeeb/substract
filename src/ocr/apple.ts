import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import util from 'node:util';
import pLimit from 'p-limit';
import type { AppleOcrOptions, Frame, OcrFrame, OcrLine, OcrResult } from '../types';
import logger from '../utils/logger';
import { filterSubtitleFrames } from '../utils/subtitleFilter';

const execFileAsync = util.promisify(execFile);

/** macOCR JSON uses pixel coordinates with a top-left origin. Fail closed on incompatible output. */
export const parseAppleOcr = (document: unknown): OcrLine[] => {
    const data = document as { height: number; observations: { bbox: OcrLine['box']; text: string }[]; width: number };
    if (
        !data ||
        !Number.isFinite(data.width) ||
        data.width <= 0 ||
        !Number.isFinite(data.height) ||
        data.height <= 0 ||
        !Array.isArray(data.observations)
    )
        throw new Error('Invalid macOCR JSON document');
    return data.observations.map((observation) => {
        const box = observation?.bbox;
        if (
            typeof observation?.text !== 'string' ||
            !box ||
            ![box.x, box.y, box.width, box.height].every(Number.isFinite) ||
            box.width <= 0 ||
            box.height <= 0 ||
            box.x >= data.width ||
            box.y >= data.height ||
            box.x + box.width <= 0 ||
            box.y + box.height <= 0
        ) {
            throw new Error('Invalid macOCR observation');
        }
        const x = Math.max(0, box.x),
            y = Math.max(0, box.y);
        return {
            box: {
                height: (Math.min(data.height, box.y + box.height) - y) / data.height,
                width: (Math.min(data.width, box.x + box.width) - x) / data.width,
                x: x / data.width,
                y: y / data.height,
            },
            text: observation.text,
        };
    });
};

export const ocrWithAppleEngine = async (frames: Frame[], options: AppleOcrOptions): Promise<OcrResult[]> => {
    if (!options.binaryPath) throw new Error('appleBinaryPath is required');
    if (options.format !== undefined && options.format !== 'json' && options.format !== 'legacy') {
        throw new Error('Unknown OCR format');
    }
    if (!Number.isFinite(options.timeoutMs ?? 60_000) || (options.timeoutMs ?? 60_000) <= 0) {
        throw new Error('OCR timeout must be positive');
    }
    if (
        options.languages &&
        (!options.languages.length ||
            options.languages.some((language) => !/^[a-z]{2,3}(?:-[A-Za-z0-9]+)*$/.test(language)))
    ) {
        throw new Error('OCR languages must be language codes such as en or en-US');
    }
    if (options.format === 'legacy' && options.subtitleOptions !== undefined && options.subtitleOptions !== false) {
        throw new Error('Watermark filtering requires macOCR JSON bounding boxes');
    }

    const concurrency = options.concurrency ?? 5;
    if (!Number.isInteger(concurrency) || concurrency <= 0) {
        throw new Error('OCR concurrency must be a positive integer');
    }
    const limit = pLimit(concurrency);

    if (options.callbacks?.onOcrStarted) {
        await options.callbacks?.onOcrStarted(frames);
    }

    const folder = await mkdtemp(path.join(tmpdir(), 'substract-ocr-'));
    let failed = false;
    try {
        const ocrPromises = frames.map((frame, i, arr) =>
            limit(async () => {
                try {
                    if (failed) throw new Error('OCR stopped after a frame failed');
                    const output = path.join(folder, `${i}.json`);
                    const language = (options.languages ?? ['en']).join(',');
                    const args =
                        options.format === 'legacy'
                            ? [language, 'false', 'false', frame.filename]
                            : ['--language', language, '--output', output, frame.filename];
                    const { stderr, stdout } = await execFileAsync(options.binaryPath, args, {
                        maxBuffer: 10 * 1024 * 1024,
                        timeout: options.timeoutMs ?? 60_000,
                    });
                    if (stderr) logger.warn(`macOCR diagnostics: ${stderr}`);
                    if (options.format === 'legacy')
                        return { start: frame.start, text: stdout.trim().replace(/\s+/g, ' ') };
                    return { lines: parseAppleOcr(JSON.parse(await readFile(output, 'utf8'))), start: frame.start };
                } catch (error) {
                    failed = true;
                    throw new Error(`OCR failed for frame at ${frame.start}s: ${frame.filename}`, { cause: error });
                } finally {
                    logger.debug(`${i}/${arr.length} OCR completed`);

                    if (options.callbacks?.onOcrProgress) {
                        options.callbacks?.onOcrProgress(frame, i);
                    }
                }
            }),
        );

        // Drain running/queued children before removing the scratch directory, including on failure.
        const results = await Promise.allSettled(ocrPromises);
        const failure = results.find((result) => result.status === 'rejected');
        if (failure?.status === 'rejected') throw failure.reason;
        const values = results.map((result) => (result as PromiseFulfilledResult<OcrFrame | OcrResult>).value);
        return options.format === 'legacy'
            ? (values as OcrResult[])
            : filterSubtitleFrames(values as OcrFrame[], options.subtitleOptions);
    } finally {
        await rm(folder, { force: true, recursive: true });
    }
};
