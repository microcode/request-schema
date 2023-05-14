type MetaMap = Map<string,any>;

export interface IResult {
    readonly value: any | null;
    readonly meta: MetaMap;

    withValue(v: any) : IResult;
    addMeta(key: string, value: any) : IResult;
}
