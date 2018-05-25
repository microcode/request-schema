const { Entry } = require('./schema/entry');
const { NodeData } = require('./schema/data');
const { FilterData, FilterStatus } = require('./filter');

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

async function runFilters(filters, filterDataFn) {
    if (filters) {
        for (let filter of filters) {
            const filterData = filterDataFn();
            await filter.run(filterData);
        }
    }
}

class Schema {
    constructor(methods, options) {
        this._methods = new Map(methods.map(method => [method, new PathTree()]));
        this._options = Object.assign({}, options || {});

        Object.seal(this);
    }

    on(method, path, ...args) {
        const m = this._methods.get(method);
        if (!m) {
            throw new Error("Unsupported method");
        }

        const node = m.insert(path);

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

        data.add_entry(new Entry(filters, func), ['data', 'context']);
    }

    async run(method, path, data, context) {
        const m = this._methods.get(method);
        if (!m) {
            throw new Error("Unsupported method");
        }

        const capture = new Map();
        const node = m.find(path, capture);
        if (!node) {
            throw new Error("Could not find function");
        }

        const nodeData = node.data;
        if (!nodeData) {
            return;
        }


        let is_resolved = false, is_rejected = false;
        let resolve_response = undefined, reject_error = undefined;
        const on_resolve = function (_response) {
            is_resolved = true;
            resolve_response = _response;
        };
        const on_reject = function (_err) {
            is_rejected = true;
            reject_error = _err;
        };

        let callbacks = [];
        const register_callback = function (cb) {
            callbacks.push(cb);
        }

        for (let entry of nodeData.entries)  {
            callbacks = [];
            is_rejected = false;

            await runFilters(entry.filters, () => new FilterData(method, data, context, capture, on_resolve, on_reject, register_callback));

            if (is_resolved) {
                break;
            }

            if (is_rejected) {
                continue;
            }

            const argNames = entry.args;
            const args = argNames.map(name => {
                switch (name) {
                    case 'data': return data;
                    case 'context': return context;
                    default: return capture.get(name);
                }
            });

            try {
                on_resolve(await entry.func.apply(context, args));
            } catch (err) {
                on_reject(err);
            }
        }

        if (is_resolved) {
            for (let cb of callbacks) {
                await cb(resolve_response, context);
            }
            return resolve_response;
        } else if (reject_error) {
            throw reject_error;
        } else {
            throw Error("No response");
        }
    }
}

exports.Schema = Schema;
