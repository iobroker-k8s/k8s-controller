import type { Client as StatesClient } from '@iobroker/db-states-redis';
import { tools, logger as toolsLogger } from '@iobroker/js-controller-common';
import { CustomObjectsApi } from '@kubernetes/client-node';
import { stringify as stringifyYaml } from 'yaml';
import {
    getAdapterNamespace,
    getHelmReleaseName,
    kubeConfig,
    parseAdapterInstance,
} from './common';

const hostname = tools.getHostName();
const hostObjectPrefix: ioBroker.ObjectIDs.Host = `system.host.${hostname}`;
const hostLogPrefix = `host.${hostname}`;

export async function adapterConfigChange(
    id: string,
    obj: ioBroker.InstanceObject | null,
    states: StatesClient,
    logger: ReturnType<typeof toolsLogger>
) {
    const { adapter, instance } = parseAdapterInstance(id);
    if (!adapter || instance === null) {
        logger.warn(
            `${hostLogPrefix} ${tools.appName} Cannot process config change for invalid adapter instance ${id}`
        );
        return;
    }

    if (!obj) {
        // TODO [k8s]: implement deletion of config
        logger.info(
            `${hostLogPrefix} ${tools.appName} Ignoring config deletion for adapter instance ${id}`
        );
        return;
    }

    // always send sigKill to adapter instance (it needs to restart to apply new config)
    await states!.setState(`${id}.sigKill`, { val: -1, ack: false, from: hostObjectPrefix });

    const customObjectsApi = kubeConfig.makeApiClient(CustomObjectsApi);
    const namespace = getAdapterNamespace(adapter, instance);
    const releaseName = getHelmReleaseName(adapter, instance);

    logger.info(
        `${hostLogPrefix} ${tools.appName} Setting Helm release config for ${releaseName} in namespace ${namespace}`
    );

    const adapterConfig = { ...obj };
    delete adapterConfig.from;
    delete adapterConfig.ts;
    const valuesContent = stringifyYaml({
        adapter: {
            config: adapterConfig,
        },
    });
    console.log('valuesContent:', valuesContent);

    const customObjectInfo = {
        group: 'helm.cattle.io',
        version: 'v1',
        plural: 'helmchartconfigs',
        namespace,
    } as const;
    try {
        await customObjectsApi.patchNamespacedCustomObject({
            ...customObjectInfo,
            name: releaseName,
            body: [
                {
                    op: 'replace',
                    path: '/spec/valuesContent',
                    value: valuesContent,
                },
            ],
        });
    } catch (error) {
        if (error.code !== 404) {
            logger.error(
                `${hostLogPrefix} ${tools.appName} Cannot patch Helm release config for ${releaseName} in namespace ${namespace}: ${error}`
            );
            return;
        }

        logger.info(
            `${hostLogPrefix} ${tools.appName} Creating initial Helm release config for ${releaseName} in namespace ${namespace}`
        );
        // if we cannot patch, we create the object
        await customObjectsApi.createNamespacedCustomObject({
            ...customObjectInfo,
            body: {
                // see https://docs.k3s.io/helm for details
                apiVersion: 'helm.cattle.io/v1',
                kind: 'HelmChartConfig',
                metadata: {
                    name: releaseName,
                    namespace,
                    labels: {
                        'app.kubernetes.io/managed-by': 'iobroker-k8s-controller',
                        'app.kubernetes.io/name': `adapter-${adapter}`,
                        'app.kubernetes.io/instance': `${adapter}.${instance}`,
                    },
                },
                spec: {
                    valuesContent,
                },
            },
        });
    }
}
