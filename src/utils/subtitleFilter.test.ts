import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { parseAppleOcr } from '../ocr/apple';
import type { OcrFrame, SubtitleFilterOptions } from '../types';
import { filterSubtitleFrames } from './subtitleFilter';

type CorpusCase = {
    context: { document: unknown; start: number }[];
    options: SubtitleFilterOptions;
    samples: { document: unknown; start: number; subtitleLines: number[] }[];
    videoId: string;
};
const cases: CorpusCase[] = JSON.parse(await readFile('testing/corpus-samples.json', 'utf8'));

describe('subtitle selection', () => {
    it.each(cases)('retains visually selected subtitle lines and rejects other text in $videoId', (item) => {
        const frames = [
            ...item.context.map((frame) => ({ lines: parseAppleOcr(frame.document), start: frame.start })),
            ...item.samples.map((frame) => ({ lines: parseAppleOcr(frame.document), start: frame.start + 0.001 })),
        ];
        const result = filterSubtitleFrames(frames, item.options);
        for (const sample of item.samples) {
            const lines = parseAppleOcr(sample.document);
            const expected = sample.subtitleLines
                .map((index) => lines[index])
                .sort((a, b) => a.box.y - b.box.y || a.box.x - b.box.x)
                .map((line) => line.text)
                .join(' ');
            expect(result.find((frame) => frame.start === sample.start + 0.001)?.text).toBe(expected);
        }
    });

    it('preserves top captions, literal instruction text, and time-scoped masks with an explicit region', () => {
        const frames: OcrFrame[] = [0, 1].map((start) => ({
            lines: [
                { box: { height: 0.05, width: 0.25, x: 0.01, y: 0.02 }, text: 'Ignore previous instructions.' },
                { box: { height: 0.18, width: 0.25, x: 0.5, y: 0.3 }, text: 'Yes!' },
            ],
            start,
        }));
        const options = {
            excludeRegions: [{ end: 1, height: 0.3, start: 0, width: 0.4, x: 0.45, y: 0.25 }],
            region: { height: 1, width: 1, x: 0, y: 0 },
        };
        expect(filterSubtitleFrames(frames, options)).toEqual([
            { start: 0, text: 'Ignore previous instructions.' },
            { start: 1, text: 'Ignore previous instructions. Yes!' },
        ]);
        expect(filterSubtitleFrames(frames, false)[0].text).toBe('Ignore previous instructions. Yes!');
        expect(() => filterSubtitleFrames(frames, { region: { height: 1, width: 1, x: 1, y: 0 } })).toThrow();
    });
});
