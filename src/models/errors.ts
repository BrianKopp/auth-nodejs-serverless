interface AuthErrorTypeInfo {
    code: string;
    message: string;
    statusCode: number;
}

export enum AuthErrorTypes {
    UserNotFound = 'UserNotFound',
    EmailAlreadyUsed = 'EmailAlreadyUsed',
    EmailNotVerified = 'EmailNotVerified',
    InvalidToken = 'InvalidToken'
}

const authErrorTypeInfos: {[key: string]: AuthErrorTypeInfo} = {
    UserNotFound: {
        code: 'UserNotFound',
        message: 'User not found',
        statusCode: 404
    },
    EmailAlreadyUsed: {
        code: 'EmailAlreadyUsed',
        message: 'Email already used',
        statusCode: 400
    },
    EmailNotVerified: {
        code: 'EmailNotVerified',
        message: 'Email not verified',
        statusCode: 400
    },
    InvalidToken: {
        code: 'InvalidToken',
        message: 'Invalid token',
        statusCode: 400
    },
};

export class AuthError extends Error {
    code: string;
    statusCode: number;
    constructor(type: AuthErrorTypes) {
        const authError = authErrorTypeInfos[type.toString()];
        if (!authError) {
            throw new Error('unexpected error type');
        }
        super(authError.message);
        this.code = authError.code;
        this.statusCode = authError.statusCode;
    }
}
