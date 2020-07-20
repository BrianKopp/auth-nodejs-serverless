import * as winston from 'winston';
import { DynamoDB } from 'aws-sdk';
import { makeFromEnv } from './config';
import { DynamoDataService } from './data/dynamo-service';
import { createTable } from './data/dynamo-functions';
import { NoOpEmailService } from './email/noop-email.service';
import { AccountService } from './account.service';
import { makeApp } from './app';

const config = makeFromEnv();
const formats = [winston.format.timestamp(), winston.format.metadata()];
if (process.env.ENVIRONMENT === 'local') {
    formats.push(winston.format.simple());
} else {
    formats.push(winston.format.json());
}
const logger = winston.createLogger({
    level: config.logLevel,
    format: winston.format.combine(...formats),
    transports: new winston.transports.Console()
});
logger.debug('auth service booting');

let dynamoDocClient: DynamoDB.DocumentClient;
if (process.env.ENVIRONMENT === 'local') {
    const awsConfig = {
        region: config.awsRegion,
        endpoint: 'localstack:4566',
        accessKeyId: 'a',
        secretAccessKey: 'a',
        sslEnabled: false
    };
    dynamoDocClient = new DynamoDB.DocumentClient(awsConfig);
    const dynamoClient = new DynamoDB(awsConfig);
    createTable(dynamoClient, 'local', false).catch((err) => logger.error('error creating table', { error: err }));
} else {
    dynamoDocClient = new DynamoDB.DocumentClient({ region: config.awsRegion });
}
const dataService = new DynamoDataService(logger, dynamoDocClient, config);
const emailService = new NoOpEmailService(logger);
const accountService = new AccountService(config, logger, dataService, emailService);

const app = makeApp(logger, accountService);

const server = app.listen(config.port, (err) => {
    if (err) {
        logger.error('error starting server', { error: err });
        process.exit(1);
    }
    logger.verbose(`auth service started, listening on port ${config.port}`);
});

const shutdown = () => {
    logger.verbose('received shutdown signal');
    server.close((err) => {
        if (err) {
            logger.error('error shutting down server', { error: err });
            process.exit(1);
        }
        logger.verbose('successfully shut down auth service');
        process.exit(0);
    });
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
