import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const redFlagsTable = pgTable("red_flags", {
  id: serial("id").primaryKey(),
  reviewId: integer("review_id").notNull(),
  emoji: text("emoji").notNull().default("🚩"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRedFlagSchema = createInsertSchema(redFlagsTable).omit({ id: true, createdAt: true });
export type InsertRedFlag = z.infer<typeof insertRedFlagSchema>;
export type RedFlag = typeof redFlagsTable.$inferSelect;
