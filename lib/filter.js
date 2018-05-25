const FilterStatus = {
    RESOLVED: 'resolved',
    REJECTED: 'rejected'
};

class FilterData {
    constructor(data, context, params, resolve, reject) {
        this._data = data;
        this._context = context;
        this._params = params;
        this._resolve = resolve;
        this._reject = reject;
        this._status = undefined;
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
        this._status = FilterStatus.RESOLVED;
        this._resolve(response);
    }

    reject(err) {
        this._status = FilterStatus.REJECTED;
        this._reject(err);
    }
}

class Filter {
    async run(data) {}
}

exports.FilterData = FilterData;
exports.FilterStatus = FilterStatus;
exports.Filter = Filter;
