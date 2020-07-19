import Joi from '@hapi/joi';

export interface Registration {
    firstName: string;
    lastName: string;
    emailAddress: string;
    password: string;
}

export const registrationJoiObject = Joi.object({
    firstName: Joi.string().min(2).max(50).required(),
    lastName: Joi.string().min(2).max(50).required(),
    emailAddress: Joi.string().email().required(),
    password: Joi.string().required() // TODO use pattern to ensure strength
});
