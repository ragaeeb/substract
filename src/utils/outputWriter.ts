import fs from 'fs/promises';
import path from 'node:path';

import { OcrResult, OutputFormat, OutputOptions } from '../types.js';
import logger from './logger.js';

const mapDataToJSONString = (segments: OcrResult[]): string => {
    return JSON.stringify(segments, null, 2);
};

const mapDataToPlainText = (segments: OcrResult[]): string => {
    return segments.map((segment) => segment.text).join('\n');
};

const OutputFormatToHandler = {
    [OutputFormat.Json]: mapDataToJSONString,
    [OutputFormat.Txt]: mapDataToPlainText,
};

export const writeOcrResults = async (segments: OcrResult[], options: OutputOptions): Promise<string> => {
    const format = path.parse(options.outputFile).ext.slice(1);
    logger.info(`Writing ${segments.length} transcripts to ${JSON.stringify(options)}`);
    const handler = OutputFormatToHandler[format as OutputFormat];

    if (!handler) {
        throw new Error(`${format} extension not supported`);
    }

    await fs.writeFile(options.outputFile, handler(segments), 'utf8');

    return options.outputFile;
};
