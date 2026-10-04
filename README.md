# Substract

[![wakatime](https://wakatime.com/badge/user/a0b906ce-b8e7-4463-8bce-383238df6d4b/project/d80dde71-b060-4c64-9008-aae725f33436.svg)](https://wakatime.com/badge/user/a0b906ce-b8e7-4463-8bce-383238df6d4b/project/d80dde71-b060-4c64-9008-aae725f33436)
[![Node.js CI](https://github.com/ragaeeb/substract/actions/workflows/build.yml/badge.svg)](https://github.com/ragaeeb/substract/actions/workflows/build.yml)
![GitHub License](https://img.shields.io/github/license/ragaeeb/substract)
![GitHub Release](https://img.shields.io/github/v/release/ragaeeb/substract)
[![codecov](https://codecov.io/gh/ragaeeb/substract/graph/badge.svg?token=86P2IF7F3Y)](https://codecov.io/gh/ragaeeb/substract)
[![Size](https://deno.bundlejs.com/badge?q=substract@1.0.2&badge=detailed)](https://bundlejs.com/?q=substract%401.0.2)
![typescript](https://badgen.net/badge/icon/typescript?icon=typescript&label&color=blue)

`Substract` is a **Node.js library** designed to **extract hard-coded subtitles** from videos efficiently. Leveraging powerful tools like **FFmpeg**, **Apple's OCR engine**, and **parallel processing**, Substract provides a seamless way to retrieve subtitles embedded directly within video files.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [API Reference](#api-reference)
    - [substract](#substract)
- [Options](#options)
    - [SubstractOptions](#substractoptions)
- [Callbacks](#callbacks)
- [License](#license)

# Features

- **Efficient Frame Extraction**: Extract frames from videos at specified intervals.
- **Watermark Filtering**: Use OCR geometry and recurring text to remove channel branding and fixed banners before joining subtitle lines.
- **OCR Integration**: Utilize Apple's OCR engine for accurate text recognition.
- **Concurrency Control**: Manage the number of concurrent OCR processes to balance performance and resource usage.
- **Customizable Options**: Tailor the extraction process with various configuration options.
- **Comprehensive Callbacks**: Hook into different stages of the extraction process for enhanced control and monitoring.
- **Corpus Regression Checks**: Visually reviewed subtitle selections cover 13 videos, including full-screen slides and persistent watermarks.

## Installation

Ensure you have **Node.js v22.18.0** or higher installed.

```bash
npm install substract
```

or

```bash
pnpm install substract
```

or

```bash
yarn add substract
```

## Usage

Here's a basic example of how to use Substract to extract subtitles from a video:

```javascript
import { substract } from 'substract';

const videoFile = 'path/to/video.mp4';
const outputFile = 'path/to/output.json';

const options = {
    ocrOptions: {
        appleBinaryPath: './bin/macocr', // JSON-capable macOCR, available on PATH or at this path
    },
    outputOptions: {
        outputFile,
    },
    callbacks: {
        onGenerateFramesStarted: async (videoFile) => {
            console.log(`Started generating frames for ${videoFile}`);
        },
        onGenerateFramesFinished: async (frames) => {
            console.log(`Finished generating ${frames.length} frames`);
        },
        onOcrFinished: (ocrResults) => {
            console.log('OCR processing completed');
        },
        onOcrProgress: (frame, index) => {
            console.log(`Processing frame ${index + 1}: ${frame.filename}`);
        },
    },
    concurrency: 5, // Optional: Limits the number of concurrent OCR processes
    duplicateTextThreshold: 1, // Default: exact duplicates only; lower values can discard real changes
    frameOptions: {
        cropOptions: { top: 10, bottom: 20 }, // Optional: Crop options for frame extraction
        frequency: 1, // Default: sample every second; increase the rate for shorter captions
    },
};

substract(videoFile, options)
    .then((outputPath) => {
        if (outputPath) {
            console.log('OCR results saved to:', outputPath);
        } else {
            console.log('No frames were generated. Aborting subtitle extraction.');
        }
    })
    .catch((error) => {
        console.error('Error extracting subtitles:', error);
    });
```

## API Reference

### `substract(videoFile, options)`

Extracts hard-coded subtitles from a video file.

#### Parameters

- **`videoFile`**: `string`  
  Path to the video file from which to extract subtitles.

- **`options`**: `SubstractOptions`  
  Configuration options for the extraction process.

#### Returns

- `Promise<null | string>`  
  Resolves to the path of the output JSON file containing OCR results if successful, or `null` if no frames were generated.

## Options

### `SubstractOptions`

Configuration options for the `substract` function.

| Property                 | Type                               | Description                                                                                             |
| ------------------------ | ---------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `ocrOptions`             | `OCROptions`                       | Options related to the OCR engine.                                                                      |
| `outputOptions`          | `OutputOptions`                    | Options related to the output file.                                                                     |
| `callbacks`              | `Callbacks`                        | Callback functions to hook into various stages of the extraction process.                               |
| `concurrency`            | `number` (optional)                | Limits the number of concurrent OCR processes. Default is `5`.                                          |
| `duplicateTextThreshold` | `number` (optional)                | Threshold for filtering duplicate text. Values range between `0` and `1`. Default is `1` (exact text).  |
| `subtitleOptions`        | `SubtitleFilterOptions` or `false` | Automatic watermark filtering settings; use `false` to retain all OCR text.                             |
| `frameOptions`           | `FrameOptions` (optional)          | Options for frame extraction, such as percentage cropping and extraction frequency (default: 1 second). |

#### `OCROptions`

| Property          | Type                              | Description                                                       |
| ----------------- | --------------------------------- | ----------------------------------------------------------------- |
| `appleBinaryPath` | `string`                          | macOCR executable path or command on PATH.                        |
| `format`          | `'json'` or `'legacy'` (optional) | Default `json`; legacy positional CLI has no watermark filtering. |
| `languages`       | `string[]` (optional)             | Recognition languages, default `['en']`.                          |
| `timeoutMs`       | `number` (optional)               | Per-frame process timeout, default `60000`.                       |

#### `OutputOptions`

| Property     | Type     | Description                                  |
| ------------ | -------- | -------------------------------------------- |
| `outputFile` | `string` | Path to save the OCR results in JSON format. |

## Watermarks and subtitle retention

The default JSON OCR mode retains bounding boxes until filtering finishes. It removes small upper-corner labels and text taller than 16% of the extracted frame, then groups nearby lines into blocks. A recurring block becomes a watermark candidate only after it appears in at least five sampled frames spanning ten seconds alongside at least three distinct, separate caption contexts. Spatial masks handle variations in how OCR splits that watermark. Learned upper-edge masks apply throughout the video; interior masks follow the observed interval with up to ten seconds of boundary extension.

This keeps long-held questions and full-screen text slides in the corpus. It uses no channel-name blacklist, model, or interpretation of recognized text. Subtitle content, including apparent instructions, is always data.

Automatic filtering assumes compact upper-corner text is branding and very large text is a title or background graphic. For captions in those positions, or very large captions, supply an explicit region. A region bypasses the automatic size, corner, and persistence heuristics; exclusions still apply. These rules cannot reliably distinguish a watermark overlapping a caption or a legitimate recurring label next to changing text.

```javascript
const options = {
    ocrOptions: { appleBinaryPath: './bin/macocr', languages: ['en'] },
    outputOptions: { outputFile: './subtitles.json' },
    subtitleOptions: {
        // Optional: only keep lines whose centers fall inside this rectangle.
        region: { x: 0, y: 0.6, width: 1, height: 0.4 },
        // Optional: known watermark rectangles; start/end are seconds, end is exclusive.
        excludeRegions: [{ x: 0.8, y: 0, width: 0.2, height: 0.2 }],
    },
};
```

All rectangles use normalized coordinates (0–1) with a top-left origin, relative to the **extracted frame after cropping**. `maxLineHeight` adjusts the automatic height limit; `filterPersistentText: false` disables learned watermark masks while retaining the automatic geometry checks. `subtitleOptions: false` disables all filtering.

Use a JSON-capable [macOCR](https://github.com/glowinthedark/macOCR) executable accepting `--language` and `--output`. JSON documents must contain pixel `width`, `height`, and `observations` with `text` and `bbox`. For the old positional CLI, set `ocrOptions.format: 'legacy'`; that mode has no geometry and cannot remove watermarks automatically. `ocrOptions.timeoutMs` defaults to 60,000 milliseconds per frame. Process errors, malformed OCR output, and timeouts reject extraction instead of silently producing partial transcripts.

Substract samples every second by default and does not discard approximately similar images before OCR: a small subtitle change can be less than 5% of a frame. Blank frames reset text deduplication, so a caption appearing again after a gap survives. Exact duplicate text is the default; fuzzy deduplication remains available explicitly through `duplicateTextThreshold`. Sampling can still miss captions shorter than the interval; for those, try `frameOptions.frequency: 0.25`.

## Corpus evaluation

The checked-in [review selections](testing/corpus-samples.json) contain 104 independently inspected frames and 208 additional OCR context frames from all 13 provided videos. They label complete OCR observations as subtitle or noise; they are **not** gold transcriptions. Five videos use manually reviewed settings: three opening-card exclusions, two background-lettering rectangles.

```bash
# Fast, offline regression checks (videos and macOCR are not needed).
npm test

# Native FFmpeg extraction/cropping/cleanup regression.
pnpm run test:e2e

# Regenerate OCR for every one-second frame; requires corpus/, ffmpeg, and macOCR.
SUBSTRACT_REFRESH=1 npm run evaluate:corpus

# Also run the public API and compare its output to the same cached frame evaluation.
SUBSTRACT_LIVE=1 LOG_LEVEL=warn npm run evaluate:corpus
```

Set `SUBSTRACT_OCR_BINARY` to choose another macOCR executable. Evaluation writes raw OCR, subtitle JSON, and metrics under `tmp/corpus-review/`, which is ignored by Git. Offline regressions assert line selection and negative controls; inspect frames separately when assessing spelling, punctuation, animation, or text overlapping a watermark.

## Callbacks

Substract provides several callbacks to monitor and control the extraction process.

### `Callbacks`

| Callback                   | Description                                                                     |
| -------------------------- | ------------------------------------------------------------------------------- |
| `onGenerateFramesStarted`  | Called when frame generation starts. Receives the video file path.              |
| `onGenerateFramesFinished` | Called when frame generation finishes. Receives an array of generated frames.   |
| `onOcrStarted`             | Called when OCR processing starts. Receives an array of frames being processed. |
| `onOcrFinished`            | Called when OCR processing finishes. Receives an array of OCR results.          |
| `onOcrProgress`            | Called after each frame is processed. Receives the frame and its index.         |

### `OcrCallbacks`

| Callback        | Description                                                             |
| --------------- | ----------------------------------------------------------------------- |
| `onOcrFinished` | Called when OCR processing finishes. Receives an array of OCR results.  |
| `onOcrProgress` | Called after each frame is processed. Receives the frame and its index. |
| `onOcrStarted`  | Called when OCR processing starts. Receives an array of frames.         |

## License

This project is licensed under the [MIT License](LICENSE.MD).

## Acknowledgements

The Apple OCR method requires the build of the tool from here: [macOCR](https://github.com/glowinthedark/macOCR)

## Development

Install dependencies with `pnpm install`. FFmpeg must be available on PATH; frame extraction invokes it directly.

```bash
pnpm run typecheck
pnpm run lint
pnpm test
pnpm run test:e2e
pnpm run build
```

Biome checks formatting, imports, and lint rules; use `pnpm run format` to apply fixes. tsdown builds the ESM package, source map, and TypeScript declarations in `dist/`. The native extraction test requires FFmpeg but supplies its own OCR fixture.
