import axios, { AxiosResponse } from "axios";
import {
    DataCreatorFunc,
    DataSelectorFunc,
    DataSelectionResult,
    IDataAccumulator,
    IDataFileConfig,
} from "../core/declaration";
import { LineByLineReader } from "../core/reader";
import { DataSelector, } from "../core/selector";
import { after, before } from "../date.utils";

const fileConfig: IDataFileConfig = {
    path: "src/examples/transactions.csv",
    delimiter: ",",
    headers: ["timestamp", "transaction_type", "token", "amount"]
};

interface Transaction {
    timestamp: string;
    transaction_type: string;
    token: string;
    amount: string;
}

enum TransactionType {
    DEPOSIT = "DEPOSIT",
    WITHDRAWL = "WITHDRAWL"
}

class PortfolioAccumulator implements IDataAccumulator<Transaction, Map<string, number>> {
    private _transactionMap: Map<string, number>;

    constructor() {
        this._transactionMap = new Map<string, number>();
    }

    compute(transaction: Transaction): void {
        const currentAmount = this._transactionMap.get(transaction.token) || 0;
        const updatedAmount = transaction.transaction_type === TransactionType.DEPOSIT
            ? Number(transaction.amount)
            : -Number(transaction.amount);

        this._transactionMap.set(transaction.token, currentAmount + updatedAmount);
    }

    getResult(): Map<string, number> {
        return this._transactionMap;
    }
}

/**
 * Get exchange rate for tokens on cryptocompare
 * @param tokens 
 * @param currency 
 * @returns 
 */
const getExchangeRate = function (tokens: Array<string>, currency: string): Promise<AxiosResponse<any>> {
    const exchangeRateApiUrl = "https://min-api.cryptocompare.com/data/pricemulti";
    const apiKey = "2854a5c3399c288c9183d204216c9c5d706e7d55bb64cd5a67eda10db684a574"; // Free key on cryptocompare 

    return axios.get(exchangeRateApiUrl, {
        params: {
            api_key: apiKey,
            fsyms: tokens.join(","),
            tsyms: currency
        }
    });
}

/**
 * Get portfolio value of the token(s) base on input params:
 * Given no parameters, return the latest portfolio value per token in USD
 * Given a token, return the latest portfolio value for that token in USD
 * Given a date, return the portfolio value per token in USD on that date
 * Given a date and a token, return the portfolio value of that token in USD on that date
 * @param tokenRef 
 * @param dateRef 
 */
export const getPortfolio = async function (tokenRef?: string, dateRef?: Date) {
    const dataCreatorFunc: DataCreatorFunc<Transaction> = function (inputs: Array<string>): Transaction {
        const [timestamp, transaction_type, token, amount] = inputs;
        const transaction: Transaction = { timestamp, transaction_type, token, amount };

        return transaction;
    }

    /**
     * Since logs are sorted by descending timestamp
     * So if transaction's timestamp is after the dateRef, it will be skipped
     * Else if transaction's timestamp is after the dateRef, we will stop to read file
     * Otherwise, it will be selected
     */
    const checkDateFunc: DataSelectorFunc<Transaction> = function (transaction: Transaction): DataSelectionResult {
        if (!dateRef) {
            return DataSelectionResult.Select;
        }

        if (after(Number(transaction.timestamp), dateRef)) {
            return DataSelectionResult.Skip;
        }

        if (before(Number(transaction.timestamp), dateRef)) {
            return DataSelectionResult.Stop;
        }

        return DataSelectionResult.Select;
    }

    const checkTokenFunc: DataSelectorFunc<Transaction> = function (transaction: Transaction): DataSelectionResult {
        return !tokenRef || tokenRef.toUpperCase() === transaction.token.toUpperCase()
            ? DataSelectionResult.Select
            : DataSelectionResult.Skip;
    }

    const transactionSelector = new DataSelector<Transaction>()
        .addCheckFunc(checkDateFunc)
        .addCheckFunc(checkTokenFunc);

    const accumulator: PortfolioAccumulator = new PortfolioAccumulator();

    const lineByLineReader = new LineByLineReader(
        fileConfig,
        dataCreatorFunc,
        accumulator,
        transactionSelector
    );

    console.time('#performance::readAsync');
    await lineByLineReader.readAsync();
    console.timeEnd('#performance::readAsync');

    const portfolioMap = accumulator.getResult();
    const currency = "USD"; // Which currency we want to return

    const response: AxiosResponse<any> = await getExchangeRate(Array.from(portfolioMap.keys()), currency);

    portfolioMap.forEach((portfolio, token) => {
        const exchangeRateObject = response.data && response.data[token];
        const exchangeRate = exchangeRateObject && exchangeRateObject[currency];

        if (exchangeRate) {
            console.log(`${token}: ${portfolio * exchangeRate} ${currency}.`);
        } else {
            console.log(`${token}: ${portfolio} (Cannot get the exchange of that token ${token} in ${currency} on Cryptocompare).`);
        }
    });
}