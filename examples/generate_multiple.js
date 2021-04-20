#!/usr/bin/env node
const fs = require('fs')
const parser = require('../index.js')

let rules
let opts

try {
  rules = fs.readFileSync('./rules.txt', 'UTF-8')
  opts = JSON.parse(fs.readFileSync('./nodes.json', 'UTF-8'))
} catch (err) {
  console.log(err)
  process.exit(1)
}

console.log(JSON.stringify(parser.parse(rules, opts), null, 4))
