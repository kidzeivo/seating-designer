import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  listVersions,
  getVersion,
  saveVersion,
  deleteVersion,
} from "./versionsStorage";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Seating designer versions (file-based)
  app.post("/api/versions", async (req: Request, res: Response) => {
    try {
      const { name, guests, tables } = req.body ?? {};
      if (!Array.isArray(guests) || !Array.isArray(tables)) {
        return res.status(400).json({ message: "Missing or invalid guests/tables" });
      }
      const meta = await saveVersion({
        name: typeof name === "string" ? name.trim() || "Unnamed version" : "Unnamed version",
        guests,
        tables,
      });
      return res.status(201).json(meta);
    } catch (err: any) {
      console.error("POST /api/versions error:", err);
      const errorMessage = err?.message || "Failed to save version";
      return res.status(500).json({ message: errorMessage, error: String(err) });
    }
  });

  app.get("/api/versions", async (_req: Request, res: Response) => {
    try {
      const list = await listVersions();
      return res.json(list);
    } catch (err) {
      console.error("GET /api/versions", err);
      return res.status(500).json({ message: "Failed to list versions" });
    }
  });

  app.get("/api/versions/:id", async (req: Request, res: Response) => {
    try {
      const version = await getVersion(req.params.id);
      if (!version) return res.status(404).json({ message: "Version not found" });
      return res.json(version);
    } catch (err) {
      console.error("GET /api/versions/:id", err);
      return res.status(500).json({ message: "Failed to load version" });
    }
  });

  app.delete("/api/versions/:id", async (req: Request, res: Response) => {
    try {
      const ok = await deleteVersion(req.params.id);
      if (!ok) return res.status(404).json({ message: "Version not found" });
      return res.status(204).send();
    } catch (err) {
      console.error("DELETE /api/versions/:id", err);
      return res.status(500).json({ message: "Failed to delete version" });
    }
  });

  return httpServer;
}
