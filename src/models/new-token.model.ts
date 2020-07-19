import Joi from '@hapi/joi';

export interface NewTokenRequest {
    emailAddress: string;
    password?: string;
    refreshToken?: string;
}

export const authJoiObject = Joi.object({
    emailAddress: Joi.string().email().required(),
    password: Joi.string(),
    accessToken: Joi.string()
}).xor('password', 'accessToken');
