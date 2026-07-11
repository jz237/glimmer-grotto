import { createRoot } from "react-dom/client";
import GlimmerGrotto from "../app/GlimmerGrotto";
import "../app/globals.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Glimmer Grotto could not find its page mount.");
}

createRoot(root).render(<GlimmerGrotto />);
