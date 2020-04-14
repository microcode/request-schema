import {
    parseScript
} from 'esprima';

import first from 'lodash.first';

import {
    IEntry
} from './Entry';

import Debug from "debug";
const debug = Debug('request-schema:data');

export class Arg {
    private readonly _name : string;
    private readonly _optional: boolean;

    constructor(name: string, optional: boolean) {
        this._name = name;
        this._optional = optional;
    }

    get name(): string {
        return this._name;
    }

    get optional(): boolean {
        return this._optional;
    }
}

export class NodeData {
    _args: string[];
    _entries: IEntry[];

    constructor(args: string[]) {
        this._args = args;
        this._entries = [];
    }

    get entries() {
        return this._entries;
    }

    addEntry(entry: IEntry, entryArgs: string[], extraArgs: string[]) {
        entry.args = NodeData.getFunctionArguments(entry.func, this._args, entryArgs, extraArgs);
        this._entries.push(entry);
    }

    static getFunctionArguments(func: any, nodeArgs: string[], entryArgs: string[], extraArgs: string[]) {
        const maybe = (x: any) => (x || {});
        const argsMap = new Map<string,boolean>(
            [].concat(
                nodeArgs.map(arg => [arg, false])
            ).concat(
                entryArgs.map(arg => [arg, true])
            ).concat(
                extraArgs.map(arg => [arg, false])
            )
        );

        const funcString = "(" + func.toString() + ")";
        const tree = parseScript(funcString);

        const type = maybe(first(tree.body)).type;
        let funcArgs = [];

        switch (type) {
            case 'ExpressionStatement': {
                funcArgs = maybe(maybe(first(tree.body)).expression).params.map((param: any) => param.name);
            } break;

            case 'FunctionDeclaration': {
                funcArgs = maybe(first(tree.body)).params.map((param: any) => param.name);
            } break;

            default: {
                debug('Unknown function format "%s"', type);
                throw new Error("Unknown function format");
            }
        }

        return funcArgs.map((arg: string) => {
            if (!argsMap.has(arg)) {
                debug('Unknown function parameter "%s"', arg);
                throw new Error("Unknown function parameter");
            }

            return new Arg(arg, argsMap.get(arg));
        });
    }
}
