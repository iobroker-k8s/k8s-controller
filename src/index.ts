import { argv } from './argv';
import { init } from './main';

function run(): void {
    console.log('ioBroker Kubernetes Controller');

    if (argv.verbose) {
        console.log('Verbose mode enabled');
        console.log('Arguments:', argv);
    }

    console.log('Controller starting...');
    init();
}

if (require.main === module) {
    run();
}

export { run as main };
