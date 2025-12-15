import express from "express";

const app = express();
const port = 3000;

export function startServer() {
  app.listen(port, () => {
    console.log("Listening on port ", port);
  });
}
