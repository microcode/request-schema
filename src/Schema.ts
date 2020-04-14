import {IPathNode, PathTree} from '@microcode/pathtree';
import {NodeData} from './schema/NodeData';
import {Entry} from "./schema/Entry";
import {Arg} from "./schema/Arg";
import {CompletionCallbackFn, FilterData} from './FilterData';
import {IFilter} from './Filter';

import isFunction from 'lodash.isfunction';
import {PathCapture} from "@microcode/pathtree/dist/PathTree";
import {IResult, Result} from "./schema/Result";

import Debug from "debug";
const debug = Debug('request-schema:schema');

type ErrorFilterFn = (error: Error) => boolean;

export interface SchemaOptions {
    extraArguments: string[];
    errorFilter: ErrorFilterFn;
}

export class Schema {
    _methods: Map<string,PathTree>;
    _options: SchemaOptions;

    constructor(methods: string[], options: SchemaOptions | null = null) {
        this._methods = new Map(methods.map(method => [method, new PathTree()]));
        this._options = Object.assign({
            extraArguments: [],
            errorFilter: (err: Error) => true
        }, options || {});
    }

    on(method: string, path: string, ...args: any[]): void {
        debug('on("%s", "%s", ...)', method, path);

        const tree = this._methods.get(method);
        if (!tree) {
            debug('Method "%s" is not supported', method);
            throw new Error("Unsupported method");
        }

        const components = /^(.*?)(?:\?(.*))?$/.exec(path);
        if (!components) {
            throw new Error("Could not parse path");
        }
        const node = tree.insert(components[1]);

        const filters = args.length > 1 ? args.slice(0, -1) : [];
        const func = args.slice(-1)[0];

        for (const filter of filters) {
            if (!(filter instanceof IFilter)) {
                debug('Invalid filter supplied for "%s" ("%s")', path, method);
                throw new Error("Not a valid filter");
            }
        }

        if (!isFunction(func)) {
            debug('Path "%s" ("%s") is not a valid function', path, method);
            throw new Error("Not a function");
        }

        let data = node.data;
        if (!data) {
            const wcArgs = Schema.getWildcardArguments(node);
            node.data = data = new NodeData(wcArgs);
        }

        const queryArgs = Array.from((function* (s) {
            const re = /([^=]+)=(?:\:.*?(?:&|$))/gm;
            let m;
            while (m = re.exec(s)) yield m[1]; // tslint:disable-line:no-conditional-assignment
        })(components[2]));

        debug('Adding entry to path "%s" ("%s")', path, method);
        try {
            data.addEntry(new Entry(filters, func), queryArgs, ['data', 'context'].concat(this._options.extraArguments));
        } catch (err) {
            debug('Failed to add entry to path "%s" ("%s")', path, method);
            throw err;
        }
    }

    async run(method: string, path: string, data: any | null = null, context: any | null = null, extra: [string, string][] | null = null) : Promise<any> {
        debug('run("%s", "%s", ...)', method, path);

        const m = this._methods.get(method);
        if (!m) {
            debug('Method "%s" is not supported', method);
            throw new Error("Unsupported method");
        }

        const components = /^(.*?)(?:\?(.*))?$/.exec(path);
        if (!components) {
            debug('Could not parse path "%s"', path);
            throw new Error("Could not parse path");
        }

        const capture = new Map<string,string>(extra);
        const node = m.find(components[1], capture);
        if (!node) {
            debug('Could not find function for path "%s" ("%s")', path, method);
            throw new Error("Could not find function");
        }

        const nodeData = node.data;
        if (!nodeData) {
            return;
        }

        let callbacks: CompletionCallbackFn[] = [];
        const registerCallback = (cb: CompletionCallbackFn): Promise<void> => {
            callbacks.push(cb);
            return Promise.resolve();
        };

        let isResolved = false;
        let isRejected = false;

        let resolveResult;
        let rejectError;

        const onResolve = async (_result: IResult): Promise<void> => {
            if (isResolved) {
                throw new Error("on_resolve already called");
            }

            isRejected = false;
            isResolved = true;
            resolveResult = _result;

            const cbs = callbacks.reverse();
            callbacks = [];

            for (const cb of cbs) {
                await cb(null, _result, context);
            }
        };
        const onReject = async (_err: Error): Promise<void> => {
            if (isRejected) {
                throw new Error("onReject() already called");
            }

            isResolved = false;
            isRejected = true;
            rejectError = _err;

            const cbs = callbacks.reverse();
            callbacks = [];

            for (const cb of cbs) {
                await cb(_err, undefined, context);
            }
        };

        for (const entry of nodeData.entries)  {
            callbacks = [];
            isRejected = false;
            const result = new Result();

            if (entry.filters) {
                for (const filter of entry.filters) {
                    if (isResolved || isRejected) {
                        break;
                    }

                    const filterData = new FilterData(method, path, data, context, capture, onResolve, onReject, registerCallback, result);
                    try {
                        await filter.run(filterData);
                    } catch (err) {
                        filterData.reject(err);
                    }
                }
            }

            if (isResolved) {
                break;
            }

            if (isRejected) {
                if (this._options.errorFilter(rejectError)) {
                    continue;
                } else {
                    break;
                }
            }

            try {
                let queryArgs: Map<string,string>;
                if (components[2]) {
                    queryArgs = new Map(Schema.filterQueryArgs(components[2]));
                }

                const args = entry.args.map((arg: Arg) => {
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
                                debug('Path "%s" ("%s") is missing argument value for "%s"', path, method, arg.name);
                                throw new Error("Argument value not found");
                            }

                            return undefined;
                        }
                    }
                });


                await onResolve(
                    result.withValue(await entry.func.apply(context, args))
                );
                break;
            } catch (err) {
                await onReject(err);
                if (!this._options.errorFilter(rejectError)) {
                    break;
                }
            }
        }

        if (!isResolved && !rejectError) {
            rejectError = new Error("No result");
        }

        if (isResolved) {
            return resolveResult;
        } else {
            throw rejectError;
        }
    }

    get(method: string, path: string, capture: PathCapture | null = null) {
        const m = this._methods.get(method);
        if (!m) {
            debug('Method "%s" is not supported', method);
            return undefined;
        }

        const node = m.find(path, capture);
        if (!node) {
            debug('Could not find function for path "%s" ("%s")', path, method);
            return undefined;
        }

        const nodeData = node.data;
        if (!nodeData) {
            return undefined;
        }

        return nodeData;
    }

    private static getWildcardArguments(node: IPathNode): string[] {
        const args: string[] = [];
        for (; node !== null; node = node.parent) {
            if (node.isWildcard) {
                args.unshift(node.key);
            }
        }
        return args;
    }

    private static *filterQueryArgs(s: string): Generator<[string, string]> {
        const re = /([^=]+)=(?:(.*?)(?:&|$))/gm;
        let m;
        while (m = re.exec(s)) yield [m[1], m[2]]; // tslint:disable-line:no-conditional-assignment
    }
}
