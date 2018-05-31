'use strict';

const filter = {

    SHORT_WORD: 2,

    _cachedReplaceList: null,

    /**
     *
     * @param {string|Array} wordOrArray
     * @returns {Array}
     */
    stringToSearchArray (wordOrArray) {

        const ret = [];
        let iterate = arguments; // eslint-disable-line

        if (wordOrArray instanceof Array) {
            iterate = wordOrArray;
        }

        for (let i = 0; i < iterate.length; i++) {
            this._toSearchArray(iterate[i], ret);
        }

        return ret;
    },

    /**
     *
     * @param {string} searchString
     * @returns {Array}
     */
    searchStringToChunks (searchString) {
        return this._toSearchArray(searchString)
            .map(function (word) {
                return new RegExp(`^${this.escapeRegex(word)}`);
            }, this);
    },

    _toSearchArray (word, ret) {
        const start = this._replaceSpecials(word).toLowerCase();
        const split = start.split(/\s/);

        if (ret && ret.indexOf(start) === -1) {
            ret.push(start);
        } else if (!ret) {
            ret = [start];
        }

        if (split.length > 1) {
            split.forEach(function (chunk) {
                const rep = chunk.replace(/[^a-z0-9]+/g, '_');
                if (rep.length > this.SHORT_WORD) {
                    if (ret.indexOf(rep) === -1) {
                        ret.push(rep);
                    }
                }
            }, this);
        }
        return ret;
    },

    /**
     * @param {string} search
     * @param {string} fieldName
     * @returns {Array}
     *
     */
    generateQueryOr (search, fieldName) {
        const queryOr = [];
        const queryAnd = [];

        const chunksArr = filter.searchStringToChunks(search);

        if (chunksArr.length > 1) {
            const searchStringRegex = chunksArr.shift();

            const or = {};
            or[fieldName] = searchStringRegex;
            queryOr.push(or);
        }

        chunksArr.forEach((regex) => {
            const and = {};
            and[fieldName] = regex;
            queryAnd.push(and);
        });

        queryOr.push({ $and: queryAnd });
        return queryOr;
    },

    /**
     *
     * @param {string} word
     * @returns {string}
     */
    escapeRegex (word) {
        return word.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&'); // eslint-disable-line
    },

    _replaceSpecials (word) {
        if (this._cachedReplaceList === null) {
            const list = [];

            const from = 'ÄäÀàÁáÂâÃãÅåǍǎĄąĂăÆæÇçĆćĈĉČčĎđĐďðÈèÉéÊêËëĚěĘęĜĝĢģĞğĤĥÌìÍíÎîÏïıĴĵĶķĹĺĻļŁłĽ'
                + 'ľÑñŃńŇňÖöÒòÓóÔôÕõŐőØøŒœŔŕŘřẞßŚśŜŝŞşŠšŤťŢţÞþÜüÙùÚúÛûŰűŨũŲųŮůŴŵÝýŸÿŶŷŹźŽžŻż';
            const replace = 'AaAaAaAaAaAaAaAaAaAaCcCcCcCcDdDddEeEeEeEeEeEeGgGgGgHhIiIiIiIiiJjKkLlLlLlL'
                + 'lNnNnNnOoOoOoOoOoOoOoOoRrRrSsSsSsSsSsTtTtTtUuUuUuUuUuUuUuUuWsYyYyYyZzZzZz';

            for (let i = 0; i < from.length; i++) {
                list.push({
                    f: new RegExp(from[i], 'g'),
                    t: replace[i]
                });
            }

            this._cachedReplaceList = list;
        }

        for (let k = 0; k < this._cachedReplaceList.length; k++) {
            word = word.replace(this._cachedReplaceList[k].f, this._cachedReplaceList[k].t);
        }

        return word;
    },

    normalize (word) {

        word = this._replaceSpecials(word)
            .toLowerCase()
            .replace(/[^a-z0-9:\-%]+/g, '_').replace(/(^_+)|(_+$)/g, '');

        return word;
    },

    normalizeForTranslations (word) {

        word = this._replaceSpecials(word)
            .replace(/[^a-z0-9:?!.\-%]+/gi, '_').replace(/(^_+)|(_+$)/g, '');

        return word;
    },

    /**
     *
     * @param {object} obj
     * @param {object} forbiddenDbObject
     * @returns {object}
     */
    deleteForbidden (obj, forbiddenDbObject) {

        for (const key in forbiddenDbObject) {
            if (Object.hasOwnProperty.call(forbiddenDbObject, key)
                && typeof obj[key] !== 'undefined') {

                delete obj[key];
            }
        }

        return obj;
    }

};

module.exports = filter;
