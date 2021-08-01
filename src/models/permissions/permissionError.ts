'use strict';

import AppError from "../../appError";
export = InvalidInputError
 class InvalidInputError extends AppError {
    readonly data: boolean[]|string
    /**
     * @param {string|boolean[] | string} input
     */
    constructor (input:boolean[]|string) {
        super('Invalid input');
        this.data = input;
    }
}

