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
    , STATUS      = cnst.STATUS

describe( "notifications", function() {
  describe( "Observable", function() {
    it( "should add Observers for one type", function() {
      const observable = new Observable( true )
      observable.add( "addme", function() {} )
      observable.get( "addme" ).length.should.equal( 1 )
    })

    it( "should add an Observer for several types", function() {
      const observable = new Observable( true )
          , observer = observable.add( "ett", "två", "tre", function() {} )
      observable.get( "ett" ).length.should.equal( 1 )
      observable.get( "två" ).length.should.equal( 1 )
      observable.get( "tre" ).length.should.equal( 1 )
      observable.get( "ett" )[0].should.equal( observer )
      observable.get( "två" )[0].should.equal( observer )
      observable.get( "tre" )[0].should.equal( observer )
    })

    it( "should remove Observers based on status", function() {
      const type = cnst.REPLY.TOPIC
          , observable = new Observable( true )
          , before = observable.get( type ) ? observable.get( type ).length : 0

      const h = function( stuff ) {
        stuff.should.equal( "LOL" )
        return STATUS.REMOVE
      }

      observable.add( type, h )
      observable.get( type ).length.should.equal( before + 1 )
      observable.notify( type, "LOL" )
      if ( 0 === before )
        should.not.exist( observable.get( type ) )
      else
        observable.get( type ).length.should.equal( before )
    })

    it( "should remove Observers using type and object reference", function() {
      const observable = new Observable( true )
          , observer = observable.add( "lol", function() {} )
      observable.get( "lol" ).length.should.equal( 1 )
      observable.remove( "lol", observer )
      should.not.exist( observable.get( "lol" ) )
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
