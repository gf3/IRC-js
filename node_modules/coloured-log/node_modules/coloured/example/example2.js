var Colour = require( '../lib/coloured' )
Colour.extendString()
console.log( "\n" )

console.log( "this is red".red() )
console.log( "this is red with a blue background (read: ugly)".red_on_blue() )
console.log( "this is red with an underline".red().underline() )
console.log( "this is really bold and really blue".bold().blue() )

