export interface Config {
    logLevel: string;
    port: number;

    awsRegion: string;
    dynamoTableName: string;

    jwtSecret: string;

    // UI URLs for things
    emailVerifyUrl: string;
    passwordResetUrl: string;

    // token expiration times
    ttlEmailVerification: number;
    ttlRefreshToken: number;
    ttlAccessToken: number;
    ttlPasswordReset: number;
}

export const makeFromEnv = (): Config => {
    const config: Config = {
        port: Number(process.env.PORT || 3000),
        logLevel: process.env.LOG_LEVEL || 'info',

        awsRegion: process.env.AWS_REGION,
        dynamoTableName: process.env.DYNAMO_TABLENAME,

        jwtSecret: process.env.JWT_SECRET,

        emailVerifyUrl: `${process.env.WEBHOST}/account/verify-email`,
        passwordResetUrl: `${process.env.WEBHOST}/account/reset-password`,

        ttlEmailVerification: Number(process.env.EMAIL_VERIFY_TTL || 1000 * 60 * 60 * 24 * 3), // default 3 days
        ttlRefreshToken: Number(process.env.REFRESH_TOKEN_TTL || 1000 * 60 * 60 * 24 * 30), // default 30 days
        ttlAccessToken: Number(process.env.ACCESS_TOKEN_TTL || 1000 * 60 * 30), // default to 30 minutes
        ttlPasswordReset: Number(process.env.PASSWORD_RESET_TTL || 1000 * 60 * 30), // default 30 minutes
    };

    return config;
};
