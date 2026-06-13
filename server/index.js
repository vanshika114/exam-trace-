require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const examRoutes = require("./routes/exam");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "5mb" }));

// Routes
app.use("/api/exam", examRoutes);

app.get("/health", (req, res) => res.json({ status: "ok" }));

// Connect to MongoDB then start
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("[DB] Connected to MongoDB");
    app.listen(PORT, () => console.log(`[SERVER] Running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("[DB] Connection failed:", err.message);
    process.exit(1);
  });