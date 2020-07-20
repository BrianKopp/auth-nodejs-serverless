import { Logger } from 'winston';
import { DynamoDB } from 'aws-sdk';
import * as m from '../models';
import { Config } from '../config';
import * as d from './dynamo-functions';

export class DynamoDataService implements m.DataService {

    constructor(
        private logger: Logger,
        private client: DynamoDB.DocumentClient,
        private config: Config
    ) {}

    async getUser(emailAddress: string): Promise<m.User> {
        this.logger.debug('getting user', { emailAddress });
        const user = await d.getUser(this.client, this.config.dynamoTableName, emailAddress);
        if (!user) {
            throw new m.AuthError(m.AuthErrorTypes.UserNotFound);
        }
        this.logger.verbose('get user success', { ...user });
        return user;
    }

    async setUser(user: m.User, requireNew: boolean): Promise<void> {
        this.logger.debug('setting user', { user, requireNew });
        try {
            await d.setUser(this.client, this.config.dynamoTableName, user, requireNew);
            this.logger.info('updated user', { user, requireNew });
        } catch (err) {
            if (err.code === 'ConditionalCheckFailedException') {
                throw new m.AuthError(m.AuthErrorTypes.EmailAlreadyUsed);
            }
            throw err;
        }
    }
    async setToken(token: m.Token): Promise<void> {
        this.logger.info('setting token', {
            emailAddress: token.emailAddress,
            type: token.type,
            expiration: token.expiration
        });
        await d.setToken(this.client, this.config.dynamoTableName, token);
    }
    async consumeToken(emailAddress: string, token: string, type: string): Promise<void> {
        this.logger.debug('consuming token', { emailAddress, token, type });
        try {
            await d.invalidateTokenIfExists(this.client, this.config.dynamoTableName, emailAddress, token, type, Date.now());
            this.logger.info('consumed token', { emailAddress, token, type });
        } catch (err) {
            if (err.code === 'ConditionalCheckFailedException') {
                throw new m.AuthError(m.AuthErrorTypes.InvalidToken);
            }
            throw err;
        }
    }
}
