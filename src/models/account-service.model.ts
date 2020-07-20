import { Registration } from './registration.model';
import { NewTokenRequest } from './new-token.model';
import { AuthSuccess } from './auth-success.model';

export interface AccountService {
    register: (reg: Registration) => Promise<void>;
    getAccessToken: (auth: NewTokenRequest) => Promise<AuthSuccess>;
    logout: (emailAddress: string, token: string) => Promise<void>;
    verifyEmail: (emailAddress: string, token: string) => Promise<void>;
    requestPasswordReset: (emailAddress: string) => Promise<void>;
    resetPassword: (emailAddress: string, password: string, token: string) => Promise<void>;
}
