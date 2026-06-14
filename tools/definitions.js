import fs from "fs";
import path from "path";

const DATA_DIR = process.env.DATA_DIR || "./data";

function ensureDataDirs() {
  const dirs = [
    DATA_DIR,
    path.join(DATA_DIR, "memooro"),
    path.join(DATA_DIR, "sonora")
  ];
  for (const d of dirs) {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  }
}
ensureDataDirs();

export const toolSchemas = [
  {
    type: "function",
    function: {
      name: "memooro_add_entry",
      description: "Agrega una nueva entrada (nota/diario) a MEMOORO con fecha, título y contenido.",
      parameters: {
        type: "object",
        properties: {
          titulo: { type: "string", description: "Título corto de la entrada" },
          contenido: { type: "string", description: "Contenido completo de la entrada" },
          fecha: { type: "string", description: "Fecha en formato YYYY-MM-DD. Si no se da, se usa la fecha actual." }
        },
        required: ["titulo", "contenido"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "memooro_list_entries",
      description: "Lista las últimas entradas guardadas en MEMOORO.",
      parameters: {
        type: "object",
        properties: {
          limite: { type: "number", description: "Cantidad máxima de entradas a devolver (default 5)" }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "sonora_get_stats",
      description: "Obtiene estadísticas de reproducción guardadas por Sonora Pro (si fueron sincronizadas previamente).",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "sonora_save_stats",
      description: "Guarda/actualiza estadísticas de reproducción enviadas desde Sonora Pro.",
      parameters: {
        type: "object",
        properties: {
          stats: { type: "object", description: "Objeto JSON con las estadísticas a guardar" }
        },
        required: ["stats"]
      }
    }
  }
];

export const toolHandlers = {
  memooro_add_entry: ({ titulo, contenido, fecha }) => {
    const file = path.join(DATA_DIR, "memooro", "entries.json");
    let entries = [];
    if (fs.existsSync(file)) {
      entries = JSON.parse(fs.readFileSync(file, "utf-8"));
    }
    const entry = {
      id: Date.now().toString(),
      titulo,
      contenido,
      fecha: fecha || new Date().toISOString().slice(0, 10)
    };
    entries.unshift(entry);
    fs.writeFileSync(file, JSON.stringify(entries, null, 2));
    return { ok: true, entry };
  },

  memooro_list_entries: ({ limite = 5 }) => {
    const file = path.join(DATA_DIR, "memooro", "entries.json");
    if (!fs.existsSync(file)) return { entries: [] };
    const entries = JSON.parse(fs.readFileSync(file, "utf-8"));
    return { entries: entries.slice(0, limite) };
  },

  sonora_get_stats: () => {
    const file = path.join(DATA_DIR, "sonora", "stats.json");
    if (!fs.existsSync(file)) return { stats: null };
    return { stats: JSON.parse(fs.readFileSync(file, "utf-8")) };
  },

  sonora_save_stats: ({ stats }) => {
    const file = path.join(DATA_DIR, "sonora", "stats.json");
    fs.writeFileSync(file, JSON.stringify(stats, null, 2));
    return { ok: true };
  }
};
