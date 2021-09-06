import { DataSelectionResult, DataSelectorFunc } from "./declaration";

export class DataSelector<T> {
    private _checkFunctions: Array<DataSelectorFunc<T>> = [];

    constructor() { }

    public addCheckFunc(func: DataSelectorFunc<T>): DataSelector<T> {
        this._checkFunctions.push(func);
        return this;
    }

    public doCheck(data: T): DataSelectionResult {
        for (let i = 0; i < this._checkFunctions.length; i++) {
            const result = this._checkFunctions[i](data);

            if (result !== DataSelectionResult.Select) {
                return result;
            }
        }

        return DataSelectionResult.Select;
    }
}