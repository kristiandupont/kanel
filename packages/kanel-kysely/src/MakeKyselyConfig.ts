import { CompositeDetails, InstantiatedConfig } from "kanel";

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
    tableInterfaceName: `${selectorName}Table`,
    selectableName: selectorName,
    insertableName: canInitialize ? `New${selectorName}` : undefined,
    updatableName: canMutate ? `${selectorName}Update` : undefined,
  }),
};

export default MakeKyselyConfig;
