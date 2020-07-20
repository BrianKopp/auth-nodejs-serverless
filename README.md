# Auth NodeJS Serverless

This repo serves a rest API for authentication and basic authorization.
It exposes its rest api using express via Lambda + API Gateway.
Data is stored in a single dynamodb table.

## API

### Register

`POST /auth/account-registration`

Body

```json
{
    "firstName": "foo",
    "lastName": "bar",
    "emailAddress": "foo@bar.com",
    "password": "xyz"
}
```

Returns 201 if success, 400 or 500 if fail.

### Login to Obtain JWT or refresh JWT

`POST /auth/token`

Body is either

```json
{
    "emailAddress": "foo@bar.com",
    "password": "foobar"
}
```

Or

```json
{
    "emailAddress": "foo@bar.com",
    "refreshToken": "foobar"
}
```

Responds with 201

```json
{
    "jwt": "foo.bar.jwt",
    "refreshToken": "foobar"
}
```

### Logout

`DELETE /auth/token`

Body

```json
{
    "refreshToken": "foobar"
}
```

Responds 204.

### Email Verification

`POST /auth/email-verification`

Body

```json
{
    "token": "foobar",
    "emailAddress": "foo@bar.com"
}
```

### Send Password Reset Email

`POST /auth/password-reset-request`

Body

```json
{
    "emailAddress": "foo@bar.com"
}
```

### Password Reset

`POST /auth/password-reset`

Body

```json
{
    "emailAddress": "foo@bar.com",
    "password": "password",
    "token": "foobar"
}
```

## Backend

The backend will be a single DynamoDB table with an `id` string hash key.
The user will be identified in the table as `user_${emailAddress}`.

Active user refresh tokens will be created as new dynamodb items, which will
have a TTL associated with them, and an expiry field to automatically clean up.
These will be stored as `refreshtoken_${emailAddress}_${token}`.

### Example User Object

```json
{
    "id": "user_foo@bar.com",
    "emailAddress": "foo@bar.com",
    "firstName": "foo",
    "lastName": "bar",
    "saltyPassword": "fooblockityblock",
    "emailVerified": true,
    "lastLogin": 0, // epoch timestamp
    "createDate": 0, // epoch timestamp
    "claims": {"admin": true} // arbitrary claims
}
```

### Example Refresh Token Object

```json
{
    "id": "token_foo@bar.com_foobar",
    "emailAddress": "foo@bar.com",
    "refreshToken": "foobar",
    "expires": 0 // epoch timestamp
}
```
