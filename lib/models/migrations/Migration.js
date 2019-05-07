
'use strict';


class Migration {

    /**
     * @param description
     * @param {Function.<Promise.<void>>} up
     * @param {Function.<Promise.<void>>} [down=Function]
     */
    constructor (description, up, down = () => null) {
        this.description = description;

        // NOTE 'up' and 'down' has to be as properties because of 'migrate' package

        this.up = (next) => {
            (async () => {
                await up();
                next();
            })().catch(next);
        };

        this.down = (next) => {
            (async () => {
                await down();
                next();
            })().catch(next);
        };
    }

}

module.exports = Migration;
