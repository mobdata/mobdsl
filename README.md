# mobdsl

Parser tool that produces configuration for Apache CouchDb's replication. Uses a simple, straight-forward DSL.

# Install

`npm install @mobdata/mobdsl`

# Why

Apache CouchDb's replication documents can be awkward to manage if there are large numbers of servers and/or if they have filters. This DSL can specify in a few lines what would otherwise require hundreds/thousands of lines of JSON and JavaScript.

# Examples

To quickly see what mobdsl is doing run this:

````bash
npm run install --save-dev
cd examples
cat rule.txt
./generate_single.js
````

From the above you will see how a single rule, easily readable, is converted into a combination of JSON and JavaScript, ready for CouchDb's purposes.

`generate_multiple.js` shows two lines of rules (from `rules.txt`) being converted into much longer JSON.

`view_filter.js` extracts the dense JavaScript function from the output and formats it for easier reading.

# How-to

The DSL is a parser that accepts replication rules and server configurations and returns a JSON array of replication documents that can be applied to an Apache CouchDb's `_replicator` database. It's most easily used as part of the MobNode webapp.

## Rules

The simplest rule might be:

````
send "my_data" to "remote_node"
````

Which follows the format:

````
send "<database_name>" to "<remote_server>"
````

## Save time and typing using nicknames and lists

Rules are separated by commas. Servers have nicknames called "node_names" (see "opts" below). Multiple nodes can be grouped into lists.

````
friends = ["thor", "hulk", "cap"],
enemies = ["thanos", "ultron", "hela"],
frenemies: ["loki", "deadpool"],
send "secret_plans" to friends,
send "misdirection_plans" to enemies,
send "bad_jokes" to frenemies
````

## No JavaScript required using if-clauses

Rules can include complex logic. mobdsl converts it into JavaScript and JSON be applies it to CouchDb.

````
friends = ["thor", "hulk", "cap"],
enemies = ["thanos", "ultron", "hela"],
frenemies: ["loki", "deadpool"],
send "upcoming_schedule" to friends if package-meta:designation is "secret",
send "upcoming_schedule" to enemies if package-meta:designation is "public",
send "upcoming_schedule" to frenemies if package-meta.designation is "public",
send "jokes" to friends if package-meta:rating is "funny",
send "jokes" to enemies if package-meta:rating is "sarcastic",
send "jokes" to frenemies if package-meta:rating is "sarcastic" or package-meta:rating is "annoying"
````

The rules can inspect:

* Each document being sent, called the "package",
* Each document's metadata, called "package-meta",
* Each server sending documents, called the "source", and
* Each server receiving documents, called the "target".

The `source` and `target` attributes are defined the `opts` data described further down. The `package` is a JSON document. It's the document you or your user is storing to a CouchDb database.

The contents of `package` are defined solely by your user. If you need to inspect the document in order to know if it can be replicated to another server you'll then need to know its basic structure/contents. This will require some coordination with whomever is writing the document to CouchDb.

The contents of `package-meta` will include whatever data helps describe the document but is not part of that document. For example, if a database contains articles from various magazines, the `package` might be each article's text, including title and author(s). The `package-meta` might then be some JSON describing things like number of words in the article, overall size of the package, source magazine, etc. In a security company, `package-meta` might contain the security designation of the document, such as `"designation": "secret"` or `"designation": "confidential"`.

JSON examples of what `package` and `package-meta` look like are given further below.

## Operators

The if-clauses can compare data in the following ways.

| Operator        | Definition           | Example  |
| --------- |------------------------------| ---------|
| `is`      | Relative equality, ==        | `package:title is "A title"` |
| `isnot`   | Not equal, !==               | `package-meta:type isnot "press release"` |
| `isin`    | Is in a list/array           | `package:author isin ["Stephen King", "Clive Barker", "Bram Stoker"]` |
| `notin`   | Is not in a list/array       | `package:author notin ["Nora Roberts", "Julia Quinn", "Sarah MacLean"]` |
| `lte`     | Less than or equal           | `package-meta:size lte 50` |
| `lt`      | Less than                    | `package-meta:size lt 51` |
| `gte`     | Greater than or equal        | `package-meta:priority gte 9` |
| `gt`      | Greater than                 | `package-meta:priorty gt 5` |
| `matches` | Matches a JavaScript regex   | `package:title matches /PRESS RELEASE.*/` |
| `mst`     | "More Secure Than", compares government classifications | `target:classification mst package-meta:classification` |

