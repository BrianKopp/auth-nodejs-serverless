import express, { Express, Request, Response, NextFunction } from 'express';
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
        logger.silly('liveness check');
        res.send('alive');
    });
    
    app.get('/health', (_, res) => {
        logger.silly('health check');
        res.send('healthy');
    });
    
    
    app.post('/auth/account-registration', validator.body(m.registrationJoiObject), async (req, res) => {
        const regData: m.Registration = req.body;
        await accountService.register(regData);
        res.status(201).json({ message: 'created' });
    });
    
    app.post('/auth/token', validator.body(m.authJoiObject), async (req, res) => {
        const authData: m.NewTokenRequest = req.body;
        await accountService.getAccessToken(authData);
        res.status(201).json({
            jwt: 'foobar',
            refreshToken: 'blahblah',
        });
    });
    
    const logoutModel = Joi.object({
        emailAddress: Joi.string().email().required(),
        refreshToken: Joi.string().required()
    });
    app.delete('/auth/token', validator.body(logoutModel), async (req, res) => {
        const { emailAddress, refreshToken } = req.body;
        await accountService.logout(emailAddress, refreshToken);
        res.status(204).json({ message: 'logged out' });
    });
    
    const emailVerificationModel = Joi.object({
        emailAddress: Joi.string().email().required(),
        token: Joi.string().required()
    });
    app.post('/auth/email-verification', validator.body(emailVerificationModel), async (req, res) => {
        const { emailAddress, token } = req.body;
        await accountService.verifyEmail(emailAddress, token);
        res.status(200).json({ message: 'email verified' });
    });
    
    const emailOnlyVerification = Joi.object({ emailAddress: Joi.string().email().required() });
    app.post('/auth/password-reset-request', validator.body(emailOnlyVerification), async (req, res) => {
        const { emailAddress } = req.body;
        await accountService.requestPasswordReset(emailAddress);
        res.status(201).json({ message: 'password reset sent' });
    });
    
    const passwordResetModel = Joi.object({
        emailAddress: Joi.string().email().required(),
        password: Joi.string().required(), // TODO pattern for strength
        token: Joi.string().required()
    });
    app.post('/auth/password-reset', validator.body(passwordResetModel), async (req, res) => {
        const { emailAddress, password, token } = req.body;
        await accountService.resetPassword(emailAddress, password, token);
        res.json({ message: 'password reset' });
    });

    // error handling
    app.use((err: any, req: Request, res: Response, next: NextFunction) => {
        if (err instanceof m.AuthError) {
            res.status(err.statusCode).json({ code: err.code, message: err.message });
            return;
        }

        logger.error('error in request handler', { url: req.url, error: err });
        next(err);
    });

    return app;
};