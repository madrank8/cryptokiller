import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const faqItemsTable = pgTable("faq_items", {
  id: serial("id").primaryKey(),
  reviewId: integer("review_id").notNull(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFaqItemSchema = createInsertSchema(faqItemsTable).omit({ id: true, createdAt: true });
export type InsertFaqItem = z.infer<typeof insertFaqItemSchema>;
export type FaqItem = typeof faqItemsTable.$inferSelect;
