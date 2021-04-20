{
  const hashIt = require('./lib/hashIt')
  const makeCouchFilter = require('./lib/makeCouchFilter')
  const sourceNodeName = options._source_node_name
  const nodesAvailable = options.nodes

  const nodesAvailableAsList = Object.keys(nodesAvailable).map((node) => {
    if (typeof node === 'string') {
      return {
        name: node,
        nodes: [ node ],
      }
    } else {
      return {
        name: node.node_name,
        nodes: [ node.node_name ],
      }
    }
  })
}

Start
  = lists:Assignments rules:Rules {
    // Put single nodes in the same format as lists to keep the reduction simple:
    const listsAndSingleNodes = [ ...lists, ...nodesAvailableAsList ]
    return {
      rules: rules.reduce((arr, rule) => {
        const matchingList = listsAndSingleNodes.find((list) => {
          return list.name === rule.target
        })
        if (typeof matchingList === 'undefined') {
          error(`"${rule.target}" is undefined.`)
        }
        return [
          ...arr,
          ...listsAndSingleNodes.find(list => list.name === rule.target)
          .nodes.map((targetNodeName, i) => {
            const sourceNode = nodesAvailable[sourceNodeName]
            const targetNode = nodesAvailable[targetNodeName]

            return {
              db: rule.dbName,
              source: sourceNode.node_name,
              target: targetNode.node_name,
              hash: hashIt(rule.dbName, rule.target, rule.filter),
              continuous: true,
              filter: makeCouchFilter(rule.filter, sourceNode, targetNode),
            }
          }),
        ]
      }, []),
    }
  } / _ { return { rules: [] } }

Assignments
  = statements:(Assignment ",")* {
    return statements.map(x => x[0])
  }

Assignment
  = _ name:Variable _ "=" _ nodes:List _ {
    return {
      name,
      nodes,
    }
  }

List
  = "[" _ nodes:(String _ "," _)* lastNode:String _ "]" {
    const nodesInList = [ ...nodes.map(x => x[0]), lastNode ]
    nodesInList.forEach((node) => {
      // Check the availability of nodes in lists during assignment:
      if (typeof nodesAvailable[node] === 'undefined') {
        error(`Node "${value}" is not available. Please add it to the nodes table.`)
      }
    })
    return nodesInList
  }

Rules
  = statements:(Rule ",")* lastStatement:Rule {
    return [ ...statements.map(x => x[0]), lastStatement ]
  }

Rule
  = _ "send" _ dbName:String _ "to" _ target:TargetValue _ filter:Filter _ {
    // target can be either a list of nodes or a single node:
    return {
      dbName,
      target,
      filter,
    }
  }

TargetValue
  = value:Variable { return value }
  / value:String {
    // Check the availability of single nodes during rule declaration:
    if (typeof nodesAvailable[value] === 'undefined') {
      error(`Node "${value}" is not available. Please add it to the nodes table.`)
    }
    return value
  }

Filter
  = firstFilter:(_ "if" _ Clause _) filters:(_ "and" _ Clause _)* {
    return [ firstFilter[3], ...filters.map(x => x[3]) ]
  }
  / _ {
    return undefined
  }

Clause
  = object:Object ":" attribute:Variable _ comparison:Comparison {
    return {
      object,
      attribute,
      ...comparison,
    }
  }

Comparison
  = operator:"is" _ value:IsValue { return { operator, value } }
  / operator:"isnot" _ value:IsNotValue { return { operator, value } }
  / operator:"isin" _ value:IsInValue { return { operator, value } }
  / operator:"notin" _ value:NotInValue { return { operator, value } }
  / operator:"lte" _ value:LteValue { return { operator, value } }
  / operator:"lt" _ value:LtValue { return { operator, value } }
  / operator:"gte" _ value:GteValue { return { operator, value } }
  / operator:"gt" _ value:GtValue { return { operator, value } }
  / operator:"matches" _ value:MatchesValue { return { operator, value } }
  / operator:"mst" _ value:MstValue { return { operator, value } }

IsValue
  = value:String { return `"${value}"` }
  / value:Number { return value }
  / value:ObjectAttributePair { return value }

IsNotValue
  = value:String { return `"${value}"` }
  / value:Number { return value }
  / value:ObjectAttributePair { return value }

IsInValue
  = value: ComparisonList { return value }

NotInValue
  = value: ComparisonList { return value }

LteValue
  = value:Number { return value }
  / value:ObjectAttributePair { return value }

LtValue
  = value:Number { return value }
  / value:ObjectAttributePair { return value }

GteValue
  = value:Number { return value }
  / value:ObjectAttributePair { return value }

GtValue
  = value:Number { return value }
  / value:ObjectAttributePair { return value }

MatchesValue
  = value:Regex { return value }
  / value:ObjectAttributePair { return value }

MstValue
  = value:String { return `"${value}"` }
  / value:ObjectAttributePair { return value }

ObjectAttributePair
  = object:Object ":" attribute:Variable {
    return { target: true, object, attribute }
  }

Object
  = "source" / "target" / "package-meta" / "package"

ComparisonList
  = "[" values:(_ ComparisonListValue _ "," _)* lastValue:(_ ComparisonListValue _) "]" {
    let comparisonListString = `[`
    values.map(x => x[1]).forEach((x) => {
      comparisonListString = comparisonListString.concat(`${x},`)
    })
    comparisonListString = comparisonListString.concat(`${lastValue[1]}]`)
    return comparisonListString
  }
  / "[" _ "]" { return "[]" }

ComparisonListValue
  = value:String { return `"${value}"` }
  / value:Number { return `${value}` }

String "string"
  = "\"" value:StringChar* "\"" {
    return value.join("")
  }

StringChar
  = !("\"" / "\\") char:. { return char }
  / "\\" char:EscapeChar { return char }

Regex "regex"
  = "/" value:RegexChar* "/" {
    return new RegExp(value.join(""))
  }

RegexChar
  = !("/" / "\\") char:. { return char }
  / "\\" char:EscapeChar { return char }

EscapeChar
  = "\""
  / "/"
  / "\\"
  / "s" { return "\s" }
  / "t" { return "\t" }
  / "n" { return "\n" }
  / "r" { return "\r" }

Number "number"
  = _ [0-9]+ "." [0-9]+ { return parseFloat(text()) }
  / _ [0-9]+ { return parseInt(text(), 10); }

Variable "variable"
  = value:[a-zA-Z0-9_]+ {
    return value.join("")
  }

_ "whitespace"
  = [ \t\n\r]*

