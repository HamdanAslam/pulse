import http from "http";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { connectDb } from "./config/db.js";
import { initSocket } from "./socket.js";

async function bootstrap() {
  await connectDb();
  const app = createApp();
  const server = http.createServer(app);
  initSocket(server, env.clientUrls);

  server.listen(env.port, () => {
    console.log(`API listening on http://localhost:${env.port}`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
