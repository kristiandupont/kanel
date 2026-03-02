const { join, relative } = require("path");
const fs = require("fs");
const { exec } = require("child_process");
const { promisify } = require("util");

const execAsync = promisify(exec);

async function generateExamples() {
  console.info("Generating examples...");

  const pwd = process.cwd();
  const examplesFolder = join(pwd, "examples");

  const exampleFolders = fs
    .readdirSync(examplesFolder)
    .filter((file) => fs.statSync(join(examplesFolder, file)).isDirectory());
  for (const exampleFolder of exampleFolders) {
    console.info(` - ${exampleFolder}`);

    try {
      await execAsync(`kanel -c kanel.config.js`, {
        cwd: join(examplesFolder, exampleFolder),
      });
    } catch (error) {
      console.error(`Failed to generate example ${exampleFolder}`);
      console.error(error.stderr.toString());
      process.exit(1);
    }
  }
}

generateExamples();
