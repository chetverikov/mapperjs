'use strict';

const isObject = require('lodash.isobject');
const isFunction = require('lodash.isfunction');
const defaults = require('lodash.defaults');
const mpath = require('mpath');
const debug = require('debug')('mapper');
const reg_dollar_exist = /\$/;
const isNum = /^\d+$/;

// wait https://github.com/aheckmann/mpath/pull/6
function K(v) {
  return v;
}
mpath.set = function(path, val, o, special, map, _copying, workWithArray) {
  var lookup;

  if ('function' == typeof special) {
    if (special.length < 2) {
      map = special;
      special = undefined;
    } else {
      lookup = special;
      special = undefined;
    }
  }

  map || (map = K);

  var parts = 'string' == typeof path
    ? path.split('.')
    : path;

  if (!Array.isArray(parts)) {
    throw new TypeError('Invalid `path`. Must be either string or array');
  }

  if (null == o) return;

  // the existance of $ in a path tells us if the user desires
  // the copying of an array instead of setting each value of
  // the array to the one by one to matching positions of the
  // current array.
  var copy = _copying || reg_dollar_exist.test(path)
    , obj = o
    , part;

  for (var i = 0, len = parts.length - 1; i < len; ++i) {
    part = parts[i];

    if ('$' == part) {
      if (i == len - 1) {
        break;
      } else {
        continue;
      }
    }

    if (Array.isArray(obj) && !isNum.test(part)) {
      var paths = parts.slice(i);

      workWithArray = true;

      if (!copy && Array.isArray(val)) {
        for (var j = 0; j < obj.length && j < val.length; ++j) {
          // assignment of single values of array
          exports.set(paths, val[j], obj[j], special || lookup, map, copy);
        }
      } else {
        for (var j = 0; j < obj.length; ++j) {
          // assignment of entire value
          exports.set(paths, val, obj[j], special || lookup, map, copy);
        }
      }
      return;
    }

    if (!obj[part]) {
      if (parts[i + 1] && parts[i + 1] == '$' && !parts[i + 2]) {
        obj[part] = [];
      }

      if (!workWithArray && parts[i + 1] != '$') {
        obj[part] = {};
      }
    }

    if (lookup) {
      obj = lookup(obj, part);
    } else {
      obj = special && obj[special]
        ? obj[special][part]
        : obj[part];
    }

    if (!obj) return;
  }

  // process the last property of the path
  part = parts[len];

  // use the special property if exists
  if (special && obj[special]) {
    obj = obj[special];
  }

  // set the value on the last branch
  if (Array.isArray(obj) && !isNum.test(part)) {
    if (!copy && Array.isArray(val)) {
      for (var item, j = 0; j < obj.length && j < val.length; ++j) {
        item = obj[j];
        if (item) {
          if (lookup) {
            lookup(item, part, map(val[j]));
          } else {
            if (item[special]) item = item[special];
            item[part] = map(val[j]);
          }
        }
      }
      // push element in array
    } else if (Array.isArray(obj) && part == '$') {
      obj.push(map(val));
    } else {
      for (var j = 0; j < obj.length; ++j) {
        item = obj[j];
        if (item) {
          if (lookup) {
            lookup(item, part, map(val));
          } else {
            if (item[special]) item = item[special];
            item[part] = map(val);
          }
        }
      }
    }
  } else {
    if (lookup) {
      lookup(obj, part, map(val));
    } else {
      obj[part] = map(val);
    }
  }
};

/**
 * mapper
 *
 * #### Example
 *
 * var oldObj = {
 *       username: 'Maksim Chetverikov',
 *       avatar: '2fge0923df08r.jpg',
 *       country: 'Russia'
 *       city: 'Irkutsk'
 *     }
 *   , newObj = {
 *       firstname: '',
 *       lastname: '',
 *       avatar: '',
 *       address: ''
 *    };
 *
 * var map = [
 *   username: function( value ){
 *      var parts = username.split(' ');
 *
 *      return {firstname: parts[0], lastname: parts[1]};
 *   },
 *   avatar: 'avatar',
 *   'country city': function( value ){
 *     return {'address': value.country + ', ' + value.city}
 *   }
 * ];
 *
 * var mapper = new Mapper( map );
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
    if (!isObject(map)) {
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

    this.options = defaults(options, {
      skipError: false,
      skipFields: '',
      delimiter: ' '
    });
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
    var obj = {};
    obj[this.handler] = value;
    return obj;
  }

  /**
   *
   * @param {Object} map { where: what }
   */
  injector(map) {
    if (map && isObject(map)) {
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
      const func = (isFunction(handler)) ? handler : this.bridge;
      const defer = Promise.defer();

      Promise
        .resolve(value)
        .then(value => func.call(context, value))
        .then(result => defer.resolve(result))
        .catch(reason => this.options.skipError ? defer.resolve() : defer.reject(reason));

      return defer
        .promise
        .then(result => this.injector(result));
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
    if (!isObject(src) || !isObject(dst)) {
      return Promise.reject(new TypeError('Source or destination is not object'));
    }

    this._src = src;
    this._dst = dst;

    const promise = Object
      .keys(this._map)
      .reduce((accumulator, source_path) => this.reduceHandler(accumulator, this._map[source_path], source_path), Promise.resolve());

    return promise.then(() => dst);
  }
}

module.exports = Mapper;
