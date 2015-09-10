/**
 * @fileOverview Description file.
 * @author <a href="mailto:ma.chetverikov@gmail.com">Maksim Chetverikov</a>
 */

var Mapper = require('./../')
  , fake = require('./fake.json')
  , vow = require('vow');

require('should');

describe('MapperJs', function() {
  it('default', function(){
    var mapper, dst_obj = {};

    mapper = new Mapper({
      field_string: function( val ){
        return { 'string': val, string_up: val.toUpperCase() };
      },
      field_array_of_string: function( val ){
        var result = [val[0]];

        result.push( this.dst.string );

        return { array_of_string: result };
      }
    });

    return mapper.transfer(fake, dst_obj).then(function( dst ){
      var result = {
        string: 'Foooooo',
        string_up: 'FOOOOOO',
        array_of_string: [
          "one",
          'Foooooo'
        ]
      };

      dst.should.eql( result );
      dst_obj.should.eql( result );
    });
  });
  it('undefined field in src', function( ){
    var map = new Mapper({
      field_string: 'string',
      field_not_exist: 'foo'
    });

    var dst_obj = {};

    return map.transfer( fake, dst_obj ).then(function(dst){
      var result = {
        string: 'Foooooo'
      };

      dst.should.eql( result );
      dst_obj.should.eql( result );
    })
  });
  it('undefined field in src with handler', function( ){
    var map = new Mapper({
      field_string: 'string',
      field_not_exist: function(){
        return {'foo': 'bar'};
      }
    });

    var dst_obj = {};

    return map.transfer( fake, dst_obj ).then(function(dst){
      var result = {
        string: 'Foooooo'
      };

      dst.should.eql( result );
      dst_obj.should.eql( result );
    })
  });

  it('get deep field', function( ){
    var map = new Mapper({
      field_string: 'string',
      'field_object.a.e.f': 'foo'
    });

    var dst_obj = {};

    return map.transfer( fake, dst_obj ).then(function(dst){
      var result = {
        string: 'Foooooo',
        foo: 'fooo'
      };

      dst.should.eql( result );
      dst_obj.should.eql( result );
    })
  });

  it('get array elem deep field ', function(){
    var map = new Mapper({
      field_string: 'string',
      'field_object.a.d.0': 'foo'
    });

    var dst_obj = {};

    return map.transfer( fake, dst_obj ).then(function(dst){
      var result = {
        string: 'Foooooo',
        foo: 1
      };

      dst.should.eql( result );
      dst_obj.should.eql( result );
    })
  });

  it('create deep field in dst', function(){
    var map = new Mapper({
      field_array_of_object: 'i.deep.deep.field'
    });

    var dst_obj = {};

    return map.transfer( fake, dst_obj).then(function(dst){
      var result = {
        i:{
          deep: {
            deep: {
              field: fake.field_array_of_object
            }
          }
        }
      };

      dst.should.eql( result );
      dst_obj.should.eql( result );
    })
  });

  it('create deep field array in dst', function(){
    var map = new Mapper({
        'field_array_of_object.0': 'i.deep.array.$', //create
        'field_array_of_object.1': 'i.deep.array.$'  //add
    });

    var dst_obj = {};

    return map.transfer( fake, dst_obj ).then(function(dst){
      var result = {
        i:{
          deep: {
            array: fake.field_array_of_object
          }
        }
      };

      dst.should.eql( result );
      dst_obj.should.eql( result );
    })
  });

  it('multi field', function(){
    var map = new Mapper({
      'field_object.a.e.f field_string': function( values ){
        return { multi: [values['field_object.a.e.f'], values['field_string']].join(' ') }
      }
    });

    var dst_obj = {};

    return map.transfer( fake, dst_obj).then(function(dst){
      var result = {
        multi: [fake.field_object.a.e.f, fake.field_string].join(' ')
      };

      dst.should.eql( result );
      dst_obj.should.eql( result );
    })
  });

  it('Skip options', function(){
    var map = new Mapper({
      field_string: 'string',
      field_array_of_string: function( val ){
          var result = [val[0]];

          result.push( this.dst.string );

          return { array_of_string: result };
      }
    }, {skipFields: 'field_array_of_string'});

    var dst_obj = {};

    return map.transfer( fake, dst_obj ).then(function(dst){
      var result = {
        string: 'Foooooo'
      };

      dst.should.eql( result );
      dst_obj.should.eql( result );
    })
  });

  it('handler return promise', function(){
    var map = new Mapper({
      field_string: function(value){
        var defer = vow.defer();

        setTimeout(defer.resolve.bind(defer, {string: value}), 50);

        return defer.promise();
      }
    }, {skipFields: 'field_array_of_string'});

    var dst_obj = {};

    return map.transfer( fake, dst_obj ).then(function(dst){
      var result = {
        string: 'Foooooo'
      };

      dst.should.eql( result );
      dst_obj.should.eql( result );
    })
  });

  it('handler return rejected promise', function(){
    var map = new Mapper({
      field_string: function(value){
        var defer = vow.defer();

        setTimeout(defer.reject.bind(defer, 'Not set value'), 50);

        return defer.promise();
      }
    }, {skipFields: 'field_array_of_string'});

    var dst_obj = {};

    return map.transfer( fake, dst_obj ).fail(function(err){
      err.should.eql('Not set value');
    })
  });

  it('handler return rejected promise with skipError option', function(){
    var map = new Mapper({
      field_string: function(value){
        var defer = vow.defer();

        setTimeout(defer.reject.bind(defer, 'Not set value'), 50);

        return defer.promise();
      },
      'field_object.a.b': 'string'
    }, {skipError: true});

    var dst_obj = {};

    return map.transfer( fake, dst_obj ).then(function(dst){
      var result = {
        string: 'c'
      };

      dst.should.eql( result );
      dst_obj.should.eql( result );
    })
  });

  it('handler with exception', function(){
    var map = new Mapper({
      field_string: function(){
        throw new Error('Ho ho ho')
      },
      'field_object.a.b': 'string'
    }, {skipError: true});

    var dst_obj = {};

    return map.transfer( fake, dst_obj ).then(function(dst){
      var result = {
        string: 'c'
      };

      dst.should.eql( result );
      dst_obj.should.eql( result );
    })
  });
});