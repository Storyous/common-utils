'use strict';


const configuration = {


    /* CONSTANTS */
    DEVELOPMENT: 'development',
    PRODUCTION: 'production',
    TESTING: 'testing',
    TEST: 'test',

    _initialized: false,

    production: false,

    /**
     * System environment
     */
    env: null,

    /**
     * Call me once after run
     */
    init () {
        if (!this._initialized) {
            this.env = process.env.NODE_ENV || this.DEVELOPMENT;

            try {
                const defaultConfigFile = this._getDefaultConfigFile();
                if (defaultConfigFile) {
                    this._merge(require(this._getDefaultConfigFile())); // eslint-disable-line
                }

                const environmentSpecificConfigFile = this._getEnvSpecificConfigFile(this.env);
                if (environmentSpecificConfigFile) {
                    this._merge(require(environmentSpecificConfigFile)); // eslint-disable-line
                }
            } catch (e) {
                console.error('Can\'t load configuration', e); // eslint-disable-line
            }

            this._initialized = true;
        }
    },

    /**
     * Returns if is in production mode
     *
     * @returns {boolean}
     */
    isProduction () {
        return this.env === this.PRODUCTION;
    },

    /**
     * Constructs testing DB name for testing pipelines from desired prefix and commit hash if present.
     * Makes sure that the desired database name does not exceed MongoDB's length limit of database name when
     * constructing with commit hash.
     *
     * @param {string} prefix
     * @param {string} [commit]
     * @returns {string}
     */
    constructTestingDbName (prefix, commit = null) {

        if (commit && prefix.length > 16) {
            prefix = prefix.slice(0, 16);
        }

        return commit
            ? `${prefix}${commit.slice(0, 16)}`
            : prefix;
    },

    /**
     * Returns environment specific configuration file name
     *
     * @param env {string} current environment
     * @returns {string|null}
     * @private
     */
    _getEnvSpecificConfigFile (env) { // eslint-disable-line
        return null;
    },

    /**
     * Returns default configuration file name
     *
     * @returns {string|null}
     * @private
     */
    _getDefaultConfigFile () {
        return null;
    },

    /**
     * Merge configuration files
     *
     * @param replaceWith
     * @param defaults
     * @private
     */
    _merge (replaceWith, defaults) {
        defaults = defaults || this;

        for (const k in replaceWith) {
            if (!Object.prototype.hasOwnProperty.call(replaceWith, k)) {
                continue;
            }
            if (typeof replaceWith[k] !== 'object' || replaceWith[k] === null || Array.isArray(replaceWith[k])
                || typeof defaults[k] !== 'object' || defaults[k] === null) {

                defaults[k] = replaceWith[k];
            } else {
                this._merge(replaceWith[k], defaults[k]);
            }
        }
    }
};

module.exports = configuration;
