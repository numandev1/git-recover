#!/usr/bin/env node
import { Command } from 'commander';

import { checkGithubDirAndRecoverFiles } from './helper';

const packageJSON = require('../package.json');
const program = new Command();
program.version(packageJSON.version);

program
  .description(packageJSON.description)
  .action(checkGithubDirAndRecoverFiles);

program.parse(process.argv);
