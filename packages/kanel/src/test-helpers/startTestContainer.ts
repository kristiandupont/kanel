import type { StartedTestContainer } from "testcontainers";
import { GenericContainer } from "testcontainers";

const timeout = 5 * 60 * 1000;

const startTestContainer = async (
  image: string,
): Promise<StartedTestContainer> =>
  // Starting this with withReuse() enabled will spin up the container
  // on the first call and then reuse it on subsequent calls.
  new GenericContainer(image)
    .withReuse()
    .withExposedPorts(5432)
    .withEnvironment({ POSTGRES_PASSWORD: "postgres" })
    .withStartupTimeout(timeout)
    .start();

export default startTestContainer;
