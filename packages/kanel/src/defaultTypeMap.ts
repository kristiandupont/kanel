import TypeMap from './TypeMap';

const defaultTypeMap: TypeMap = {
  'pg_catalog.int2': 'number',
  'pg_catalog.int4': 'number',
  'pg_catalog.int8': 'number',
  'pg_catalog.float4': 'number',
  'pg_catalog.float8': 'number',
  'pg_catalog.numeric': 'number',
  'pg_catalog.bool': 'boolean',
  'pg_catalog.json': 'unknown',
  'pg_catalog.jsonb': 'unknown',
  'pg_catalog.char': 'string',
  'pg_catalog.bpchar': 'string',
  'pg_catalog.varchar': 'string',
  'pg_catalog.text': 'string',
  'pg_catalog.uuid': 'string',
  'pg_catalog.inet': 'string',
  'pg_catalog.date': 'Date',
  'pg_catalog.time': 'Date',
  'pg_catalog.timetz': 'Date',
  'pg_catalog.timestamp': 'Date',
  'pg_catalog.timestamptz': 'Date',
  'pg_catalog.int4range': '[number, number]',
  'pg_catalog.int8range': '[string, string]',
  'pg_catalog.numrange': '[string, string]',
  'pg_catalog.tsrange': '[Date, Date]',
  'pg_catalog.tstzrange': '[Date, Date]',
  'pg_catalog.daterange': '[Date, Date]',
};

export default defaultTypeMap;
