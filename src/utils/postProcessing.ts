import type { Frame } from 'ffmpeg-simplified';

import { stringSimilarity } from 'string-similarity-js';

import { OcrResult } from '../types';
import { TEXT_COMPARISON_SENSITIVITY } from './constants';
import { areImagesSimilar } from './imageUtils';

export const filterOutDuplicates = (
    ocrResults: OcrResult[],
    threshold: number = TEXT_COMPARISON_SENSITIVITY,
): OcrResult[] => {
    if (ocrResults.length === 0) {
        return [];
    }

    const filtered: OcrResult[] = [ocrResults[0]];

    for (let i = 1; i < ocrResults.length; i++) {
        const ocrResult = ocrResults[i];

        if (stringSimilarity(ocrResults[i].text, ocrResults[i - 1].text) < threshold) {
            filtered.push(ocrResult);
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
