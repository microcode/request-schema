import {IResult} from "./schema/Result";

export type CompletionCallbackFn = (err: Error | null, result: IResult | null, context: any) => Promise<void>;
type ParameterMap = Map<string,string>;

export interface IFilterData {
    readonly method: string;
    readonly path: string;
    readonly data: string;
    readonly context: string;
    readonly params: ParameterMap;
    readonly result: IResult;

    resolve(value: any) : Promise<void>;
    reject(err: Error) : Promise<void>;
    onCompleted(func: CompletionCallbackFn): Promise<void>;
}

type ResolveFn = (result: IResult) => Promise<void>;
type RejectFn = (err: Error) => Promise<void>;
type OnCompletedFn = (fn: CompletionCallbackFn) => Promise<void>;

export class FilterData implements IFilterData {
    private readonly _method: string;
    private readonly _path: string;
    private readonly _data: string;
    private readonly _context: string;
    private readonly _params: ParameterMap;
    private readonly _resolve: ResolveFn;
    private readonly _reject: RejectFn;
    private readonly _on_completed: OnCompletedFn;
    private readonly _result: IResult;

    constructor(method: string, path: string, data: any, context: any, params: ParameterMap, resolve : ResolveFn, reject: RejectFn, on_completed: OnCompletedFn, result: IResult) {
        this._method = method;
        this._path = path;
        this._data = data;
        this._context = context;
        this._params = params;
        this._resolve = resolve;
        this._reject = reject;
        this._on_completed = on_completed;
        this._result = result;
    }

    get method() {
        return this._method;
    }

    get path() {
        return this._path;
    }

    get data() {
        return this._data;
    }

    get context() {
        return this._context;
    }

    get params() {
        return this._params;
    }

    async resolve(value: any) {
        return this._resolve(this._result.withValue(value));
    }

    async reject(err: Error) {
        return this._reject(err);
    }

    async onCompleted(fn: CompletionCallbackFn): Promise<void> {
        if (this._on_completed) {
            return this._on_completed(fn);
        }
    }

    get result() {
        return this._result;
    }
}

export abstract class IFilter {
    abstract run(data: IFilterData): Promise<void>;
}
