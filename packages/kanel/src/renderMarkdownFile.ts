import Handlebars from "handlebars";
import { readFileSync } from "fs";
import { resolve } from "path";

function registerBuiltinHelpers(hbs: typeof Handlebars): void {
  hbs.registerHelper("findBy", function (array, key, value, options) {
    const item = array.find((item: any) => item[key] === value);
    return item ? options.fn(item) : options.inverse(this);
  });

  hbs.registerHelper("find", function (array, value, options) {
    const key = "name";
    const item = array.find((item: any) => item[key] === value);
    return item ? options.fn(item) : options.inverse(this);
  });

  /**
   * Strips the schema prefix from a qualified PostgreSQL type name.
   * e.g. "pg_catalog.int4" → "int4", "public.my_enum" → "my_enum"
   * Array suffixes are preserved: "pg_catalog.text[]" → "text[]"
   */
  hbs.registerHelper("shortType", function (type: unknown) {
    if (typeof type !== "string") return type;
    return type.split(".").pop() ?? type;
  });
}

/**
 * Renders a markdown file using a Handlebars template
 * @param templatePath - Path to the Handlebars template file
 * @param context - Data to pass to the template
 * @param helpers - Optional additional Handlebars helpers to register
 * @returns Array of lines (strings)
 */
export default function renderMarkdownFile(
  templatePath: string,
  context: unknown,
  helpers?: Record<string, (...args: any[]) => any>,
): string[] {
  const hbs = Handlebars.create();
  registerBuiltinHelpers(hbs);

  if (helpers) {
    for (const [name, fn] of Object.entries(helpers)) {
      hbs.registerHelper(name, fn);
    }
  }

  const templateSource = readFileSync(resolve(templatePath), "utf-8");
  const template = hbs.compile(templateSource);
  const rendered = template(context);
  return rendered.split("\n");
}
