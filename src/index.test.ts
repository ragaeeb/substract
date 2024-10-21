import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';

import { substract } from './index.js';

describe('index', () => {
    describe('substract', () => {
        it(
            'should process the transcription successfully and not delete the temporary folder where the output was generated',
            async () => {
                const result = await substract('testing/v.mp4', { outputOptions: { outputFile: 'testing/v.json' } });
                console.log('resultx', result);
            },
            { timeout: 30000 },
        );
    });
});
