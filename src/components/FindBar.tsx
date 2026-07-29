import { useState, useEffect, useRef } from "react";
import { Search, X, ChevronUp, ChevronDown } from "lucide-react";
import { useTabsStore } from "../stores/tabs";

interface Props {
  onClose: () => void;
}

export function FindBar({ onClose }: Props) {
  const [query, setQuery] = useState("");
  const { findInPage, findStop } = useTabsStore();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleChange = (q: string) => {
    setQuery(q);
    findInPage(q);
  };

  const handleClose = () => {
    findStop();
    onClose();
  };

  return (
    <div className="absolute top-[128px] right-4 z-40 w-96 bg-veil-900 border border-veil-700 rounded-xl shadow-2xl p-2 flex items-center gap-2"
      style={{ background: "rgba(15, 19, 26, 0.98)", backdropFilter: "blur(20px)" }}
    >
      <Search size={14} className="text-veil-500 ml-1" />
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") handleClose();
          if (e.key === "Enter") findInPage(query);
        }}
        placeholder="Find in page..."
        className="flex-1 bg-transparent text-sm text-veil-100 placeholder-veil-500 focus:outline-none"
      />
      <button
        className="btn-icon-sm"
        onClick={() => findInPage(query)}
        title="Find previous"
      >
        <ChevronUp size={14} />
      </button>
      <button
        className="btn-icon-sm"
        onClick={() => findInPage(query)}
        title="Find next"
      >
        <ChevronDown size={14} />
      </button>
      <button className="btn-icon-sm" onClick={handleClose} title="Close (Esc)">
        <X size={14} />
      </button>
    </div>
  );
}
