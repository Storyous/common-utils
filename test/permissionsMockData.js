const validArrayInputs = [
    [true, true, true, false, false, true],
    [false, false, false, true, true],
    [true, false, false, false, false],
    [true,false,true,false],
    [true,false,true,false,true,false,true,false]];

const invalidArrayInputs = [
    [true, true, true, 0],
    [true, false, true, false, 1],
    [true, true, false, false, 'false'],
    [true, true, true, false, false, 'true'],
    [true, true, true, false, false, {}]
    ];

const expectedHexResult = ['e4', '18', '80',"a","aa"];
const validHexInput=['e4', '18', '80',"a","Aa"]
const expectedArrayResult = [
    [true, true, true, false, false, true, false, false],
    [false, false, false, true, true, false, false, false],
    [true, false, false, false, false, false, false, false],
    [true,false,true,false],
    [true,false,true,false,true,false,true,false]
];

const invalidHexInputs = ['12W', '22an', true];
module.exports = {
    validArrayInputs, expectedHexResult, invalidArrayInputs, validHexInput,invalidHexInputs, expectedArrayResult,
};
