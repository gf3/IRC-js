// NO U LOL - Gianni Chiappetta <gianni@runlevel6.org>

/**
 * Function#bind(context[, args...]) -> Function
 * - context (Object): Object context to bind to.
 * - args (?): Optional arguments to curry.
 * 
 * Bind a function to a given `context`. Optionally curry arguments.
 * 
 * ### Examples
 * 
 *     var new_func = my_func.bind(my_object, "no u");
**/
if (typeof Function.prototype.bind !== "function") {
  Object.defineProperty(Function.prototype, "bind", {
    value: (function(){
      var _slice = Array.prototype.slice
      return function(context) {
        var fn = this
          , args = _slice.call(arguments, 1)
        
        if (args.length) 
          return function() {
            return arguments.length
              ? fn.apply(context, args.concat(_slice.call(arguments)))
              : fn.apply(context, args)
          }
         
        return function() {
          return arguments.length
            ? fn.apply(context, arguments)
            : fn.call(context)
        }
      }
    })()
  })
}

/**
 * Object#extend(source) -> Object
 * - source (Object): Source object whose properties will be duplicated.
 * 
 * Shallow copy properties from `source` to an object.
 * 
 * ### Examples
 * 
 *     obj.extend({no: "U"});
**/
if (typeof Object.prototype.extend !== 'function') {
  Object.defineProperty(Object.prototype, "extend", {
    value: function (obj) {
      var key, keys, i, length
      for (i = 0, keys = Object.keys(obj), length = keys.length; i < length; i++)
        key = keys[i], this[key] = obj[key]
      return this
    }
  })
}
