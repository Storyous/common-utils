'use strict';

/*
 Copy-pasted from https://github.com/emartech/cls-adapter
 As it is in private space, there can be some issues in future, better to have it here directly.
 It also allows updates of the code if necessary
 */

/* eslint-disable */

const continuationLocalStorage = require('cls-hooked');
const { generateRandomAlphanumeric } = require('../utils');

const correlationIdHeader = 'x-correlation-id';
const sessionIdHeader = 'x-session-id';

// lowercase, uppercase and numbers contains about 60 different characters
// having length of 6 allows 60^6=46,656,000,000 possibilities which means we barely get any conflict
// and even if we do so - correlationId is not unique-critical functionality, while
// having it short allows rewriting it by hand from i.e. image or some graphs
const correlationIdLength = 6;

class ContextFactory {
    static getKoaMiddleware () {
        const namespace = this.createNamespace();

        return async function (ctx, next) {
            await new Promise(namespace.bind(function (resolve, reject) {
                const correlationId = ctx.get(correlationIdHeader) || generateRandomAlphanumeric(correlationIdLength);
                const sessionId = ctx.get(sessionIdHeader) || ctx.get('x-device-id') || ctx.get('deviceid') || null;
                ContextFactory.initializeCorrelationSessionId(namespace, correlationId, sessionId);

                ctx.set(correlationIdHeader, correlationId);
                if (sessionId) {
                    ctx.set(sessionIdHeader, sessionId);
                }

                namespace.bindEmitter(ctx.req);
                namespace.bindEmitter(ctx.res);

                next()
                    .then(resolve)
                    .catch(reject);
            }));
        };
    }

    // static getExpressMiddleware () {
    //     const namespace = this.createNamespace();
    //
    //     return (req, res, next) => {
    //         namespace.bindEmitter(req);
    //         namespace.bindEmitter(res);
    //
    //         namespace.run(() => {
    //             namespace.set(
    //                 'correlationId',
    //                 req.headers[correlationIdHeader] || generateRandomAlphanumeric(correlationIdLength)
    //             );
    //
    //             next();
    //         });
    //     };
    // }

    /**
     * This will create new context over promise-chain
     * @param {Function} promiseFactory Function that creates promise you want to use bind for
     */
    static bindToPromiseFactory(promiseFactory) {
        const namespace = this.createNamespace();
        return new Promise(
            namespace.bind(
                (resolve, reject) => {
                    this.initializeCorrelationSessionId(namespace, generateRandomAlphanumeric(correlationIdLength));
                    promiseFactory().then(resolve).catch(reject)
                }
            )
        );
    }

    static initializeCorrelationSessionId(namespace, correlationId, sessionId) {
        namespace.set(
            'correlationId',
            correlationId
        );

        if (sessionId) {
            namespace.set('sessionId', sessionId);
        }
    }

    static setAdditionalLogFields (obj) {
        let _obj = { ...obj };
        const existing = this.getContextStorage().additional;
        if (existing) {
            _obj = {
                ...existing,
                ..._obj,
            }
        }

        this.setOnContext('additional', _obj);
    }

    static getAdditionalLogFields() {
        const additional = this.getContextStorage().additional;
        if (!additional) {
            return { };
        }
        return additional;
    }


    static run (callback) {
        const namespace = this.createNamespace();

        return namespace.runAndReturn(callback);
    }

    static setOnContext (key, value) {
        const namespace = this.createNamespace();
        namespace.set(key, value);
    }

    static getContextStorage () {
        if (this._namespace && this._namespace.active) {
            const {
                id,
                _ns_name,
                ...contextData
            } = this._namespace.active;
            return contextData;
        }

        return {};
    }

    static getCorrelationId () {
        if (!this.getContextStorage().correlationId) {
            return 'notdefined';
        }
        return this.getContextStorage().correlationId;
    }

    static getSessionId () {
        return this.getContextStorage().sessionId;
    }

    static addContextStorageToInput () {
        return (input) => Object.assign({}, input, this.getContextStorage());
    }

    static addCorrelationIdToInput () {
        return (input) => Object.assign({}, input, { correlationId: this.getCorrelationId() });
    }

    static destroyNamespace () {
        if (this._namespace) {
            continuationLocalStorage.destroyNamespace('session');
            this._namespace = null;
        }
    }

    static createNamespace () {
        if (!this._namespace) {
            this._namespace = continuationLocalStorage.createNamespace('session');
        }
        return this._namespace;
    }
}

module.exports = ContextFactory;
