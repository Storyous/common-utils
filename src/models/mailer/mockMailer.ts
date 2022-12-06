'use strict';

const nodemailerMockTransport = require('nodemailer-mock-transport');
const nodemailer = require('nodemailer');
const mailer = require('./index');
const { beforeEach, afterEach } = require('mocha');

module.exports = {

    get sentMail () {
        return this._mockTransporter.sentMail;
    },

    _originalTransporter: null,

    _mockTransporter: null,

    useForBlock () {

        beforeEach(() => {
            this._originalTransporter = mailer._transporter;
            this._mockTransporter = nodemailerMockTransport();
            mailer._transporter = nodemailer.createTransport(this._mockTransporter);
        });

        afterEach(() => {
            mailer._transporter = this._originalTransporter;
        });

    }

};
