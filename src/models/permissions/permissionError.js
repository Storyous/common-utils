const  AppError = require("../../appError")

class InvalidInputError extends AppError {

    /**
     * @param {string|boolean[]} input
     */
    constructor (input) {
        super('Invalid input');
        this.data = input;
    }
}

module.exports = { InvalidInputError };
