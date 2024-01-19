type MetaMap = Map<string,unknown>;

export interface IResult {
    readonly value?: unknown;
    readonly meta: MetaMap;

    withValue(v: unknown) : IResult;
    addMeta(key: string, value: unknown) : IResult;
}
