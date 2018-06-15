const esprima = require('esprima');
const first = require('lodash.first');
const debug = require('debug')('request-schema:data');

function getFunctionArguments(func, args)
{
    const maybe = x => (x || {});
    const argsSet = new Set(args);

    const funcString = "(" + func.toString() + ")";
    const tree = esprima.parse(funcString);

    const type = maybe(first(tree.body)).type;
    let funcArgs = [];

    switch (type) {
        case 'ExpressionStatement': {
            funcArgs = maybe(maybe(first(tree.body)).expression).params.map(param => param.name);
        } break;

        case 'FunctionDeclaration': {
            funcArgs = maybe(first(tree.body)).params.map(param => param.name);
        } break;

        default: {
            debug('Unknown function format "%s"', type);
            throw new Error("Unknown function format '" + type + "'");
        }
    }

    for (let arg of funcArgs) {
        if (!argsSet.has(arg)) {
            debug('Unknown function parameter "%s"', arg);
            throw new Error("Unknown function parameter '" + arg + "'");
        }
    }

    return funcArgs;
}

class NodeData {
    constructor(args) {
        this._args = args;
        this._entries = [];
    }

    add_entry(entry, extraArgs) {
        entry.args = getFunctionArguments(entry.func, this._args.concat(extraArgs));
        this._entries.push(entry);
    }

    get entries() {
        return this._entries;
    }
}

exports.NodeData = NodeData;