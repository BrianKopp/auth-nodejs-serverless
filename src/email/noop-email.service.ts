import { Logger } from 'winston';
import { EmailService } from '../models';

export class NoOpEmailService implements EmailService {
    constructor(private logger: Logger) {}

    async send(emailAddress: string, content: string): Promise<void> {
        this.logger.info('would have sent email', { emailAddress, content });
    }
}
