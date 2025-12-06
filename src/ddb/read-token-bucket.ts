import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { DdbTokenBucket } from "./token-bucket";

export abstract class ReadTokenBucket {

    static async readTokenBucket(ddb: DynamoDBDocumentClient,
                                 tableName: string,
                                 bucketId: string): Promise<DdbTokenBucket | undefined> {
        const command = new GetCommand({
            TableName: tableName,
            Key: {
                'PK': `TOKEN_BUCKET#${bucketId}`,
                'SK': 'TOKEN_BUCKET',
            }
        });

        return ddb.send(command).then(output => {
            if (output.Item == undefined) {
                return undefined;
            } else {
                return DdbTokenBucket.fromItem(output.Item);
            }
        }, error => {
            throw error;
        });
    }
}
