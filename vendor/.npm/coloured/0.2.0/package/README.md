# Coloured

Pretty colours in your terminal. This is a node.js port of [defunkt's colored](http://github.com/defunkt/colored).

    Colour.extendString()
    console.log( "this is red".red() )
    console.log( "this is red with a blue background (read: ugly)".red_on_blue() )
    console.log( "this is red with an underline".red().underline() )
    console.log( "this is really bold and really blue".bold().blue() )

![Screenshot](http://img.gf3.ca/4f615cb56fb1a090ff4e36eb88247258.png)

For more examples see `example/example.js`.

## Colours & Extras

As a convenience all colours and extras are available as methods on strings.
Colours may be specified alone (e.g. `red`), or they may be specified with
a background like so `foreground_on_background` (e.g. `black_on_cyan`).

* black
* red
* green
* yellow
* blue
* magenta
* cyan
* white

Extras are used the same as colours.

* clear
* bold
* underline
* reverse

## Installation

With npm: `npm install coloured`

With git: `git clone git://github.com/gf3/coloured.git`

## API

When `require`'d this module returns a Colour object with the following methods
and properties.

### Methods

`Colour.extendString( nativeProto ) → Undefined`

* `native` - Prototype to extend. Default: `String.prototype`.

`Colour.colourise( string, options ) → String`

* `string` - String to be coloured. **Required**.
* `options` - Object with any of the following properties: `foreground`, `background`, `extra`. Default: `{}`.

`Colour.colour( name, background ) → String`

* `name` - Colour name (e.g. `"red"`). **Required**.
* `background` - Set to true if background colour is desired. Default: `false`.

`Colour.extra( name) → String`

* `name` - Extra name (e.g. `"bold"`). **Required**.

### Properties

`Colour.colours → Object` Object containing colour names and values.

`Colour.extras → Object` Object containing extra names and values.

## Author

Written by [Gianni "gf3" Chiappetta](http://github.com/gf3) &ndash; [gf3.ca](http://gf3.ca)

## License

Coloured is [UNLICENSED](http://unlicense.org/).

