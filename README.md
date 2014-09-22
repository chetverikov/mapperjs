mapper
======

NodeJS Data Mapper for transfer data from old format to new.

# Install

```

 npm install mapperjs;

```

# Usage

```javascript

var mapper = require('mapperjs');

mapper = new mapper( map, options );
mapper.transfer( source, destination, function(err, dst_res_obj){
  // call after 
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

map = [
  ['title', 'title'], 
  /*
   * in destination object will be field description with data from descriptions.long
   */
  ['descriptions.long', 'description'],
  /*
   * in preview will be first photo from photos
   */
  ['photos.0', 'preview']
]

```

# Sync and Async Map functions

On the map are the functions for processing the data sync and async.

```javascript

map = [

  /**
   * Async map func
   * value - content entity id
   * dst, src - destination and source object
   * done - callback that should be called after the completion of data processing
   */
  ['entityId', function( value, dst, src, done){
    db.queryById( value, function(err, entity ){
    
      /**
       * first arg - error
       * second arg - object: 
       *   key - path to destination object
       *   value - value
       
       * The second argument may contain multiple key/value to setup more fields and values.
       */
      done(err, { 'entity': entity });
    })
  }],
  
  /**
   * Sync map func - three args!
   */ 
  ['comments', function( comments, dst, src ){
    return { comments_count: getOnlyActive(comments) }
  }]
]

```

# Options

## Debug

For debug set options true. Default: false

```javascript

var mapper = require('mapper');

mapper = new mapper( map, { debug: true } );

mapper.transfer( source, destination, function(err, dst_res_obj){
  // call after 
});

```

## skipError

For skip error from async callback. Default: false

> if set to false, then the transfer process will stop after the first error

```javascript

var mapper = require('mapper');

mapper = new mapper( map, { skipError: true } );

// not passed errors in an asynchronous callback, and do not stop the transfer process
mapper.transfer( source, destination, function(err, dst_res_obj){
  // call after
});

```


# Example

```javascript

  var oldObj = {
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
 
  var map = [
    ['username', function( value ){
                     var parts = username.split(' ');
 
                     return { 'firstname': parts[0], 'lastname': parts[1] };
                 }],
    ['avatar', 'avatar'],
    [['country', 'city'], function( value ){
                             return {'address': value.country + ', ' + value.city}
                          }]
  ];
 
  var mapper = new Mapper( map );
 
  mapper.transfer( oldObj, newObj, function( err, obj ){
      console.log( obj );
  });

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
