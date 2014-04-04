var _ = require('lodash')
  , mpath = require('mpath')
  , color = require('cli-color')
  , async = require('async');

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
  if (!(this instanceof Mapper))
    return new Mapper(obj, options);

  if(!_.isArray(map) || !map.length)
    throw new Error( "Map is not array" );

  this._map = map;
  this.options = this.defaultOptions({
    parallel: false,
    limit: false,
    debug: false
  }, options);
}

/**
 * Returns default options for this schema, merged with `options`.
 *
 * @param {Object} options
 * @return {Object}
 * @api private
 */
Mapper.prototype.defaultOptions = function(defaults, options){
  var keys = Object.keys(defaults)
    , i = keys.length
    , k ;

  options = options || {};

  while (i--) {
    k = keys[i];
    if (!(k in options)) {
      options[k] = defaults[k];
    }
  }

  return options;
};

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
      , srcValue = {};

    mapper._debug(' Transfer from ' + srcPath + ' to ' + ((_.isFunction(dstPath))? 'function': dstPath) + ' is started');

    if(_.isArray(srcPath)) {
      _.each(srcPath, function(path) {
        srcValue[path] = getValue(path, src);
      });
    }else{
      srcValue = getValue(srcPath, src);
    }

    if( _.isFunction( dstPath ) ) {
      if( dstPath.length == 4 ) {
        dstPath(srcValue, dst, src, function( err, map ){
          if(err) return next(err);

          if(map && _.isObject(map))
            setValue(map, dst);

          next();
        });
      }else{
        setValue( dstPath(srcValue, dst, src), dst );
        next();
      }
    }else{
      var map = {};
      map[dstPath] = srcValue;
      setValue(map, dst);
      next();
    }
  }, function(err){
    if(err){
      mapper._debug('error', err);
      return done(err);
    }
    mapper._debug('notice', 'Data is transferred.');
    done(null, dst);
  });
};

/**
 * Debug
 *
 * First param may be level.
 * Available levels:
 *  info
 *  error
 *  warn
 *  notice
 *
 * @api private
 */
Mapper.prototype._debug = function(){
  var types = {
      info: color.green,
      error: color.red.bold,
      warn: color.yellow,
      notice: color.blue.bold
    }
    , args = Array.prototype.slice.call(arguments, 0);

  if(this.options.debug) {
    if( types[args[0]] ){
      args[0] = types[args[0]](args[0]) + ': ';
    }else{
      args.unshift(types.info('info: '));
    }

    console.log.apply(null, args);
  }
};

module.exports = Mapper;