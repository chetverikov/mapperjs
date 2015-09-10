var _ = require('lodash')
  , mpath = require('mpath')
  , debug = require('debug')('mapper')
  , vow = require('vow')
  , reg_dollar_exist = /\$/
  , isNum = /^\d+$/;

// wait https://github.com/aheckmann/mpath/pull/6
function K ( v ){ return v; }
mpath.set = function (path, val, o, special, map, _copying, workWithArray) {
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
      if (parts[ i + 1 ] && parts[ i + 1 ] == '$' && !parts[ i + 2 ]){
        obj[part] = [];
      }

      if(!workWithArray && parts[ i + 1 ] != '$'){
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
    } else if (Array.isArray(obj) && part == '$'){
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
function Mapper( map, options ){
  if(!_.isObject(map))
    throw new TypeError( "Map is not object" );

  if(!options){
    options = {};
  }

  this._map = map;
  this._keys = _.keys(this._map) || [];

  if(!this._keys)
    throw new TypeError( "Map is empty" );

  this.options = _.defaults( options, {
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
Mapper.prototype.setValue = function(map, dstObj){
  if(map !== undefined)
    _.each( map, function( what, where ){
      if( what !== undefined )
        mpath.set( where, what, dstObj );
    });
};

/**
 * Get value from source object
 *
 * @param path
 * @param obj
 * @returns {*}
 */
Mapper.prototype.getValue = function(path, obj){
  if(path)
    return mpath.get(path, obj);

  return undefined;
};

Mapper.prototype._extractor = function(){
  var paths = this.source_path.split(this.mapper.options.delimiter)
    , value
    , i = 0
    , len = paths.length
    , key;

  debug('Initiated the transfer from %s', paths);

  if(len > 1) {
    value = {};

    while(i < len) {
      key = paths[i++];
      value[key] = this.mapper.getValue(key, this.src);
    }
  }else{
    value = this.mapper.getValue(this.source_path, this.src);
  }

  return value;
};

Mapper.prototype._bridge = function(value){
  var obj = {};
  obj[this.handler] = value;
  return obj;
};

Mapper.prototype._injector = function( map ){
  if(map && _.isObject(map))
    this.mapper.setValue(map, this.dst);
};

Mapper.prototype._executor = function( value ){
  if(value != null){
    var func = (_.isFunction(this.handler))? this.handler: this.mapper._bridge;
    var defer = vow.defer();

    vow
      .resolve(value)
      .then(func, this)
      .then(defer.resolve.bind(defer), function(reason){
        this.mapper.options.skipError? defer.resolve() : defer.reject(reason);
      }, this);

    return defer.promise().then(this.mapper._injector, this);
  }
};

Mapper.prototype._reduceHandler = function(promise, handler, source_path){
  var context
    , src = this.src
    , dst = this.dst
    , mapper = this.mapper
    , skipFields = mapper.options.skipFields
    , delimiter  = mapper.options.delimiter
    , paths = source_path.split(delimiter);

  paths = paths.filter(function(path){
    return skipFields.indexOf(path) === -1;
  });

  if(!paths.length){
    return promise;
  }

  context = {mapper: mapper, src: src, dst: dst, source_path: paths.join(delimiter), handler: handler};

  return promise.then(mapper._extractor, context).then(mapper._executor, context);
};

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
Mapper.prototype.transfer = function( src, dst ){
  var promise;

  if(!_.isObject(src) || !_.isObject(dst))
    return vow.reject(new TypeError("Source or destination object is not object"));

  promise = _.reduce(this._map, this._reduceHandler, vow.resolve(), {mapper: this, dst: dst, src: src});

  return promise.then(function(){
    return this.dst;
  }, {dst: dst});
};

module.exports = Mapper;