import { z } from "zod";

const seedInput = z.object({
  config: z
    .object({
      schema: z.string(),
    })
    .optional(),
  defaults: z.record(z.string()).optional(),
  data: z.array(
    z.object({
      name: z.string(),
      rows: z.array(z.record(z.string())),
    }),
  ),
});

export type SeedInput = z.infer<typeof seedInput>;

export default seedInput;
