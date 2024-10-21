import { CropOptions, Frame } from 'ffmpeg-simplified';

export type OcrResult = {
    start: number;
    text: string;
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

export interface Callbacks extends GenerateFramesCallbacks, OcrCallbacks {}

export enum OutputFormat {
    Json = 'json',
}

export interface OutputOptions {
    outputFile: string;
}

export type FrameOptions = {
    cropOptions?: CropOptions;
    frequency?: number;
};

export type AppleOcrOptions = {
    callbacks?: OcrCallbacks;
    concurrency?: number;
};

export interface SubstractOptions {
    callbacks?: Callbacks;
    concurrency?: number;
    duplicateTextThreshold?: number;
    frameOptions?: FrameOptions;
    outputOptions: OutputOptions;
}
