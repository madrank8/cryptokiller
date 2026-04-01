import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const funnelStagesTable = pgTable("funnel_stages", {
  id: serial("id").primaryKey(),
  reviewId: integer("review_id").notNull(),
  stageNumber: integer("stage_number").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  statValue: text("stat_value").notNull().default(""),
  statLabel: text("stat_label").notNull().default(""),
  bullets: text("bullets").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFunnelStageSchema = createInsertSchema(funnelStagesTable).omit({ id: true, createdAt: true });
export type InsertFunnelStage = z.infer<typeof insertFunnelStageSchema>;
export type FunnelStage = typeof funnelStagesTable.$inferSelect;
