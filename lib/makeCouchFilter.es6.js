function makeCouchFilter (filterArray, sourceNode, targetNode) {

  const linesOfCode = []
  linesOfCode.push(`${sourceNode.node_name}_to_${targetNode.node_name}_filter : function(doc,req) { `)
  linesOfCode.push(`var classyjs = require("views/lib/classyjs");`)
  linesOfCode.push(`var targetNode = ${JSON.stringify(targetNode)};`)
  linesOfCode.push(`var sourceNode = ${JSON.stringify(sourceNode)};`)
  linesOfCode.push(`if (doc["_id"].indexOf("_design") >= 0) {log("REPLICATION FILTER SKIPS design doc: " + doc["_id"]);return false;}`)
  if (typeof filterArray === 'undefined') {
    linesOfCode.push('return true;}')
    return linesOfCode.join('')
  }
  linesOfCode.push(`log("REQ CONTENTS: " + toJSON(req));`)
  linesOfCode.push(`log("DOC CONTENTS: " + toJSON(doc));`)
  linesOfCode.push(`if (doc["_deleted"] && doc["_deleted"] === true) {log("REPLICATING deletion of doc id: " + doc["_id"] + ", rev: " + doc["_rev"]); return true; }`)
  linesOfCode.push(`if (doc["md_attributes"] === undefined || !doc["md_attributes"]) {log("REPLICATION FILTER FAILS on md_attributes:" + doc["_id"]);return false;}`)

  filterArray.forEach((filter) => {
    const { object, operator, value } = filter
    const attribute = filter.attribute.toLowerCase()

    const leftOperand = (() => {
      switch (object) {
        case 'source':
          return `sourceNode["attributes"]["${attribute}"]`
        case 'target':
          return `targetNode["attributes"]["${attribute}"]`
        case 'package':
          return `doc["${attribute}"]`
        case 'package-meta':
          return `doc["md_attributes"]["${attribute}"]`
        default:
          return null
      }
    })()

    const rightOperand = (() => {
      if (value.target === true && typeof value.object !== 'undefined' &&
      typeof value.attribute !== 'undefined') {
        const targAttribute = value.attribute.toLowerCase()
        switch (value.object) {
          case 'source':
            return `sourceNode["attributes"]["${targAttribute}"]`
          case 'target':
            return `targetNode["attributes"]["${targAttribute}"]`
          case 'package':
            return `doc["${targAttribute}"]`
          case 'package-meta':
            return `doc["md_attributes"]["${targAttribute}"]`
          default:
            return null
        }
      } else {
        return value
      }
    })()

    const comparison = (() => {
      switch (operator) {
        case 'is':
          return `${leftOperand} === ${rightOperand}`
        case 'isnot':
          return `${leftOperand} !== ${rightOperand}`
        case 'isin':
          return `${rightOperand}.indexOf(${leftOperand}) > -1`
        case 'notin':
          return `${rightOperand}.indexOf(${leftOperand}) === -1`
        case 'lte':
          return `${leftOperand} <= ${rightOperand}`
        case 'lt':
          return `${leftOperand} < ${rightOperand}`
        case 'gte':
          return `${leftOperand} >= ${rightOperand}`
        case 'gt':
          return `${leftOperand} > ${rightOperand}`
        case 'matches':
          return `${leftOperand}.match(${rightOperand})`
        case 'mst':
          return `classyjs.bannerEqOrMoreSecureThan(${leftOperand}, ${rightOperand})`
        default:
          return null
      }
    })()

    const comparisonExpression = `typeof ${leftOperand} !== "undefined" && ${comparison}`
    linesOfCode.push(`if (!(${comparisonExpression})) {log("REPLICATION FILTER FAILS doc " + doc["_id"] + " on expression test."); return false;}`)
  })

  linesOfCode.push(`return true;}`)
  return linesOfCode.join('')
}

module.exports = makeCouchFilter
