const esprima = require('esprima');
const first = require('lodash.first');
const log = require('@microcode/debug-ng')('request-schema:data');

function getFunctionArguments(func, nodeArgs, entryArgs, extraArgs)
{
    const maybe = x => (x || {});
    const argsMap = new Map(
        [].concat(
            nodeArgs.map(arg => [arg, false])
        ).concat(
            entryArgs.map(arg => [arg, true])
        ).concat(
            extraArgs.map(arg => [arg, false])
        )
    );

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
            log.error('Unknown function format "%s"', type);
            throw new Error("Unknown function format '" + type + "'");
        }
    }

    return funcArgs.map(arg => {
        if (!argsMap.has(arg)) {
            log.error('Unknown function parameter "%s"', arg);
            throw new Error("Unknown function parameter '" + arg + "'");
        }

        return new Arg(arg, argsMap.get(arg));
    });
}

class Arg {
    constructor(name, optional) {
        this._name = name;
        this._optional = optional;
    }

    get name() {
        return this._name;
    }

    get optional() {
        return this._optional;
    }
}

class NodeData {
    constructor(args) {
        this._args = args;
        this._entries = [];
    }

    add_entry(entry, entryArgs, extraArgs) {
        entry.args = getFunctionArguments(entry.func, this._args, entryArgs, extraArgs);
        this._entries.push(entry);
    }

    get entries() {
        return this._entries;
    }
}

exports.NodeData = NodeData;