import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { areImagesSimilar } from './imageUtils';

describe('imageUtils', () => {
    describe('areImagesSimilar', () => {
        it('should determine that the images are the same', async () => {
            const actual = await areImagesSimilar(
                path.join('testing', 'frame_0003.jpg'),
                path.join('testing', 'frame_0004.jpg'),
            );
            expect(actual).toBe(true);
        });

        it('should determine the images are different', async () => {
            const actual = await areImagesSimilar(
                path.join('testing', 'frame_0004.jpg'),
                path.join('testing', 'frame_0005.jpg'),
            );
            expect(actual).toBe(false);
        });
    });
});
