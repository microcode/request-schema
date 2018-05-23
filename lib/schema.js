const { Entry } = require('./entry');

const { PathTree } = require('@microcode/pathtree');

class Schema {
    constructor(methods) {
        this._methods = new Map(methods.map(method => [method, new PathTree()]));
    }

    on(method, url, ...args) {
        const m = this._methods.get(method);
        if (!m) {
            throw new Error("Unsupported method");
        }

        const node = m.insert(url);

        const filters = args.length > 1 ? args.slice(0, -1) : [];
        const func = args.slice(-1).pop();

        const data = node.data;
        if (data) {
            data.push(new Entry(filters, func));
        } else {
            node.data = [new Entry(filters, func)];
        }
    }

    async run(method, url, ...args) {
        const m = this._methods.get(method);
        if (!m) {
            throw new Error("Unsupported method");
        }

        const capture = new Map();
        const node = m.find(url, capture);

        console.log("RUN", method, url, capture);
    }
}

exports.Schema = Schema;
