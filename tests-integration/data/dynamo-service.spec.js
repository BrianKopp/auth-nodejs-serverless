require('mocha');
const { expect } = require('chai');
const AWS = require('aws-sdk');
const winston = require('winston');
const d = require('../../src/data/dynamo-functions');
const { DynamoDataService } = require('../../src/data/dynamo-service');

describe('dynamo function tests', () => {
    /** @type {DynamoDataService} */
    let svc = null;

    /** @type {import('aws-sdk').DynamoDB.DocumentClient} */
    let docClient = null;

    /** @type {import('aws-sdk').DynamoDB} */
    let dynClient = null;

    const tableName = 'test';

    before(() => {
        const awsConfig = {
            region: 'us-east-1',
            accessKeyId: 'foo',
            secretAccessKey: 'bar',
            endpoint: 'localstack:4566',
            sslEnabled: false
        };
        docClient = new AWS.DynamoDB.DocumentClient(awsConfig);
        dynClient = new AWS.DynamoDB(awsConfig);
        svc = new DynamoDataService(winston.createLogger({
            level: 'debug',
            transports: [new winston.transports.Console()]
        }), docClient, { dynamoTableName: 'test' });
    });
    beforeEach(function(done) {
        this.timeout(10000);
        d.createTableForTesting(dynClient, tableName).then(done).catch(done);
    });
    afterEach((done) => {
        dynClient.deleteTable({ TableName: tableName }, done);
    });

    it('should throw error if user not found', async () => {
        try {
            await svc.getUser('foo@bar.com');
            expect.fail();
        } catch(err) {
            expect(err.message).to.eql('User not found');
        }
    });
    it('should return user if found', async () => {
        const expected = {
            id: 'user_foo@bar.com',
            foo: 'bar'
        };
        await docClient.put({
            TableName: 'test',
            Item: expected
        }).promise();
        const user = await svc.getUser('foo@bar.com');
        expect(user).to.eql(expected);
    });
    it('should successfully set user, requiring new', async () => {
        const user = {
            emailAddress: 'foo@bar.com'
        };
        await svc.setUser(user, true);
        const resp = await docClient.get({ TableName: 'test', Key: { id: 'user_foo@bar.com' }}).promise();
        expect(resp.Item).to.eql({ emailAddress: 'foo@bar.com', id: 'user_foo@bar.com' });
    });
    it('should successfully set user, not requiring new', async () => {
        const user = {
            emailAddress: 'foo@bar.com'
        };
        await svc.setUser(user, false);
        const resp = await docClient.get({ TableName: 'test', Key: { id: 'user_foo@bar.com' }}).promise();
        expect(resp.Item).to.eql({ emailAddress: 'foo@bar.com', id: 'user_foo@bar.com' });
    });
    it('should fail to set user if already present', async () => {
        const user = {
            id: 'user_foo@bar.com',
            emailAddress: 'foo@bar.com'
        };
        await docClient.put({ TableName: 'test', Item: user }).promise();
        try {
            await svc.setUser(user, true);
            expect.fail();
        } catch (err) {
            expect(err.message).to.eql('Email already used');
        }
    });
    it('should succeed to set user if already present, but not requiring new', async () => {
        const user = {
            id: 'user_foo@bar.com',
            emailAddress: 'foo@bar.com'
        };
        await docClient.put({ TableName: 'test', Item: user }).promise();
        await svc.setUser(user, false);
    });

    it('should set a token successfully', async () => {
        const token = {
            emailAddress: 'foo@bar.com',
            value: 'abcd',
            expiration: 123,
            type: 'foobar'
        };
        await svc.setToken(token);
        const resp = await docClient.get({ TableName: 'test', Key: { id: 'token_foo@bar.com_abcd' }}).promise();
        expect(resp.Item).to.eql({ ...token, id: 'token_foo@bar.com_abcd' });
    });

    it('should fail to invalidate a token that doesn\'t exist', async () => {
        try {
            await svc.consumeToken('foo@bar.com', 'abcd', 'email');
            expect.fail();
        } catch (err) {
            expect(err.message).to.eql('Invalid token');
        }
    });
    it('should fail to invalidate a token that is of the wrong type', async () => {
        await docClient.put({ TableName: 'test', Item: {
            id: 'token_foo@bar.com_abcd',
            type: 'foo',
            expiration: Date.now() + 1000*3600,
            value: 'abcd'
        }}).promise();
        try {
            await svc.consumeToken('foo@bar.com', 'abcd', 'bar');
            expect.fail();
        } catch (err) {
            expect(err.message).to.eql('Invalid token');
        }
    });
    it('should fail to invalidate a token that is expired', async () => {
        await docClient.put({ TableName: 'test', Item: {
            id: 'token_foo@bar.com_abcd',
            type: 'foo',
            expiration: Date.now() - 1000*3600,
            value: 'abcd'
        }}).promise();
        try {
            await svc.consumeToken('foo@bar.com', 'abcd', 'foo');
            expect.fail();
        } catch (err) {
            expect(err.message).to.eql('Invalid token');
        }
    });
    it('should successfully invalidate a valid token', async () => {
        await docClient.put({ TableName: 'test', Item: {
            id: 'token_foo@bar.com_abcd',
            type: 'foo',
            expiration: Date.now() + 1000*3600,
            value: 'abcd'
        }}).promise();
        await svc.consumeToken('foo@bar.com', 'abcd', 'foo');
    });
});