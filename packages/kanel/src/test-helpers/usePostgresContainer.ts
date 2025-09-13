import type { StartedTestContainer } from "testcontainers";
import { beforeAll } from "vitest";

import startTestContainer from "./startTestContainer";

const timeout = 5 * 60 * 1000;

const usePostgresContainer = (
  image: string = "postgres",
): (() => StartedTestContainer) => {
  let container: StartedTestContainer;

  beforeAll(async () => {
    container = await startTestContainer(image);
  }, timeout);

  return () => container;
};

export default usePostgresContainer;
