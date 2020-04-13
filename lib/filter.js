const log = require('@microcode/debug-ng')('request-schema:filter');

class FilterData {
    constructor(method, path, data, context, params, resolve, reject, on_completed, result) {
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

    async resolve(value) {
        return this._resolve(this._result.with_value(value));
    }

    async reject(err) {
        return this._reject(err);
    }

    async on_completed(func) {
        if (this._on_completed) {
            return this._on_completed(func);
        }
    }

    get result() {
        return this._result;
    }
}

class Filter {
    async run(data) {}
}

exports.FilterData = FilterData;
exports.Filter = Filter;
