import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { ConditionalCheckFailedException, DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DdbTokenBucket } from "./token-bucket";
import { ReadTokenBucket } from "./read-token-bucket";
import { UpdateTokenBucket } from "./update-token-bucket";
import {
    CREATE_TEST_TABLE_COMMAND,
    DELETE_TEST_TABLE_COMMAND,
    TEST_TABLE_NAME,
    UPDATE_TEST_TABLE_TTL_COMMAND
} from "../constants";

let ddb: DynamoDBDocumentClient;

beforeAll(async () => {
    const dynamo = new DynamoDBClient({
        endpoint: process.env.MOCK_DYNAMODB_ENDPOINT,
        region: "local",
        credentials: {
            accessKeyId: "accessKeyId",
            secretAccessKey: "secretAccessKey",
        },
    });
    ddb = DynamoDBDocumentClient.from(dynamo, {
        marshallOptions: {
            removeUndefinedValues: true,
        },
    });
});

beforeEach(async () => {
    await ddb.send(CREATE_TEST_TABLE_COMMAND);
    await ddb.send(UPDATE_TEST_TABLE_TTL_COMMAND);
});
afterEach(async () => {
    await ddb.send(DELETE_TEST_TABLE_COMMAND);
});

afterAll(async () => {
    ddb.destroy();
});

const tokenBucket1Id = "abc123";
const tokenBucket2Id = "def456";

const creationTime1 = Date.now();
const updateTime1 = creationTime1 + 5;
const expirationTime1 = updateTime1 + 100;
const creationTime2 = Date.now() + 10;
const updateTime2 = creationTime2 + 10;
const expirationTime2 = updateTime2 + 100;
const tokenBucket1Initial = new DdbTokenBucket({
    tokenBucketId: tokenBucket1Id,
    tokens: 5,
    lastRefillTimestamp: creationTime1,
    ttlTimestamp: expirationTime1,
    version: 0,
});
const tokenBucket2Initial = new DdbTokenBucket({
    tokenBucketId: tokenBucket2Id,
    tokens: 100,
    lastRefillTimestamp: creationTime2,
    ttlTimestamp: expirationTime2,
    version: 1,
});

test('create update read token bucket', async () => {
    const tokenBucketBeforeCreate = await ReadTokenBucket.readTokenBucket(ddb, TEST_TABLE_NAME, tokenBucket1Id);
    expect(tokenBucketBeforeCreate).toBeUndefined();

    const tokenBucketAtCreate = await UpdateTokenBucket.createTokenBucket(ddb, TEST_TABLE_NAME, tokenBucket1Initial);
    expect(tokenBucketAtCreate).toEqual(tokenBucket1Initial);

    // Can't create duplicates
    await expect(async () => await UpdateTokenBucket.createTokenBucket(ddb, TEST_TABLE_NAME, tokenBucket1Initial)).rejects.toThrow(ConditionalCheckFailedException);

    const tokenBucketAfterCreate = await ReadTokenBucket.readTokenBucket(ddb, TEST_TABLE_NAME, tokenBucket1Id);
    expect(tokenBucketAfterCreate).toEqual(tokenBucket1Initial);

    const updatedTokenBucket = new DdbTokenBucket({
        tokenBucketId: tokenBucket1Id,
        tokens: 4,
        lastRefillTimestamp: updateTime1,
        ttlTimestamp: expirationTime2,
        version: 1,
    });

    // Can't update with the wrong version number
    await expect(async () => await UpdateTokenBucket.updateTokenBucket(ddb, TEST_TABLE_NAME, updatedTokenBucket, 1)).rejects.toThrow(ConditionalCheckFailedException);

    // Can't update a token bucket which doesn't exist
    await expect(async () => await UpdateTokenBucket.updateTokenBucket(ddb, TEST_TABLE_NAME, tokenBucket2Initial, 0)).rejects.toThrow(ConditionalCheckFailedException);

    // Can update with correct version number
    const tokenBucketAtUpdate = await UpdateTokenBucket.updateTokenBucket(ddb, TEST_TABLE_NAME, updatedTokenBucket, 0);
    expect(tokenBucketAtUpdate.tokenBucketId).toEqual(updatedTokenBucket.tokenBucketId);
    expect(tokenBucketAtUpdate.tokens).toEqual(updatedTokenBucket.tokens);
    expect(tokenBucketAtUpdate.lastRefillTimestamp).toEqual(updatedTokenBucket.lastRefillTimestamp);
    expect(tokenBucketAtUpdate.ttlTimestamp).toEqual(updatedTokenBucket.ttlTimestamp);
    expect(tokenBucketAtUpdate.version).toEqual(updatedTokenBucket.version);

    // Can create another token bucket with a different ID
    const tokenBucket2BeforeCreate = await ReadTokenBucket.readTokenBucket(ddb, TEST_TABLE_NAME, tokenBucket2Id);
    expect(tokenBucket2BeforeCreate).toBeUndefined();

    const tokenBucket2AtCreate = await UpdateTokenBucket.createTokenBucket(ddb, TEST_TABLE_NAME, tokenBucket2Initial);
    expect(tokenBucket2AtCreate).toEqual(tokenBucket2Initial);

    const tokenBucket2AfterCreate = await ReadTokenBucket.readTokenBucket(ddb, TEST_TABLE_NAME, tokenBucket2Id);
    expect(tokenBucket2AfterCreate).toEqual(tokenBucket2Initial);
});
