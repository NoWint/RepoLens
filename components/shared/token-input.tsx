"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff } from "lucide-react";

interface TokenInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function TokenInput({ value, onChange }: TokenInputProps) {
  const [show, setShow] = useState(false);

  return (
    <div className="flex items-center gap-2 w-full max-w-2xl">
      <Input
        type={show ? "text" : "password"}
        placeholder="GitHub Token (optional, for private repos & higher rate limits)"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1"
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="text-muted-foreground hover:text-foreground p-2"
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}
