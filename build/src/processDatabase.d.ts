export default processDatabase;
declare function processDatabase({ connection, sourceCasing, filenameCasing, preDeleteModelFolder, customTypeMap, schemas, }: {
    connection: any;
    sourceCasing?: string;
    filenameCasing?: string;
    preDeleteModelFolder?: boolean;
    customTypeMap?: {};
    schemas: any;
}): Promise<void>;
