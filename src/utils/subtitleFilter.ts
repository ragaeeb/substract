import { stringSimilarity } from 'string-similarity-js';

import type { OcrFrame, OcrLine, OcrResult, SubtitleFilterOptions, TextRegion } from '../types';

type Block = { box: TextRegion; lines: OcrLine[]; text: string };
type Track = { block: Block; occurrences: { block: Block; frame: number }[] };

const normalize = (text: string): string =>
    text
        .normalize('NFKC')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]/gu, '');
const contains = (region: TextRegion, box: TextRegion): boolean =>
    box.x + box.width / 2 >= region.x &&
    box.x + box.width / 2 <= region.x + region.width &&
    box.y + box.height / 2 >= region.y &&
    box.y + box.height / 2 <= region.y + region.height;

const validateRegion = (region: TextRegion): void => {
    if (
        ![region.x, region.y, region.width, region.height].every(Number.isFinite) ||
        region.x < 0 ||
        region.y < 0 ||
        region.width <= 0 ||
        region.height <= 0 ||
        region.x + region.width > 1 ||
        region.y + region.height > 1
    ) {
        throw new Error('Subtitle regions must fit within normalized frame coordinates (0..1)');
    }
};

const groupLines = (lines: OcrLine[]): Block[] => {
    const blocks: Block[] = [];
    for (const line of [...lines].sort((a, b) => a.box.y - b.box.y || a.box.x - b.box.x)) {
        const box = line.box;
        const block = blocks.find((candidate) => {
            const previous = candidate.lines[candidate.lines.length - 1].box;
            return (
                box.y - previous.y - previous.height <= Math.max(box.height, previous.height) * 0.8 &&
                box.x < candidate.box.x + candidate.box.width &&
                box.x + box.width > candidate.box.x
            );
        });
        if (!block) {
            blocks.push({ box: { ...box }, lines: [line], text: line.text });
        } else {
            const right = Math.max(block.box.x + block.box.width, box.x + box.width);
            const bottom = Math.max(block.box.y + block.box.height, box.y + box.height);
            block.box.x = Math.min(block.box.x, box.x);
            block.box.width = right - block.box.x;
            block.box.height = bottom - block.box.y;
            block.lines.push(line);
            block.text += ` ${line.text}`;
        }
    }
    return blocks;
};

const overlap = (a: TextRegion, b: TextRegion): number => {
    const width = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
    const height = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
    const intersection = width * height;
    return intersection / (a.width * a.height + b.width * b.height - intersection);
};

const sameBlock = (a: Block, b: Block): boolean =>
    overlap(a.box, b.box) >= 0.35 && stringSimilarity(normalize(a.text), normalize(b.text)) >= 0.5;

