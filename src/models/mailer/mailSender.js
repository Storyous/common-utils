/**
 * Created by Václav Oborník, on 10. 8. 2015.
 * updated by vojtechmalek 22.9.2015
 */

'use strict';

/**
 * @typedef {{
 *      htmlTemplatePath?: string,
 *      textTemplatePath?: string,
 *      subject?: string
 * }} MailSenderOptions
 */


const handlebars = require('handlebars');
const _ = require('lodash');
const config = require('../../config');
const AppError = require('../../appError');

/**
 * Provides shortcut for sending email
 *
 * @param {function (MailOptions): Promise.<SentMailInfo> } sendFunction
 * @param {MailSenderOptions} options
 */

function MailSender (options, sendFunction) {

    this._sendFunction = sendFunction;

    this._sendTo = options.to;

    this._sendFrom = options.from;

    this._tempate = options.template;
}

MailSender.prototype = {

    _tempate: null,

    _sendFunction: null,

    _subject: null,

    _htmlTemplate: null,

    _textTemplate: null,

    _sendTo: null,

    _sendFrom: null,


    _getTemplate (params) {

        const compiledTemplate = handlebars.compile(params.template)(params);

        const separatorRegexp = /<!--\s*\/([a-zA-Z0-9]+)\s*-->/;
        const templatePieces = compiledTemplate.split(separatorRegexp);

        templatePieces.shift(); // remove first blank string

        if (templatePieces.length % 2 !== 0) {
            throw AppError.internal('The template is not valid.');
        }

        const template = {};
        for (let i = 0; i < templatePieces.length; i += 2) {
            template[templatePieces[i]] = templatePieces[i + 1];
        }

        if (template.subject) {
            template.subject = template.subject.trim();
        }

        return template;
    },

    _getLanguageFromParams (params) {

        if (params.lang) {
            return params.lang;
        }

        if (params.person && params.person.lang) {
            return params.person.lang;
        }

        return config.defaultLanguage;
    },

    _completeParams (params) {
        return _.extend({}, params, {
            lang: this._getLanguageFromParams(params),
            to: params.to || this._sendTo,
            from: params.from || this._sendFrom,
            template: params.template || this._tempate
        });
    },

    /**
     * @param {{
     *      to?: string|string[],
     *      replyTo?: string|string[],
     *      lang?: string
     *      person?: Object,
     *      bcc?: string|string[],
     *      cc?: string|string[]
     * }} params - the templates params
     * @returns {Promise.<SentMailInfo>}
     *
     */
    async send (params) {

        params = this._completeParams(params);

        const template = this._getTemplate(params);

        const mailOptions = {
            html: template.html,
            text: template.text,
            subject: template.subject,
            to: params.to,
            from: this._sendFrom,
            replyTo: params.replyTo,
            bcc: params.bcc,
            cc: params.cc
        };

        if (Array.isArray(mailOptions.to)) {
            mailOptions.to = mailOptions.to.join(',');
        }

        if (Array.isArray(mailOptions.replyTo)) {
            mailOptions.replyTo = mailOptions.replyTo.join(',');
        }

        if (Array.isArray(mailOptions.bcc)) {
            mailOptions.bcc = mailOptions.bcc.join(',');
        }

        if (Array.isArray(mailOptions.cc)) {
            mailOptions.cc = mailOptions.cc.join(',');
        }

        return this._sendFunction(mailOptions);
    }

};


module.exports = MailSender;
