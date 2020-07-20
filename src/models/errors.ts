export enum AuthErrorTypes {
    UserNotFound = 'User not found',
    EmailAlreadyUsed = 'Email already used',
    EmailNotVerified = 'Email not verified',
    InvalidToken = 'Invalid token',
}

export class AuthError extends Error {
    constructor(type: AuthErrorTypes) {
        super(type.toString());
    }
}
