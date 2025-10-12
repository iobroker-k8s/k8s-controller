import { Setup } from '@iobroker/js-controller-cli/build/esm/lib/setup/setupSetup';
import { tools } from '@iobroker/js-controller-common-db';
import fs from 'fs-extra';
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
}
