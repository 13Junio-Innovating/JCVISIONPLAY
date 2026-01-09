import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

console.log("----------------------------------------");
console.log("JVision: Inicializando aplicação...");
console.log("JVision: Verificando elemento root...");

const rootElement = document.getElementById("root");

if (!rootElement) {
  console.error("JVision: CRITICAL ERROR - Elemento 'root' não encontrado no DOM!");
} else {
  console.log("JVision: Elemento 'root' encontrado. Montando React App...");
  try {
    createRoot(rootElement).render(<App />);
    console.log("JVision: React App montado com sucesso (render chamado).");
  } catch (error) {
    console.error("JVision: Erro ao montar React App:", error);
  }
}

