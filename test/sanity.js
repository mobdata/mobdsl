/**
 The tests below are very, very simple. They are mainly "sanity" tests with the following goals:
  - Demonstrate that the parser returns parseable JSON
  - Demonstrate that the "if clause" values are found in the JSON
  - Do the above for every kind of operator in the DSL
 The following are _not_ goals of these tests:
  - Demonstrate that the filters are executable functions
  - Demonstrate that the expected logic is found in the filters
    - I want another set of tests within this module to provide the above
  - Demonstrate that the JSON, when applied to CouchDb replication docs, acts as expected.
    - This will be found in integration tests.
*/
import test from 'ava'
import parser from '../index.js'

/* eslint no-useless-escape: "off" */

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

test('Sanity tests', t => {
  // does parser load
  t.truthy(parser)
  const rules = 'send "internal_research" to "remote_node_a" if source:company is "apple"'
  const result = parser.parse(rules, opts)
  // does simple call return object
  t.true(typeof result === 'object')
  // does simple call return parseable JSON
  t.truthy(result.rules)
  // does simple call return single object in array
  t.true(result.rules.length === 1)
  // does simple call return repdoc type object in array
  t.truthy(result.rules[0].db)
  t.truthy(result.rules[0].target)
  t.true(result.rules[0].continuous)
  t.truthy(result.rules[0].filter)
})

test('All kinds of empty tests', t => {
  t.truthy(parser)
  const emptyRules1 = ''
  const result1 = parser.parse(emptyRules1, opts)
  t.truthy(result1.rules)
  t.true(result1.rules.length === 0)

  const emptyRules2 = ' '
  const result2 = parser.parse(emptyRules2, opts)
  t.truthy(result2.rules)
  t.true(result2.rules.length === 0)

  const emptyRules3 = '  '
  const result3 = parser.parse(emptyRules3, opts)
  t.truthy(result3.rules)
  t.true(result3.rules.length === 0)

  const emptyRules4 = '\t'
  const result4 = parser.parse(emptyRules4, opts)
  t.truthy(result4.rules)
  t.true(result4.rules.length === 0)

  const emptyRules5 = '\n'
  const result5 = parser.parse(emptyRules5, opts)
  t.truthy(result5.rules)
  t.true(result5.rules.length === 0)

  const emptyRules6 = '\t \n'
  const result6 = parser.parse(emptyRules6, opts)
  t.truthy(result6.rules)
  t.true(result6.rules.length === 0)
})

test('Lists tests', t => {
  const rules1 = `
first_list = ["base"],
satellites = ["remote_node_a","remote_node_b","remote_node_c","004"],
send "users" to first_list, 
send "sales_data" to satellites if package:priority isnot target:priority
`
  const result1 = parser.parse(rules1, opts)
  t.truthy(result1.rules)
  t.true(result1.rules.length === 5)
})

