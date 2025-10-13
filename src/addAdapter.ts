import type { Client as ObjectsClient } from '@iobroker/db-objects-redis';
import { EXIT_CODES } from '@iobroker/js-controller-common';
import { SYSTEM_ADAPTER_PREFIX } from '@iobroker/js-controller-common-db/constants';
import { CoreV1Api, CustomObjectsApi } from '@kubernetes/client-node';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { argv } from './argv';
import { getAdapterNamespace, getHelmReleaseName, kubeConfig } from './common';
import { getConfig } from './config';
import type { MessageHandler } from './types';

export async function addAdapter(
    {
        adapter,
        instance: instanceStr,
        hostname,
    }: { adapter: string; instance: string; hostname: string },
    { sendExit, sendStdout, sendStderr }: MessageHandler,
    objects: ObjectsClient
): Promise<void> {
    const instanceOrAuto = instanceStr === 'auto' ? 'auto' : parseInt(instanceStr, 10);
    if (instanceOrAuto !== 'auto' && (isNaN(instanceOrAuto) || instanceOrAuto < 0)) {
        sendStderr(`Invalid adapter instance '${instanceStr}'`);
        sendExit(EXIT_CODES.INVALID_ARGUMENTS);
        return;
    }

    sendStdout(`Requested instance is ${instanceOrAuto}`);

    const instanceObjs = await objects.getObjectViewAsync('system', 'instance', {
        startkey: `${SYSTEM_ADAPTER_PREFIX}${adapter}.`,
        endkey: `${SYSTEM_ADAPTER_PREFIX}${adapter}.\u9999`,
    });

    let instance = -1;
    if (instanceOrAuto != 'auto') {
        instance = instanceOrAuto;
        // check if instance already exists
        if (instanceObjs.rows.find((obj) => parseInt(obj.id.split('.').pop()!, 10) === instance)) {
            sendStderr('error: instance already exists');
            return sendExit(EXIT_CODES.INSTANCE_ALREADY_EXISTS);
        }
    } else {
        // find max instance
        for (const row of instanceObjs.rows) {
            const iInstance = parseInt(row.id.split('.').pop()!, 10);
            if (instance === null || iInstance > instance) {
                instance = iInstance;
            }
        }
        instance++;
    }

    sendStdout(`Installing ${adapter}.${instance}`);

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

    const adapterEntry = indexYaml.entries?.[chartName];
    if (!adapterEntry || !Array.isArray(adapterEntry) || adapterEntry.length === 0) {
        sendStderr(`Cannot find adapter ${adapter} in repository`);
        sendExit(EXIT_CODES.ADAPTER_NOT_FOUND);
        return;
    }

    // TODO: figure out which version to install
    const versionInfo = adapterEntry[0];
    if (!versionInfo || !versionInfo.version || !versionInfo.appVersion) {
        sendStderr(`Cannot find version information for adapter ${adapter}`);
        sendExit(EXIT_CODES.ADAPTER_NOT_FOUND);
        return;
    }

    sendStdout(
        `Installing adapter ${adapter} version ${versionInfo.appVersion} (Helm chart version ${versionInfo.version})`
    );

    const namespace = getAdapterNamespace(adapter, instance);

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

    const configMapName = `iobroker-config`;
    sendStdout(`Creating ioBroker ConfigMap in namespace ${namespace}`);
    // TODO: should we check if it already exists?
    await k8sApi.createNamespacedConfigMap({
        namespace,
        body: {
            metadata: {
                name: configMapName,
            },
            data: {
                'iobroker.json': JSON.stringify(
                    getConfig({
                        host: argv.adapterRedisHost ?? argv.redisHost,
                        port: argv.adapterRedisPort ?? argv.redisPort,
                        password: argv.redisPassword,
                        db: argv.redisDb,
                    }),
                    null,
                    2
                ),
            },
        },
    });

    const customObjectsApi = kubeConfig.makeApiClient(CustomObjectsApi);

    sendStdout(`Creating Helm release in namespace ${namespace}`);
    const releaseName = getHelmReleaseName(adapter, instance);
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
                    'app.kubernetes.io/managed-by': 'iobroker-k8s-controller',
                    'app.kubernetes.io/name': chartName,
                    'app.kubernetes.io/instance': `${adapter}.${instance}`,
                },
            },
            spec: {
                chart: chartName,
                targetNamespace: namespace,
                version: versionInfo.version,
                repo: helmRepo,
                backOffLimit: 3,
                valuesContent: stringifyYaml({
                    fullnameOverride: releaseName,
                    adapter: {
                        instance,
                        hostname,
                        configMapName,
                    },
                }),
            },
        },
    });

    // TODO: observe the status of the helm chart installation
    sendExit(0);
}
