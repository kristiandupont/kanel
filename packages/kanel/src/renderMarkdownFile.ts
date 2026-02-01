import Handlebars from "handlebars";
import { readFileSync } from "fs";
import { resolve } from "path";

/**
 * Renders a markdown file using a Handlebars template
 * @param templatePath - Path to the Handlebars template file
 * @param context - Data to pass to the template
 * @returns Array of lines (strings)
 */
export default function renderMarkdownFile(
  templatePath: string,
  context: unknown,
): string[] {
  // Read and compile template
  const templateSource = readFileSync(resolve(templatePath), "utf-8");
  const template = Handlebars.compile(templateSource);

  // Render template with context
  const rendered = template(context);

  // Split into lines
  return rendered.split("\n");
}
