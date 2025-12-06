# ddb-token-bucket

A generic Token Bucket rate limiting implementation in Typescript using DynamoDB as the backend. This library provides a distributed rate limiting solution that works across multiple instances of an application.

## Prerequisites

### DynamoDB Table Setup

The library supports a table with a key schema of `PK` (Hash) and `SK` (Range), and uses the `TtlTimestamp` attribute to expire token buckets after they have been unchanged for 100 seconds or more.

Example AWS CLI command to create the table:

```bash
aws dynamodb create-table \
  --table-name token-buckets \
  --attribute-definitions \
    AttributeName=PK,AttributeType=S \
    AttributeName=SK,AttributeType=S \
  --key-schema \
    AttributeName=PK,KeyType=HASH \
    AttributeName=SK,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --time-to-live-specification Enabled=true,AttributeName=TtlTimestamp
```

## Usage

```typescript
import { TokenBucket, TokenBucketConfig } from 'ddb-token-bucket';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

// Initialize DynamoDB client
const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });
const ddb = DynamoDBDocumentClient.from(dynamoClient);

// Configure your token bucket
const config: TokenBucketConfig = {
  bucketId: 'user-123',        // Unique identifier for this bucket
  capacity: 100,               // Maximum number of tokens
  refillRate: 10,              // Tokens per second
};

// Check if request should be throttled
const shouldThrottle = await TokenBucket.shouldThrottle(
  ddb,
  'token-buckets',  // Your DynamoDB table name
  config
);

if (shouldThrottle) {
  // Rate limit exceeded - reject the request
  return { statusCode: 429, body: 'Too Many Requests' };
} else {
  // Proceed with the request
  // Process your request...
}
```

## How It Works

The [token bucket](https://en.wikipedia.org/wiki/Token_bucket) algorithm allows throttling requests on one or many dimensions with separate Burst and Sustained rates:
1. **Initialization**: When a bucket is first created, it starts with `capacity - 1` tokens
2. **Token Consumption**: Each call to `shouldThrottle` consumes 1 token
3. **Token Refilling**: Tokens are automatically refilled at the specified `refillRate` (tokens per second)
4. **Throttling**: If there are no tokens available when a request arrives, the request is throttled

Example with `capacity: 100` and `refillRate: 10`:
- Bucket can hold up to 100 tokens
- 10 tokens are added every second
- If the bucket is full and 100 requests come in all at once, they all succeed
- The 101th request will be throttled until at least 0.1 seconds have passed

## Development

### Building

```bash
npm run build
```

### Testing

```bash
# Run tests
npm run test
```

Tests use [`@shelf/jest-dynamodb`](https://github.com/shelfio/jest-dynamodb) to run a local DynamoDB instance.

## License

MIT
