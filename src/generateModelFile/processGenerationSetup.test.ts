import { describe, expect, it } from 'vitest';

import ModelFileGenerationSetup from './ModelFileGenerationSetup';
import processGenerationSetup from './processGenerationSetup';

describe('processGenerationSetup', () => {
  it('should process a type declaration', () => {
    const generationSetup: ModelFileGenerationSetup = {
      declarations: [
        {
          declarationType: 'typeDeclaration' as const,
          name: 'MyString',
          comments: ['This is just a string'],
          typeDefinition: 'string',
        },
      ],
    };
    const lines = processGenerationSetup(generationSetup, './');
    expect(lines).toEqual([
      '/** This is just a string */',
      `export type MyString = string;`,
    ]);
  });

  it('should process an interface', () => {
    const generationSetup: ModelFileGenerationSetup = {
      declarations: [
        {
          declarationType: 'interface' as const,
          name: 'Member',
          isDefaultExport: true,
          properties: [
            {
              name: 'id',
              typeName: 'MemberId',
              comments: ['This is the identifier', "it's a number"],
              isArray: false,
              isOptional: false,
              isNullable: false,
            },
          ],
        },
      ],
    };
    const lines = processGenerationSetup(generationSetup, './');
    expect(lines).toEqual([
      `export default interface Member {`,
      '  /**',
      '   * This is the identifier',
      "   * it's a number",
      '   */',
      '  id: MemberId;',
      '}',
    ]);
  });

  it('should process a Zod schema', () => {
    const generationSetup: ModelFileGenerationSetup = {
      declarations: [
        {
          declarationType: 'zodSchema' as const,
          name: 'member',
          properties: [
            {
              name: 'id',
              typeName: 'memberId',
              isBuiltin: false,
              isOptional: false,
              isNullable: false,
            },
          ],
        },
      ],
    };
    const lines = processGenerationSetup(generationSetup, './');
    expect(lines).toEqual([
      "import z from 'zod';",
      '',
      `export const member = z.object({`,
      '  id: memberId,',
      '});',
    ]);
  });
});
