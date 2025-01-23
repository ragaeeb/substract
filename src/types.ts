import { CropOptions, Frame } from 'ffmpeg-simplified';

export enum OutputFormat {
    Json = 'json',
    Txt = 'txt',
}

export type AppleOcrOptions = {
    binaryPath: string;
    callbacks?: OcrCallbacks;
    concurrency?: number;
};

export interface Callbacks extends GenerateFramesCallbacks, OcrCallbacks {}

export type FrameOptions = {
    cropOptions?: CropOptions;
    frequency?: number;
};

export interface GenerateFramesCallbacks {
    onGenerateFramesFinished?: (frames: Frame[]) => Promise<void>;
    onGenerateFramesStarted?: (videoFile: string) => Promise<void>;
}

export interface OcrCallbacks {
    onOcrFinished?: (ocrResults: OcrResult[]) => void;
    onOcrProgress?: (frame: Frame, segmentIndex: number) => void;
    onOcrStarted?: (frames: Frame[]) => Promise<void>;
}

export type OCROptions = {
    appleBinaryPath: string;
};

export type OcrResult = {
    start: number;
    text: string;
};

export interface OutputOptions {
    outputFile: string;
}

export interface SubstractOptions {
    callbacks?: Callbacks;
    concurrency?: number;
    duplicateTextThreshold?: number;
    frameOptions?: FrameOptions;
    ocrOptions: OCROptions;
    outputOptions: OutputOptions;
}
