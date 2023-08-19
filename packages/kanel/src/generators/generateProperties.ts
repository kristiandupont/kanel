import {
  MaterializedViewColumn,
  MaterializedViewDetails,
  TableColumn,
  TableDetails,
  ViewColumn,
  ViewDetails,
} from 'extract-pg-schema';
import * as R from 'ramda';

import { InstantiatedConfig } from '../config-types';
import { InterfacePropertyDeclaration } from '../declaration-types';
import TypeImport from '../TypeImport';
import { CompositeDetails, CompositeProperty } from './composite-types';
import resolveType from './resolveType';

const generateProperties = <D extends CompositeDetails>(
  details: D,
  generateFor: 'selector' | 'initializer' | 'mutator',
  config: InstantiatedConfig,
): InterfacePropertyDeclaration[] => {
  const ps =
    details.kind === 'compositeType' ? details.attributes : details.columns;

  const sortedPs = config.propertySortFunction
    ? R.sort(config.propertySortFunction, ps as any)
    : ps;

  const result: InterfacePropertyDeclaration[] = sortedPs
    .filter((p) => generateFor === 'selector' || p.generated !== 'ALWAYS')
    .map((p: CompositeProperty): InterfacePropertyDeclaration => {
      // If this is a (materialized or not) view column, we need to check
      // the source table to see if the column is nullable.
      if ((p as ViewColumn | MaterializedViewColumn).source) {
        const source = (p as ViewColumn | MaterializedViewColumn).source;
        const target: TableDetails | ViewDetails | MaterializedViewDetails =
          config.schemas[source.schema].tables.find(
            (t) => t.name === source.table,
          );

        if (target) {
          const column = (
            target.columns as Array<
              TableColumn | ViewColumn | MaterializedViewColumn
            >
          ).find((c) => c.name === source.column);
          if (column) {
            p.isNullable = column.isNullable;
          }
        }
      }

      const {
        name,
        comment,
        typeOverride,
        nullableOverride,
        optionalOverride,
      } = config.getPropertyMetadata(p, details, generateFor, config);

      const canBeOptional: boolean =
        p.isNullable ||
        p.defaultValue ||
        p.isIdentity ||
        p.generated === 'BY DEFAULT';

      const t = typeOverride ?? resolveType(p, details, config);

      let typeName: string;
      let typeImports: TypeImport[] = [];

      if (typeof t === 'string') {
        typeName = t;
      } else {
        typeName = t.name;
        typeImports = t.typeImports;
      }

      let isOptional: boolean;

      if (optionalOverride === undefined) {
        switch (generateFor) {
          case 'selector': {
            isOptional = false;
            break;
          }
          case 'initializer': {
            isOptional = canBeOptional;
            break;
          }
          case 'mutator': {
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

      return {
        name,
        comment,
        dimensions: p.isArray ? 1 : 0,
        isNullable,
        isOptional,
        typeName,
        typeImports,
      };
    });
  return result;
};

export default generateProperties;
