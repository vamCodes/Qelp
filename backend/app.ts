import express from "express";

import cors from "cors";

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
    console.log("Health check endpoint hit");
  });

  return app;
}