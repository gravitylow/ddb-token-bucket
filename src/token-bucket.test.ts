import { ReadTokenBucket } from "./ddb/read-token-bucket";
import { UpdateTokenBucket } from "./ddb/update-token-bucket";
import { DdbTokenBucket } from "./ddb/token-bucket";
import { TokenBucket } from "./token-bucket";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import {TEST_TABLE_NAME} from "./constants";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient());

test('creates new token bucket', async () => {
    const mockReadBucket = jest.fn().mockReturnValue(Promise.resolve(undefined));
    ReadTokenBucket.readTokenBucket = mockReadBucket;

    const mockCreateBucket = jest.fn().mockReturnValue(Promise.resolve(undefined));
    UpdateTokenBucket.createTokenBucket = mockCreateBucket;

    const config = {
        bucketId: "test-bucket",
        capacity: 10,
        refillRate: 1,
    };

    expect(await TokenBucket.shouldThrottle(ddb, TEST_TABLE_NAME, config)).toBe(false);

    expect(mockReadBucket).toHaveBeenCalledWith(ddb, TEST_TABLE_NAME, config.bucketId);
    expect(mockCreateBucket).toHaveBeenCalledWith(ddb, TEST_TABLE_NAME, expect.objectContaining({
        tokenBucketId: config.bucketId,
        tokens: 9,
        version: 0,
    }));
});

test('ignores errors when creating new token bucket', async () => {
    const mockReadBucket = jest.fn().mockReturnValue(Promise.resolve(undefined));
    ReadTokenBucket.readTokenBucket = mockReadBucket;

    const mockCreateBucket = jest.fn().mockReturnValue(Promise.reject('oof'));
    UpdateTokenBucket.createTokenBucket = mockCreateBucket;

    const config = {
        bucketId: "test-bucket",
        capacity: 10,
        refillRate: 1,
    };

    expect(await TokenBucket.shouldThrottle(ddb, TEST_TABLE_NAME, config)).toBe(false);

    expect(mockReadBucket).toHaveBeenCalledWith(ddb, TEST_TABLE_NAME, config.bucketId);
    expect(mockCreateBucket).toHaveBeenCalledWith(ddb, TEST_TABLE_NAME, expect.objectContaining({
        tokenBucketId: config.bucketId,
        tokens: 9,
        version: 0,
    }));
});

test('updates existing token bucket', async () => {
    const initialTokenBucket = new DdbTokenBucket({
        tokenBucketId: "test-bucket",
        tokens: 5,
        lastRefillTimestamp: new Date().getTime() - (100 * 1000),
        ttlTimestamp: (new Date().getTime() / 1000) + 100,
        version: 0,
    });

    const mockReadBucket = jest.fn().mockReturnValue(Promise.resolve(initialTokenBucket));
    ReadTokenBucket.readTokenBucket = mockReadBucket;

    const mockUpdateBucket = jest.fn().mockReturnValue(Promise.resolve(undefined));
    UpdateTokenBucket.updateTokenBucket = mockUpdateBucket;

    const config = {
        bucketId: "test-bucket",
        capacity: 10,
        refillRate: 1,
    };

    expect(await TokenBucket.shouldThrottle(ddb, TEST_TABLE_NAME, config)).toBe(false);

    expect(mockReadBucket).toHaveBeenCalledWith(ddb, TEST_TABLE_NAME, config.bucketId);
    expect(mockUpdateBucket).toHaveBeenCalledWith(ddb, TEST_TABLE_NAME, expect.objectContaining({
        tokenBucketId: config.bucketId,
        tokens: 9,
        version: 1,
    }), 0);
});

test('catches errors updating existing token bucket', async () => {
    const initialTokenBucket = new DdbTokenBucket({
        tokenBucketId: "test-bucket",
        tokens: 5,
        lastRefillTimestamp: new Date().getTime() - (100 * 1000),
        ttlTimestamp: (new Date().getTime() / 1000) + 100,
        version: 0,
    });

    const mockReadBucket = jest.fn().mockReturnValue(Promise.resolve(initialTokenBucket));
    ReadTokenBucket.readTokenBucket = mockReadBucket;

    const mockUpdateBucket = jest.fn().mockReturnValue(Promise.reject('oof'));
    UpdateTokenBucket.updateTokenBucket = mockUpdateBucket;

    const config = {
        bucketId: "test-bucket",
        capacity: 10,
        refillRate: 1,
    };

    expect(await TokenBucket.shouldThrottle(ddb, TEST_TABLE_NAME, config)).toBe(false);

    expect(mockReadBucket).toHaveBeenCalledWith(ddb, TEST_TABLE_NAME, config.bucketId);
    expect(mockUpdateBucket).toHaveBeenCalledWith(ddb, TEST_TABLE_NAME, expect.objectContaining({
        tokenBucketId: config.bucketId,
        tokens: 9,
        version: 1,
    }), 0);
});

test('throttles requests', async () => {
    const initialTokenBucket = new DdbTokenBucket({
        tokenBucketId: "test-bucket",
        tokens: 0,
        lastRefillTimestamp: new Date().getTime(),
        ttlTimestamp: (new Date().getTime() / 1000) + 100,
        version: 0,
    });

    const mockReadBucket = jest.fn().mockReturnValue(Promise.resolve(initialTokenBucket));
    ReadTokenBucket.readTokenBucket = mockReadBucket;

    const mockUpdateBucket = jest.fn().mockReturnValue(Promise.resolve(undefined));
    UpdateTokenBucket.updateTokenBucket = mockUpdateBucket;

    const config = {
        bucketId: "test-bucket",
        capacity: 10,
        refillRate: 1,
    };

    expect(await TokenBucket.shouldThrottle(ddb, TEST_TABLE_NAME, config)).toBe(true);

    expect(mockReadBucket).toHaveBeenCalledWith(ddb, TEST_TABLE_NAME, config.bucketId);
    expect(mockUpdateBucket).not.toHaveBeenCalled();
});
