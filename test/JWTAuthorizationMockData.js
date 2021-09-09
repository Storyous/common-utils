'use strict';
const { Scope, Restriction } = require('@storyous/storyous-jwt');

exports.mockPayload = {
    clientId: '5c006f700000000000000000',
    deviceId: '5bfec53bef2ca200131988ab',
    personId: '5bfec53bef2ca200131988aa'
};
exports.defaultMerchantId = '123456789abc';

const merchantRestriction = new Restriction('merchantId', exports.defaultMerchantId);
const placeRestrictions = new Restriction('placeId', [
    '5bfec53bef2ca200131988ac',
    '5bfec53bef2ca200131988aa',
    '5bfec53bef2ca200131988ab',
    '5bfec53bef2ca200131988au'
]);
exports.restrictions = [merchantRestriction, placeRestrictions];
exports.scopes = [new Scope(
    'perms',
    exports.restrictions,
    '00F'
)];
exports.expectedPayload = {
    clientId: exports.mockPayload.clientId,
    deviceId: exports.mockPayload.deviceId,
    personId: exports.mockPayload.personId,
    scopes: [
        [
            'perms',
            '00F',
            {
                merchantId: exports.defaultMerchantId,
                placeId: [
                    '5bfec53bef2ca200131988ac',
                    '5bfec53bef2ca200131988aa',
                    '5bfec53bef2ca200131988ab',
                    '5bfec53bef2ca200131988au'
                ]
            }
        ]
    ],
    iss: 'Storyous s.r.o.'
};
