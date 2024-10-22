import { describe, expect, it } from 'vitest';

import { filterOutDuplicateFrames, filterOutDuplicates } from './postProcessing';

describe('postProcessing', () => {
    describe('filterOutDuplicateFrames', () => {
        it('should determine that the images are the same', async () => {
            const actual = await filterOutDuplicateFrames([
                { filename: 'testing/frame_0003.jpg', start: 0 },
                { filename: 'testing/frame_0004.jpg', start: 10 },
                { filename: 'testing/frame_0005.jpg', start: 20 },
            ]);
            expect(actual).toEqual([
                { filename: 'testing/frame_0003.jpg', start: 0 },
                { filename: 'testing/frame_0005.jpg', start: 20 },
            ]);
        });
    });

    describe('filterOutDuplicates', () => {
        it('should return an empty array when given an empty array', () => {
            const result = filterOutDuplicates([]);
            expect(result).toEqual([]);
        });

        it('should return the same array when all texts are unique', () => {
            const ocrResults = [
                { start: 0, text: 'Hello World' },
                { start: 1, text: 'Testing 123' },
                { start: 2, text: 'Vitest Rocks!' },
            ];

            const result = filterOutDuplicates(ocrResults);
            expect(result).toEqual(ocrResults);
        });

        it('should filter out consecutive similar strings based on default threshold', () => {
            const ocrResults = [
                { start: 0, text: 'Subtitle line one.' },
                { start: 1, text: 'Subtitle line one..' },
                { start: 2, text: 'Subtitle line one...' },
                { start: 3, text: 'Subtitle line two.' },
            ];

            const result = filterOutDuplicates(ocrResults);

            expect(result).toEqual([
                { start: 0, text: 'Subtitle line one.' },
                { start: 3, text: 'Subtitle line two.' },
            ]);
        });

        it('should not filter out non-consecutive similar strings', () => {
            const ocrResults = [
                { start: 0, text: 'First line of text.' },
                { start: 1, text: 'Something else entirely.' },
                { start: 2, text: 'First line of text.' },
            ];

            const result = filterOutDuplicates(ocrResults);

            expect(result).toEqual(ocrResults);
        });

        it('should correctly apply a custom threshold', () => {
            const ocrResults = [
                { start: 0, text: 'Hello World!' },
                { start: 1, text: 'Hello World!!' },
                { start: 2, text: 'Hello World!!!' },
                { start: 3, text: 'Goodbye World.' },
            ];

            const customThreshold = 0.9;

            const result = filterOutDuplicates(ocrResults, customThreshold);

            expect(result).toEqual([
                { start: 0, text: 'Hello World!' },
                { start: 3, text: 'Goodbye World.' },
            ]);
        });

        it('should handle identical strings', () => {
            const ocrResults = [
                { start: 0, text: 'Same text' },
                { start: 1, text: 'Same text' },
                { start: 2, text: 'Same text' },
            ];

            const result = filterOutDuplicates(ocrResults);

            expect(result).toEqual([{ start: 0, text: 'Same text' }]);
        });

        it('should handle varying similarities around the threshold', () => {
            const ocrResults = [
                { start: 0, text: 'This is a test.' },
                { start: 1, text: 'This is a tests.' }, // Slight variation
                { start: 2, text: 'Completely different text.' },
                { start: 3, text: 'This is a test.' }, // Similar to the first
            ];

            const result = filterOutDuplicates(ocrResults);

            expect(result).toEqual([
                { start: 0, text: 'This is a test.' },
                { start: 2, text: 'Completely different text.' },
                { start: 3, text: 'This is a test.' },
            ]);
        });

        it('should filter out all duplicates when the threshold is set to one', () => {
            const ocrResults = [
                { start: 0, text: 'Unique text' },
                { start: 1, text: 'Unique text' },
                { start: 2, text: 'Unique text' },
            ];

            const result = filterOutDuplicates(ocrResults, 1);

            expect(result).toEqual([{ start: 0, text: 'Unique text' }]);
        });

        it('should not filter out similar but non-consecutive texts', () => {
            const ocrResults = [
                { start: 0, text: 'First unique text' },
                { start: 1, text: 'Another unique text' },
                { start: 2, text: 'First unique text' }, // Similar to first but non-consecutive
            ];

            const result = filterOutDuplicates(ocrResults);

            expect(result).toEqual(ocrResults);
        });
    });
});