/** Filter observations before flattening: repeated text alone is never enough to discard a caption. */
export const filterSubtitleFrames = (frames: OcrFrame[], options: false | SubtitleFilterOptions = {}): OcrResult[] => {
    if (options !== false) {
        if (options.region) validateRegion(options.region);
        options.excludeRegions?.forEach((region) => {
            validateRegion(region);
            if (
                (region.start !== undefined && (!Number.isFinite(region.start) || region.start < 0)) ||
                (region.end !== undefined && (!Number.isFinite(region.end) || region.end < (region.start ?? 0)))
            ) {
                throw new Error('Excluded region times must be finite, nonnegative, and ordered');
            }
        });
        if (
            !Number.isFinite(options.maxLineHeight ?? 0.16) ||
            (options.maxLineHeight ?? 0.16) <= 0 ||
            (options.maxLineHeight ?? 0.16) > 1
        )
            throw new Error('maxLineHeight must be in (0, 1]');
    }
    const ordered = [...frames].sort((a, b) => a.start - b.start);
    const blocks = ordered.map((frame) =>
        groupLines(
            frame.lines.filter((line) => {
                if (!line.text.trim()) return false;
                if (options === false) return true;
                if (
                    options.excludeRegions?.some(
                        (region) =>
                            frame.start >= (region.start ?? 0) &&
                            frame.start < (region.end ?? Infinity) &&
                            contains(region, line.box),
                    )
                )
                    return false;
                if (options.region) return contains(options.region, line.box);
                const centerX = line.box.x + line.box.width / 2;
                if (line.box.y + line.box.height < 0.28 && line.box.width < 0.5 && (centerX < 0.25 || centerX > 0.75))
                    return false;
                return line.box.height <= (options.maxLineHeight ?? 0.16);
            }),
        ),
    );

    const noise = new Set<OcrLine>();
    const masks: { box: TextRegion; first: number; last: number }[] = [];
    if (options !== false && options.filterPersistentText !== false && !options.region) {
        const tracks: Track[] = [];
        // ponytail: scan spatial/text tracks; use a spatial index if long videos make this costly.
        blocks.forEach((frameBlocks, frame) => {
            frameBlocks.forEach((block) => {
                let track = tracks.find((candidate) => sameBlock(candidate.block, block));
                if (!track) {
                    track = { block, occurrences: [] };
                    tracks.push(track);
                }
                track.occurrences.push({ block, frame });
            });
        });
        for (const track of tracks) {
            const first = track.occurrences[0].frame;
            const last = track.occurrences[track.occurrences.length - 1].frame;
            const span = ordered[last].start - ordered[first].start;
            if (new Set(track.occurrences.map((occurrence) => occurrence.frame)).size < 5 || span < 10) continue;

            const contexts: string[] = [];
            for (const occurrence of track.occurrences) {
                const context = normalize(
                    blocks[occurrence.frame]
                        .filter((block) => block !== occurrence.block && block.box.width >= 0.4)
                        .map((block) => block.text)
                        .join(' '),
                );
                if (context.length >= 30 && !contexts.some((other) => stringSimilarity(context, other) >= 0.6)) {
                    contexts.push(context);
                }
                if (contexts.length >= 3) break;
            }
            // Require a separate, changing caption block so long-held questions and slides survive.
            if (contexts.length >= 3) {
                for (const { block } of track.occurrences) {
                    for (const line of block.lines) noise.add(line);
                }
                const box = track.occurrences
                    .map((occurrence) => occurrence.block.box)
                    .reduce((a, b) => {
                        const x = Math.min(a.x, b.x),
                            y = Math.min(a.y, b.y);
                        return {
                            height: Math.max(a.y + a.height, b.y + b.height) - y,
                            width: Math.max(a.x + a.width, b.x + b.width) - x,
                            x,
                            y,
                        };
                    });
                const atEdge = box.y + box.height < 0.28;
                masks.push({
                    box,
                    first: atEdge || ordered[first].start - ordered[0].start <= 10 ? 0 : first,
                    last:
                        atEdge || ordered[ordered.length - 1].start - ordered[last].start <= 10
                            ? ordered.length - 1
                            : last,
                });
            }
        }
        // OCR may split logos differently. Edge masks span the video; interior masks follow the observed lifespan.
        blocks.forEach((frameBlocks, i) => {
            frameBlocks.forEach((block) => {
                block.lines.forEach((line) => {
                    if (
                        masks.some(
                            (mask) =>
                                i >= mask.first &&
                                i <= mask.last &&
                                (contains(mask.box, line.box) || overlap(mask.box, line.box) >= 0.35),
                        )
                    )
                        noise.add(line);
                });
            });
        });
    }
    return ordered.map((frame, i) => ({
        start: frame.start,
        // Preserve blank frames as boundaries until consecutive text deduplication.
        text: blocks[i]
            .flatMap((block) => block.lines)
            .filter((line) => !noise.has(line))
            .sort((a, b) => a.box.y - b.box.y || a.box.x - b.box.x)
            .map((line) => line.text.trim().replace(/\s+/g, ' '))
            .join(' '),
    }));
};
