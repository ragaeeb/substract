import { stringSimilarity } from 'string-similarity-js';

import { OcrResult } from '../types';

export const filterOutDuplicates = (ocrResults: OcrResult[], threshold: number = 0.7): OcrResult[] => {
    const filtered: OcrResult[] = [ocrResults[0]];

    for (let i = 1; i < ocrResults.length; i++) {
        const ocrResult = ocrResults[i];

        if (stringSimilarity(ocrResults[i].text, ocrResults[i - 1].text) < 0.7) {
            filtered.push(ocrResult);
        }
    }

    return filtered;
};
