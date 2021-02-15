'use strict';

const nodemailerMockTransport = require('nodemailer-mock-transport');
const nodemailer = require('nodemailer');
const mailer = require('./index');


module.exports = {

    get sentMail () {
        return this._mockTransporter.sentMail;
    },

    _originalTransporter: null,

    _mockTransporter: null,

    useForBlock (mocha: { beforeEach: (arg0: () => void) => void; afterEach: (arg0: () => void) => void; }) {

        mocha.beforeEach(() => {
            this._originalTransporter = mailer._transporter;
            this._mockTransporter = nodemailerMockTransport();
            mailer._transporter = nodemailer.createTransport(this._mockTransporter);
        });

        mocha.afterEach(() => {
            mailer._transporter = this._originalTransporter;
        });

    }

};
