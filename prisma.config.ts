import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient({
  datasources: {
    db: {
      adapter: "sqlite",
      url: "file:./prisma/dev.db", // база SQLite
    },
  },
});
