mapper
======

[![Join the chat at https://gitter.im/chetverikov/mapperjs](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/chetverikov/mapperjs?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

NodeJS Data Mapper for transfer data from old format to new.

# Install

```

 npm install mapperjs;

```

# Usage

```javascript

const Mapper = require('mapperjs');

mapper = new Mapper( map, options );
mapper.transfer( source, destination )
 .then(dst_res_obj => {
   // call after
 }
 .catch(err => {
   // call after if reject with err
 });

```

# Map

The map must be a binary array consisting of the string/array/functions. The first array element should be a string or an array of strings path to data of the original object.

```javascript

// Source data
source = {
  title: '',
  descriptions: {
    short: '',
    long: ''
  },
  photos: [
    '1.jpg',
    '2.jpg',
    '3.jpg'
  ],
  old_photos: [
    'a.png',
    'b.png'
  ]
}

destination = {};

map = {
  title: 'title',
  /*
   * in destination object will be field description with data from descriptions.long
   */
  'descriptions.long': 'description',
  /*
   * in preview will be first photo from photos
   */
  'photos.0': 'preview'
}

```

# Sync and Async Map functions

On the map are the functions for processing the data sync and async.

```javascript

map = {

  /**
   * Async map func
   * value - content entity id
   */
  entityId: function( value ){
    // this.dst - destination
    // this.src - source

    retun db.queryById( value )
     .then( entity ){

      /**
       * first arg - error
       * second arg - object:
       *   key - path to destination object
       *   value - value

       * The second argument may contain multiple key/value to setup more fields and values.
       */
      return { entity: entity };
     })
     .catch(err => defer.reject(err));
  },

  /**
   * Sync map func
   */
  comments: comments => {
    return { comments_count: getCountOnlyActiveComments(comments) };
  }
}

```

# Debug

Mapperjs uses the [debug](https://github.com/visionmedia/debug) module internally to log information about route matches and application mode. To see this information, simply set the DEBUG environment variable to substance:* when launching your app and the debug information will appear on the console.

```javascript

DEBUG=mapper* node app.js

```

# Options

## skipError

For skip error from async callback. Default: false

> if set to false, then the transfer process will stop after the first error

```javascript

const Mapper = require('mapper');

mapper = new Mapper( map, { skipError: true } );

// not passed errors in an asynchronous callback, and do not stop the transfer process
mapper.transfer( source, destination ).then(dst_res_obj => {
  // call after
});

```

## skipFields

For skip not required fields, you can use the option skipFields:

```javascript

const Mapper = require('mapper');

mapper = new Mapper( map, { skipFields: 'field1 field2 iAnotherField' } );

// without fields field1, field2, iAnotherField
mapper.transfer( source, destination ).then(dst_res_obj => {
  // call after
});

```


# Example

```javascript

  const oldObj = {
        username: 'Maksim Chetverikov',
        avatar: '2fge0923df08r.jpg',
        country: 'Russia'
        city: 'Irkutsk'
      }
    , newObj = {
        firstname: '',
        lastname: '',
        avatar: '',
        address: ''
     };

  const map = {
    username: username => {
      const parts = username.split(' ');

      return { firstname: parts[0], lastname: parts[1] };
    },
    avatar: 'avatar',
    'country city', values => {
        return {address: value.country + ', ' + value.city}
    }
  };

  const mapper = new Mapper( map );

  mapper.transfer( oldObj, newObj ).then(obj => console.log( obj ));

```

results

```javascript

{
  firstname: 'Maksim',
  lastname: 'Chetverikov',
  avatar: '2fge0923df08r.jpg',
  address: 'Russia, Irkutsk'
}

```

# Tests

` npm test `
