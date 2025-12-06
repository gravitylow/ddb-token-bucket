import { NativeAttributeValue } from "@aws-sdk/util-dynamodb";

interface TokenBucketProps {
    tokenBucketId: string;
    tokens: number;
    lastRefillTimestamp: number;
    ttlTimestamp: number;
    version: number;
}

export class DdbTokenBucket {
    tokenBucketId: string;
    tokens: number;
    lastRefillTimestamp: number;
    ttlTimestamp: number;
    version: number;

    constructor(props: TokenBucketProps) {
        this.tokenBucketId = props.tokenBucketId;
        this.tokens = props.tokens;
        this.lastRefillTimestamp = props.lastRefillTimestamp;
        this.ttlTimestamp = props.ttlTimestamp;
        this.version = props.version;
    }

    static fromItem(item: Record<string, NativeAttributeValue>): DdbTokenBucket {
        return new DdbTokenBucket({
            tokenBucketId: item["TokenBucketId"],
            tokens: item["Tokens"],
            lastRefillTimestamp: item["LastRefillTimestamp"],
            ttlTimestamp: item["TtlTimestamp"],
            version: item["Version"],
        })
    }

    toItem(): Record<string, NativeAttributeValue> {
        return {
            'PK': `TOKEN_BUCKET#${this.tokenBucketId}`,
            'SK': 'TOKEN_BUCKET',
            'TokenBucketId': this.tokenBucketId,
            'Tokens': this.tokens,
            'LastRefillTimestamp': this.lastRefillTimestamp,
            'TtlTimestamp': this.ttlTimestamp,
            'Version': this.version,
        }
    }

    getKey(): Record<string, NativeAttributeValue> {
        return {
            'PK': `TOKEN_BUCKET#${this.tokenBucketId}`,
            'SK': 'TOKEN_BUCKET',
        }
    }
}
