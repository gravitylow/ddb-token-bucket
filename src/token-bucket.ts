import { ReadTokenBucket } from "./ddb/read-token-bucket";
import { UpdateTokenBucket } from "./ddb/update-token-bucket";
import { DdbTokenBucket } from "./ddb/token-bucket";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

export type TokenBucketConfig = {
    bucketId: string;
    capacity: number;
    refillRate: number;
};

export abstract class TokenBucket {

    static async shouldThrottle(ddb: DynamoDBDocumentClient, dynamoTableName: string, tokenBucketConfig: TokenBucketConfig): Promise<boolean> {
        const now = Date.now();

        const tokenBucket = await ReadTokenBucket.readTokenBucket(ddb, dynamoTableName, tokenBucketConfig.bucketId);
        if (tokenBucket !== undefined) {
            // Refill tokens based on elapsed time
            const now = Date.now();
            const elapsedSeconds = (now - tokenBucket.lastRefillTimestamp) / 1000;
            const newTokens = Math.min(tokenBucketConfig.capacity, tokenBucket.tokens + elapsedSeconds * tokenBucketConfig.refillRate);

            if (newTokens < 1) {
                // Not enough tokens, throttle
                console.warn('Throttling request to ' + tokenBucketConfig.bucketId + ' because there are only ' + newTokens + ' tokens available. lastRefillTimestamp = ' + tokenBucket.lastRefillTimestamp + ', tokensBefore = ' + tokenBucket.tokens + ', refillRate = ' + tokenBucketConfig.refillRate);
                return true;
            }
            const updatedTokenBucket = new DdbTokenBucket({
                tokenBucketId: tokenBucketConfig.bucketId,
                tokens: newTokens - 1,
                lastRefillTimestamp: now,
                ttlTimestamp: ((now / 1000)|0) + 100,
                version: tokenBucket.version + 1,
            });
            try {
                await UpdateTokenBucket.updateTokenBucket(ddb, dynamoTableName, updatedTokenBucket, tokenBucket.version);
            } catch (e) {
                console.warn(`Caught error when updating token bucket ${tokenBucketConfig.bucketId}, ignoring it:`, e);
            }
            return false;
        } else {
            // New request, create a token bucket for this key
            const newTokenBucket = new DdbTokenBucket({
                tokenBucketId: tokenBucketConfig.bucketId,
                tokens: tokenBucketConfig.capacity - 1,
                lastRefillTimestamp: now,
                ttlTimestamp: ((now / 1000)|0) + 100,
                version: 0,
            });
            try {
                await UpdateTokenBucket.createTokenBucket(ddb, dynamoTableName, newTokenBucket);
            } catch (e) {
                console.warn(`Caught error when creating token bucket ${tokenBucketConfig.bucketId}, ignoring it:`, e);
            }
            return false;
        }
    }
}
