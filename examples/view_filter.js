#!/usr/bin/env node
const fs = require('fs')
const prettyJs = require('pretty-js')
const parser = require('../index.js')

let rules
let opts

try {
  rules = fs.readFileSync('./rule.txt', 'UTF-8')
  opts = JSON.parse(fs.readFileSync('./nodes.json', 'UTF-8'))
} catch (err) {
  console.log(err)
  process.exit(1)
}

const repdocs = JSON.stringify(parser.parse(rules, opts))
const funcStart = repdocs.indexOf('_filter : ') + '_filter : '.length
const funcEnd = repdocs.indexOf('"}]}', funcStart)
const func = repdocs.substring(funcStart, funcEnd).replace(/\\"/g, '"')
console.log(prettyJs(func))
