export type Table = any;
export type Type = any;
export const generateFile: ({ fullPath, lines }: {
    fullPath: any;
    lines: any;
}) => void;
export function generateModels({ connection, sourceCasing, filenameCasing, customTypeMap, schemas, }: {
    connection: any;
    sourceCasing?: string;
    filenameCasing?: string;
    customTypeMap?: {};
    schemas: any;
}): Promise<void>;
