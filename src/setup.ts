import { Setup } from '@iobroker/js-controller-cli/build/esm/lib/setup/setupSetup';

export async function setup(): Promise<void> {
    // Add any setup steps needed for your application
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
