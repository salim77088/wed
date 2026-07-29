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
    <div
      className="fixed top-[84px] right-4 z-[54] w-96 bg-veil-900 border border-veil-700 rounded-xl shadow-lg p-2 flex items-center gap-1 animate-slide-down"
      style={{ background: "rgba(20, 21, 24, 0.98)", backdropFilter: "blur(20px)" }}
    >
      <Search size={15} className="text-veil-500 ml-1.5" />
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") handleClose();
          if (e.key === "Enter") findInPage(query);
        }}
        placeholder="Find in page..."
        className="flex-1 bg-transparent text-[13px] text-veil-100 placeholder-veil-500 focus:outline-none px-1"
        spellCheck={false}
      />
      <button className="btn-icon-sm" onClick={() => findInPage(query)} title="Find previous">
        <ChevronUp size={15} />
      </button>
      <button className="btn-icon-sm" onClick={() => findInPage(query)} title="Find next">
        <ChevronDown size={15} />
      </button>
      <button className="btn-icon-sm" onClick={handleClose} title="Close (Esc)">
        <X size={15} />
      </button>
    </div>
  );
}
