const { Entry } = require('./schema/entry');
const { NodeData } = require('./schema/data');

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
    constructor(methods, options) {
        this._methods = new Map(methods.map(method => [method, new PathTree()]));
        this._options = Object.assign({
            data: 'data',
            context: 'context'
        }, options || {});

        Object.seal(this);
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

        data.add_entry(new Entry(filters, func), [this._options.data, this._options.context]);
    }

    async run(method, url, data, context) {
        const m = this._methods.get(method);
        if (!m) {
            throw new Error("Unsupported method");
        }

        const capture = new Map();
        const node = m.find(url, capture);
        if (!node) {
            throw new Error("Could not find function");
        }

        const nodeData = node.data;
        if (!nodeData) {
            return;
        }

        capture.set(this._options.data, data);
        capture.set(this._options.context, context);

        let lastError = null;
        for (let entry of nodeData.entries)  {
            const argNames = entry.args;

            const args = argNames.map(name => {
                if (!capture.has(name)) {
                    throw new Error("Could not find variable '" + name + "'")
                }
                return capture.get(name);
            });

            // TODO: run filters

            try {
                return await entry.func.apply(context, args);
            } catch (err) {
                lastError = err;
            }
        }

        if (lastError) {
            throw lastError;
        } else {
            throw new Error("No response");
        }
    }
}

exports.Schema = Schema;
