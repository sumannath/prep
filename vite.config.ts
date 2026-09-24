import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "no-spa-fallback-for-markdown",
      configureServer(server) {
        return () => {
          server.middlewares.use((req, res, next) => {
            const path = req.url?.split("?")[0] ?? "";
            if (path.endsWith(".md")) {
              res.statusCode = 404;
              res.setHeader("Content-Type", "text/plain; charset=utf-8");
              res.end("Not found");
              return;
            }
            next();
          });
        };
      },
    },
  ],
  base: process.env.GITHUB_PAGES === "true" ? "/prep/" : "/",
});
