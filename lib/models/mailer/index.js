'use strict';

const nodemailer = require('nodemailer');
const config = require('../../config');
const logger = require('../log').module('mailer');
const MailSender = require('./mailSender');

/**
 * @typedef {{
 *      messageId?: string,
 *      envelope: Object,
 *      accepted: string[],
 *      rejected: string[],
 *      pending: string[],
 *      response: string
 * }} SentMailInfo
 */

/**
 * @typedef {{
 *      from: string,
 *      to: string,
 *      subject: string,
 *      text?: string,
 *      html?: string
 * }} MailOptions
 */


const mailer = {

    /**
     * @type {Nodemailer}
     */
    _transporter: null,

    /**
     * RFC 2822 standard
     * @type RegExp
     */
    _emailAddressRegexp: /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/,


    _initialize () {
        this._transporter = nodemailer.createTransport(config.mailer.transporter);
    },


    /**
     *
     * @param {MailSenderOptions} defaultMailOptions
     * @returns {MailSender}
     */
    createSender (defaultMailOptions) {

        defaultMailOptions.from = config.mailer.transporter.auth.user;

        return new MailSender(defaultMailOptions, this.sendMail.bind(this));
    },


    /**
     * @param {MailOptions} mailOptions
     * @returns {Promise.<SentMailInfo>}
     */
    sendMail (mailOptions) {
        return new Promise((resolve, reject) => {
            this._transporter.sendMail(mailOptions, (err, info) => {
                if (err) {
                    reject(err);
                } else {
                    this._logSentMail(mailOptions, info || {});
                    resolve(info);
                }
            });
        });
    },


    /**
     * @param {MailOptions} mailOptions
     * @param {SentMailInfo} resultInfo
     * @private
     */
    _logSentMail (mailOptions, resultInfo) {

        const extractEmail = this._extractEmail.bind(this);

        const logMetaInfo = {
            subject: mailOptions.subject,
            to: mailOptions.to.split(',').map(extractEmail)
        };

        if (resultInfo.accepted && resultInfo.accepted.length) {
            logMetaInfo.accepted = resultInfo.accepted.map(extractEmail);
        }

        if (resultInfo.rejected && resultInfo.rejected.length) {
            logMetaInfo.rejected = resultInfo.rejected.map(extractEmail);
        }

        if (resultInfo.pending && resultInfo.pending.length) {
            logMetaInfo.pending = resultInfo.pending.map(extractEmail);
        }

        logger.i('Mail sent', logMetaInfo);
    },


    _extractEmail (emailText) {
        const result = emailText.match(this._emailAddressRegexp);
        return result ? result[0] : '';
    }

};

module.exports = mailer;
