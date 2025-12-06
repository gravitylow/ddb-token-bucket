import { DynamoDBDocumentClient, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { DdbTokenBucket } from "./token-bucket";

export abstract class UpdateTokenBucket {

    static createTokenBucket(ddb: DynamoDBDocumentClient,
                             tableName: string,
                             tokenBucket: DdbTokenBucket): Promise<DdbTokenBucket> {
        const command = new PutCommand({
            TableName: tableName,
            Item: tokenBucket.toItem(),
            Expected: {
                'PK': {
                    Exists: false
                }
            }
        });

        return ddb.send(command).then(_ => {
            return tokenBucket;
        }, error => {
            throw error;
        });
    }

    static updateTokenBucket(ddb: DynamoDBDocumentClient,
                             tableName: string,
                             tokenBucket: DdbTokenBucket,
                             expectedVersion: number,): Promise<DdbTokenBucket> {
        const command = new UpdateCommand({
            TableName: tableName,
            Key: tokenBucket.getKey(),
            UpdateExpression: 'set #tokens = :tokens, ' +
                '#lastRefillTimestamp = :lastRefillTimestamp, ' +
                '#ttlTimestamp = :ttlTimestamp, ' +
                '#version = :newVersion',
            ConditionExpression: "#version = :currentVersion",
            ExpressionAttributeNames: {
                '#tokens': 'Tokens',
                '#lastRefillTimestamp': 'LastRefillTimestamp',
                '#ttlTimestamp': 'TtlTimestamp',
                '#version': 'Version',
            },
            ExpressionAttributeValues: {
                ":tokens": tokenBucket.tokens,
                ":lastRefillTimestamp": tokenBucket.lastRefillTimestamp,
                ":ttlTimestamp": tokenBucket.ttlTimestamp,
                ":currentVersion": expectedVersion,
                ":newVersion": expectedVersion + 1,
            },
            ReturnValues: "ALL_NEW",
        });

        return ddb.send(command).then(output => {
            return DdbTokenBucket.fromItem(output.Attributes!!);
        }, error => {
            throw error;
        });
    }
}
