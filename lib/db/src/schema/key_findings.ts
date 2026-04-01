import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const keyFindingsTable = pgTable("key_findings", {
  id: serial("id").primaryKey(),
  reviewId: integer("review_id").notNull(),
  content: text("content").notNull(),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertKeyFindingSchema = createInsertSchema(keyFindingsTable).omit({ id: true, createdAt: true });
export type InsertKeyFinding = z.infer<typeof insertKeyFindingSchema>;
export type KeyFinding = typeof keyFindingsTable.$inferSelect;
