const format    = require( "util" ).format
    , constants = require( "./constants" )

const COMMAND   = constants.COMMAND

/** Construct a shiny message object.
 *  @todo {jonas} When available, use rest params instead of params array
 *
 *  @constructor
 *  @param {?Server|?Person} from
 *  @param {string}          type   Usually something from COMMAND, ERROR or REPLY
 *  @param {Array}           params
 *  @property {Date}            date
 *  @property {?Server|?Person} from
 *  @property {string}          type
 *  @property {Array}           params
 */
const Message = function( from, type, params ) {
  this.date   = new Date()
  this.from   = from
  this.type   = type
  this.params = params
}

/** Serialize into a string suitable for transmission.
 *  @return {string}
 */
Message.prototype.toString = function() {
  const params = this.params
      , parts  = []
  if ( this.from !== null )
    parts.push( ":" + this.from )
  parts.push( this.type )
  if ( params.length !== 0 )
    parts.push( params.join( " " ) )
  return parts.join( " " )
}

/** Enhance with {@link Client}-powered methods.
 *  @param  {Client} client
 *  @return {Message}
 */
Message.prototype.for = function( client ) {
  this.reply = reply.bind( this, client )
  this.send  = send.bind( this, client )
  return this
}

/** @this {Message}
 *  @param {Client} client
 *  @return {Message}
 */
const send = function( client ) {
  client.send( this )
  return this
}

/** Reply to wherever a {@link Message} came from.
 *  If text contains format specifiers, additional args will fill them in.
 *  Be aware of that if you want to send text containing placeholders.
 *  util.format only supports 3 simple specifiers:
 *    %s    String
 *    %d    Number
 *    %j    JSON
 *    %     Does nothing
 *  See http://nodejs.org/api/util.html
 *
 *  @this {Message}
 *  @param {Client} client
 *  @param {string} text
 *  @return {Message}
 */
const reply = function( client, text ) {
  const sender  = this.params[0]
      , recip   = sender === client.user.nick
                ? this.from.nick : sender
  var args
  // Check for extra arguments, format string if present
  if ( arguments.length > 2 ) {
    args = Array.apply( null, arguments )
    args.shift()
    text = format.apply( null, args )
  }
  client.send( message( COMMAND.PRIVMSG
             , [ recip, trailing( text ) ] ) )
  return this
}

/** Factory function for {@link Message} constructor.
 *  @throws {Error} if no matching signature was found
 *  @param {?Server|?Person|string} prefix   Prefix or command
 *  @param {Array|string=}          command  Command or params
 *  @param {Array=}                 params
 *  @return {Message}
 */
const message = function( prefix, command, params ) {
  const argCount = arguments.length

  switch ( argCount ) {
    case 2:
      return new Message( null, prefix, command )
    case 1:
      return new Message( null, prefix, [] )
    case 3:
      return new Message( prefix, command, params )
    default:
      throw new Error( "No matching signature" )
  }
}

/** Prefix a trailing message param
 *  @param {string} text
 *  @return {string}
 */
const trailing = function( text ) {
  return ":" + text
}


exports.Message   = Message
exports.message   = message
exports.trailing  = trailing