## Opts

The following defines the `opts` data structure. To be clear, mobdsl has always been part of a larger whole. The MobNode webapp uses mobdsl and provides the `opts` data, which can be non-trivial.

`opts` contains the server information for your enterprise. Each server is called a `node`. This means that the rules you write will define how data is replicated between these nodes. Each node has its own set of rules: node "A" has rules for sending data to nodes "B" and "C", and node "B" has its own rules for sending to nodes "A" and "C" and so on. On each node we refer to itself as the "source" node or "base" node.

The `opts` structure looks like this:

````json
{
  "nodes": {
    "<node_name>": {
      "node_name": "<node_name>",
      "url": "<url>",
      "attributes": { "<attribute>": "<value>", "<attribute>": "<value>", ... }
    },
    ...
  },
  "_source_node_name": "<node_name>"
}
````

`nodes` is a list of all the servers that are part of the replication system. Each server, or node, has a `node_name` to refer to it. `_source_node_name` is the `node_name` of the current server.

The `attributes` for each node define what can queried in a given rule. `send "data" to all_servers where target:company is "my_company"` is only a valid rule if `company` is one of the attributes for the nodes.

````json
const opts =
{
  "nodes": {
    "base": {
      "node_name": "base",
      "url": "https://test.server.com:443",
      "attributes": { "company": "apple", "office_type": "regional" }
    },
    "node_a": {
      "node_name": "node_a",
      "url": "https://test1.server.com:443",
      "attributes": { "company": "google", "office_type": "regional" }
    },
    "node_b": {
      "node_name": "node_b",
      "url": "https://test2.server.com:443",
      "attributes": { "company": "google", "office_type": "hq" }
    },
    "node_c": {
      "node_name": "node_c",
      "url": "https://test3.server.com:443",
      "attributes": { "company": "google", "office_type": "regional" }
    }
  },
  "_source_node_name": "base"
}
````

Two side notes:

* You'll notice there's a duplication of the `node_name`, for example
  * `'node_a': { 'node_name': 'node_a', ... }`
  * Why specify "node_a" twice? For now it's a requirement, but in the future we'll fix it so that this duplication isn't needed.
* Each `node_name` is a nickname for your servers and is the primary way a user references the server in the rules.
  * Keep the node names as short and identifiable as possible, because users will be writing them a lot and will be reading them a lot.

# From JavaScript to JSON

Assuming you had the rules and opts available, your next step is to convert it into JSON, before storing it in CouchDb.

````js
import parser from 'mobdsl'

const rules = '<some cool replication rules>'
const opts = '<JSON doc describing the servers you are replicating between>'
const replicationDocs = parser.parse(rules, opts)
console.log(replicationDocs)
````

The above would output something like this:

```json
{
    "rules": [{
            "db": "internal_research",
            "target": "https://md-104.trinityalps.org:443",
            "hash": "3f1694b10fe80e58",
            "continuous": true,
            "filter": "base_to_remote_node_a_filter : function(doc,req) {/* lengthy js code here */}"
        },
        {
            "db": "personnel_evaluations",
            "target": "https://md-103.trinityalps.org:443",
            "hash": "14471863c449a66c",
            "continuous": true,
            "filter": "base_to_remote_node_b_filter : function(doc,req) {/* lengthy js code here */}"
        }
    ]
}
````

This JSON can then be inserted, with a couple changes, into a CouchDb server's `_replicator` database, which would then trigger CouchDb's replication processes.

# Developing mobdsl

`mobdsl` is written using [PEG.js's](https://pegjs.org/) excellent parser generator. By editing `mobdata_grammar.pegjs` and running `npm run build` the PEG.js generator will generate the necessary JavaScript files that make up the module.

The grammar, in turn, makes use of some pure JavaScript functions found in the `lib` directory. These are written in ES6 and babel will down-convert to ES5.

When the module is published the ES6 source code files and `mobdata_grammar.pegjs` file are ignored.
