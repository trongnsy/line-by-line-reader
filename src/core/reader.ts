import { once } from "events";
import { createReadStream } from "fs";
import { createInterface, Interface } from "readline";

import { DataCreatorFunc, DataSelectionResult, IDataAccumulator, IDataFileConfig, } from "./declaration";
import { DataSelector } from "./selector";

export class LineByLineReader<TData> {
    private _fileConfig: IDataFileConfig;
    private _selector: DataSelector<TData> | undefined;
    private _accumulator: IDataAccumulator<TData, any> | undefined;
    private _dataCreatorFunc: DataCreatorFunc<TData>;

    private _readLineInterface: Interface | undefined;

    constructor(
        fileConfig: IDataFileConfig,
        dataCreatorFunc: DataCreatorFunc<TData>,
        accumulator: IDataAccumulator<TData, any>,
        selector?: DataSelector<TData>
    ) {
        this._selector = selector;
        this._fileConfig = fileConfig;
        this._accumulator = accumulator;
        this._dataCreatorFunc = dataCreatorFunc;
    }

    public async readAsync(): Promise<void> {
        try {
            this._readLineInterface = createInterface({
                input: createReadStream(this._fileConfig.path),
                crlfDelay: Infinity
            });

            var lineIndex: number = 0;
            this._readLineInterface.on("line", (line: string) => {
                this._readLineInterface?.pause();
                this.onLined(line, lineIndex++ === 0);
            });

            await once(this._readLineInterface, "close");
        } catch (error) {
            console.error(error.message);
        }
    }

    private onLined(line: string, isHeader: boolean): void {
        const fields: Array<string> = line.split(this._fileConfig.delimiter);

        if (isHeader) {
            this.onHeaderLined(fields);
        } else {
            this.onDataLined(fields);
        }
    }

    private onHeaderLined(fields: Array<string>): void {
        const invalidFormat = this._fileConfig.headers.some((field, index) => field !== fields[index]);

        if (invalidFormat) {
            this._readLineInterface?.close();
            console.log('File format is differrent with predefined format in config file.');
        } else {
            this._readLineInterface?.resume();
        }
    }

    private onDataLined(fields: Array<string>): void {
        const data: TData = this._dataCreatorFunc(fields);

        if (this._selector) {
            const selectionState = this._selector.doCheck(data);

            if (selectionState === DataSelectionResult.Stop) {
                this._readLineInterface?.close();

                return;
            }

            if (selectionState === DataSelectionResult.Skip) {
                this._readLineInterface?.resume();

                return;
            }
        }

        this._accumulator?.compute(data);
        this._readLineInterface?.resume();
    }
}