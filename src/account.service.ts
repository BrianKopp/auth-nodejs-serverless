import { Logger } from 'winston';
import { randomBytes, pbkdf2 } from 'crypto';
import * as JWT from 'jsonwebtoken';
import { Config } from './config';
import {
    AccountService as IActSvc,
    Registration,
    NewTokenRequest,
    AuthSuccess,
    DataService,
    EmailService,
    User,
    Token,
    AuthError,
    AuthErrorTypes,
} from './models';

const hashPassword = (
    password: string,
    salt?: string,
    iterations?: number
): Promise<string> => {
    if (!salt) {
        salt = randomBytes(128).toString('base64');
    }
    if (!iterations) {
        iterations = Math.round(Math.random()*1000) + 1;
    }

    return new Promise<string>((resolve, reject) => {
        pbkdf2(password, salt, iterations, 32, 'sha512', (err, hash) => {
            if (err) {
                reject(err);
                return;
            }
            const hashStr = hash.toString('hex');
            resolve([salt, iterations, hashStr].join(':'));
        });
    });
};

const makeEmailVerificationContent = (
    firstName: string,
    url: string
): string => {
    return `<h4>Verify Email</h4><p>Thanks for registering, ${firstName}! Click the link below to verify your email address:</p>` +
        `<p><a href="${url}">${url}</a></p>`;
};

const makePasswordResetContent = (
    firstName: string,
    url: string
): string => {
    return `<h4>Password reset</h4><p>Hi ${firstName}!</p><p>Please click the link below to reset your password.</p>` +
        `<p><a href="${url}">${url}</a></p>`;
};

export class AccountService implements IActSvc {
    
    constructor(
        private config: Config,
        private logger: Logger,
        private dataService: DataService,
        private emailService: EmailService
    ) {}

    async register(reg: Registration): Promise<void> {
        const pwHash = await hashPassword(reg.password);
        const user: User = {
            createDate: Date.now(),
            firstName: reg.firstName,
            lastName: reg.lastName,
            emailAddress: reg.emailAddress,
            emailVerified: false,
            saltyPassword: pwHash
        };

        await this.dataService.setUser(user, true);
        
        const verificationToken: Token = {
            emailAddress: reg.emailAddress,
            expiration: Date.now() + this.config.ttlEmailVerification,
            type: 'email',
            value: randomBytes(32).toString('base64')
        };

        // save email verification token in DB
        await this.dataService.setToken(verificationToken);

        // send welcome/verification email
        const url = `${this.config.emailVerifyUrl}?token=${encodeURIComponent(verificationToken.value)}&email=${encodeURIComponent(verificationToken.emailAddress)}`;
        const emailContent = makeEmailVerificationContent(reg.firstName, url);
        await this.emailService.send(reg.emailAddress, emailContent);
    }

    async getAccessToken(auth: NewTokenRequest): Promise<AuthSuccess> {
        const user = await this.dataService.getUser(auth.emailAddress);
        if (auth.password) {
            const [salt, iterations, hashedPw] = user.saltyPassword.split(':');
            const providedHash = await hashPassword(auth.password, salt, Number(iterations));
            if (providedHash !== hashedPw) {
                throw new Error('invalid password');
            }
        } else if (auth.refreshToken) {
            await this.dataService.consumeToken(auth.emailAddress, auth.refreshToken, 'refresh');
        } else {
            throw new Error('must provide password or refresh token');
        }

        // save new token
        const newToken: Token = {
            emailAddress: auth.emailAddress,
            type: 'refresh',
            value: randomBytes(32).toString('base64'),
            expiration: Date.now() + this.config.ttlRefreshToken
        };

        await this.dataService.setToken(newToken);
        
        const jwt = JWT.sign({
            sub: auth.emailAddress,
            claims: [],
        }, this.config.jwtSecret, {
            expiresIn: this.config.ttlAccessToken / 1000
        });
        return {
            refreshToken: newToken.value,
            jwt
        };
    }

    logout(emailAddress: string, token: string): Promise<void> {
        return this.dataService.consumeToken(emailAddress, token, 'refresh');
    }

    async verifyEmail(emailAddress: string, token: string): Promise<void> {
        // get token
        await this.dataService.consumeToken(emailAddress, token, 'email'); // TODO error handling

        // update user
        const user = await this.dataService.getUser(emailAddress);
        user.emailVerified = true;
        await this.dataService.setUser(user, false);
    }

    async requestPasswordReset(emailAddress: string): Promise<void> {
        const user = await this.dataService.getUser(emailAddress);
        if (!user.emailVerified) {
            throw new AuthError(AuthErrorTypes.EmailNotVerified);
        }

        // create password reset token
        const pwToken: Token = {
            emailAddress,
            expiration: Date.now() + this.config.ttlPasswordReset,
            type: 'password',
            value: randomBytes(32).toString('base64')
        };
        await this.dataService.setToken(pwToken);

        // send password reset request email
        const url = `${this.config.passwordResetUrl}?token=${encodeURIComponent(pwToken.value)}&email=${encodeURIComponent(emailAddress)}`;
        const pwResetEmailContent = makePasswordResetContent(emailAddress, url);
        await this.emailService.send(emailAddress, pwResetEmailContent);
    }

    async resetPassword(emailAddress: string, password: string, token: string): Promise<void> {
        // invalidate token,
        await this.dataService.consumeToken(emailAddress, token, 'password');

        const newPw = await hashPassword(password);
        const user = await this.dataService.getUser(emailAddress);
        user.saltyPassword = newPw;
        await this.dataService.setUser(user, false);

        // send password did reset email
        await this.emailService.send(emailAddress, `<h4>Password Reset</h4><p>Hi ${user.firstName}!</p><p>Your password has just been reset. If this was not you, please reset your password or contact us.</p>`);
    }
}
