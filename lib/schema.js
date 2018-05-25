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
            try {
                await filter.run(filterData);
            } catch (err) {
                filterData.reject(err);
            }
        }
    }
}

class Schema {
    constructor(methods, options) {
        this._methods = new Map(methods.map(method => [method, new PathTree()]));
        this._options = Object.assign({}, options || {});

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

        data.add_entry(new Entry(filters, func), ['data', 'context']);
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


        let is_completed = false;
        let resolve_response, reject_response;
        const on_resolve = function (_response) {
            is_completed = true;
            resolve_response = _response;
        };
        const on_reject = function(_err) {
            is_completed = true;
            reject_response = _err;
        }

        let lastError = null;
        for (let entry of nodeData.entries)  {
            await runFilters(entry.filters, () => new FilterData(data, context, capture, on_resolve, on_reject));

            if (is_completed && !reject_response) {
                if (!reject_response) {
                    break;
                }
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
                const response = await entry.func.apply(context, args);
                on_resolve(response);
                break;
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
