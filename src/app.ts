import express, { Express } from 'express';
import bodyParser from 'body-parser';
import { Logger } from 'winston';
import Joi from '@hapi/joi';
import { createValidator } from 'express-joi-validation';
import * as m from './models';

export const makeApp = (logger: Logger, accountService: m.AccountService): Express => {
    const app = express();
    app.use(bodyParser.json());
    const validator = createValidator();
    
    // health checks
    app.get('/', (_, res) => {
        res.send('alive');
    });
    
    app.get('/health', (_, res) => {
        res.send('healthy');
    });
    
    
    app.post('/auth/account-registration', validator.body(m.registrationJoiObject), (req, res) => {
        const regData: m.Registration = req.body;
        console.log('registration data', regData);
        res.status(201).json({ message: 'created' });
    });
    
    app.post('/auth/token', validator.body(m.authJoiObject), (req, res) => {
        const authData: m.NewTokenRequest = req.body;
        console.log('new token request', authData);
        res.status(201).json({
            jwt: 'foobar',
            refreshToken: 'blahblah',
        });
    });
    
    const logoutModel = Joi.object({
        emailAddress: Joi.string().email().required(),
        refreshToken: Joi.string().required()
    });
    app.delete('/auth/token', validator.body(logoutModel), (req, res) => {
        const { emailAddress, refreshToken } = req.body;
        console.log('refresh token', emailAddress, refreshToken);
        res.status(204).json({ message: 'logged out' });
    });
    
    const emailVerificationModel = Joi.object({
        emailAddress: Joi.string().email().required(),
        token: Joi.string().required()
    });
    app.post('/auth/email-verification', validator.body(emailVerificationModel), (req, res) => {
        const { emailAddress, token } = req.body;
        console.log('email verify', emailAddress, token);
        res.status(200).json({ message: 'email verified' });
    });
    
    const emailOnlyVerification = Joi.object({ emailAddress: Joi.string().email().required() });
    app.post('/auth/password-reset-request', validator.body(emailOnlyVerification), (req, res) => {
        const { emailAddress } = req.body;
        console.log('got request to reset password', emailAddress);
        res.status(201).json({ message: 'password reset sent' });
    });
    
    const passwordResetModel = Joi.object({
        emailAddress: Joi.string().email().required(),
        password: Joi.string().required(), // TODO pattern for strength
        token: Joi.string().required()
    });
    app.post('/auth/password-reset', validator.body(passwordResetModel), (req, res) => {
        const { emailAddress, password, token } = req.body;
        console.log('password reset request', emailAddress, password, token);
        res.json({ message: 'password reset' });
    });

    return app;
};