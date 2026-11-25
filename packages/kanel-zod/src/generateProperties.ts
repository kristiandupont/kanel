import {
  resolveType,
  type CompositeDetails,
  type CompositeProperty,
  type PgTsGeneratorContext,
  type TypeDefinition,
  type TypeImport,
  type TypeMap,
} from "kanel";

export type ZodPropertyDeclaration = {
  name: string;
  value: string;
  typeImports: TypeImport[];
};

// resolveType imports an identifier type from another schema under the alias
// `${schemaName}_${name}`, so the zod schema is looked up in that schema and
// imported under the same kind of alias.
const getIdentifierImport = (
  t: Exclude<TypeDefinition, string>,
  schemaName: string,
  identifierTypeImports: Record<string, TypeImport>,
): TypeImport | undefined => {
  const [typeImport] = t.typeImports;
  if (t.typeImports.length !== 1 || typeImport.asName !== t.name) {
    return identifierTypeImports[`${schemaName}.${t.name}`];
  }
  const targetSchemaName = t.name.slice(0, -(typeImport.name.length + 1));
  const x = identifierTypeImports[`${targetSchemaName}.${typeImport.name}`];
  return x && { ...x, asName: `${targetSchemaName}_${x.name}` };
};

const generateProperties = <D extends CompositeDetails>(
  details: D,
  generateFor: "selector" | "initializer" | "mutator",
  nonCompositeTypeImports: Record<string, TypeImport>,
  compositeTypeImports: Record<string, TypeImport>,
  identifierTypeImports: Record<string, TypeImport>,
  zodTypeMap: TypeMap,
  context: PgTsGeneratorContext,
): ZodPropertyDeclaration[] => {
  const pgTsContext = context;

  const ps =
    details.kind === "compositeType" ? details.attributes : details.columns;

  const sortedPs = pgTsContext.propertySortFunction
    ? [...ps].sort(pgTsContext.propertySortFunction as any)
    : ps;

  const result: ZodPropertyDeclaration[] = sortedPs.map(
    (p: CompositeProperty): ZodPropertyDeclaration => {
      const { name, typeOverride, nullableOverride, optionalOverride } =
        pgTsContext.getPropertyMetadata(p, details, generateFor);
      const canBeOptional: boolean =
        p.isNullable || p.defaultValue || p.isIdentity;

      const t = typeOverride ?? resolveType(p, details);

      let zodType: string;
      const typeImports: TypeImport[] = [];

      const identifierImport =
        typeof t === "string"
          ? undefined
          : getIdentifierImport(t, details.schemaName, identifierTypeImports);

      if (identifierImport) {
        typeImports.push(identifierImport);
        zodType = identifierImport.asName ?? identifierImport.name;
      } else if (p.type.fullName in zodTypeMap) {
        const x = zodTypeMap[p.type.fullName];
        if (typeof x === "string") {
          zodType = x;
          if ("dimensions" in p) {
            for (let i = p.dimensions || 0; i > 0; i--) {
              zodType = `${zodType}.array()`;
            }
          }
        } else {
          zodType = x.name;
          typeImports.push(...x.typeImports);
        }
      } else if (p.type.fullName in nonCompositeTypeImports) {
        const x = nonCompositeTypeImports[p.type.fullName];
        typeImports.push(x);
        zodType = x.name;
      } else if (p.type.fullName in compositeTypeImports) {
        const x = compositeTypeImports[p.type.fullName];
        typeImports.push(x);
        zodType = x.name;
        if (p.isArray) zodType = `${zodType}.array()`;
        if (p.isNullable) zodType = `${zodType}.nullable()`;
      } else {
        console.error(
          `kanel-zod: Unknown type for ${name}.${p.name}: ${p.type.fullName}`,
        );
      }

      let isOptional: boolean;

      if (optionalOverride === undefined) {
        switch (generateFor) {
          case "selector": {
            isOptional = false;
            break;
          }
          case "initializer": {
            isOptional = canBeOptional;
            break;
          }
          case "mutator": {
            isOptional = true;
            break;
          }
          default: {
            throw new Error(`Unexpected generateFor value: ${generateFor}`);
          }
        }
      } else {
        isOptional = optionalOverride;
      }

      const isNullable = Boolean(nullableOverride ?? p.isNullable);

      const qualifiers = [];
      if (isOptional) {
        qualifiers.push("optional()");
      }
      if (isNullable) {
        qualifiers.push("nullable()");
      }
      // if (comment) {
      //   qualifiers.push(`describe('${comment}')`);
      // }

      const value =
        qualifiers.length > 0 ? `${zodType}.${qualifiers.join(".")}` : zodType;

      return {
        name,
        value,
        typeImports,
      };
    },
  );
  return result;
};

export default generateProperties;
