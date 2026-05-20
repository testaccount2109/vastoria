import { useCallback, useRef } from "react";
import { cn } from "@/lib/utils";

interface ResizerProps {
  direction: "horizontal" | "vertical";
  onResize: (delta: number) => void;
  className?: string;
}

export function Resizer({ direction, onResize, className }: ResizerProps) {
  const dragging = useRef(false);
  const lastPos = useRef(0);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current = true;
      lastPos.current = direction === "horizontal" ? e.clientX : e.clientY;

      const onMove = (ev: MouseEvent) => {
        if (!dragging.current) return;
        const pos = direction === "horizontal" ? ev.clientX : ev.clientY;
        const delta = pos - lastPos.current;
        lastPos.current = pos;
        onResize(delta);
      };

      const onUp = () => {
        dragging.current = false;
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [direction, onResize],
  );

  return (
    <div
      role="separator"
      aria-orientation={direction === "horizontal" ? "vertical" : "horizontal"}
      onMouseDown={onMouseDown}
      className={cn(
        "shrink-0 bg-vast-border/50 hover:bg-vast-accent/60 transition-colors z-10",
        direction === "horizontal" ? "w-1 cursor-col-resize" : "h-1 cursor-row-resize",
        className,
      )}
    />
  );
}
