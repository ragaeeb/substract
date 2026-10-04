import { stringSimilarity } from 'string-similarity-js';
import type { Frame, OcrResult } from '../types';
import { TEXT_COMPARISON_SENSITIVITY } from './constants';
import { areImagesSimilar } from './imageUtils';

export const filterOutDuplicates = (
    ocrResults: OcrResult[],
    threshold: number = TEXT_COMPARISON_SENSITIVITY,
): OcrResult[] => {
    if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1)
        throw new Error('Duplicate threshold must be in [0, 1]');
    const filtered: OcrResult[] = [];
    let previous: string | undefined;
    for (const result of ocrResults) {
        const text = result.text.trim().replace(/\s+/g, ' ');
        if (!text) {
            previous = undefined;
            continue;
        }
        if (
            previous === undefined ||
            (threshold === 1 ? text !== previous : stringSimilarity(text, previous) < threshold)
        ) {
            filtered.push({ ...result, text });
            previous = text;
        }
    }

    return filtered;
};

export const filterOutDuplicateFrames = async (frames: Frame[]): Promise<Frame[]> => {
    if (frames.length === 0) {
        return [];
    }

    const uniqueFrames: Frame[] = [frames[0]]; // Keep the first frame by default

    for (let i = 1; i < frames.length; i++) {
        const areSimilar = await areImagesSimilar(uniqueFrames[uniqueFrames.length - 1].filename, frames[i].filename);

        if (!areSimilar) {
            uniqueFrames.push(frames[i]);
        }
    }

    return uniqueFrames;
};
