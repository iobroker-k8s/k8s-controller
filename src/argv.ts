import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';

export const argv = yargs(hideBin(process.argv))
    .option('verbose', {
        alias: 'v',
        type: 'boolean',
        description: 'Run with verbose logging',
        default: false,
    })
    .option('redisHost', {
        type: 'string',
        description: 'Redis host',
        demandOption: true,
    })
    .option('redisPort', {
        type: 'number',
        description: 'Redis port',
        default: 6379,
    })
    .option('redisPassword', {
        type: 'string',
        description: 'Redis password',
    })
    .option('redisDb', {
        type: 'number',
        description: 'Redis database number',
    })
    .option('adapterRedisHost', {
        type: 'string',
        description: 'Adapter Redis host (if different from main Redis)',
    })
    .option('adapterRedisPort', {
        type: 'number',
        description: 'Adapter Redis port (if different from main Redis)',
    })
    .help()
    .alias('help', 'h')
    .env('IOB_K8S_')
    .parseSync();
