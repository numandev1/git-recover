const chalk = require('chalk');
const cliSpinners = require('cli-spinners');
const execa = require('execa');
const fs = require('fs-extra');
const inquirer = require('inquirer');
const logUpdate = require('log-update');
const path = require('path');
const loading = () => {
  const spinner = cliSpinners.dots;
  let i = 0;
  let timer = null;
  const load = () => {
    timer = setInterval(() => {
      const { frames } = spinner;
      logUpdate(frames[(i = ++i % frames.length)] + ' Please Wait...');
    }, spinner.interval);
  };
  const stop = () => {
    clearInterval(timer);
    logUpdate('');
  };
  return { load, stop };
};

const Loader = loading();

const isGithubDirectory = (currentDirPath) => {
  const gitPath = path.resolve(currentDirPath, '.git');
  return fs.pathExistsSync(gitPath);
};

export const checkGithubDirAndRecoverFiles = async () => {
  const currentDirPath = process.cwd();
  if (isGithubDirectory(currentDirPath)) {
    const { recovery_path }: { recovery_path: 'string' } =
      await promptForRecoveryPath();

    Loader.load();
    const allBlobArray = await isCompletedFsck(currentDirPath);
    Loader.stop();
    const recoveryPath = path.resolve(recovery_path);
    const allPromises = allBlobArray.map(async (fileBlob) => {
      const result2 = await execa(`git show ${fileBlob}`, {
        shell: true,
      });
      const filePath = path.resolve(recoveryPath, fileBlob);
      fs.outputFileSync(filePath, result2.stdout);
    });
    Promise.all(allPromises);
    successLog(
      `successfully done,\nnow you can see recovered files in \n\n${recoveryPath}\n\n directory`,
    );
  } else {
    errorLog(
      'It is not a github directory. Please go to github directory and then run this command again!',
    );
  }
};

const isCompletedFsck = async (currentDirPath) => {
  try {
    const result = await execa(
      `cd ${currentDirPath} && git fsck --lost-found`,
      {
        shell: true,
      },
    );
    const allBlobhashes = result.stdout.match(/(?<=blob ).+/g);
    if (result.stderr) {
      errorLog(result.stderr);
    }
    return allBlobhashes;
  } catch (error) {
    return [];
  }
};

export default async function promptForRecoveryPath() {
  const questions = {
    type: 'input',
    name: 'recovery_path',
    message:
      'Please Enter the path, where you want to recover your files (Empty DIR)',
    validate: (value) => {
      if (fs.pathExistsSync(value)) {
        return true;
      } else {
        return 'Please enter a valid recovery directory path';
      }
    },
  };

  const answers = await inquirer.prompt(questions);
  return answers;
}

const errorLog = (error) => {
  console.log(chalk.red.bold(error));
};

const successLog = (message) => {
  console.log(chalk.green.bold(message));
};
