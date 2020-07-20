import * as winston from 'winston';
import { DynamoDB } from 'aws-sdk';
import { makeFromEnv } from './config';
import { DynamoDataService } from './data/dynamo-service';
import { NoOpEmailService } from './email/noop-email.service';
import { AccountService } from './account.service';
import { makeApp } from './app';

const config = makeFromEnv();
const logger = winston.createLogger({
    level: config.logLevel,
    format: winston.format.combine(
        winston.format.json(),
        winston.format.timestamp(),
        winston.format.metadata()
    ),
    transports: new winston.transports.Console()
});
logger.debug('auth service booting');

const dynamoDocClient = new DynamoDB.DocumentClient({ region: config.awsRegion });
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
