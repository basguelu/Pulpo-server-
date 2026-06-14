import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Groq from "groq-sdk";
import { toolSchemas, toolHandlers } from "./tools/definitions.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `Eres "Pulpo", el asistente central que conecta y maneja varias apps de Luis: 
MEMOORO (diario personal) y Sonora Pro (reproductor de música), y otras que se vayan agregando.
Usa las herramientas disponibles cuando el usuario pida guardar, consultar o modificar datos de esas apps.
Responde siempre en español, de forma breve y directa.`;

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Pulpo server activo" });
});

app.post("/pulpo", async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Falta 'message' en el body" });
    }

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history,
      { role: "user", content: message }
    ];

    let response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages,
      tools: toolSchemas,
      tool_choice: "auto"
    });

    let choice = response.choices[0];

    while (choice.finish_reason === "tool_calls") {
      const toolCalls = choice.message.tool_calls;
      messages.push(choice.message);

      for (const call of toolCalls) {
        const fnName = call.function.name;
        const args = JSON.parse(call.function.arguments || "{}");
        let result;
        try {
          if (toolHandlers[fnName]) {
            result = toolHandlers[fnName](args);
          } else {
            result = { error: `Herramienta desconocida: ${fnName}` };
          }
        } catch (err) {
          result = { error: err.message };
        }

        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(result)
        });
      }

      response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages,
        tools: toolSchemas,
        tool_choice: "auto"
      });
      choice = response.choices[0];
    }

    res.json({
      reply: choice.message.content,
      history: [...messages, choice.message]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Pulpo server escuchando en puerto ${PORT}`);
});
