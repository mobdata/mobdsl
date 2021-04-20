var XXH = require('xxhashjs')

function hashIt (source, target, filter) {
  var plainText = `${source}${target}`
  if (typeof filter !== 'undefined') {
    const { object, attribute, operator, value } = filter
    plainText = `${plainText}${object}${attribute}${operator}${value}`
  }
  return XXH.h64(plainText, 0).toString(16)
}

module.exports = hashIt
