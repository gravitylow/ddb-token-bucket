import { CreateTableCommand, DeleteTableCommand, UpdateTimeToLiveCommand } from "@aws-sdk/client-dynamodb";

export const TEST_TABLE_NAME = "token-bucket";

export const CREATE_TEST_TABLE_COMMAND = new CreateTableCommand(
    {
        TableName: TEST_TABLE_NAME,
        AttributeDefinitions: [
            { AttributeName: "PK", AttributeType: "S" },
            { AttributeName: "SK", AttributeType: "S" },
        ],
        KeySchema: [
            { AttributeName: "PK", KeyType: "HASH" },
            { AttributeName: "SK", KeyType: "RANGE" },
        ],
        ProvisionedThroughput: {
            ReadCapacityUnits: 1,
            WriteCapacityUnits: 1,
        },
    }
);

export const UPDATE_TEST_TABLE_TTL_COMMAND = new UpdateTimeToLiveCommand(
    {
        TableName: TEST_TABLE_NAME,
        TimeToLiveSpecification: {
            Enabled: true,
            AttributeName: 'TtlTimestamp',
        }
    }
);

export const DELETE_TEST_TABLE_COMMAND = new DeleteTableCommand({ TableName: TEST_TABLE_NAME });
