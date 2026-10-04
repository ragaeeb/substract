/** Legacy type-only preset names; extraction uses explicit crop percentages. */
export declare enum CropPreset {
    HorizontallyCenteredText = 'HorizontallyCenteredText',
    VerticallyCenteredText = 'VerticallyCenteredText',
    BottomText = 'BottomText',
    TopText = 'TopText',
}

/** Percentages removed from each edge of the video frame. */
export type CropOptions = { bottom?: number; left?: number; right?: number; top?: number };

export type Frame = { filename: string; start: number };

export enum OutputFormat {
    Json = 'json',
    Txt = 'txt',
}

export type AppleOcrOptions = {
    binaryPath: string;
    callbacks?: OcrCallbacks;
    concurrency?: number;
    format?: 'json' | 'legacy';
    languages?: string[];
    subtitleOptions?: false | SubtitleFilterOptions;
    timeoutMs?: number;
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

export type OcrFrame = {
    lines: OcrLine[];
    start: number;
};

export type OcrLine = {
    box: TextRegion;
    text: string;
};

export type OCROptions = {
    appleBinaryPath: string;
    format?: 'json' | 'legacy';
    languages?: string[];
    timeoutMs?: number;
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
    subtitleOptions?: false | SubtitleFilterOptions;
}

export type SubtitleFilterOptions = {
    excludeRegions?: (TextRegion & { end?: number; start?: number })[];
    filterPersistentText?: boolean;
    maxLineHeight?: number;
    region?: TextRegion;
};

/** Normalized coordinates (0..1), relative to the extracted frame, with a top-left origin. */
export type TextRegion = {
    height: number;
    width: number;
    x: number;
    y: number;
};
