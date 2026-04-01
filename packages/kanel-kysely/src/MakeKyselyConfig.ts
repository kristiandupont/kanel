import type { CompositeDetails } from "kanel";
import { escapeIdentifier } from "kanel";

interface MakeKyselyConfig {
  databaseFilename: string;
  includeSchemaNameInTableName: boolean;
  getKyselyItemMetadata?: (
    d: CompositeDetails,
    selectorName: string,
    canInitialize: boolean,
    canMutate: boolean,
  ) => {
    tableInterfaceName: string;
    selectableName: string | undefined;
    insertableName: string | undefined;
    updatableName: string | undefined;
  };
}

export const defaultConfig: MakeKyselyConfig = {
  databaseFilename: "Database",
  includeSchemaNameInTableName: false,
  getKyselyItemMetadata: (d, selectorName, canInitialize, canMutate) => ({
    tableInterfaceName: `${escapeIdentifier(selectorName)}Table`,
    selectableName: escapeIdentifier(selectorName),
    insertableName: canInitialize
      ? `New${escapeIdentifier(selectorName)}`
      : undefined,
    updatableName: canMutate
      ? `${escapeIdentifier(selectorName)}Update`
      : undefined,
  }),
};

export default MakeKyselyConfig;
