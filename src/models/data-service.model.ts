import { User } from './user.model';
import { Token } from './tokens.model';

export interface DataService {
    getUser: (emailAddress: string) => Promise<User>;
    setUser: (user: User, requireNew: boolean) => Promise<void>;
    setToken: (token: Token) => Promise<void>;
    consumeToken: (emailAddress: string, token: string, type: string) => Promise<void>;
}
