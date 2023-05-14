import { parseScript } from 'esprima';

import first from 'lodash.first';

import { IEntry } from './IEntry';
import { Arg } from './Arg';

import Debug from "debug";
const debug = Debug('request-schema:data');

type ArgArray = [string,boolean][]

export class NodeData {
    private _path: string;
    private _args: string[];
    private _entries: IEntry[];

    constructor(path: string, args: string[]) {
        this._path = path;
        this._args = args;
        this._entries = [];
    }

    get path() {
        return this._path;
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
            ([] as ArgArray).concat(
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

            return new Arg(arg, argsMap.get(arg)!);
        });
    }
}
