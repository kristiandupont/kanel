type Casing = 'camel' | 'snake' | 'pascal' | 'dash';

export default Casing;

export type Casings = {
  sourceCasing?: Casing;
  typeCasing?: Casing;
  propertyCasing?: Casing;
  filenameCasing?: Casing;
};
