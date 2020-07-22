import express, { Express, Request, Response, NextFunction } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { Logger } from 'winston';
import Joi, { ValidationError } from '@hapi/joi';
import { createValidator } from 'express-joi-validation';
import * as m from './models';

export const makeApp = (logger: Logger, accountService: m.AccountService): Express => {
    const app = express();
    app.use(cors());
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
    
    
    app.post('/accounts', validator.body(m.registrationJoiObject, { passError: true }), async (req, res, next) => {
        const regData: m.Registration = req.body;
        try {
            await accountService.register(regData);
            res.status(201).json({ message: 'created' });
        } catch (err) {
            next(err);
        }
    });
    
    app.post('/accounts/tokens', validator.body(m.authJoiObject, { passError: true }), async (req, res, next) => {
        const authData: m.NewTokenRequest = req.body;
        try {
            const accessTokens = await accountService.getAccessToken(authData);
            res.status(201).json(accessTokens);
        } catch (err) {
            next(err);
        }
    });
    
    const logoutModel = Joi.object({
        email: Joi.string().email().required(),
        token: Joi.string().required()
    });
    app.delete('/accounts/tokens', validator.query(logoutModel, { passError: true }), async (req, res, next) => {
        const emailAddress = req.query.email.toString();
        const refreshToken = req.query.token.toString();
        try {
            await accountService.logout(emailAddress, refreshToken);
            res.status(204).json({ message: 'logged out' });
        } catch (err) {
            next(err);
        }
    });
    
    const emailVerificationModel = Joi.object({
        emailAddress: Joi.string().email().required(),
        token: Joi.string().required()
    });
    app.post('/accounts/email-verifications', validator.body(emailVerificationModel, { passError: true }), async (req, res, next) => {
        const { emailAddress, token } = req.body;
        try {
            await accountService.verifyEmail(emailAddress, token);
            res.status(200).json({ message: 'email verified' });
        } catch (err) {
            next(err);
        }
    });

    const emailVerificationRequestModel = Joi.object({
        emailAddress: Joi.string().email().required()
    });
    app.post('/accounts/email-verification-requests', validator.body(emailVerificationRequestModel, { passError: true}), async (req, res, next) => {
        const { emailAddress } = req.body;
        try {
            await accountService.requestEmailVerification(emailAddress);
            res.status(201).json({ message: 'email verification sent' });
        } catch (err) {
            next(err);
        }
    });
    
    const emailOnlyVerification = Joi.object({ emailAddress: Joi.string().email().required() });
    app.post('/accounts/password-reset-requests', validator.body(emailOnlyVerification, { passError: true }), async (req, res, next) => {
        const { emailAddress } = req.body;
        try {
            await accountService.requestPasswordReset(emailAddress);
            res.status(201).json({ message: 'password reset sent' });
        } catch (err) {
            next(err);
        }
    });
    
    const passwordResetModel = Joi.object({
        emailAddress: Joi.string().email().required(),
        password: Joi.string().required(), // TODO pattern for strength
        token: Joi.string().required()
    });
    app.post('/accounts/password-resets', validator.body(passwordResetModel, { passError: true }), async (req, res, next) => {
        const { emailAddress, password, token } = req.body;
        try {
            await accountService.resetPassword(emailAddress, password, token);
            res.json({ message: 'password reset' });
        } catch (err) {
            next(err);
        }
    });

    // error handling
    app.use((err: any, req: Request, res: Response, next: NextFunction) => {
        if (err instanceof m.AuthError) {
            logger.info('auth error', { ...err, stack: err.stack });
            res.status(err.statusCode).json({ code: err.code, message: err.message });
            return;
        }

        if (err && err.error && err.error instanceof ValidationError) {
            res.status(400).json({ message: err.error.message });
            return;
        }

        next(err);
    });

    return app;
};