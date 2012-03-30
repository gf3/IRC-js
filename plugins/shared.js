const fmt = require( "util" ).format
    , obj = require( "../lib/objects" )

// Redis stuff
const TOKEN = "ff774f90da063a0dfa783172f16af4e3"
    , HOST  = "pike.redistogo.com"
    , PORT  = 9475

// Redis events
const EVENT =
    { ERROR: "error"
    }

const getKey = function( nick, prefix ) {
  const id = nick instanceof obj.Person ? nick.id : new obj.Person( nick, null, null ).id
      , p = prefix || "IRCJS"
  return p + id
}

const timeAgo = function( t ) {
  var diff = Math.round( ( Date.now() - t ) / 1000 )
  const days  = Math.floor( diff / 86400 )
      , hours = Math.floor( ( diff -= days * 86400 ) / 3600 )
      , mins  = Math.floor( ( diff -= hours * 3600 ) / 60 )
      , secs  = Math.floor( ( diff -= mins * 60 ) )
      , ago   = []

  if ( days )
    ago.push( days === 1 ? "one day" : days + " days" )
  if ( hours )
    ago.push( hours === 1 ? "one hour" : hours + " hours" )
  if ( mins )
    ago.push( mins === 1 ? "one minute" : mins + " minutes" )
  if ( secs )
    ago.push( secs === 1 ? "one second" : secs + " seconds" )
  ago.splice( 2 )
  return ago.join( " and " )
}

const join = function( arr ) {
  const last = arr.pop()
  if ( arr.length === 0 )
    return last
  return fmt( "%s and %s", arr.join( ", " ), last )
}

exports.join = join
exports.timeAgo = timeAgo

exports.redis =
  { EVENT: EVENT
  , TOKEN: TOKEN
  , HOST: HOST
  , PORT: PORT
  , key: getKey
  }
