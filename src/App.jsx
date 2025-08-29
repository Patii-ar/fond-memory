import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// -----------------------------
// Tipos e categorias
// -----------------------------
const CATEGORIES = [
  { id: "family", label: "Família" },
  { id: "couple", label: "Casal" },
  { id: "pets", label: "Pets" },
  { id: "legacy", label: "Entes queridos" },
];

function classNames(...c) { return c.filter(Boolean).join(" "); }
const uid = () => Math.random().toString(36).slice(2, 10);

function fileToMediaItem(file) {
  const url = URL.createObjectURL(file);
  const type = file.type;
  const kind = type.startsWith("image/")
    ? "image"
    : type.startsWith("video/")
    ? "video"
    : "audio";
  return { id: uid(), kind, url, name: file.name, size: file.size, type };
}

// -----------------------------
// Storage local
// -----------------------------
const STORAGE_KEY = "fond-memory-album-v1";
function useAlbumStorage() {
  const [album, setAlbum] = useState([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setAlbum(JSON.parse(raw));
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(album)); } catch {}
  }, [album]);
  return [album, setAlbum];
}

// -----------------------------
// Componentes
// -----------------------------
function Header({ onImportClick, onExportClick }) {
  return (
    <div className="sticky top-0 z-20 backdrop-blur bg-white/70 border-b">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
        <span className="text-2xl font-black tracking-tight">
          fond <span className="text-pink-600">memory</span>
        </span>
        <span className="hidden sm:inline text-sm text-gray-500">
          crie lembranças com fotos, vídeos e áudios
        </span>
        <div className="ml-auto flex gap-2">
          <button onClick={onImportClick} className="px-3 py-2 rounded-xl border hover:bg-gray-50 text-sm">Importar</button>
          <button onClick={onExportClick} className="px-3 py-2 rounded-xl bg-pink-600 text-white hover:bg-pink-700 text-sm">Exportar</button>
        </div>
      </div>
    </div>
  );
}

function Uploader({ onFiles }) {
  const fileInput = useRef();
  return (
    <div>
      <input
        type="file"
        multiple
        accept="image/*,video/*,audio/*"
        hidden
        ref={fileInput}
        onChange={(e) => {
          if (!e.target.files?.length) return;
          const items = Array.from(e.target.files).map(fileToMediaItem);
          onFiles(items);
          fileInput.current.value = "";
        }}
      />
      <button
        onClick={() => fileInput.current.click()}
        className="px-3 py-2 rounded-xl border border-dashed hover:bg-gray-50 text-sm"
      >
        Adicionar mídia
      </button>
    </div>
  );
}

function AudioRecorder({ onSave }) {
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const chunks = useRef([]);

  useEffect(() => {
    if (!recording) return;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const rec = new MediaRecorder(stream);
        rec.ondataavailable = (e) => chunks.current.push(e.data);
        rec.onstop = () => {
          const blob = new Blob(chunks.current, { type: "audio/webm" });
          chunks.current = [];
          const url = URL.createObjectURL(blob);
          onSave({
            id: uid(),
            kind: "audio",
            url,
            name: `audio-${Date.now()}.webm`,
            size: blob.size,
            type: "audio/webm",
          });
        };
        rec.start();
        setMediaRecorder(rec);
      } catch (err) {
        console.error("Erro ao gravar áudio:", err);
        setRecording(false);
      }
    })();
  }, [recording]);

  const stop = () => {
    mediaRecorder?.stop();
    setMediaRecorder(null);
    setRecording(false);
  };

  return (
    <button
      onClick={() => (recording ? stop() : setRecording(true))}
      className={classNames(
        "px-3 py-2 rounded-xl text-sm",
        recording ? "bg-red-600 text-white" : "border hover:bg-gray-50"
      )}
    >
      {recording ? "Parar gravação" : "Gravar áudio"}
    </button>
  );
}

