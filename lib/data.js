const esprima = require('esprima');
const first = require('lodash.first');

function getFunctionArgumentIndices(func, args)
{
    const maybe = x => (x || {});
    const argsSet = new Set(args);

    const funcString = func.toString();
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
            throw new Error("Unknown function format '" + type + "'");
        }
    }

    console.log("FUNC ARGS", funcArgs);
    console.log("INP", argsSet);

    const indices = new Map(funcArgs.map((arg, index) => {
        if (!argsSet.has(arg)) {
            throw new Error("Unknown function parameter '" + arg + "'");
        }

        return [arg, index];
    }));

    console.log(indices);

    return indices;
}

class NodeData {
    constructor(args) {
        this._args = args;
        this._entries = [];
    }

    add_entry(entry, extraArgs) {
        const args = this._args.concat(extraArgs);

        const indices = getFunctionArgumentIndices(entry.func, args);
        console.log(indices);





        this._entries.push(entry);
    }
}

exports.NodeData = NodeData;