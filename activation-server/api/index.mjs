import { createActivationServer } from "../server.mjs";
import { createPostgresStore } from "../postgres-store.mjs";
let instance;
async function initialize() {
  const storage = await createPostgresStore(
    process.env.DATABASE_URL || process.env.POSTGRES_URL
  );
  try {
    return await createActivationServer({
      storage,
      secrets: {
        adminToken: process.env.ACTIVATION_ADMIN_TOKEN,
        serverSecret: process.env.ACTIVATION_HASH_SECRET,
        privatePem: process.env.ACTIVATION_SIGNING_PRIVATE_KEY,
      },
      clientAddress: (request) =>
        String(
          request.headers["x-forwarded-for"] ||
            request.socket.remoteAddress ||
            "unknown"
        )
          .split(",")[0]
          .trim(),
    });
  } catch (error) {
    await storage.close();
    throw error;
  }
}
export default async function handler(request, response) {
  try {
    if (!instance)
      instance = initialize().catch((error) => {
        instance = null;
        throw error;
      });
    await (await instance).handler(request, response);
  } catch {
    // Never expose connection strings or signing material through an error page.
    response.writeHead(503, {
      "content-type": "application/json",
      "cache-control": "no-store",
    });
    response.end(
      JSON.stringify({
        code: "SERVER_UNAVAILABLE",
        error: "Le serveur d’activation est temporairement indisponible.",
      })
    );
  }
}
