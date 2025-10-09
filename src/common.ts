import { KubeConfig } from '@kubernetes/client-node';

export const kubeConfig = new KubeConfig();
kubeConfig.loadFromDefault();

export function parseAdapterInstance(
    adapterInstance: string
): { adapter: string; instance: number } | { adapter: null; instance: null } {
    const parts = adapterInstance.split('.');
    while (parts.length > 2) {
        // remove extra parts in front of adapter name
        parts.shift();
    }

    const [adapter, instanceStr] = parts;
    const instance = parseInt(instanceStr || '0', 10);
    if (!adapter || isNaN(instance)) {
        return { adapter: null, instance: null };
    }

    return { adapter, instance };
}

export function getAdapterNamespace(adapter: string, instance: number): string {
    return `iobroker-${adapter}-${instance}`;
}

export function getHelmReleaseName(adapter: string, instance: number): string {
    return `iobroker-${adapter}-${instance}`;
}
