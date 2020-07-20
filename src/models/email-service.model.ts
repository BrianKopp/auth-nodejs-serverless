export interface EmailService {
    send: (emailAddress: string, content: string) => Promise<void>;
}
