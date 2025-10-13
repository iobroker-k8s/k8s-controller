import type { Client as ObjectsClient } from '@iobroker/db-objects-redis';
import type { Client as StatesClient } from '@iobroker/db-states-redis';
import { EXIT_CODES, tools, type logger as toolsLogger } from '@iobroker/js-controller-common';
import { CustomObjectsApi } from '@kubernetes/client-node';
import yargs from 'yargs/yargs';
import { addAdapter } from './addAdapter';
import { kubeConfig, parseAdapterInstance } from './common';
import type { SendTo } from './main';
import type { MessageHandler } from './types';

const hostname = tools.getHostName();
const hostLogPrefix = `host.${hostname}`;

export async function cmdExec(
    msg: ioBroker.SendableMessage,
    sendTo: SendTo,
    logger: ReturnType<typeof toolsLogger>,
    objects: ObjectsClient,
    _states: StatesClient
): Promise<void> {
    if (!msg.message.data || typeof msg.message.data !== 'string') {
        logger.warn(
            `${hostLogPrefix} ${
                tools.appName
            } Invalid cmdExec object. Expected key "data" with the command as string. Got as "data": ${JSON.stringify(
                msg.message.data
            )}`
        );
        return;
    }
    const args: string[] = msg.message.data.split(' ');
    logger.info(`${hostLogPrefix} ${tools.appName.toLowerCase()} ${args.join(' ')}`);

    const handler: MessageHandler = {
        sendStdout: (data: string) => {
            logger.info(`${hostLogPrefix} ${tools.appName} ${data}`);
            void sendTo(msg.from, 'cmdStdout', { id: msg.message.id, data: data });
        },
        sendStderr: (data: string) => {
            logger.error(`${hostLogPrefix} ${tools.appName} ${data}`);
            void sendTo(msg.from, 'cmdStderr', { id: msg.message.id, data: data });
        },
        sendExit: (exitCode: number) => {
            logger.info(`${hostLogPrefix} ${tools.appName} exit ${exitCode}`);
            setTimeout(
                () => sendTo(msg.from, 'cmdExit', { id: msg.message.id, data: exitCode }),
                200
            );
        },
    };

    const cmdYargs = yargs()
        .option('debug', {
            type: 'boolean',
            description: 'Run with debug logging',
            default: false,
        })
        .command(
            ['add <adapter> [instance]', 'a'],
            'Add an adapter',
            (y) =>
                y
                    .positional('adapter', {
                        type: 'string',
                        describe: 'Name of the adapter to add',
                        demandOption: true,
                    })
                    .positional('instance', {
                        type: 'string',
                        describe:
                            'Instance number of the adapter to add or "auto" to pick the next free instance',
                        default: 'auto',
                    })
                    .option('host', {
                        type: 'string',
                        description: 'Hostname for the adapter',
                    }),
            (args) => addAdapter({ ...args, hostname }, handler, objects)
        )
        .command(
            ['delete <adapterInstance>', 'del'],
            'Delete an adapter instance',
            (y) =>
                y.positional('adapterInstance', {
                    type: 'string',
                    describe: 'Adapter instance to delete, e.g. "mqtt.0"',
                    demandOption: true,
                }),
            (args) => deleteAdapter(args, handler)
        )
        .demandCommand(1, 1, 'You need to specify a command')
        .strict();

    try {
        await cmdYargs.parseAsync(args);
    } catch (error) {
        handler.sendStderr(`Error executing command: ${error.message}`);
        handler.sendExit(EXIT_CODES.UNCAUGHT_EXCEPTION);
    }
}

async function deleteAdapter(
    { adapterInstance }: { adapterInstance: string },
    { sendExit, sendStdout }: MessageHandler
): Promise<void> {
    if (!adapterInstance) {
        sendExit(EXIT_CODES.INVALID_ARGUMENTS);
        return;
    }

    const { adapter, instance } = parseAdapterInstance(adapterInstance);
    if (!adapter) {
        sendExit(EXIT_CODES.INVALID_ARGUMENTS);
        return;
    }

    const namespace = `iobroker-${adapter}-${instance}`;

    sendStdout(`Deleting Helm release in namespace ${namespace}`);
    const releaseName = `iobroker-${adapter}-${instance}`;
    const customObjectsApi = kubeConfig.makeApiClient(CustomObjectsApi);
    await customObjectsApi.deleteNamespacedCustomObject({
        group: 'helm.cattle.io',
        version: 'v1',
        plural: 'helmcharts',
        namespace,
        name: releaseName,
    });

    // TODO: observe the status of the helm chart uninstallation

    // TODO: delete the namespace when empty
    sendExit(0);
}
