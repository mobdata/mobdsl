import fs from 'fs'
import test from 'ava'
import parser from '../index.js'

let consoleLogging = false

/**
 * The tests below verify that the strings returned by the parser can be eval'd into valid,
 * executable JavaScript functions.
 *
 * The tests do not verify the functions behave properly, only that the the syntax is valid.
 */
const opts = {
  nodes: {
    base: {
      node_name: 'base',
      url: 'https://md-105.trinityalps.org:443',
      attributes: { company: 'apple', office_type: 'regional', classification: 'SECRET' }
    },
    remote_node_a: {
      node_name: 'remote_node_a',
      url: 'https://md-104.trinityalps.org:443',
      attributes: { company: 'google', office_type: 'regional', classification: 'TOP SECRET//SI//FVEY' }
    },
    remote_node_b: {
      node_name: 'remote_node_b',
      url: 'https://md-103.trinityalps.org:443',
      attributes: { company: 'google', office_type: 'hq', classification: 'TOP SECRET//SI' }
    },
    remote_node_c: {
      node_name: 'remote_node_c',
      url: 'https://md-103.trinityalps.org:443',
      attributes: { company: 'google', office_type: 'regional', classification: 'TOP SECRET//SI' }
    },
    '004': {
      node_name: '004',
      url: 'https://md-103.trinityalps.org:443',
      attributes: { company: 'google', office_type: 'regional', classification: 'TOP SECRET//SI' }
    },
    '005': {
      node_name: '005',
      url: 'https://md-103.trinityalps.org:443',
      attributes: { company: 'google', office_type: 'regional', classification: 'UNCLASSIFIED' }
    }
  },
  _source_node_name: 'base'
}

const doc1 =
  {
    _id: 'ce5a8fa81bcfe50519ac9d3f4e005072',
    _rev: '2-8c46c00dd1cd42cbf3fa0e790709709b',
    firstName: 'Robert',
    lastName: 'Danger',
    age: 32,
    md_attributes: {
      company: 'apple',
      priority: '10'
    }
  }

const doc2 =
  {
    _id: 'ce5a8fa81bcfe50519ac9d3f4e005072',
    _rev: '2-8c46c00dd1cd42cbf3fa0e790709709b',
    firstName: 'Robert',
    lastName: 'Danger',
    age: 32,
    md_attributes: {
      company: 'apple',
      classification: 'TOP SECRET'
    }
  }

const designDoc =
  {
    _id: '_design/books',
    _rev: '81-1216b2af280ee2ff1d12dbcc11d79938',
    filters: {
      '': ''
    },
    views: {
      lib: {
        classyjs: ''
      }
    }
  }

const req1 =
  {
  }

/**
 * Takes care of some of the boilerplate verification before getting to the meat of a test.
 */
const getResult = function (rules, t) {
  const result = parser.parse(rules, opts)

  t.true(typeof result === 'object')
  t.truthy(result.rules)
  t.true(result.rules.length === 1)
  t.truthy(result.rules[0].filter)

  return result
}

/**
 * Defined here so that it's available to the filter function as a global function. couchdb
 * provides a global log function to filters which mobdsl uses, so this must be available.
 */
const log = function (str) { // eslint-disable-line no-unused-vars
  consoleLogging && console.log(str) // eslint-disable-line no-console
}

/**
 * Defined here so that it's available to the filter function as a global function. couchdb
 * provides a global toJSON function to filters which mobdsl uses, so this must be available.
 */
const toJSON = function (json) { // eslint-disable-line no-unused-vars
  return JSON.stringify(json)
}

test.before(t => {
  process.argv.slice(2).forEach(arg => {
    if (arg === '--console') {
      consoleLogging = true
    }
  })

  try {
    fs.mkdirSync('node_modules/views')
  } catch (err) {
    // ignore "file exists" error
    if (err.errno !== -17) {
      throw err
    }
  }

  try {
    fs.mkdirSync('node_modules/views/lib')
  } catch (err) {
    // ignore "file exists" error
    if (err.errno !== -17) {
      throw err
    }
  }
  try {
    fs.symlinkSync('../../@jacobs.com/classy', 'node_modules/views/lib/classyjs')
  } catch (err) {
    // ignore "file exists" error
    if (err.errno !== -17) {
      throw err
    }
  }
})

test.after(t => {
  fs.unlinkSync('node_modules/views/lib/classyjs')
  fs.rmdirSync('node_modules/views/lib')
  fs.rmdirSync('node_modules/views')
})

test('Execution test', t => {
  const result = getResult('send "internal_research" to "remote_node_a" if source:company is "apple"', t)

  // extract filter function
  const filter = result.rules[0].filter
  const re = /[A-z-_]* : (.*)/
  const filterFunc = filter.match(re)
  t.true(typeof filterFunc === 'object')
  t.true(filterFunc.length === 2)
  const fn = eval('(' + filterFunc[1] + ')') // eslint-disable-line no-eval
  t.true(fn(doc1, req1))
})

test('Design doc test', t => {
  const result = getResult('send "internal_research" to "remote_node_a" if source:company is "apple"', t)

  // extract filter function
  const filter = result.rules[0].filter
  const re = /[A-z-_]* : (.*)/
  const filterFunc = filter.match(re)
  t.true(typeof filterFunc === 'object')
  t.true(filterFunc.length === 2)
  const fn = eval('(' + filterFunc[1] + ')') // eslint-disable-line no-eval
  t.false(fn(designDoc, req1))
})

test('Fail filter test', t => {
  const result = getResult('send "internal_research" to "remote_node_a" if source:company is "google"', t)

  // extract filter function
  const filter = result.rules[0].filter
  const re = /[A-z-_]* : (.*)/
  const filterFunc = filter.match(re)
  t.true(typeof filterFunc === 'object')
  t.true(filterFunc.length === 2)
  const fn = eval('(' + filterFunc[1] + ')') // eslint-disable-line no-eval
  t.false(fn(doc1, req1))
})

test('Classy module test', t => {
  const result = getResult('send "internal_research" to "remote_node_a" if target:classification mst package-meta:classification', t)

  // extract filter function
  const filter = result.rules[0].filter
  const re = /[A-z-_]* : (.*)/
  const filterFunc = filter.match(re)
  t.true(typeof filterFunc === 'object')
  t.true(filterFunc.length === 2)
  const fn = eval('(' + filterFunc[1] + ')') // eslint-disable-line no-eval
  t.true(fn(doc2, req1))
})

test('Classy module fails test', t => {
  const result = getResult('send "internal_research" to "005" if target:classification mst package-meta:classification', t)

  // extract filter function
  const filter = result.rules[0].filter
  const re = /[A-z-_]* : (.*)/
  const filterFunc = filter.match(re)
  t.true(typeof filterFunc === 'object')
  t.true(filterFunc.length === 2)
  const fn = eval('(' + filterFunc[1] + ')') // eslint-disable-line no-eval
  t.false(fn(doc2, req1))
})
