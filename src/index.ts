#!/usr/bin/env node

import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import { init } from './main';

interface Arguments {
    verbose?: boolean;
}

const argv = yargs(hideBin(process.argv))
    .option('verbose', {
        alias: 'v',
        type: 'boolean',
        description: 'Run with verbose logging',
        default: false,
    })
    .help()
    .alias('help', 'h')
    .parseSync() as Arguments;

function run(): void {
    console.log('ioBroker Kubernetes Controller');

    if (argv.verbose) {
        console.log('Verbose mode enabled');
        console.log('Arguments:', argv);
    }

    console.log('Controller starting...');
    init();
}

if (require.main === module) {
    run();
}

export { run as main };
