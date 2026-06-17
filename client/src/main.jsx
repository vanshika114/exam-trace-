import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

document.body.style.margin = "0";

const root = document.getElementById("root");

if (root) {
  root.style.width = "100vw";
  root.style.minHeight = "100vh";
}

ReactDOM.createRoot(root).render(<App />);