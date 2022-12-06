'use strict';

require('./config/index'); // eslint-disable-line import/order
const { describe, it } = require('mocha');
const assert = require('assert');
const mailer = require('../lib/models/mailer');
const mockMailer = require('../lib/models/mailer/mockMailer');

describe('mailer', () => {

    mockMailer.useForBlock();

    it('should work', async () => {
        // await mailer._initialize();

        const template = '<!-- /subject -->'
            + 'Hello {{name}}'
            + '<!-- /html -->'
            + 'Dear <em>{{name}}</em>, nice to hear from you.';

        const sender = mailer.createSender({ template });

        await sender.send({
            from: 'from@saltpay.co',
            to: 'to@saltpay.co',
            name: 'John Doe'
        });

        const sentMail = mockMailer.sentMail[0];

        assert.deepStrictEqual(sentMail.data, {
            from: 'from@saltpay.co',
            to: 'to@saltpay.co',
            bcc: undefined,
            cc: undefined,
            replyTo: undefined,
            subject: 'Hello John Doe',
            headers: {},
            html: 'Dear <em>John Doe</em>, nice to hear from you.',
            text: undefined
        });

        assert.strictEqual(sentMail.message.content, 'Dear <em>John Doe</em>, nice to hear from you.');
    });

});
