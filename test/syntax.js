import test from 'ava'
import parser from '../index.js'

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
    }
  },
  _source_node_name:
  'base'
}

test('Syntax test', t => {
  const rules = 'send "internal_research" to "remote_node_a" if source:company is "apple"'
  const result = parser.parse(rules, opts)

  t.true(typeof result === 'object')
  t.truthy(result.rules)
  t.true(result.rules.length === 1)
  t.truthy(result.rules[0].filter)

  // extract filter function
  const filter = result.rules[0].filter
  const re = /[A-z-_]* : (.*)/
  const filterFunc = filter.match(re)
  t.true(typeof filterFunc === 'object')
  t.true(filterFunc.length === 2)
  eval('(' + filterFunc[1] + ')') // eslint-disable-line no-eval
})

test('Lists syntax test', t => {
  const rules = `
first_list = ["base"],
satellites = ["remote_node_a","remote_node_b","remote_node_c","004"],
send "users" to first_list,
send "sales_data" to satellites if package:priority isnot target:priority
`
  const result = parser.parse(rules, opts)
  t.truthy(result.rules)
  t.true(result.rules.length === 5)

  // first rule has a filter that skips design doc
  t.truthy(result.rules[0].filter)

  // the rest of the rules have filters
  const re = /[A-z-_]* : (.*)/
  result.rules.shift()
  result.rules.forEach(rule => {
    const filter = rule.filter
    const filterFunc = filter.match(re)
    t.true(typeof filterFunc === 'object')
    t.true(filterFunc.length === 2)
    eval('(' + filterFunc[1] + ')') // eslint-disable-line no-eval
  })
})