function MemoryForm({ onAdd }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("family");
  const [media, setMedia] = useState([]);

  function submit(e) {
    e.preventDefault();
    if (!title.trim() || media.length === 0) return;
    onAdd({
      id: uid(),
      title,
      category,
      createdAt: Date.now(),
      media,
    });
    setTitle("");
    setCategory("family");
    setMedia([]);
  }

  return (
    <form onSubmit={submit} className="p-4 border rounded-2xl bg-white shadow-sm space-y-3">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título da lembrança"
        className="w-full px-3 py-2 border rounded-xl"
      />
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="w-full px-3 py-2 border rounded-xl"
      >
        {CATEGORIES.map((c) => (
          <option key={c.id} value={c.id}>{c.label}</option>
        ))}
      </select>
      <div className="flex gap-2">
        <Uploader onFiles={(items) => setMedia((m) => [...m, ...items])} />
        <AudioRecorder onSave={(item) => setMedia((m) => [...m, item])} />
      </div>
      {media.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {media.map((m) => (
            <div key={m.id} className="relative">
              {m.kind === "image" && <img src={m.url} alt={m.name} className="w-full h-24 object-cover rounded-xl" />}
              {m.kind === "video" && <video src={m.url} className="w-full h-24 object-cover rounded-xl" />}
              {m.kind === "audio" && <audio src={m.url} controls className="w-full" />}
            </div>
          ))}
        </div>
      )}
      <button className="px-4 py-2 rounded-xl bg-pink-600 text-white hover:bg-pink-700">Salvar lembrança</button>
    </form>
  );
}

function MemoryCard({ memory, onDelete }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="p-4 border rounded-2xl bg-white shadow-sm space-y-2"
    >
      <div className="flex justify-between items-center">
        <h3 className="font-bold">{memory.title}</h3>
        <button
          onClick={() => onDelete(memory.id)}
          className="text-xs text-red-500 hover:underline"
        >
          Remover
        </button>
      </div>
      <div className="text-sm text-gray-500">
        {CATEGORIES.find((c) => c.id === memory.category)?.label}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {memory.media.map((m) => (
          <div key={m.id} className="relative">
            {m.kind === "image" && <img src={m.url} alt={m.name} className="w-full h-32 object-cover rounded-xl" />}
            {m.kind === "video" && <video src={m.url} controls className="w-full h-32 object-cover rounded-xl" />}
            {m.kind === "audio" && <audio src={m.url} controls className="w-full" />}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function SearchBar({ query, setQuery, category, setCategory }) {
  return (
    <div className="flex gap-2">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Pesquisar..."
        className="flex-1 px-3 py-2 border rounded-xl"
      />
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="px-3 py-2 border rounded-xl"
      >
        <option value="">Todas</option>
        {CATEGORIES.map((c) => (
          <option key={c.id} value={c.id}>{c.label}</option>
        ))}
      </select>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center text-gray-500 py-12">
      <p>Nenhuma lembrança ainda. Comece adicionando uma!</p>
    </div>
  );
}

function Footer() {
  return (
    <div className="mt-8 text-center text-xs text-gray-400">
      feito com 💖 para guardar suas memórias
    </div>
  );
}

// -----------------------------
// App principal
// -----------------------------
export default function App() {
  const [album, setAlbum] = useAlbumStorage();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");

  function addMemory(memory) { setAlbum([...album, memory]); }
  function deleteMemory(id) { setAlbum(album.filter((m) => m.id !== id)); }

  const filtered = useMemo(() => {
    return album.filter((m) =>
      (!query || m.title.toLowerCase().includes(query.toLowerCase())) &&
      (!category || m.category === category)
    );
  }, [album, query, category]);

  function exportAlbum() {
    const blob = new Blob([JSON.stringify(album)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "fond-memory.json";
    a.click();
  }
  function importAlbum() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = (e) => {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        try { setAlbum(JSON.parse(reader.result)); } catch {}
      };
      reader.readAsText(file);
    };
    input.click();
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header onImportClick={importAlbum} onExportClick={exportAlbum} />
      <main className="max-w-6xl mx-auto px-4 py-6 flex-1 w-full space-y-6">
        <MemoryForm onAdd={addMemory} />
        <SearchBar query={query} setQuery={setQuery} category={category} setCategory={setCategory} />
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              {filtered.map((m) => (
                <MemoryCard key={m.id} memory={m} onDelete={deleteMemory} />
              ))}
            </div>
          )}
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  );
}
