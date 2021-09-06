import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { convertToDate } from './date.utils';
import { getPortfolio } from './examples/transaction-reader';

const argv = yargs(hideBin(process.argv))
    .options({
        token: { alias: 't', type: 'string' },
        date: { alias: 'd' },
    })
    .parseSync();

const date = convertToDate(argv.date);
const token = argv.token;

getPortfolio(token, date);