test('Filter sanity tests', t => {
  const rules1 = `
send "internal_research" to "remote_node_a"
  if source:company is "apple",
send "personnel_evaluations" to "remote_node_b"
  if source:company is "apple inc"
  and package:trustability is "high"
`
  const result1 = parser.parse(rules1, opts)
  t.truthy(result1.rules)
  t.true(result1.rules.length === 2)
  t.truthy(result1.rules[0].filter)
  t.true(result1.rules[0].filter.includes('"apple"'))
  t.truthy(result1.rules[1].filter)
  t.true(result1.rules[1].filter.includes('"apple inc"'))
  t.true(result1.rules[1].filter.includes('"trustability"'))

  const rules2 = `
send "sales_quota" to "remote_node_c"
  if source:node_type isin [ "hq", "regional", "", "!@#$%^&*()-_=+[{]}\|,:'<>/? " ]
`
  const result2 = parser.parse(rules2, opts)
  t.true(result2.rules[0].filter.includes('"hq"'))
  t.true(result2.rules[0].filter.includes('"regional"'))
  t.true(result2.rules[0].filter.includes('"!@#$%^&*()-_=+[{]}\|,:\'<>/? "'))
  const rules3 = `
send "internal_docs" to "remote_node_c"
  if package:author isin []
`
  const result3 = parser.parse(rules3, opts)
  t.true(result3.rules[0].filter.includes('[]'))

  const rules4 = `
send "sales_quota" to "remote_node_a"
  if package:priority is 10.8
`
  const result4 = parser.parse(rules4, opts)
  t.true(result4.rules[0].filter.includes('10.8'))
  t.false(result4.rules[0].filter.includes('"10.8"'))

  const rules5 = `
send "sales_quota" to "remote_node_a"
  if package:priority is 4
`
  const result5 = parser.parse(rules5, opts)
  t.true(result5.rules[0].filter.includes('=== 4'))

  const rules6 = `
send "sales_quota" to "remote_node_a"
  if package:priority is 0
`
  const result6 = parser.parse(rules6, opts)
  t.true(result6.rules[0].filter.includes('=== 0'))

  const rules7 = `
send "sales_quota" to "remote_node_a"
  if package:priority isnot 1
`
  const result7 = parser.parse(rules7, opts)
  t.true(result7.rules[0].filter.includes('!== 1'))

  const rules8 = `
send "sales_quota" to "remote_node_a"
  if package:priority isnot 4.00
`
  const result8 = parser.parse(rules8, opts)
  t.true(result8.rules[0].filter.includes('!== 4'))

  const rules9 = `
send "sales_quota" to "remote_node_a"
  if package:priority isnot 0
`
  const result9 = parser.parse(rules9, opts)
  t.true(result9.rules[0].filter.includes('!== 0'))

  const rules10 = `
send "sales_data" to "remote_node_b"
  if package:priority lt 5
`
  const result10 = parser.parse(rules10, opts)
  t.true(result10.rules[0].filter.includes('< 5'))

  const rules11 = `
send "sales_data" to "remote_node_b"
  if package:priority gt 5
`
  const result11 = parser.parse(rules11, opts)
  t.true(result11.rules[0].filter.includes('> 5'))

  const rules12 = `
send "sales_data" to "remote_node_b"
  if package:priority lte 5
`
  const result12 = parser.parse(rules12, opts)
  t.true(result12.rules[0].filter.includes('<= 5'))

  const rules13 = `
send "sales_data" to "remote_node_b"
  if package:priority gte 5
`
  const result13 = parser.parse(rules13, opts)
  t.true(result13.rules[0].filter.includes('>= 5'))

  const rules14 = `
send "sales_data" to "remote_node_b"
  if package:priority gte 5
`
  const result14 = parser.parse(rules14, opts)
  t.true(result14.rules[0].filter.includes('>= 5'))

  const rules15 = `
send "sales_data" to "remote_node_b"
  if package:priority isin [1,2,3,4,5]
`
  const result15 = parser.parse(rules15, opts)
  t.true(result15.rules[0].filter.includes('[1,2,3,4,5]'))

  const rules16 = `
send "sales_data" to "remote_node_b"
  if package:priority notin [1,2,3,4,5]
`
  const result16 = parser.parse(rules16, opts)
  t.true(result16.rules[0].filter.includes('[1,2,3,4,5]'))

  const rules17 = `
send "test_database" to "remote_node_a"
  if target:classification mst "TOP SECRET//NOFORN"
`
  const result17 = parser.parse(rules17, opts)
  t.true(result17.rules[0].filter.includes('"TOP SECRET//NOFORN"'))
  t.true(result17.rules[0].filter.includes('classy'))

  const rules18 = `
send "test_db" to "remote_node_b"
  if source:pattern matches /ab+a/
`
  const result18 = parser.parse(rules18, opts)
  t.true(result18.rules[0].filter.includes('ab+a'))
})
