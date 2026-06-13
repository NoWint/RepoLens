"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, KeyRound } from "lucide-react";

interface TokenInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function TokenInput({ value, onChange }: TokenInputProps) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative flex items-center w-full max-w-xl">
      <KeyRound className="absolute left-3 text-muted-foreground" size={14} />
      <Input
        type={show ? "text" : "password"}
        placeholder="GitHub Token (optional, for private repos & higher rate limits)"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-9 pr-10 h-10 text-sm"
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute right-3 text-muted-foreground hover:text-foreground transition-colors"
      >
        {show ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  );
}
