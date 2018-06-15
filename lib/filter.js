const debug = require('debug')('request-schema:filter');

class FilterData {
    constructor(method, path, data, context, params, resolve, reject, on_completed) {
        this._method = method;
        this._path = path;
        this._data = data;
        this._context = context;
        this._params = params;
        this._resolve = resolve;
        this._reject = reject;
        this._on_completed = on_completed;
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

    async resolve(response) {
        return this._resolve(response);
    }

    async reject(err) {
        return this._reject(err);
    }

    async on_completed(func) {
        if (this._on_completed) {
            return this._on_completed(func);
        }
    }
}

class Filter {
    async run(data) {}
}

exports.FilterData = FilterData;
exports.Filter = Filter;
