import { IResult } from "./schema/Result";
import { IFilterData, CompletionCallbackFn, ParameterMap } from "./IFilterData";

type ResolveFn = (result: IResult) => Promise<void>;
type RejectFn = (err: Error) => Promise<void>;
type OnCompletedFn = (fn: CompletionCallbackFn) => Promise<void>;

export class FilterData implements IFilterData {
    private readonly _method: string;
    private readonly _path: string;
    private readonly _data: string;
    private readonly _context: any;
    private readonly _params: ParameterMap;
    private readonly _resolve: ResolveFn;
    private readonly _reject: RejectFn;
    private readonly _onCompleted: OnCompletedFn;
    private readonly _result: IResult;

    constructor(method: string, path: string, data: any, context: any, params: ParameterMap, resolve : ResolveFn, reject: RejectFn, onCompleted: OnCompletedFn, result: IResult) {
        this._method = method;
        this._path = path;
        this._data = data;
        this._context = context;
        this._params = params;
        this._resolve = resolve;
        this._reject = reject;
        this._onCompleted = onCompleted;
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
        if (this._onCompleted) {
            return this._onCompleted(fn);
        }
    }

    get result() {
        return this._result;
    }
}
