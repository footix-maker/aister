
import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

const MODELS = {
  general: process.env.AISTER_GENERAL_MODEL || "anthropic/claude-sonnet-4",
  code: process.env.AISTER_CODE_MODEL || "openai/gpt-4o",
  research: process.env.AISTER_RESEARCH_MODEL || "google/gemini-2.5-pro",
  synthesis: process.env.AISTER_SYNTHESIS_MODEL || "anthropic/claude-sonnet-4"
};

const SYSTEM = `Tu es AIster, un assistant IA francophone polyvalent, fiable et orienté réalisation.
Réponds dans la langue de l'utilisateur. Sois clair, précis et honnête.
N'invente jamais une recherche web, un fichier créé, une action exécutée ou une information vérifiée.
Pour un projet, propose des étapes concrètes et produis directement le travail demandé quand c'est possible.
Signale les limites et les incertitudes.`;

async function askModel(model, messages, temperature = 0.4) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key || key === "colle_ta_cle_ici") {
    const err = new Error("La clé API n'est pas configurée. Ajoute OPENROUTER_API_KEY dans le fichier .env.");
    err.status = 503;
    throw err;
  }
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json",
      "X-OpenRouter-Title": "AIster"
    },
    body: JSON.stringify({ model, messages, temperature, max_tokens: 3000 })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(data?.error?.message || `Erreur du fournisseur IA (${response.status})`);
    err.status = response.status;
    throw err;
  }
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("Le modèle n'a pas renvoyé de texte.");
  return content;
}

app.get("/api/status", (_req, res) => {
  res.json({ configured: Boolean(process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY !== "colle_ta_cle_ici"), provider: "OpenRouter" });
});

app.post("/api/chat", async (req, res) => {
  try {
    const { messages, mode = "auto", ensemble = false } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 40) {
      return res.status(400).json({ error: "Historique de conversation invalide." });
    }
    const safeMessages = messages
      .filter(m => m && ["user", "assistant"].includes(m.role) && typeof m.content === "string")
      .map(m => ({ role: m.role, content: m.content.slice(0, 16000) }));
    if (!safeMessages.length || safeMessages[safeMessages.length - 1].role !== "user") {
      return res.status(400).json({ error: "Ajoute un message utilisateur." });
    }

    const latest = safeMessages[safeMessages.length - 1].content.toLowerCase();
    let chosen = MODELS.general;
    if (mode === "code" || /code|javascript|python|html|css|bug|programme|site web|application/.test(latest)) chosen = MODELS.code;
    if (mode === "research" || /recherche|sources|actualité|compare|étude|informations récentes/.test(latest)) chosen = MODELS.research;

    const baseMessages = [{ role: "system", content: SYSTEM }, ...safeMessages];
    if (!ensemble) {
      const answer = await askModel(chosen, baseMessages);
      return res.json({ answer, models: [chosen], ensemble: false });
    }

    // Deux avis indépendants, puis une synthèse : ce mode consomme davantage de crédits.
    const second = chosen === MODELS.code ? MODELS.research : MODELS.code;
    const [firstOpinion, secondOpinion] = await Promise.all([
      askModel(chosen, baseMessages, 0.35),
      askModel(second, baseMessages, 0.35)
    ]);
    const synthesisMessages = [
      { role: "system", content: SYSTEM + "\nTu es le synthétiseur d'AIster. Compare les deux propositions, repère les erreurs ou désaccords, puis donne une réponse finale cohérente. Ne prétends pas que les avis sont des sources vérifiées." },
      { role: "user", content: `Demande initiale :\n${safeMessages[safeMessages.length - 1].content}\n\nAvis du modèle A (${chosen}) :\n${firstOpinion}\n\nAvis du modèle B (${second}) :\n${secondOpinion}\n\nFais la meilleure synthèse utile.` }
    ];
    const answer = await askModel(MODELS.synthesis, synthesisMessages, 0.25);
    return res.json({ answer, models: [chosen, second, MODELS.synthesis], ensemble: true });
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || "Une erreur est survenue." });
  }
});

app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`AIster est lancé sur http://localhost:${port}`));
