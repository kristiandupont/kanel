import type { StartedTestContainer } from "testcontainers";

import startTestContainer from "./startTestContainer";

const containerLogPrefix = "postgres-container>>> ";
let container: StartedTestContainer;

export const setup = async (): Promise<void> => {
  if (process.arch === "arm64") {
    // Ryuk doesn't work on arm64 at the time of writing.
    // Disable and prune docker images manually
    // eslint-disable-next-line no-process-env
    process.env["TESTCONTAINERS_RYUK_DISABLED"] = "true";
  }

  container = await startTestContainer("postgres");

  const stream = await container.logs();
  stream
    // .on('data', (line) => console.log(containerLogPrefix + line))
    .on("err", (line) => console.error(containerLogPrefix + line))
    .on("end", () => console.info(containerLogPrefix + "Stream closed"));
};

export const teardown = async (): Promise<void> => {
  await container.stop({
    timeout: 10_000,
  });
};
