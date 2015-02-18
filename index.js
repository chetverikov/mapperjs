var _ = require('lodash')
  , mpath = require('mpath')
  , debug = require('debug')('mapper')
  , async = require('async')
  , reg_dollar_exist = /\$/
  , isNum = /^\d+$/;

// wait https://github.com/aheckmann/mpath/pull/6
function K ( v ){ return v; };
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
 *   ['username', function( value ){
 *                    var parts = username.split(' ');
 *
 *                    return {'firstname': parts[0], 'lastname': parts[1]};
 *                }],
 *   ['avatar', 'avatar'],
 *   [['country', 'city'], function( value ){
 *                            return {'address': value.country + ', ' + value.city}
 *                         }]
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
  if(!_.isArray(map) || !map.length)
    throw new Error( "Map is not array" );

  if(!options){
    options = {};
  }

  this._map = map;
  this.options = _.defaults( options, {
    parallel: false,
    limit: false,
    skipError: false,
    skipFields: ''
  });

  this._skip = this.options.skipFields.split(' ');
}

/**
 * Set value to destination object
 *
 * @param map
 * @param dstObj
 */
function setValue(map, dstObj){
  if(map !== undefined)
    _.each( map, function( what, where ){
      if( what !== undefined )
        mpath.set( where, what, dstObj );
    });
}

/**
 * Get value from source object
 *
 * @param path
 * @param obj
 * @returns {*}
 */
function getValue( path, obj ){
  if(path)
    return mpath.get(path, obj);

  return undefined;
}

/**
 * The transfer of data
 * from the source object to
 * the destination object using
 * the map is set in the constructor.
 *
 * @param src
 * @param dst
 * @param done
 * @returns {*}
 */
Mapper.prototype.transfer = function( src, dst, done ){
  if(!_.isObject(src) || !_.isObject(dst))
    return done(new Error("Source or destination object is not object"));

  // TODO: eachLimit!
  var mapper = this
    , mode = (mapper.parallel)? ((!mapper.limit || mapper.limit < 2)? 'eachSeries': 'eachLimit'): 'each';

  async[mode](mapper._map, function( row, next ){
    if(!_.isArray(row) || row.length < 2)
      return next(new Error("One of the elements of the map is not binary"));

    var srcPath = row[0]
      , dstPath = row[1]
      , srcValue = {}
      , end = function(){ //err, srcPath, dstPath
        var args = Array.prototype.slice.call( arguments, 0 );

        debug('Transfer from %s to %s %s', args[1], args[2], !args[0]? 'is completed': 'is error' );

        if(this.options.skipError){
          args[0] = null;
        }

        next.apply(this, args);
      }.bind(this);

    if(_.indexOf(mapper._skip, srcPath) !== -1){
      debug('Skip %s', srcPath);
      return next();
    }

    debug('Initiated the transfer from %s', srcPath);

    if(_.isArray(srcPath)) {
      _.each(srcPath, function(path) {
        srcValue[path] = getValue(path, src);
      });
    }else{
      srcValue = getValue(srcPath, src);
    }

    if( _.isFunction( dstPath ) ) {
      if( dstPath.length == 4 ) {
        return dstPath(srcValue, dst, src, function( err, map ){
          if(!err && map && _.isObject(map))
            setValue(map, dst);

          var args = [ err ];

          args.push( srcPath );
          args.push( _.keys(map) );

          return end.apply(this, args);
        });
      }else{
        var tmp = dstPath(srcValue, dst, src);
        setValue( tmp, dst );
        return end(null, srcPath, _.keys(tmp));
      }
    }else{
      var map = {};
      map[dstPath] = srcValue;
      setValue(map, dst);
      return end(null, srcPath, dstPath);
    }
  }.bind(this), function(err){
    if(err){
      debug('error %s', err);
      return done(err);
    }
    debug('Data is transferred.');
    done(null, dst);
  });
};

module.exports = Mapper;