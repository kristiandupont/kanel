import { CompositeDetails, escapeIdentifier, InstantiatedConfig } from "kanel";

interface MakeKyselyConfig {
  databaseFilename: string;
  getKyselyItemMetadata?: (
    d: CompositeDetails,
    selectorName: string,
    canInitialize: boolean,
    canMutate: boolean,
    instantiatedConfig: InstantiatedConfig,
  ) => {
    tableInterfaceName: string;
    selectableName: string | undefined;
    insertableName: string | undefined;
    updatableName: string | undefined;
  };
}

export const defaultConfig: MakeKyselyConfig = {
  databaseFilename: "Database",
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
