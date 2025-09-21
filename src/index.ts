#!/usr/bin/env node

import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";

interface Arguments {
  verbose?: boolean;
}

const argv = yargs(hideBin(process.argv))
  .option("verbose", {
    alias: "v",
    type: "boolean",
    description: "Run with verbose logging",
    default: false,
  })
  .help()
  .alias("help", "h")
  .parseSync() as Arguments;

function main(): void {
  console.log("ioBroker Kubernetes Controller");

  if (argv.verbose) {
    console.log("Verbose mode enabled");
    console.log("Arguments:", argv);
  }

  // TODO: Implement controller logic
  console.log("Controller starting...");
}

if (require.main === module) {
  main();
}

export { main };
