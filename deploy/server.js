import express from 'express';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 8080;

const __dirname = new URL('.', import.meta.url).pathname;

app.use(express.static(path.join(__dirname)));

app.use("/api", (req, res, next) => next());

app.get('*', (_, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT);
