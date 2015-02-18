/**
 * @fileOverview Description file.
 * @author <a href="mailto:ma.chetverikov@gmail.com">Maksim Chetverikov</a>
 */

var mapper = require('./../')
  , fake = require('./fake.json');

require('should');

describe('MapperJs', function() {
  describe('Sync map', function(){
    it('default', function( done ){
      var map = new mapper([
        ['field_string', 'string'],
        ['field_string', function( val ){
          return { 'string_up': val.toUpperCase() };
        }],
        ['field_array_of_string', function( val, dst, src ){
          var result = [val[0]];

          result.push( dst.string );

          return { array_of_string: result };
        }]
      ]);

      var dst_obj = {};

      map.transfer( fake, dst_obj, function(err, dst){
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

        done();

      })
    });

    it('undefined field in src', function( done ){
      var map = new mapper([
        ['field_string', 'string'],
        ['field_not_exist', 'foo']
      ]);

      var dst_obj = {};

      map.transfer( fake, dst_obj, function(err, dst){
        var result = {
          string: 'Foooooo'
        };

        dst.should.eql( result );
        dst_obj.should.eql( result );

        done();
      })
    });

    it('get deep field', function( done ){
      var map = new mapper([
        ['field_string', 'string'],
        ['field_object.a.e.f', 'foo']
      ]);

      var dst_obj = {};

      map.transfer( fake, dst_obj, function(err, dst){
        var result = {
          string: 'Foooooo',
          foo: 'fooo'
        };

        dst.should.eql( result );
        dst_obj.should.eql( result );

        done();
      })
    });

    it('get array elem deep field ', function( done ){
      var map = new mapper([
        ['field_string', 'string'],
        ['field_object.a.d.0', 'foo']
      ]);

      var dst_obj = {};

      map.transfer( fake, dst_obj, function(err, dst){
        var result = {
          string: 'Foooooo',
          foo: 1
        };

        dst.should.eql( result );
        dst_obj.should.eql( result );

        done();
      })
    });

    it('create deep field in dst', function( done ){
      var map = new mapper([
        ['field_array_of_object', 'i.deep.deep.field']
      ]);

      var dst_obj = {};

      map.transfer( fake, dst_obj, function(err, dst){
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

        done();
      })
    });

    it('create deep field array in dst', function( done ){
      var map = new mapper([
        ['field_array_of_object.0', 'i.deep.array.$'], //create
        ['field_array_of_object.1', 'i.deep.array.$']  //add
      ]);

      var dst_obj = {};

      map.transfer( fake, dst_obj, function(err, dst){
        var result = {
          i:{
            deep: {
              array: fake.field_array_of_object
            }
          }
        };

        dst.should.eql( result );
        dst_obj.should.eql( result );

        done();
      })
    });

    it('multi field', function( done ){
      var map = new mapper([
        [['field_object.a.e.f', 'field_string'], function( values ){
          return { multi: [values['field_object.a.e.f'], values['field_string']].join(' ') }
        }]
      ]);

      var dst_obj = {};

      map.transfer( fake, dst_obj, function(err, dst){
        var result = {
          multi: [fake.field_object.a.e.f, fake.field_string].join(' ')
        };

        dst.should.eql( result );
        dst_obj.should.eql( result );

        done();
      })
    });
  });

  describe('Series Async map', function(){
    it('default', function( done ){
      var map = new mapper([
        ['field_string', 'string'],
        ['field_string', function( val, dst, src, done ){
          setTimeout(function(){
            done(null, { 'string_up': val.toUpperCase() })
          }, 50);
        }],
        ['field_array_of_string', function( val, dst, src, done ){
          setTimeout(function(){
            var result = [val[0]];

            result.push( dst.string );

            done(null, { array_of_string: result });
          }, 50);
        }]
      ]);

      var dst_obj = {};

      map.transfer( fake, dst_obj, function(err, dst){
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

        done();

      })
    });
  })

  describe('Skip options', function(){
    it('default', function( done ){
      var map = new mapper([
        ['field_string', 'string'],
        ['field_string', function( val, dst, src, done ){
          setTimeout(function(){
            done(null, { 'string_up': val.toUpperCase() })
          }, 50);
        }],
        ['field_array_of_string', function( val, dst, src, done ){
          setTimeout(function(){
            var result = [val[0]];

            result.push( dst.string );

            done(null, { array_of_string: result });
          }, 50);
        }]
      ], {skipFields: 'field_array_of_string'});

      var dst_obj = {};

      map.transfer( fake, dst_obj, function(err, dst){
        var result = {
          string: 'Foooooo',
          string_up: 'FOOOOOO'
        };

        dst.should.eql( result );
        dst_obj.should.eql( result );

        done();

      })
    });
  })
});