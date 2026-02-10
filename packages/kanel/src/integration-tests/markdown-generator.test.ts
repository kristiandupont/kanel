/**
 * Markdown Generator Integration Tests
 *
 * These tests verify that the markdown documentation generator works correctly.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import type { ConfigV4 } from "../config-types-v4";
import { makeMarkdownGenerator } from "../generators/makeMarkdownGenerator";
import processDatabase from "../processDatabase";
import useTestKnex from "../test-helpers/useTestKnex";
import useSchema from "../test-helpers/useSchema";

vi.mock("../writeFile", () => ({ default: vi.fn() }));

import writeFile from "../writeFile";
const mockedWriteFile = vi.mocked(writeFile);

function getResults(): { [fullPath: string]: string[] } {
  return mockedWriteFile.mock.calls.reduce(
    (acc, [args]) => {
      acc[args.fullPath] = args.lines;
      return acc;
    },
    {} as Record<string, string[]>,
  );
}

describe("Markdown Generator", () => {
  const [getKnex, _, getConnection] = useTestKnex();
  useSchema(getKnex, "mdtest");

  // Create a temporary directory for templates
  const tempDir = join(tmpdir(), "kanel-md-test");

  beforeEach(() => {
    try {
      mkdirSync(tempDir, { recursive: true });
    } catch {
      // Directory already exists
    }
  });

  describe("Single file generation", () => {
    it("should generate a single markdown file from template", async () => {
      const db = getKnex();
      await db.raw(`
        create table mdtest.users (
          id serial primary key,
          name text not null,
          email text unique
        );
        comment on table mdtest.users is 'User accounts';
      `);

      // Create a simple template
      const templatePath = join(tempDir, "index.md.hbs");
      writeFileSync(
        templatePath,
        `# Database Documentation

{{#each metadata.entities}}
- {{type}}: {{schema}}.{{name}}
{{/each}}
`,
      );

      const config: ConfigV4 = {
        connection: getConnection(),
        schemaNames: ["mdtest"],
        typescriptConfig: {
          enumStyle: "enum",
        },
        generators: [
          makeMarkdownGenerator({
            targets: [
              {
                template: templatePath,
                output: "docs/database.md",
              },
            ],
          }),
        ],
      };

      await processDatabase(config);

      const results = getResults();
      expect(results["docs/database.md"]).toBeDefined();
      const content = results["docs/database.md"].join("\n");
      expect(content).toContain("# Database Documentation");
      expect(content).toContain("table: mdtest.users");
    });
  });

  describe("Per-entity generation", () => {
    it("should generate one file per table", async () => {
      const db = getKnex();
      await db.raw(`
        create table mdtest.posts (
          id serial primary key,
          title text not null
        );
        create table mdtest.comments (
          id serial primary key,
          post_id integer references mdtest.posts(id)
        );
      `);

      // Create a table template
      const templatePath = join(tempDir, "table.md.hbs");
      writeFileSync(
        templatePath,
        `# {{entity.name}}

Type: {{entity.type}}
Schema: {{entity.schema}}

## Columns
{{#each entity.columns}}
- {{name}}: {{type}}
{{/each}}
`,
      );

      const config: ConfigV4 = {
        connection: getConnection(),
        schemaNames: ["mdtest"],
        typescriptConfig: {
          enumStyle: "enum",
        },
        generators: [
          makeMarkdownGenerator({
            targets: [
              {
                template: templatePath,
                output: "docs/tables/{{entity.schema}}.{{entity.name}}.md",
                perEntity: true,
                filter: (entity) => entity.type === "table",
              },
            ],
          }),
        ],
      };

      await processDatabase(config);

      const results = getResults();
      expect(results["docs/tables/mdtest.posts.md"]).toBeDefined();
      expect(results["docs/tables/mdtest.comments.md"]).toBeDefined();

      const postsContent = results["docs/tables/mdtest.posts.md"].join("\n");
      expect(postsContent).toContain("# posts");
      expect(postsContent).toContain("Type: table");
      expect(postsContent).toContain("- id:");
      expect(postsContent).toContain("- title:");
    });
  });

  describe("Per-schema generation", () => {
    it("should generate one file per schema", async () => {
      const db = getKnex();
      await db.raw(`
        create table mdtest.accounts (
          id serial primary key
        );
      `);

      // Create a schema template
      const templatePath = join(tempDir, "schema.md.hbs");
      writeFileSync(
        templatePath,
        `# Schema: {{schema.name}}

## Tables
{{#each schema.tables}}
- {{name}}
{{/each}}
`,
      );

      const config: ConfigV4 = {
        connection: getConnection(),
        schemaNames: ["mdtest"],
        typescriptConfig: {
          enumStyle: "enum",
        },
        generators: [
          makeMarkdownGenerator({
            targets: [
              {
                template: templatePath,
                output: "docs/schemas/{{schema.name}}.md",
                perSchema: true,
              },
            ],
          }),
        ],
      };

      await processDatabase(config);

      const results = getResults();
      expect(results["docs/schemas/mdtest.md"]).toBeDefined();

      const schemaContent = results["docs/schemas/mdtest.md"].join("\n");
      expect(schemaContent).toContain("# Schema: mdtest");
      expect(schemaContent).toContain("- accounts");
    });
  });

  describe("Multiple targets", () => {
    it("should generate multiple files from different targets", async () => {
      const db = getKnex();
      await db.raw(`
        create table mdtest.products (
          id serial primary key,
          name text not null
        );
      `);

      // Create templates
      const indexTemplate = join(tempDir, "multi-index.md.hbs");
      writeFileSync(
        indexTemplate,
        `# Index\n\nTotal entities: {{metadata.entities.length}}`,
      );

      const tableTemplate = join(tempDir, "multi-table.md.hbs");
      writeFileSync(
        tableTemplate,
        `# {{entity.name}}\n\nColumns: {{entity.columns.length}}`,
      );

      const config: ConfigV4 = {
        connection: getConnection(),
        schemaNames: ["mdtest"],
        typescriptConfig: {
          enumStyle: "enum",
        },
        generators: [
          makeMarkdownGenerator({
            targets: [
              {
                template: indexTemplate,
                output: "docs/index.md",
              },
              {
                template: tableTemplate,
                output: "docs/tables/{{entity.name}}.md",
                perEntity: true,
                filter: (entity) => entity.type === "table",
              },
            ],
          }),
        ],
      };

      await processDatabase(config);

      const results = getResults();
      expect(results["docs/index.md"]).toBeDefined();
      expect(results["docs/tables/products.md"]).toBeDefined();

      const indexContent = results["docs/index.md"].join("\n");
      expect(indexContent).toContain("# Index");
      expect(indexContent).toContain("Total entities:");
    });
  });
});
