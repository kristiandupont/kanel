import type { Schema } from "extract-pg-schema";
import { describe, expect, it } from "vitest";

import preprocessData from "./preprocessData";

const data = {
  service_type: [
    {
      "name @ref": "hair-cut",
      description: "Hair cut",
    },
    {
      "name @ref": "hair-dye",
      description: "Hair dye",
    },
  ],
  provider_service_type: [
    {
      provider_id: "Bob",
      service_type_id: "hair-cut",
    },
    {
      provider_id: "Bob",
      service_type_id: "hair-dye",
    },
    {
      provider_id: "Alice",
      service_type_id: "hair-cut",
    },
  ],
  provider: [
    {
      "name @ref": "Bob",
      email: "bob@acme.com",
    },
    {
      "name @ref": "Alice",
      email: "alice@acme.com",
    },
  ],
  customer: [
    {
      "@ref": "John",
      name: "Johnathan",
      email: "john@microsoft.com",
    },
  ],
};

const fakeSchema = {
  tables: [
    {
      name: "service_type",
      columns: [
        {
          name: "name",
          references: [] as any,
        },
        {
          name: "description",
          references: [] as any,
        },
      ],
    },
    {
      name: "provider",
      columns: [
        {
          name: "name",
          references: [] as any,
        },
        {
          name: "email",
          references: [] as any,
        },
      ],
    },
    {
      name: "provider_service_type",
      columns: [
        {
          name: "provider_id",
          references: [
            {
              tableName: "provider",
              columnName: "id",
            },
          ],
        },
        {
          name: "service_type_id",
          references: [
            {
              tableName: "service_type",
              columnName: "id",
            },
          ],
        },
      ],
    },
    {
      name: "customer",
      columns: [
        {
          name: "name",
          references: [] as any,
        },
        {
          name: "email",
          references: [] as any,
        },
      ],
    },
  ],
} as Partial<Schema> as any;

describe("preprocessData", () => {
  it("should preprocess data", () => {
    const result = preprocessData(data, fakeSchema, {});

    // Should be ordered by dependencies
    expect(result).toEqual([
      {
        name: "service_type",
        indexColumn: "name",
        rows: [
          {
            name: "hair-cut",
            description: "Hair cut",
          },
          {
            name: "hair-dye",
            description: "Hair dye",
          },
        ],
      },
      {
        name: "provider",
        indexColumn: "name",
        rows: [
          {
            name: "Bob",
            email: "bob@acme.com",
          },
          {
            name: "Alice",
            email: "alice@acme.com",
          },
        ],
      },
      {
        name: "provider_service_type",
        rows: [
          {
            provider_id: { reference: "provider.Bob.id" },
            service_type_id: { reference: "service_type.hair-cut.id" },
          },
          {
            provider_id: { reference: "provider.Bob.id" },
            service_type_id: { reference: "service_type.hair-dye.id" },
          },
          {
            provider_id: { reference: "provider.Alice.id" },
            service_type_id: { reference: "service_type.hair-cut.id" },
          },
        ],
      },
      {
        name: "customer",
        rows: [
          {
            "@ref": "John",
            name: "Johnathan",
            email: "john@microsoft.com",
          },
        ],
      },
    ]);
  });
});
