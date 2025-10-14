import { argv } from './argv';
import { init } from './main';
import { setup } from './setup';

async function run(): Promise<void> {
    console.log('ioBroker Kubernetes Controller');

    if (argv.verbose) {
        console.log('Verbose mode enabled');
        console.log('Arguments:', argv);
    }

    if (argv._.includes('setup')) {
        console.log('Running setup...');
        await setup();
        process.exit(0);
    } else if (argv._.includes('run')) {
        console.log('Controller starting...');
        await init();
    }
}

run().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
