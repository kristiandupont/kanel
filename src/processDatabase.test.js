import dvdRental from './mocks/dvdrental.json';
import processDatabase from './processDatabase';
import writeFile from './writeFile';

jest.mock('extract-pg-schema', () => ({
  extractSchema: () => dvdRental,
}));

jest.mock('./writeFile');
jest.mock('fs');
jest.mock('path', () => {
  const originalModule = jest.requireActual('path');
  return {
    __esModule: false,
    ...originalModule,
    resolve: (...args) => args.join('/'),
  };
});

describe('processDatabase', () => {
  it('should process the dvd rental example according to the snapshot', async () => {
    await processDatabase({
      connection: {},

      preDeleteModelFolder: false,

      customTypeMap: {
        tsvector: {
          name: 'TsVector',
          module: 'ts-vector',
          absoluteImport: true,
          defaultImport: true,
        },
        bpchar: 'string',
      },

      resolveViews: true,

      schemas: [
        {
          name: 'public',
          modelFolder: '/models',
          ignore: ['film_list', 'staff'],
        },
      ],
    });

    // @ts-ignore
    const results = writeFile.mock.calls;
    expect(results).toMatchSnapshot();
  });
});
