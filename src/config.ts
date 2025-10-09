import { tools } from '@iobroker/js-controller-common-db';
import { DatabaseOptions } from '@iobroker/types/build/config';

export interface RedisConfig {
    host: string;
    port: number;
    password?: string;
    db?: number;
}

/**
 * Get the config directly from fs - never cached
 */
export function getConfig(redis: RedisConfig): ioBroker.IoBrokerJson {
    const dbOptions: DatabaseOptions = {
        type: 'redis',
        '// type': '',
        host: redis.host,
        port: redis.port,
        connectTimeout: 5000,
        writeFileInterval: 5000,
        dataDir: '',
        options: {
            auth_pass: redis.password ?? '',
            retry_max_delay: 5000,
            retry_max_count: 19,
            db: redis.db ?? 0,
            family: 0,
        },
        backup: {
            disabled: false,
            files: 24,
            '// files': '',
            hours: 48,
            '// hours': '',
            period: 120,
            '// period': '',
            path: '',
            '// path': '',
        },
        jsonlOptions: {
            '// autoCompress (1)': '',
            '// autoCompress (2)': '',
            '// autoCompress (3)': '',
            autoCompress: {
                sizeFactor: 2,
                sizeFactorMinimumSize: 25000,
            },
            '// ignoreReadErrors': '',
            ignoreReadErrors: true,
            '// throttleFS (1)': '',
            '// throttleFS (2)': '',
            throttleFS: {
                '// intervalMs': '',
                intervalMs: 60000,
                '// maxBufferedCommands': '',
                maxBufferedCommands: 100,
            },
        },
    };
    return {
        system: {
            memoryLimitMB: 0,
            hostname: tools.getHostName(),
            statisticsInterval: 0,
            '// statisticsInterval': '',
            checkDiskInterval: 0,
            '// checkDiskInterval': 'Disabled in k8s',
            instanceStartInterval: 0,
            compact: false,
            '// compact': 'Never used in k8s',
            allowShellCommands: false,
            '// allowShellCommands': 'For security reasons, shell commands are not allowed in k8s',
            memLimitWarn: 100,
            '// memLimitWarn': 'Warn if less than 100 MB available',
            memLimitError: 50,
            '// memLimitError': 'Error if less than 50 MB available',
        },
        multihostService: {
            enabled: false,
            secure: true,
            password: '',
            persist: false,
        },
        objects: {
            ...dbOptions,
            noFileCache: false,
        },
        states: {
            ...dbOptions,
            maxQueue: 1000,
        },
        log: {
            level: 'debug',
            maxDays: 7,
            noStdout: false,
            transport: {},
        },
        '// dataDir': 'Always relative to iobroker.js-controller/',
        dataDir: '',
        plugins: {},
        '// dnsResolution': "Use 'verbatim' for ipv6 first, else use 'ipv4first'",
        dnsResolution: 'ipv4first',
    };
}
