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

    resolve(response) {
        this._resolve(response);
    }

    reject(err) {
        this._reject(err);
    }

    on_completed(func) {
        this._on_completed && this._on_completed(func);
    }
}

class Filter {
    constructor() {
        const _run = this.run;
        this.run = async (filterData) => {
            try {
                await _run.call(this, filterData);
            } catch (err) {
                filterData.reject(err);
            }
        }
    }

    async run(data) {}
}

exports.FilterData = FilterData;
exports.Filter = Filter;
