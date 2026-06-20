"use client";

import { useState, useTransition } from "react";
import { addToBoardAction } from "@/app/_actions/board";
import { Button } from "@/components/ui/Button";
import { Plus, Check } from "lucide-react";

export function AddToBoardButton({ playerId }: { playerId: string }) {
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  return (
    <Button
      variant={done ? "secondary" : "primary"}
      disabled={pending || done}
      className="w-full"
      onClick={() =>
        start(async () => {
          const r = await addToBoardAction(playerId);
          if (r.ok) setDone(true);
        })
      }
    >
      {done ? (
        <>
          <Check size={15} /> Added to Board
        </>
      ) : (
        <>
          <Plus size={15} /> {pending ? "Adding…" : "Add to Board"}
        </>
      )}
    </Button>
  );
}
