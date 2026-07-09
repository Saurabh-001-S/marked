import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

// Plain .mjs on purpose, not .ts — Prisma 7's CLI loads TypeScript config
// files through a package called `jiti`, and that loader has a known bug
// in early 7.x releases (`SyntaxError: Named export 'createJiti' not
// found`). A .mjs file needs no transpilation at all, so it sidesteps the
// bug entirely rather than working around it.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
