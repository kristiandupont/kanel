import { extractSchemas } from "extract-pg-schema";

import type {
  PostgresSource,
  InstantiatedPostgresSource,
  SourceRegistry,
  InstantiatedSourceRegistry,
} from "../config-types";

export const instantiateSources = async (
  sources: SourceRegistry,
): Promise<InstantiatedSourceRegistry> => {
  const instantiatedSources: InstantiatedSourceRegistry = {};

  for (const [name, source] of Object.entries(sources)) {
    if (source.type === "postgres") {
      const schemas = await extractSchemas(source.connection, {
        schemas: source.schemas,
        typeFilter: source.typeFilter,
      });

      instantiatedSources[name] = {
        type: "postgres",
        connection: source.connection,
        schemas,
      };
    }
  }

  return instantiatedSources;
};
