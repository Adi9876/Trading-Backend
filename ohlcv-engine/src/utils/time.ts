export function getBucketFloorTimestamp(timestampMs: number, bucketSizeMin: number = 1): number {

    const bucketMs = bucketSizeMin * 60 * 1000;
    return Math.floor(timestampMs / bucketMs) * bucketMs;
}

