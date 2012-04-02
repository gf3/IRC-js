const fmt     = require( "util" ).format
    , path    = require( "path" )
    , should  = require( "should" )
    , lib     = path.join( __dirname, "..", "..", "lib" )
    , obs     = require( path.join( lib, "notifications" ) )
    , cnst    = require( path.join( lib, "constants" ) )

const Observable  = obs.Observable
    , Observer    = obs.Observer
    , ignore      = obs.ignore
    , notify      = obs.notify
    , observe     = obs.observe
    , STATUS      = obs.STATUS
    , _obs        = obs._observers

describe( "notifications", function() {
  describe( "Observable", function() {
    it( "should add Observers for one type", function() {
      const observable = new Observable( true )
      observable.add( "addme", function() {} )
      _obs["addme"].length.should.equal( 1 )
    })

    it( "should add an Observer for several types", function() {
      const observable = new Observable( true )
          , observer = observable.add( "ett", "två", "tre", function() {} )
      _obs["ett"].length.should.equal( 1 )
      _obs["två"].length.should.equal( 1 )
      _obs["tre"].length.should.equal( 1 )
      _obs["ett"][0].should.equal( observer )
      _obs["två"][0].should.equal( observer )
      _obs["tre"][0].should.equal( observer )
    })

    it( "should remove Observers based on status", function() {
      const type = cnst.REPLY.TOPIC
          , before = _obs[type] ? _obs[type].length : 0
          , observable = new Observable( true )

      const h = function( stuff ) {
        stuff.should.equal( "LOL" )
        return STATUS.REMOVE
      }

      observable.add( type, h )
      _obs[type].length.should.equal( before + 1 )
      observable.notify( type, "LOL" )
      if ( 0 === before )
        should.not.exist( _obs[type] )
      else
        _obs[type].length.should.equal( before )
    })

    it( "should remove Observers using type and object reference", function() {
      const observable = new Observable( true )
          , observer = observable.add( "lol", function() {} )
      _obs["lol"].length.should.equal( 1 )
      observable.remove( "lol", observer )
      should.not.exist( _obs["lol"] )
    })
  })

  describe( "Observer", function() {
    it( "should have a handler", function() {
      const o = new Observer( function( a ) { return a } )
      o.notify( "hej" ).should.equal( "hej" )
    })

    it( "should get notified", function() {
      const obs = new Observer( function( stuff ) {
        return stuff
      })
      obs.notify( "hej" ).should.equal( "hej" )
    })
  })
})
