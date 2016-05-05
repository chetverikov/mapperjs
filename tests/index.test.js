'use strict';

/**
 * @fileOverview Description file.
 * @author <a href="mailto:ma.chetverikov@gmail.com">Maksim Chetverikov</a>
 */

const Mapper = require('../');
const fake = require('./fake.json');

require('should');

describe('MapperJs', () => {

  it('default', () => {
    const dst_obj = {};

    const mapper = new Mapper({
      field_string: val => {
        return {string: val, string_up: val.toUpperCase()};
      },

      /* eslint object-shorthand: 0 */
      field_array_of_string: function(val) {
        var result = [val[0]];

        result.push(this.dst.string);

        return {array_of_string: result};
      }
    });

    return mapper.transfer(fake, dst_obj).then(dst => {
      const result = {
        string: 'Foooooo',
        string_up: 'FOOOOOO',
        array_of_string: ['one', 'Foooooo']
      };

      dst.should.eql(result);
      dst_obj.should.eql(result);
    });
  });

  it('undefined field in src', () => {
    const map = new Mapper({
      field_string: 'string',
      field_not_exist: 'foo'
    });

    const dst_obj = {};

    return map.transfer(fake, dst_obj).then(dst => {
      const result = {
        string: 'Foooooo'
      };

      dst.should.eql(result);
      dst_obj.should.eql(result);
    });
  });

  it('undefined field in src with handler', () => {
    const map = new Mapper({
      field_string: 'string',
      field_not_exist: () => {
        return {foo: 'bar'};
      }
    });

    const dst_obj = {};

    return map.transfer(fake, dst_obj).then(dst => {
      const result = {
        string: 'Foooooo'
      };

      dst.should.eql(result);
      dst_obj.should.eql(result);
    });
  });

  it('get deep field', () => {
    const map = new Mapper({
      field_string: 'string',
      'field_object.a.e.f': 'foo'
    });

    const dst_obj = {};

    return map.transfer(fake, dst_obj).then(dst => {
      const result = {
        string: 'Foooooo',
        foo: 'fooo'
      };

      dst.should.eql(result);
      dst_obj.should.eql(result);
    });
  });

  it('get array elem deep field ', () => {
    const map = new Mapper({
      field_string: 'string',
      'field_object.a.d.0': 'foo'
    });

    const dst_obj = {};

    return map.transfer(fake, dst_obj).then(dst => {
      const result = {
        string: 'Foooooo',
        foo: 1
      };

      dst.should.eql(result);
      dst_obj.should.eql(result);
    });
  });

  it('create deep field in dst', () => {
    const map = new Mapper({
      field_array_of_object: 'i.deep.deep.field'
    });

    const dst_obj = {};

    return map.transfer(fake, dst_obj).then(dst => {
      var result = {
        i: {
          deep: {
            deep: {
              field: fake.field_array_of_object
            }
          }
        }
      };

      dst.should.eql(result);
      dst_obj.should.eql(result);
    });
  });

  it('create deep field array in dst', () => {
    const map = new Mapper({
      'field_array_of_object.0': 'i.deep.array.$', // create
      'field_array_of_object.1': 'i.deep.array.$'  // add
    });

    const dst_obj = {};

    return map.transfer(fake, dst_obj).then(dst => {
      var result = {
        i: {
          deep: {
            array: fake.field_array_of_object
          }
        }
      };

      dst.should.eql(result);
      dst_obj.should.eql(result);
    });
  });

  it('multi field', () => {
    const map = new Mapper({
      'field_object.a.e.f field_string': values => {
        return {multi: [values['field_object.a.e.f'], values.field_string].join(' ')};
      }
    });

    const dst_obj = {};

    return map.transfer(fake, dst_obj).then(dst => {
      var result = {
        multi: [fake.field_object.a.e.f, fake.field_string].join(' ')
      };

      dst.should.eql(result);
      dst_obj.should.eql(result);
    });
  });

  it('Skip options', () => {
    const map = new Mapper({
      field_string: 'string',
      field_array_of_string: function(val) {
        var result = [val[0]];

        result.push(this.dst.string);

        return {array_of_string: result};
      }
    }, {skipFields: 'field_array_of_string'});

    const dst_obj = {};

    return map.transfer(fake, dst_obj).then(dst => {
      const result = {
        string: 'Foooooo'
      };

      dst.should.eql(result);
      dst_obj.should.eql(result);
    });
  });

  it('handler return promise', () => {
    const map = new Mapper({
      field_string: value => {
        var defer = Promise.defer();

        setTimeout(() => defer.resolve({string: value}), 50);

        return defer.promise;
      }
    }, {skipFields: 'field_array_of_string'});

    const dst_obj = {};

    return map.transfer(fake, dst_obj).then(dst => {
      var result = {
        string: 'Foooooo'
      };

      dst.should.eql(result);
      dst_obj.should.eql(result);
    });
  });

  it('handler return rejected promise', () => {
    const map = new Mapper({
      field_string: value => {
        const defer = Promise.defer();

        setTimeout(() => defer.reject('Not set value'), 50);

        return defer.promise;
      }
    }, {skipFields: 'field_array_of_string'});

    const dst_obj = {};

    return map.transfer(fake, dst_obj).catch(err => err.should.eql('Not set value'));
  });

  it('handler return rejected promise with skipError option', () => {
    const map = new Mapper({
      field_string: value => {
        var defer = Promise.defer();

        setTimeout(() => defer.reject('Not set value'), 50);

        return defer.promise;
      },
      'field_object.a.b': 'string'
    }, {skipError: true});

    const dst_obj = {};

    return map.transfer(fake, dst_obj).then(dst => {
      var result = {
        string: 'c'
      };

      dst.should.eql(result);
      dst_obj.should.eql(result);
    });
  });

  it('handler with exception', () => {
    const map = new Mapper({
      field_string: () => {
        throw new Error('Ho ho ho');
      },
      'field_object.a.b': 'string'
    }, {skipError: true});

    const dst_obj = {};

    return map.transfer(fake, dst_obj).then(dst => {
      var result = {
        string: 'c'
      };

      dst.should.eql(result);
      dst_obj.should.eql(result);
    });
  });
});
