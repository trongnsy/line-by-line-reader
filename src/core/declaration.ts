export interface IDataFileConfig {
    path: string;
    headers: Array<string>;
    delimiter: string;
}

export declare type DataCreatorFunc<T> = (inputs: Array<string>) => T;

export interface IDataAccumulator<TData, TResult> {
    compute(data: TData): void;
    getResult(): TResult;
}

export declare type DataSelectorFunc<T> = (data: T) => DataSelectionResult;

export enum DataSelectionResult {
    Select,
    Skip,
    Stop
}