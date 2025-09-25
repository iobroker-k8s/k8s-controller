import { KubeConfig, AppsV1Api, CoreV1Api, V1Pod, CustomObjectsApi } from '@kubernetes/client-node';
import { parse as parseYaml, stringify } from 'yaml';
import {
    EXIT_CODES,
    getInstancesOrderedByStartPrio,
    getObjectsConstructor,
    getStatesConstructor,
    isInstalledFromNpm,
    isLocalObjectsDbServer,
    isLocalStatesDbServer,
    NotificationHandler,
    tools,
    logger as toolsLogger,
    zipFiles,
} from '@iobroker/js-controller-common';
import type { SendTo } from './main';

const hostname = tools.getHostName();
const hostLogPrefix = `host.${hostname}`;

const kubeConfig = new KubeConfig();
kubeConfig.loadFromDefault();

type MessageHandler = {
    readonly logger: ReturnType<typeof toolsLogger>;
    sendStdout(data: string): void;
    sendStderr(data: string): void;
    sendExit(code: number): void;
};

export async function cmdExec(
    msg: ioBroker.SendableMessage,
    sendTo: SendTo,
    logger: ReturnType<typeof toolsLogger>
) {
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
        logger,
        sendStdout: (data: string) => {
            logger.info(`${hostLogPrefix} ${tools.appName} ${data}`);
            sendTo(msg.from, 'cmdStdout', { id: msg.message.id, data: data });
        },
        sendStderr: (data: string) => {
            logger.error(`${hostLogPrefix} ${tools.appName} ${data}`);
            sendTo(msg.from, 'cmdStderr', { id: msg.message.id, data: data });
        },
        sendExit: (exitCode: number) => {
            logger.info(`${hostLogPrefix} ${tools.appName} exit ${exitCode}`);
            setTimeout(
                () => sendTo(msg.from, 'cmdExit', { id: msg.message.id, data: exitCode }),
                200
            );
        },
    };

    var cmd = args.shift();
    try {
        switch (cmd) {
            case 'add':
                await addAdapter(args, handler);
                break;
            default:
                handler.sendStderr(`Unknown command: ${tools.appName.toLowerCase()} ${cmd}`);
                handler.sendExit(EXIT_CODES.INVALID_ARGUMENTS);
                break;
        }
    } catch (error) {
        handler.sendStderr(`Error executing command: ${error.message}`);
        handler.sendExit(EXIT_CODES.UNCAUGHT_EXCEPTION);
    }
}

async function addAdapter(args: string[], { sendExit, sendStdout, sendStderr }: MessageHandler) {
    var adapter = args.shift();
    if (!adapter) {
        sendExit(EXIT_CODES.INVALID_ARGUMENTS);
        return;
    }

    sendStdout(`Loading Helm repository for ${adapter}`);

    // download index.yaml for adapter
    const chartName = `adapter-${adapter}`;
    const helmRepo = `https://iobroker-k8s.github.io/${chartName}`;
    const res = await fetch(`${helmRepo}/index.yaml`);
    if (!res.ok) {
        sendStderr(`Cannot find repository for adapter ${adapter}`);
        sendExit(EXIT_CODES.ADAPTER_NOT_FOUND);
        return;
    }

    const indexYaml = parseYaml(await res.text());
    if (indexYaml.apiVersion !== 'v1') {
        sendStderr(`Invalid index.yaml for adapter ${adapter}`);
        sendExit(EXIT_CODES.ADAPTER_NOT_FOUND);
        return;
    }

    var adapterEntry = indexYaml.entries?.[chartName];
    if (!adapterEntry || !Array.isArray(adapterEntry) || adapterEntry.length === 0) {
        sendStderr(`Cannot find adapter ${adapter} in repository`);
        sendExit(EXIT_CODES.ADAPTER_NOT_FOUND);
        return;
    }

    // TODO: figure out which version to install
    var versionInfo = adapterEntry[0];
    if (!versionInfo || !versionInfo.version || !versionInfo.appVersion) {
        sendStderr(`Cannot find version information for adapter ${adapter}`);
        sendExit(EXIT_CODES.ADAPTER_NOT_FOUND);
        return;
    }

    sendStdout(
        `Installing adapter ${adapter} version ${versionInfo.appVersion} (Helm chart version ${versionInfo.version})`
    );

    // TODO: figure out which instance number we need
    const instance = 0;
    const namespace = `iobroker-${adapter}-${instance}`;

    const k8sApi = kubeConfig.makeApiClient(CoreV1Api);

    // TODO: should we allow the namespace to already exist?
    const ns = await k8sApi.listNamespace();
    if (!ns.items.find((n) => n.metadata?.name === namespace)) {
        sendStdout(`Creating namespace ${namespace}`);
        await k8sApi.createNamespace({
            body: {
                metadata: {
                    name: namespace,
                },
            },
        });
    }

    // create custom resource with apiVersion: helm.cattle.io/v1 and kind: HelmChart
    const customObjectsApi = kubeConfig.makeApiClient(CustomObjectsApi);

    sendStdout(`Creating Helm release in namespace ${namespace}`);
    const releaseName = `iobroker-${adapter}-${instance}`;
    await customObjectsApi.createNamespacedCustomObject({
        group: 'helm.cattle.io',
        version: 'v1',
        plural: 'helmcharts',
        namespace,
        body: {
            // see https://docs.k3s.io/helm for details
            apiVersion: 'helm.cattle.io/v1',
            kind: 'HelmChart',
            metadata: {
                name: releaseName,
                namespace,
                labels: {
                    app: 'iobroker',
                    adapter: adapter,
                    instance: instance.toString(),
                },
            },
            spec: {
                chart: chartName,
                targetNamespace: namespace,
                version: versionInfo.version,
                repo: helmRepo,
                backOffLimit: 10,
            },
        },
    });

    // TODO: observe the status of the helm chart installation
    sendExit(0);
}
