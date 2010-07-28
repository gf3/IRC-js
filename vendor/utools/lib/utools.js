// NO U LOL - Gianni Chiappetta <gianni@runlevel6.org>

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
