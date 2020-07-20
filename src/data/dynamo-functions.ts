import { DynamoDB } from 'aws-sdk';
import { User, Token } from '../models';

export const getUser = async (
    client: DynamoDB.DocumentClient,
    tableName: string,
    emailAddress: string
): Promise<User> => {
    const resp = await client.get({
        TableName: tableName,
        Key: {
            id: `user_${emailAddress}`
        }
    }).promise();
    return <User>resp.Item;
};

export const setUser = async (
    client: DynamoDB.DocumentClient,
    tableName: string,
    user: User,
    requireNew: boolean
): Promise<void> => {
    const dynamoItem = {
        ...user,
        id: `user_${user.emailAddress}`
    };

    if (requireNew) {
        await client.put({
            TableName: tableName,
            Item: dynamoItem,
            ConditionExpression: 'attribute_not_exists(id)'
        }).promise();
    } else {
        await client.put({
            TableName: tableName,
            Item: dynamoItem,
        }).promise();
    }
};

export const getToken = async (
    client: DynamoDB.DocumentClient,
    tableName: string,
    emailAddress: string,
    token: string,
    assertType?: string
): Promise<Token> => {
    const resp = await client.get({
        TableName: tableName,
        Key: {
            id: `token_${emailAddress}_${token}`
        }
    }).promise();

    const item = <Token>resp.Item;

    if (assertType && item.type !== assertType) {
        throw new Error(`token type mismatch - expected ${assertType}, got ${item.type}`);
    }

    return <Token>resp.Item;
};

export const setToken = async (
    client: DynamoDB.DocumentClient,
    tableName: string,
    token: Token
): Promise<void> => {
    const dynamoItem = {
        ...token,
        id: `token_${token.emailAddress}_${token.value}`,
        // TODO TTL and GSIs
    };

    await client.put({
        TableName: tableName,
        Item: dynamoItem,
    }).promise();
};

export const invalidateTokenIfExists = async (
    client: DynamoDB.DocumentClient,
    tableName: string,
    emailAddress: string,
    token: string,
    type: string,
    now: number
): Promise<void> => {
    try {
        await client.delete({
            TableName: tableName,
            Key: {
                id: `token_${emailAddress}_${token}`
            },
            ConditionExpression: 'attribute_exists(id) and expiration >= :n and #t = :t',
            ExpressionAttributeValues: {
                ':n': now - 1000*5*60, // allow 5 minute clock drift
                ':t': type
            },
            ExpressionAttributeNames: {
                '#t': 'type'
            }
        }).promise();
    } catch (err) {
        throw err;
    }
};

export const createTable = async (
    client: DynamoDB,
    tableName: string,
    requireNew: boolean
): Promise<void> => {
    try {
        await client.describeTable({
            TableName: tableName
        }).promise();
        if (requireNew) {
            throw new Error('table already exists');
        }
        return;
    } catch (err) {
        // suppress
    }

    await client.createTable({
        TableName: tableName,
        KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
        AttributeDefinitions: [{
            AttributeName: 'id',
            AttributeType: 'S'
        }],
        BillingMode: 'PAY_PER_REQUEST',
    }).promise();
};
