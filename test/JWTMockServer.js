'use strict';

const MockServer = require('mocked-server');

class JWTMockServer extends MockServer {
    constructor () {
        super('http://127.0.0.1:3010');
        this.url = 'http://127.0.0.1:3010';
        this.privateKey = `-----BEGIN RSA PRIVATE KEY-----
MIICXAIBAAKBgQDXjPg4oSjk+LjwLU/dtywCNNhfcW0GvDqOoji8G4hABYxMyPo4
HvR2+/WKoKYR+RH2NJOSq/Nt5P2ncoSnMHSxV0Zkdc0/duo0r50Di7lY7L/UwS3f
p/ThgkUJfr2tKAs/+LbTzcw0+rCmMaL6aZXbeyK+Fgt6kGBEI5Z70AMYBQIDAQAB
AoGAHEWtOSBKUN4ew8Htu9MOvqtXxg0Gk9+UfqjgcCvcTylrIZcq2rmUrxaVOj2g
CrN0m6qBwLc1ErD6ZEAtDhDY/TwK4v5m3Nda28+Dh4myydKT0v856wvbAzmhCNfd
9+BgKHore4Z4UCGPUyCrk/3BLCbSuVUwWCpXJGq4hiB8JnECQQD6GONSzm3iYII3
yTWxGz+elfGS8gxq5A4Kid+Se/r4jj/LO7RDbYhexMSBm/T/xQgw3+6WQptkdqjB
ZJ8mLvoHAkEA3KNZEoA2DkrxaiXKXN8JTUfcLjTZJFhymY4PkcHDY4uCMWnMsLui
MHyZI/mKUT3Eo0fto/Lh81lDpuboMEDKkwJAdZzmqrZxbpg8JMf2/Ab4cDfLl3NE
66+7+rDD9zte1yzuS0EUkPEdxJN8ZgdVvEKIi5ODvB4uvZwf2HLddTN6WQJBANQa
jBRHALA4x1+9uI4TM4QBYt9gmqZgCLspYDpExSq7AIu0I7x6hG6MOUPmLlvvP0ug
aAlGAoTH+UtHi0pn3tUCQGdqCu9TyBjwfzyr6kQ9u5XPAiDUhRRMithca8YjtcVx
RgAIC+Wk+1TiVTxNzXEinE9ORcBQpIw9gcZrphhd4FM=
-----END RSA PRIVATE KEY-----
`;
        this.publicKey = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDXjPg4oSjk+LjwLU/dtywCNNhf
cW0GvDqOoji8G4hABYxMyPo4HvR2+/WKoKYR+RH2NJOSq/Nt5P2ncoSnMHSxV0Zk
dc0/duo0r50Di7lY7L/UwS3fp/ThgkUJfr2tKAs/+LbTzcw0+rCmMaL6aZXbeyK+
Fgt6kGBEI5Z70AMYBQIDAQAB
-----END PUBLIC KEY-----
`;
        this.invalidPublicKey = `-----BEGIN PUBLIC KEY-----
aaafMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDXjPg4oSjk+LjwLU/dtywCNNhf
cW0GvDqOoji8G4hABYxMyPo4HvRWW2+/WKoKYR+RH2NJOSq/Nt5P2ncoSnMHSxV0Zk
dc0/duo0r50Di7lY7L/UwS3fp/ThgkUJfr2tKAs/+LbTzcw0+rCmMaL6aZXbeyK+
Fgt6kGBEI5Z70AMYBQIDAQAB
-----END PUBLIC KEY-----
`;
        this.getPrivateKey = this.get('/getPrivateKey', (ctx) => {
            ctx.body = this.privateKey;
            ctx.status = 200;
        });

        this.getPublicKey = this.get('/getPublicKey', (ctx) => {
            ctx.body = this.publicKey;
            ctx.status = 200;
        });
        this.getInvalidPublicKey = this.get('/getInvalidPublicKey', (ctx) => {
            ctx.body = this.invalidPublicKey;
            ctx.status = 200;
        });
    }
}

module.exports = new JWTMockServer();
