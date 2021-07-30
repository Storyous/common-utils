const validArrayInputs = [[true, true, true, false, false, true],
    [false, false, false, true, true], [true, false, false, false, false]];

const invalidArrayInputs = [
    [true, true, true, 0],
    [true, false, true, false, 1],
    [true, true, false, false, 'false'],
    [true, true, true, false, false, 'true']];

const expectedHexResult = ['E4', '18', '80'];

const expectedArrayResult = [[true, true, true, false, false, true, false, false],
    [false, false, false, true, true, false, false, false], [true, false, false, false, false, false, false, false]];

const invalidHexInputs = ['12W', '22a', true];
module.exports = {
    validArrayInputs, expectedHexResult, invalidArrayInputs, invalidHexInputs, expectedArrayResult,
};
