import { IResult } from "./schema/IResult";

export type CompletionCallbackFn = (err: Error | null, result: IResult | null, context: any) => Promise<void>;
export type ParameterMap = Map<string,string>;

export interface IFilterData {
    readonly method: string;
    readonly path: string;
    readonly data: any;
    readonly context: any;
    readonly params: ParameterMap;
    readonly result: IResult;

    resolve(value: any) : Promise<void>;
    reject(err: Error) : Promise<void>;
    onCompleted(func: CompletionCallbackFn): Promise<void>;
}
