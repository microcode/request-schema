const { Entry } = require('./schema/entry');
const { NodeData } = require('./schema/data');
const { Filter, FilterData } = require('./filter');
const { Result } = require('./schema/result');

const { PathTree } = require('@microcode/pathtree');
const isFunction = require('lodash.isfunction');

const log = require('@microcode/debug-ng')('request-schema:schema');

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
            extra: [],
            filter_error: (err) => true
        }, options || {});

        Object.seal(this);
    }

    on(method, path, ...args) {
        log.debug('on("%s", "%s", ...)', method, path);

        const m = this._methods.get(method);
        if (!m) {
            log.error('Method "%s" is not supported', method);
            throw new Error("Unsupported method");
        }

        const components = /^(.*?)(?:\?(.*))?$/.exec(path);
        if (!components) {
            throw new Error("Could not parse path");
        }
        const node = m.insert(components[1]);

        const filters = args.length > 1 ? args.slice(0, -1) : [];
        const func = args.slice(-1)[0];

        for (let filter of filters) {
            if (!(filter instanceof Filter)) {
                log.error('Invalid filter supplied for "%s" ("%s")', path, method);
                throw new Error("Not a valid filter");
            }
        }

        if (!isFunction(func)) {
            log.error('Path "%s" ("%s") is not a valid function', path, method);
            throw new Error("Not a function");
        }

        let data = node.data;
        if (!data) {
            const args = getWildcardArguments(node);
            node.data = data = new NodeData(args);
        }

        const queryArgs = Array.from((function* (s) {
            const re = /([^=]+)=(?:\:.*?(?:&|$))/gm;
            let m;
            while (m = re.exec(s)) yield m[1];
        })(components[2]));

        log.debug('Adding entry to path "%s" ("%s")', path, method);
        try {
            data.add_entry(new Entry(filters, func), queryArgs, ['data', 'context'].concat(this._options.extra));
        } catch (err) {
            log.error('Failed to add entry to path "%s" ("%s")', path, method);
            throw err;
        }
    }

    async run(method, path, data, context, extra) {
        log.debug('run("%s", "%s", ...)', method, path);

        const m = this._methods.get(method);
        if (!m) {
            log.error('Method "%s" is not supported', method);
            throw new Error("Unsupported method");
        }

        const components = /^(.*?)(?:\?(.*))?$/.exec(path);
        if (!components) {
            log.error('Could not parse path "%s"', path);
            throw new Error("Could not parse path");
        }

        const capture = new Map(extra);
        const node = m.find(components[1], capture);
        if (!node) {
            log.error('Could not find function for path "%s" ("%s")', path, method);
            throw new Error("Could not find function");
        }

        const nodeData = node.data;
        if (!nodeData) {
            return;
        }

        let callbacks = [];
        const register_callback = function (cb) {
            callbacks.push(cb);
        };

        let is_resolved = false, is_rejected = false;
        let resolve_result = undefined, reject_error = undefined;
        const on_resolve = async function (_result) {
            if (is_resolved) {
                throw new Error("on_resolve already called");
            }

            is_rejected = false;
            is_resolved = true;
            resolve_result = _result;

            const cbs = callbacks.reverse();
            callbacks = [];

            for (let cb of cbs) {
                await cb(null, _result, context);
            }
        };
        const on_reject = async function (_err) {
            if (is_rejected) {
                throw new Error("on_reject already called");
            }

            is_resolved = false;
            is_rejected = true;
            reject_error = _err;

            const cbs = callbacks.reverse();
            callbacks = [];

            for (let cb of cbs) {
                await cb(_err, undefined, context);
            }
        };

        for (let entry of nodeData.entries)  {
            callbacks = [];
            is_rejected = false;
            const result = new Result();

            if (entry.filters) {
                for (let filter of entry.filters) {
                    if (is_resolved || is_rejected) {
                        break;
                    }

                    const filterData = new FilterData(method, path, data, context, capture, on_resolve, on_reject, register_callback, result);
                    try {
                        await filter.run(filterData);
                    } catch (err) {
                        filterData.reject(err);
                    }
                }
            }

            if (is_resolved) {
                break;
            }

            if (is_rejected) {
                if (this._options.filter_error(reject_error)) {
                    continue;
                } else {
                    break;
                }
            }

            try {
                let queryArgs = undefined;
                if (components[2]) {
                    queryArgs = new Map((function* (s) {
                        const re = /([^=]+)=(?:(.*?)(?:&|$))/gm;
                        let m;
                        while (m = re.exec(s)) yield [m[1], m[2]];
                    })(components[2]));
                }

                const args = entry.args.map(arg => {
                    switch (arg.name) {
                        case 'data': return data;
                        case 'context': return context;
                        default: {
                            if (capture.has(arg.name)) {
                                return decodeURIComponent(capture.get(arg.name));
                            }

                            if(queryArgs && queryArgs.has(arg.name)) {
                                return decodeURIComponent(queryArgs.get(arg.name));
                            }

                            if (!arg.optional) {
                                log.warn('Path "%s" ("%s") is missing argument value for "%s"', path, method, arg.name);
                                throw new Error("Argument value not found");
                            }

                            return undefined;
                        }
                    }
                });


                await on_resolve(
                        result.with_value(await entry.func.apply(context, args))
                );
                break;
            } catch (err) {
                await on_reject(err);
                if (!this._options.filter_error(reject_error)) {
                    break;
                }
            }
        }

        if (!is_resolved && !reject_error) {
            reject_error = new Error("No result");
        }

        if (is_resolved) {

            return resolve_result;
        } else {
            throw reject_error;
        }
    }

    get(method, path, capture) {
        const m = this._methods.get(method);
        if (!m) {
            log.error('Method "%s" is not supported', method);
            return undefined;
        }

        const node = m.find(path, capture);
        if (!node) {
            log.error('Could not find function for path "%s" ("%s")', path, method);
            return undefined;
        }

        const nodeData = node.data;
        if (!nodeData) {
            return undefined;
        }

        return nodeData;
    }
}

exports.Schema = Schema;
