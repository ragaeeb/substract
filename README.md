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
- **Duplicate Frame Filtering**: Remove similar or consecutive duplicate frames to optimize processing.
- **OCR Integration**: Utilize Apple's OCR engine for accurate text recognition.
- **Concurrency Control**: Manage the number of concurrent OCR processes to balance performance and resource usage.
- **Customizable Options**: Tailor the extraction process with various configuration options.
- **Comprehensive Callbacks**: Hook into different stages of the extraction process for enhanced control and monitoring.
- **100% Test Coverage**: Robust unit tests ensure reliability and stability.

## Installation

Ensure you have **Node.js v20.0.0** or higher installed.

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
        appleBinaryPath: '/path/to/ocr/binary', // you can get this from https://github.com/glowinthedark/macOCR
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
    duplicateTextThreshold: 0.9, // Optional: Threshold for filtering duplicate text
    frameOptions: {
        cropOptions: { top: 10, bottom: 20 }, // Optional: Crop options for frame extraction
        frequency: 5, // Optional: Extract frames every 5 seconds
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

| Property                 | Type                      | Description                                                                                     |
| ------------------------ | ------------------------- | ----------------------------------------------------------------------------------------------- |
| `ocrOptions`             | `OCROptions`              | Options related to the OCR engine.                                                              |
| `outputOptions`          | `OutputOptions`           | Options related to the output file.                                                             |
| `callbacks`              | `Callbacks`               | Callback functions to hook into various stages of the extraction process.                       |
| `concurrency`            | `number` (optional)       | Limits the number of concurrent OCR processes. Default is `5`.                                  |
| `duplicateTextThreshold` | `number` (optional)       | Threshold for filtering duplicate text. Values range between `0` and `1`. Default is undefined. |
| `frameOptions`           | `FrameOptions` (optional) | Options for frame extraction, such as cropping and extraction frequency.                        |

#### `OCROptions`

| Property          | Type                      | Description                                    |
| ----------------- | ------------------------- | ---------------------------------------------- |
| `appleBinaryPath` | `string`                  | Path to the Apple OCR binary executable.       |
| `callbacks`       | `OcrCallbacks` (optional) | Callback functions specific to OCR processing. |
| `concurrency`     | `number` (optional)       | Number of concurrent OCR processes.            |

#### `OutputOptions`

| Property     | Type     | Description                                  |
| ------------ | -------- | -------------------------------------------- |
| `outputFile` | `string` | Path to save the OCR results in JSON format. |

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

This project is licensed under the [MIT License](LICENSE).

## Acknowledgements

The Apple OCR method requires the build of the tool from here: [macOCR](https://github.com/glowinthedark/macOCR)
