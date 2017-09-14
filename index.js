'use strict';

require('./monkey-patch');

const mpath = require('mpath');
const debug = require('debug')('mapper');


/**
 * mapper
 *
 * #### Example
 *
 * const oldObj = {
 *       username: 'Maksim Chetverikov',
 *       avatar: '2fge0923df08r.jpg',
 *       country: 'Russia'
 *       city: 'Irkutsk'
 *     }
 * const newObj = {
 *       firstname: '',
 *       lastname: '',
 *       avatar: '',
 *       address: ''
 *    };
 *
 * const map = [
 *   username: function( value ){
 *      const parts = username.split(' ');
 *
 *      return {firstname: parts[0], lastname: parts[1]};
 *   },
 *   avatar: 'avatar',
 *   'country city': function( value ){
 *     return {'address': value.country + ', ' + value.city}
 *   }
 * ];
 *
 * const mapper = new Mapper( map );
 *
 * mapper.transfer( oldObj, newObj, function( err, obj ){
 *     console.log( obj );
 * });
 *
 *
 *
 * @param map
 * @param options
 * @returns {Mapper}
 * @constructor
 */
class Mapper {
  constructor(map, options) {
    if (!map || typeof map !== 'object') {
      throw new TypeError('Map is not object');
    }

    if (!options) {
      options = {};
    }

    this._map = map;
    this._keys = Object.keys(this._map) || [];

    if (!this._keys) {
      throw new TypeError('Map is empty');
    }

    this.options = Object.assign({}, {
      skipError: false,
      skipFields: '',
      delimiter: ' '
    }, options);
  }

  /**
   * Set value to destination object
   *
   * @param map
   * @param dstObj
   */
  setValue(map, dstObj) {
    if (map !== undefined) {
      Object.keys(map).forEach(where => {
        const what = map[where];
        if (what !== undefined) {
          mpath.set(where, what, dstObj);
        }
      });
    }
  }

  /**
   * Get value from source object
   *
   * @param path
   * @param obj
   * @returns {*}
   */
  getValue(path, obj) {
    if (path) {
      return mpath.get(path, obj);
    }

    return undefined;
  }

  /**
   *
   * @param {String} source_path
   * @returns {*}
   */
  extractor(source_path) {
    const paths = source_path.split(this.options.delimiter);
    const len = paths.length;
    let value, key;
    let i = 0;

    debug('Initiated the transfer from %s', paths);

    if (len > 1) {
      value = {};

      while (i < len) {
        key = paths[i++];
        value[key] = this.getValue(key, this._src);
      }
    } else {
      value = this.getValue(source_path, this._src);
    }

    return value;
  }

  /**
   *
   * @param value
   * @returns {Object}
   */
  bridge(value) {
    const obj = {};

    obj[this.handler] = value;

    return obj;
  }

  /**
   *
   * @param {Object} map { where: what }
   */
  injector(map) {
    if (Boolean(map) && typeof map === 'object') {
      this.setValue(map, this._dst);
    }
  }

  /**
   *
   * @param value
   * @param {String|Function} handler
   * @returns {Promise}
   */
  executor(value, handler) {
    const context = {src: this._src, dst: this._dst, handler};

    if (value != null) {
      const func = (typeof handler === 'function') ? handler : this.bridge;

      return new Promise(resolve => resolve(func.call(context, value)))
        .then(result => this.injector(result))
        .catch(reason => {
          if (!this.options.skipError) {
            throw reason;
          }
        });
    }
  }

  /**
   *
   * @param {Promise} promise
   * @param {String|Function} handler
   * @param {String} source_path
   * @returns {Promise}
   */
  reduceHandler(promise, handler, source_path) {
    const skipFields = this.options.skipFields;
    const delimiter = this.options.delimiter;
    let paths = source_path.split(delimiter);

    paths = paths.filter(path => skipFields.indexOf(path) === -1);

    if (!paths.length) {
      return promise;
    }

    return promise
      .then(() => this.extractor(paths.join(delimiter)))
      .then(value => this.executor(value, handler));
  }

  /**
   * The transfer of data
   * from the source object to
   * the destination object using
   * the map is set in the constructor.
   *
   * @param src
   * @param dst
   * @returns {*}
   */
  transfer(src, dst) {
    if (!src || typeof src !== 'object' || !dst || typeof dst !== 'object') {
      return Promise.reject(new TypeError('Source or destination is not object'));
    }

    this._src = src;
    this._dst = dst;

    return Object
      .keys(this._map)
      .reduce((accumulator, source_path) => this.reduceHandler(accumulator, this._map[source_path], source_path), Promise.resolve())
      .then(() => dst);
  }
}

module.exports = Mapper;
