import { Buffer } from 'node:buffer';
import pixelmatch from 'pixelmatch';
import sharp from 'sharp';

import { PIXEL_COMPARISON_SENSITIVITY, PIXEL_DIFFERENCE_THRESHOLD_PERCENTAGE } from './constants';

const mapImageToBuffer = (
    image: string,
): Promise<{
    data: Buffer;
    info: sharp.OutputInfo;
}> => sharp(image).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

type ImageSimilarityOptions = {
    pixelComparisonSensitivity?: number; // determines how different two pixels need to be in terms of color for them to be considered different. A lower value (e.g., 0.1) makes the comparison more sensitive to small differences in color. A higher value (closer to 1) would make the comparison more lenient, allowing more variance in pixel color before flagging them as different
    pixelDifferenceThresholdPercentage?: number; // represents the proportion of total pixels that can differ before you consider the images as different. This is about how many pixels differ, not how much each pixel differs
};

export const areImagesSimilar = async (
    image1: string,
    image2: string,
    {
        pixelComparisonSensitivity = PIXEL_COMPARISON_SENSITIVITY,
        pixelDifferenceThresholdPercentage = PIXEL_DIFFERENCE_THRESHOLD_PERCENTAGE,
    }: ImageSimilarityOptions = {},
): Promise<boolean> => {
    const [img1, img2] = await Promise.all([mapImageToBuffer(image1), mapImageToBuffer(image2)]);

    const { height, width } = img1.info;

    if (width !== img2.info.width || height !== img2.info.height) {
        throw new Error(
            `Images must have the same dimensions: width=(${img1.info.width}, ${img2.info.width}), height=(${img1.info.height}, ${img2.info.height})`,
        );
    }

    const totalPixels = width * height;
    const diffBuffer = Buffer.alloc(totalPixels * 4); // 4 channels for RGBA

    const numDiffPixels = pixelmatch(img1.data, img2.data, diffBuffer, width, height, {
        includeAA: false,
        threshold: pixelComparisonSensitivity,
    });

    const pixelDifferenceThreshold = totalPixels * pixelDifferenceThresholdPercentage;

    return numDiffPixels <= pixelDifferenceThreshold;
};
