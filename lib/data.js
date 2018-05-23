class NodeData {
    constructor(args) {
        this._args = args;
        this._entries = [];
    }

    add_entry(entry) {
        this._entries.push(entry);
    }
}

exports.NodeData = NodeData;