import { SES } from 'aws-sdk';
import { Logger } from 'winston';
import { EmailService } from '../models';
import { Config } from '../config';

export class SesEmailService implements EmailService {
    constructor(private logger: Logger, private client: SES, private config: Config) {}

    async send(emailAddress: string, content: string): Promise<void> {
        // TOOD
    }
}
