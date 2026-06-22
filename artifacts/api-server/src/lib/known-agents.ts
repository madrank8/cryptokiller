import { KnownAgents } from "@knownagents/sdk";
import type { RequestHandler } from "express";
import { logger } from "./logger";

const accessToken = process.env.KNOWNAGENTS_ACCESS_TOKEN;

const client: KnownAgents | null = accessToken
  ? new KnownAgents(accessToken)
  : null;

if (!client) {
  logger.warn(
    "KNOWNAGENTS_ACCESS_TOKEN not set — Known Agents tracking middleware is disabled.",
  );
}

export const knownAgentsMiddleware: RequestHandler = (req, res, next) => {
  if (!client) {
    next();
    return;
  }

  const start = Date.now();
  res.on("finish", () => {
    try {
      client.trackVisit(req, res, Date.now() - start);
    } catch (err) {
      req.log.warn({ err }, "Known Agents trackVisit threw synchronously");
    }
  });

  next();
};
