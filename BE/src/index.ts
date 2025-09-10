import express from "express";
import http from "http";

/////////////////////////////////

const PORT = 3000;

/////////////////////////////////

const app = express();
const server = http.createServer(app);

/////////////////////////////////

app.get("/", (_, res) => {
  res.send("Server running...");
});

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
