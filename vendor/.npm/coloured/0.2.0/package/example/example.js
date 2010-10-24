var Colour = require( '../lib/coloured' )
Colour.extendString()

console.log( "So I heard you like " + "red".red() + "?" )
console.log( "Perhaps you like it " + "on green".red_on_green() + "?" )
console.log( "And maybe some " + "bold".bold() + "?" )
console.log( "All together".red_on_green().bold() + "?" )

