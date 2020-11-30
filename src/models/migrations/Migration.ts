
'use strict';

type NextCallback = (err?: Error) => void;

class Migration {

    description: string

    up: Function

    down: Function

    constructor (description: string, up: Function, down = () => null) {
        this.description = description;

        // NOTE 'up' and 'down' has to be as properties because of 'migrate' package

        this.up = (next: NextCallback) => {
            (async () => {
                await up();
                next();
            })().catch(next);
        };

        this.down = (next: NextCallback) => {
            (async () => {
                await down();
                next();
            })().catch(next);
        };
    }

}

export default Migration;
