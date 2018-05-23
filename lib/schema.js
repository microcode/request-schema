const { Entry } = require('./entry');
const { NodeData } = require('./data');

const { PathTree } = require('@microcode/pathtree');
const isFunction = require('lodash.isfunction');

function getWildcardArguments(node) {
    const args = [];
    for (; node !== null; node = node.parent_node) {
        if (node.is_wildcard) {
            args.unshift(node.key);
        }
    }
    return args;
}

class Schema {
    constructor(methods) {
        this._methods = new Map(methods.map(method => [method, new PathTree()]));
        this._options = {
            dataParameter: 'data',
            sessionParameter: 'session'
        }
    }

    on(method, url, ...args) {
        const m = this._methods.get(method);
        if (!m) {
            throw new Error("Unsupported method");
        }

        const node = m.insert(url);

        const filters = args.length > 1 ? args.slice(0, -1) : [];
        const func = args.slice(-1)[0];

        if (!isFunction(func)) {
            throw new Error("Not a function");
        }

        let data = node.data;
        if (!data) {
            const args = getWildcardArguments(node);
            node.data = data = new NodeData(args);
        }

        data.add_entry(new Entry(filters, func));
    }

    async run(method, url, ...args) {
        const m = this._methods.get(method);
        if (!m) {
            throw new Error("Unsupported method");
        }

        const capture = new Map();
        const node = m.find(url, capture);
        if (!node) {
            throw new Error("Could not find function");
        }

        const data = node.data;
        if (!data) {
            return;
        }

        // TODO: run filters

        console.log("RUN", node.key, method, url, capture);
    }
}

exports.Schema = Schema;
