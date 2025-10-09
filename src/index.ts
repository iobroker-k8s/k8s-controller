import { argv } from './argv';
import { init } from './main';

function run(): void {
    console.log('ioBroker Kubernetes Controller');

    if (argv.verbose) {
        console.log('Verbose mode enabled');
        console.log('Arguments:', argv);
    }

    if (argv._.includes('setup')) {
        console.log('Running setup...');
        // Here you would add any setup logic needed
        process.exit(0);
    } else if (argv._.includes('start')) {
        console.log('Controller starting...');
        init();
    }
}

if (require.main === module) {
    run();
}

export { run as main };
