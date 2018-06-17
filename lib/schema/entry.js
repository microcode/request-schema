class Entry {
    constructor(filters, func) {
        this._filters = filters;
        this._func = func;
        this._args = [];
    }

    get filters() {
        return this._filters;
    }

    get func() {
        return this._func;
    }

    get args() {
        return this._args;
    }

    set args(value) {
        this._args = value;
    }
}

exports.Entry = Entry;
