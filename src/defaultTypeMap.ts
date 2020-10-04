import { TypeMap } from './Config';

const defaultTypeMap: TypeMap = {
  int2: 'number',
  int4: 'number',
  int8: 'number',
  float4: 'number',
  numeric: 'number',
  bool: 'boolean',
  json: 'unknown',
  jsonb: 'unknown',
  char: 'string',
  varchar: 'string',
  text: 'string',
  date: 'Date',
  time: 'Date',
  timetz: 'Date',
  timestamp: 'Date',
  timestamptz: 'Date',
};

export default defaultTypeMap;
