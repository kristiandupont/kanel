export type Table = any;
export type Type = any;
export function generateFile({ fullPath, lines }: {
    fullPath: any;
    lines: any;
}): void;
export function generateModels({ connection, sourceCasing, filenameCasing, schemas, }: {
    connection: any;
    sourceCasing?: string;
    filenameCasing?: string;
    schemas: any;
}): Promise<void>;
