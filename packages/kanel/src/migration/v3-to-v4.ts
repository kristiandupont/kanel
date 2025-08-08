import type { Config } from "../config-types";

interface V3Config {
  connection: string;
  schemas?: string[];
  typeFilter?: (pgType: any) => boolean;
  getMetadata?: any;
  getPropertyMetadata?: any;
  generateIdentifierType?: any;
  propertySortFunction?: any;
  getRoutineMetadata?: any;
  enumStyle?: "enum" | "type";
  outputPath?: string;
  preDeleteOutputFolder?: boolean;
  customTypeMap?: any;
  resolveViews?: boolean;
  preRenderHooks?: any[];
  postRenderHooks?: any[];
  importsExtension?: ".ts" | ".js" | ".mjs" | ".cjs";
}

export const migrateV3ToV4 = (v3Config: V3Config): Config => {
  const v4Config: Config = {
    // Convert to new sources structure
    sources: {
      default: {
        type: "postgres",
        connection: v3Config.connection,
        schemas: v3Config.schemas,
        typeFilter: v3Config.typeFilter,
      },
    },

    // Generators will need to be configured by user
    generators: [],

    // Hooks
    preRenderHooks: v3Config.preRenderHooks,
    postRenderHooks: v3Config.postRenderHooks,

    // Output configuration
    outputPath: v3Config.outputPath,
    preDeleteOutputFolder: v3Config.preDeleteOutputFolder,
    resolveViews: v3Config.resolveViews,

    // Module format (convert from importsExtension)
    moduleFormat: v3Config.importsExtension === ".js" ? "commonjs" : "auto",

    // Legacy fields for backward compatibility
    connection: v3Config.connection,
    schemas: v3Config.schemas,
    typeFilter: v3Config.typeFilter,
    getMetadata: v3Config.getMetadata,
    getPropertyMetadata: v3Config.getPropertyMetadata,
    generateIdentifierType: v3Config.generateIdentifierType,
    propertySortFunction: v3Config.propertySortFunction,
    getRoutineMetadata: v3Config.getRoutineMetadata,
    enumStyle: v3Config.enumStyle,
    customTypeMap: v3Config.customTypeMap,
    importsExtension: v3Config.importsExtension,
  };

  return v4Config;
};

export const generateMigrationGuide = (v3Config: V3Config): string => {
  const guide = `
# Kanel v3 to v4 Migration Guide

## Breaking Changes Applied

1. **Postgres Comments**: @type tags in comments are no longer supported
2. **Enum Defaults**: Enums now default to union types instead of enum declarations
3. **Config Files**: TypeScript config files now use \`npx tsx\`
4. **Hook Signatures**: Post-render hooks no longer receive instantiatedConfig parameter

## Required Manual Steps

1. **Add Generators**: You need to add generators to your config:
   \`\`\`typescript
   import { makePgTsGenerator } from "kanel";
   
   const config = {
     // ... your existing config
     generators: [
       makePgTsGenerator({
         source: "default", // references the default source
         customizers: {
           // Your customization functions here
         }
       })
     ]
   };
   \`\`\`

2. **Update Customization Functions**: If you have custom \`getMetadata\`, \`getPropertyMetadata\`, or \`generateIdentifierType\` functions, update their signatures:
   \`\`\`typescript
   // Before (v3)
   const getMetadata = (details, generateFor, config) => { ... };
   
   // After (v4)
   const getMetadata = (details, defaultResult) => {
     // defaultResult contains the result of the default implementation
     return { ...defaultResult, /* your modifications */ };
   };
   \`\`\`

3. **Remove Comment-Based Type Overrides**: If you used @type tags in Postgres comments, convert them to explicit column overrides in your config.

4. **Test Enum Behavior**: Verify that enum/union behavior matches your expectations.

## Migration Complete!

Your config has been migrated to v4 format. The system will automatically handle backward compatibility during the transition period.
`;

  return guide;
};
