import { TypeMap } from './Config';

const defaultTypeMap: TypeMap = {
  int2: 'number',
  int4: 'number',
  int8: 'string',
  float4: 'number',
  float8: 'string',
  numeric: 'string',
  bool: 'boolean',
  json: 'unknown',
  jsonb: 'unknown',
  char: 'string',
  varchar: 'string',
  text: 'string',
  uuid: 'string',
  inet: 'string',
  date: 'Date',
  time: 'Date',
  timetz: 'Date',
  timestamp: 'Date',
  timestamptz: 'Date',
};

export default defaultTypeMap;
