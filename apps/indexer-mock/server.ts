import "dotenv/config";
import express from "express";
import router from "./routes";
import { jsonLogger } from "./models";

const app = express();

app.use(express.json({ limit: "1mb" }));
app.use(jsonLogger);
app.use(router);

const port = Number(process.env.INDEXER_PORT ?? 3001);

app.listen(port, () => {
  // Monad RPC reference for context: https://docs.monad.xyz/
  console.log(JSON.stringify({ level: "info", msg: "indexer-start", port }));
});
