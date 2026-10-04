import { execFile } from 'node:child_process';
import console from 'node:console';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';
import { substract } from '../src/index';
import { parseAppleOcr } from '../src/ocr/apple';
import type { SubtitleFilterOptions } from '../src/types';
import { filterOutDuplicates } from '../src/utils/postProcessing';
import { filterSubtitleFrames } from '../src/utils/subtitleFilter';

const exec = promisify(execFile);
type CorpusCase = { options: SubtitleFilterOptions; samples: Sample[]; videoId: string };
type Sample = { document: { observations: { text: string }[] }; start: number; subtitleLines: number[] };
const cases: CorpusCase[] = JSON.parse(await readFile('testing/corpus-samples.json', 'utf8'));
const root = 'tmp/corpus-review';
const binary = process.env.SUBSTRACT_OCR_BINARY ?? 'macocr';
await mkdir(root, { recursive: true });
const videos = (await readdir('corpus')).filter((name) => name.endsWith('.mp4')).sort();
const report = [];
// Match complete observations in reading order, not substrings (a noise glyph "a" occurs inside many real words).
const selectedIndices = (text: string, lines: { text: string }[]): Set<number> => {
    const selected = new Set<number>();
    let remaining = text;
    while (remaining) {
        const match = lines
            .map((line, index) => ({ index, text: line.text.trim().replace(/\s+/g, ' ') }))
            .filter(
                (line) =>
                    line.text &&
                    !selected.has(line.index) &&
                    (remaining === line.text || remaining.startsWith(`${line.text} `)),
            )
            .sort((a, b) => b.text.length - a.text.length)[0];
        if (!match) throw new Error('Filtered text cannot be mapped to complete input observations');
        selected.add(match.index);
        remaining = remaining.slice(match.text.length).trimStart();
    }
    return selected;
};
for (const item of cases) {
    const name = videos.find((name) => name.endsWith(`[${item.videoId}].mp4`));
    if (!name) throw new Error(`Missing corpus video: ${item.videoId}`);
    const video = path.join('corpus', name);
    const rawPath = `${root}/${item.videoId}-full.json`;
    if (process.env.SUBSTRACT_REFRESH === '1') {
        const folder = `${root}/${item.videoId}-full`;
        await rm(folder, { force: true, recursive: true });
        await mkdir(folder, { recursive: true });
        await exec('ffmpeg', [
            '-v',
            'error',
            '-i',
            video,
            '-vf',
            'fps=1',
            '-start_number',
            '0',
            '-y',
            `${folder}/frame_%04d.jpg`,
        ]);
        await exec(binary, ['--language', 'en', '--output', rawPath, folder], { maxBuffer: 10 * 1024 * 1024 });
    }
    const raw: Record<string, unknown> = JSON.parse(await readFile(rawPath, 'utf8'));
    const fullFrames = Object.entries(raw).map(([name, document]) => ({
        lines: parseAppleOcr(document),
        start: Number(name.match(/\d+/)?.[0]),
    }));
    const frames = [
        ...fullFrames,
        ...item.samples.map((sample) => ({
            lines: parseAppleOcr(sample.document),
            start: sample.start + 0.001,
        })),
    ];
    let baselineNoise = 0,
        kept = 0,
        lost = 0,
        noise = 0;
    const cleaned = filterSubtitleFrames(frames, item.options);
    const defaults = filterSubtitleFrames(frames);
    let defaultLost = 0,
        defaultNoise = 0;
    for (const sample of item.samples) {
        const result = cleaned.find((frame) => frame.start === sample.start + 0.001);
        const defaultResult = defaults.find((frame) => frame.start === sample.start + 0.001);
        if (!result || !defaultResult) throw new Error(`Missing evaluated sample: ${item.videoId} at ${sample.start}`);
        const lines = sample.document.observations;
        const defaultSelected = selectedIndices(defaultResult.text, lines),
            selected = selectedIndices(result.text, lines);
        kept += sample.subtitleLines.filter((index) => selected.has(index)).length;
        lost += sample.subtitleLines.filter((index) => !selected.has(index)).length;
        baselineNoise += lines.length - sample.subtitleLines.length;
        noise += [...selected].filter((index) => !sample.subtitleLines.includes(index)).length;
        defaultNoise += [...defaultSelected].filter((index) => !sample.subtitleLines.includes(index)).length;
        defaultLost += sample.subtitleLines.filter((index) => !defaultSelected.has(index)).length;
    }
    const output = filterOutDuplicates(filterSubtitleFrames(fullFrames, item.options));
    await writeFile(`${root}/${item.videoId}-subtitles.json`, `${JSON.stringify(output, null, 2)}\n`);
    if (process.env.SUBSTRACT_LIVE === '1') {
        await substract(video, {
            ocrOptions: { appleBinaryPath: binary },
            outputOptions: { outputFile: `${root}/${item.videoId}-production.json` },
            subtitleOptions: item.options,
        });
        const actual = JSON.parse(await readFile(`${root}/${item.videoId}-production.json`, 'utf8'));
        if (JSON.stringify(actual) !== JSON.stringify(output)) {
            throw new Error(`Public API output differs from cached frame evaluation: ${item.videoId}`);
        }
    }
    report.push({
        baselineNoise,
        defaultLost,
        defaultNoise,
        frames: fullFrames.length,
        id: item.videoId,
        kept,
        lost,
        noise,
        subtitles: output.length,
    });
    console.log(
        `${item.videoId}: ${fullFrames.length} frames; ${noise} noise lines / ${lost} lost subtitle lines in reviewed samples`,
    );
}
await writeFile(`${root}/report.json`, `${JSON.stringify(report, null, 2)}\n`);
console.table(report);
if (report.some((row) => row.noise || row.lost)) process.exitCode = 1;
