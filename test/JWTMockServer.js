'use strict';

const MockServer = require('mocked-server');

class JWTMockServer extends MockServer {
    constructor () {
        super('http://127.0.0.1:3010');
        this.url = 'http://127.0.0.1:3010';
        this.privateKey = `-----BEGIN RSA PRIVATE KEY-----
MIIEoQIBAAKCAQBoMUZQGQGVTQ0S8trMaz3wHVD7b4RM5YwY/3ctyO7CA2GXCBze
vEPz5RRlGVsN55jPRTPSxKshJx66CN4piziGVoiJsLFM/zm9wxDbwV+w1pDnMdeQ
01RE31o03tzO2nkKVRj30pAV+yCK+fmdmsafWZaQ3760UGRHGh1g332U8FO2W1gR
Iqh1HUHsm9dInABvXbJbkggNm9ICwPsBigK40cN9K+Pv78wcoQEfZ6qD8d5DATlg
CsbxBEDbaCulFsDk6M3jqbhXAw0iO1cOPtjdMJjzbnzF3nWvHTwMy3qAN5LmlY4k
3mKRAGtNlj6rJhd4wH/M8VsvoB1wfASbfy5VAgMBAAECggEAKq40nU8BBQXBG0f8
NMyhXKDFsZmm2lEVqI/NZCXxF+yGp3WdTehU9a2bQya10+ZRBGbWqboCV9xMi+xi
BSaQiwcbezu0BVRvdLpZR4vZBPl/9hTGtv66gFP2Ab5hOSLpfkAJsErC1x494HAx
vkvOnSv3r3TYC8j6qt2ZtzsVmFKr+nbGxo/Sr00O9FfNHQsV+VU1gukhKA/8wATi
go/hcHkIN8cAiqd/Oq7AvYZYLiOHjA9zmxf7W8u0B1W9yood1vpYzzcbxbo7PJGJ
hVuyiXt+7Nrz1MHJy8rgQ0tXSK307emYdh34q14nm68MwX6VEE7tbqRobKKNRptd
vjoiAQKBgQCu2x7u9OgpVXHC5wF5+L/JzKiI+eHGUT+kQo7WSv+J4KodrraFkNVV
DYGXZAOA2kUQCJxoAfxCM+zVIOxXUgznLu8ihMxji0HvZ2IM7KEjdpJTKagsaE5V
csGBk9rD0TZ+u46O/5S6xfhvQKbP1QpQA3wwdaU50v9TB8sST/80wQKBgQCYi1ZW
Gh/5l3slmaZT4eji7PsW9QfaR38hJO+xQgwGwPpsB8uqTKQ9jlm4iKZruQLvwpg9
CpCGuWaINjRMs9j3R9pukvNF/P9gTTxxVZMulyyyTZSlAjaFh6DJYojmjbFwXLRH
aUY77ftZirAmEo2c8Ex5oI2wVS5I5pjCmbH6lQKBgAyvFHVdCqJE8nWi8DZ61t66
m9cj2T7bkfRGZ7ofwp2r0GtKyy6xLOh4jFgBB0gHjU72cPISgswCnEFxm/NRnmH+
w5YLcBAgf+3v3+r0F1RNO5wQv4RJJLWKF4NgyFPAD2XuEQ9Kdu19guH/HJqi55aa
Sh3xysSBC8hoHlD7wJWBAoGAcCo8cJFDI6aT4WDqYVGCiaGROx8vB/x8aSWcra0P
5MNvH5JX2kACoFSUelDYdesTUrK2eGPVQ4r97nhU2nV/usv1vEqHYNYX/XqtT/SJ
hb+ZGP5cpzxKVMMWoh225jgX2bQAx2WMRDLIF94Xidcok9ZJlUFODfOEVgxhFO4o
ZUUCgYATj8+ATvJiS316bz88u+efN6WMIkMhm6VLnjvqGsf5S5xbcQPWECKo1+//
cJqZ+AszUllkX8XDj8m3/hM/qljWA0pOo1uc7rtBh34w2JWJbeicWRQ+YFfD7RDI
RZey04byuI4mkwi6qpnnksXAED/zthfNM+trP/87LH9oN/6LFQ==
-----END RSA PRIVATE KEY-----
`;
        this.publicKey = `-----BEGIN PUBLIC KEY-----
MIIBITANBgkqhkiG9w0BAQEFAAOCAQ4AMIIBCQKCAQBoMUZQGQGVTQ0S8trMaz3w
HVD7b4RM5YwY/3ctyO7CA2GXCBzevEPz5RRlGVsN55jPRTPSxKshJx66CN4piziG
VoiJsLFM/zm9wxDbwV+w1pDnMdeQ01RE31o03tzO2nkKVRj30pAV+yCK+fmdmsaf
WZaQ3760UGRHGh1g332U8FO2W1gRIqh1HUHsm9dInABvXbJbkggNm9ICwPsBigK4
0cN9K+Pv78wcoQEfZ6qD8d5DATlgCsbxBEDbaCulFsDk6M3jqbhXAw0iO1cOPtjd
MJjzbnzF3nWvHTwMy3qAN5LmlY4k3mKRAGtNlj6rJhd4wH/M8VsvoB1wfASbfy5V
AgMBAAE=
-----END PUBLIC KEY-----
`;
        this.invalidPublicKey = `-----BEGIN PUBLIC KEY-----
aaaMIIBITANBgkqhkiG9w0BAQEFAAOCAQ4AMIIBCQKCAQBoMUZQGQGVTQ0S8trMaz3w
HVD7b4RM5YwY/3ctyO7CA2GXCBzevEPz5RRlGVsN55jPRTPSxKshJx66CN4piziG
VoiJsLFM/zm9wxDbwV+w1pDnMdeQ01RE31o03tzO2nkKVRj30pAV+yCK+fmdmsaf
WZaQ3760UGRHGh1g332U8FO2W1gRIqh1HUHsm9dInABvXbJbkggNm9ICwPsBigK4
0cN9K+Pv78wcoQEfZ6qD8d5DATlgCsbxBEDbaCulFsDk6M3jqbhXAw0iO1cOPtjd
MJjzbnzF3nWvHTwMy3qAN5LmlY4k3mKRAGtNlj6rJhd4wH/M8VsvoB1wfASbfy5V
AgMBAAE=
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
