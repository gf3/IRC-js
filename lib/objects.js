/** @module objects
 */

const channel = require( "./channel" )
    , message = require( "./message" )
    , person  = require( "./person" )
    , server  = require( "./server" )
    , util    = require( "./util" )

// Constructors
exports.Message = message.Message
exports.Server  = server.Server
exports.Person  = person.Person
exports.Channel = channel.Channel

// Factory functions
exports.message = message.message
exports.channel = channel.channel
exports.person  = person.person

exports.id        = util.id
exports.trailing  = message.trailing
