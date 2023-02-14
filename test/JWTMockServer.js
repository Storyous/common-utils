'use strict';

const MockServer = require('mocked-server');

class JWTMockServer extends MockServer {
    constructor () {
        super('http://127.0.0.1:3010');
        this.url = 'http://127.0.0.1:3010';
        this.privateKey = `-----BEGIN RSA PRIVATE KEY-----
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
-----END RSA PRIVATE KEY-----`;
        this.publicKey = `-----BEGIN PUBLIC KEY-----
MIICITANBgkqhkiG9w0BAQEFAAOCAg4AMIICCQKCAgB0CxA1fUaXsoE/N01Mla/H
Wrmy+Dnqjm46Fb9MIW3jiXJrhYrkZwO4qoYvPKIAHpPRNiAFgPUPaFB7MFCO2n+J
vw67p6prNBlJS96mkzzNJU/jJSS4wYSDVmjpc6nx/43TdBgSUxB/rs4T43eRoWCE
rQoncUFiq7DNVSC/3hxPdYTq3kB3lJFqJTg54AYLNQuXlSAF0Tt0L7msvZ7SWM8P
MLfiHmX2R0NT/scQufUvkYA2VA7rY2AemCrXd+rAGWdRtnfrMJZjTjJSnzNEW15i
4s1k0HQlnU/MHG1DUzOSy+ptz4un4Wn1K9eeM7fYpa6Zej/pbAHbh3VtdM5q2EhC
6Tlkd1UkyZ9xi/BLO4xEYi+Chh3wxR9lvBTmIsvREBq2NgLmPhqae46MyVWWDyXH
dQcq9t6EevKAk6F8SYI0nbHYq0teAdCefFVRgcOxWv2EigvqstjnmBshC3gnzpRi
Zy8NnCxkKJaQDi3biGaSjraXViyEwLOuEsJHpVT7oBM7LQWSziSMRQFJSnwkw6nI
zg0Mbwgpf5Yc4szTPe97bBxjiOJcKtuFM0kBczqIwytbamqdR5aCxxdDqbyZopoP
4nNcEIdlSzCcYQCEtzyAeQJKrfN7My0JRKRsk/QJqY90P7HT25kmuQFA9eV/rNXS
jIhsEyYyTitqhvCR5TJ5/QIDAQAB
-----END PUBLIC KEY-----`;
        this.invalidPublicKey = `-----BEGIN PUBLIC KEY-----
aaaMIIBITANBgkqhkiG9w0BAQEFAAOCAQ4AMIIBCQKCAQBoMUZQGQGVTQ0S8trMaz3w
HVD7b4RM5YwY/3ctyO7CA2GXCBzevEPz5RRlGVsN55jPRTPSxKshJx66CN4piziG
VoiJsLFM/zm9wxDbwV+w1pDnMdeQ01RE31o03tzO2nkKVRj30pAV+yCK+fmdmsaf
WZaQ3760UGRHGh1g332U8FO2W1gRIqh1HUHsm9dInABvXbJbkggNm9ICwPsBigK4
0cN9K+Pv78wcoQEfZ6qD8d5DATlgCsbxBEDbaCulFsDk6M3jqbhXAw0iO1cOPtjd
MJjzbnzF3nWvHTwMy3qAN5LmlY4k3mKRAGtNlj6rJhd4wH/M8VsvoB1wfASbfy5V
AgMBAAE=
-----END PUBLIC KEY-----`;
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
