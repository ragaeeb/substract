import { execFile } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import type { Frame, FrameOptions } from '../types';

export const getFrames = async (
    videoFile: string,
    options: FrameOptions & { frequency: number; outputFolder: string },
): Promise<Frame[]> => {
    const { bottom = 0, left = 0, right = 0, top = 0 } = options.cropOptions ?? {};
    if (
        ![bottom, left, right, top].every((value) => Number.isFinite(value) && value >= 0 && value < 100) ||
        top + bottom >= 100 ||
        left + right >= 100
    )
        throw new Error('Crop percentages must leave a positive frame area');
    const filters = [`fps=1/${options.frequency}`];
    if (options.cropOptions) {
        filters.push(
            `crop=iw*${1 - (left + right) / 100}:ih*${1 - (top + bottom) / 100}:iw*${left / 100}:ih*${top / 100}`,
        );
    }
    await promisify(execFile)('ffmpeg', [
        '-nostdin',
        '-v',
        'error',
        '-i',
        path.resolve(videoFile),
        '-vf',
        filters.join(','),
        '-start_number',
        '0',
        path.join(options.outputFolder, 'frame_%08d.jpg'),
    ]);
    return (await readdir(options.outputFolder))
        .filter((name) => /^frame_\d+\.jpg$/.test(name))
        .sort()
        .map((name) => ({
            filename: path.join(options.outputFolder, name),
            start: Number(name.slice('frame_'.length, -'.jpg'.length)) * options.frequency,
        }));
};
