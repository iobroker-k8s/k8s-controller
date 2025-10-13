import { dbConnectAsync } from '@iobroker/js-controller-cli';
import { Setup } from '@iobroker/js-controller-cli/build/esm/lib/setup/setupSetup';
import { tools } from '@iobroker/js-controller-common-db';
import fs from 'fs-extra';
import { addAdapter } from './addAdapter';
import { getLocalConfig } from './config';

export async function setup(): Promise<void> {
    // create config file
    const fileName = tools.getConfigFileName();
    await fs.writeJson(fileName, getLocalConfig(), { spaces: 2 });
    console.log(`Created config file: ${fileName}`);

    // now do the setup
    const setup = new Setup({
        cleanDatabase: (isDeleteDb: boolean) => {
            console.log(`Clean database called with isDeleteDb=${isDeleteDb}`);
        },
        processExit: (exitCode: number) => {
            console.log(`Process exit called with exitCode=${exitCode}`);
            process.exit(exitCode);
        },
        params: {},
        restartController: () => {
            console.log('Restart controller called');
        },
    });
    await new Promise<void>((resolve) => setup.setupObjects(() => resolve()));
    console.log('Setup done');
    console.log('Installing admin adapter...');
    const { objects } = await dbConnectAsync(false);
    await addAdapter(
        {
            adapter: 'admin',
            instance: '0',
            hostname: tools.getHostName(),
        },
        {
            sendExit: process.exit,
            sendStdout: console.log,
            sendStderr: console.error,
        },
        objects as any // TODO [k8s]: figure out how to get the right exm/cjs type
    );
}
