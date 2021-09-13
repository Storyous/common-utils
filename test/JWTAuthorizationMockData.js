'use strict';
const { Scope, Restriction } = require('@storyous/storyous-jwt');

exports.mockPayload = {
    clientId: '5c006f700000000000000000',
    deviceId: '5bfec53bef2ca200131988ab',
    personId: '5bfec53bef2ca200131988aa'
};
exports.mockPlaceIds = [
    '5bfec53bef2ca200131988ac',
    '5bfec53bef2ca200131988aa',
    '5bfec53bef2ca200131988ab',
    '5bfec53bef2ca200131988au'
];
exports.defaultMerchantId = '123456789abc';
exports.defaultPlaceId = '5bfec53bef2ca200131988ac';
const merchantRestriction = new Restriction('merchantId', exports.defaultMerchantId);
const placeRestrictions = new Restriction('placesIds', exports.mockPlaceIds);
const placeRestrictionExtended = new Restriction('placesIds', [...exports.mockPlaceIds, '*']);
exports.restrictions = [merchantRestriction, placeRestrictions];
exports.defaultScopes = [new Scope(
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
                placesIds: [
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
exports.extendedScopes = [new Scope(
    'perms',
    [merchantRestriction, placeRestrictionExtended],
    '00F'
)];
exports.extendedExpectedPayload = {
    clientId: exports.mockPayload.clientId,
    deviceId: exports.mockPayload.deviceId,
    personId: exports.mockPayload.personId,
    scopes: [
        [
            'perms',
            '00F',
            {
                merchantId: exports.defaultMerchantId,
                placesIds: [
                    '5bfec53bef2ca200131988ac',
                    '5bfec53bef2ca200131988aa',
                    '5bfec53bef2ca200131988ab',
                    '5bfec53bef2ca200131988au',
                    '*'
                ]
            }
        ]
    ],
    iss: 'Storyous s.r.o.'
};
exports.createCustomScope = (merchantId, permissions = '0000', resource = 'perms') => [
    new Scope(
        resource,
        [new Restriction('merchantId', merchantId), placeRestrictions],
        permissions
    )
];
