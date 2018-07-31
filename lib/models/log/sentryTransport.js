'use strict';

const _ = require('lodash');
const Sentry = require('@storyous/winston-raven-sentry');


class SentryTransport extends Sentry {

    _normalizeExtra (msg, meta) {
        if (_.isObject(meta)) {
            meta.extra = _.omit(meta, ['extra', 'err']);
        }
        return super._normalizeExtra(msg, meta);
    }
}

module.exports = SentryTransport;
