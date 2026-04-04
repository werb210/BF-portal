import express from "express";
import path from "path";

const app = express();
const PORT = process.env.PORT || 8080;
const API_TARGET = process.env.API_URL || process.env.VITE_API_URL;

const __dirname = new URL(".", import.meta.url).pathname;

app.use(express.static(path.join(__dirname)));

app.use("/api", async (req, res, next) => {
  if (!API_TARGET) {
    return next();
  }

  try {
    const upstreamUrl = new URL(req.originalUrl, API_TARGET).toString();
    const response = await fetch(upstreamUrl, {
      method: req.method,
      headers: req.headers,
      body: req.method === "GET" || req.method === "HEAD" ? undefined : req,
      duplex: "half",
    });

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    if (!response.body) return res.end();

    for await (const chunk of response.body) {
      res.write(chunk);
    }
    res.end();
  } catch (error) {
    next(error);
  }
});

app.get("/api/*", (_req, res) => {
  res.status(502).json({ error: "API proxy not configured" });
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT);
