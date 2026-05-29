"use client";

import { DndContext, PointerSensor, useDraggable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { buildCrosswordGrid, numberCrosswordEntries, validateCrosswordLayout, type CrosswordLayout, type CrosswordPlacedEntry } from "@/lib/crossword";
import { cn } from "@/lib/utils";

const CELL_SIZE = 36;

function cellKey(row: number, col: number): string {
  return `${row}:${col}`;
}

function buildDraftLayout(entries: CrosswordPlacedEntry[]): CrosswordLayout {
  const numbered = numberCrosswordEntries(entries);
  const width = Math.min(20, Math.max(...numbered.map((entry) => entry.direction === "across" ? entry.col + entry.answer.length : entry.col + 1)));
  const height = Math.min(20, Math.max(...numbered.map((entry) => entry.direction === "down" ? entry.row + entry.answer.length : entry.row + 1)));

  return {
    width,
    height,
    entries: numbered,
    grid: buildCrosswordGrid(numbered, width, height),
  };
}

function DraggableWord({ entry, hasConflict }: { entry: CrosswordPlacedEntry; hasConflict: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: String(entry.order_index),
  });
  const style = {
    left: entry.col * CELL_SIZE,
    top: entry.row * CELL_SIZE,
    width: (entry.direction === "across" ? entry.answer.length : 1) * CELL_SIZE,
    height: (entry.direction === "down" ? entry.answer.length : 1) * CELL_SIZE,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
  };

  return (
    <button
      ref={setNodeRef}
      type="button"
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "absolute rounded-md border-2 border-primary/60 bg-primary/5 text-left transition-opacity",
        "cursor-grab active:cursor-grabbing",
        hasConflict && "border-destructive bg-destructive/10",
        isDragging && "opacity-70"
      )}
      title={`Move ${entry.answer}`}
    />
  );
}

export function CrosswordGridEditor({
  layout,
  onChange,
  onValidationChange,
}: {
  layout: CrosswordLayout;
  onChange: (layout: CrosswordLayout) => void;
  onValidationChange?: (isValid: boolean) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const validation = validateCrosswordLayout(layout.entries);
  const conflictCells = validation.ok ? new Set<string>() : validation.conflictCells ?? new Set<string>();

  function handleDragEnd(event: DragEndEvent) {
    const entryIndex = Number(event.active.id);
    const entry = layout.entries.find((item) => item.order_index === entryIndex);
    if (!entry) return;

    const rowOffset = Math.round(event.delta.y / CELL_SIZE);
    const colOffset = Math.round(event.delta.x / CELL_SIZE);
    if (rowOffset === 0 && colOffset === 0) return;

    const nextEntries = layout.entries.map((item) =>
      item.order_index === entryIndex
        ? { ...item, row: Math.max(0, item.row + rowOffset), col: Math.max(0, item.col + colOffset) }
        : item
    );
    const nextValidation = validateCrosswordLayout(nextEntries);
    onValidationChange?.(nextValidation.ok);
    onChange(nextValidation.ok ? nextValidation.layout : buildDraftLayout(nextEntries));
  }

  return (
    <div className="flex flex-col gap-3">
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="overflow-auto rounded-lg border bg-card p-4">
          <div
            className="relative"
            style={{
              width: layout.width * CELL_SIZE,
              height: layout.height * CELL_SIZE,
            }}
          >
            <div
              className="grid"
              style={{
                gridTemplateColumns: `repeat(${layout.width}, ${CELL_SIZE}px)`,
                gridTemplateRows: `repeat(${layout.height}, ${CELL_SIZE}px)`,
              }}
            >
              {layout.grid.cells.flatMap((row, rowIndex) =>
                row.map((cell, colIndex) => {
                  const isActive = Boolean(cell.letter);
                  const isConflict = conflictCells.has(cellKey(rowIndex, colIndex));
                  return (
                    <div
                      key={`${rowIndex}-${colIndex}`}
                      className={cn(
                        "relative flex items-center justify-center border border-border text-sm font-semibold",
                        isActive ? "bg-background" : "bg-muted/40",
                        isConflict && "border-destructive bg-destructive/10 text-destructive"
                      )}
                    >
                      {cell.number ? (
                        <span className="absolute left-1 top-0.5 text-[10px] leading-none text-muted-foreground">
                          {cell.number}
                        </span>
                      ) : null}
                      {cell.letter}
                    </div>
                  );
                })
              )}
            </div>
            {layout.entries.map((entry) => (
              <DraggableWord
                key={`${entry.order_index}-${entry.answer}`}
                entry={entry}
                hasConflict={entry.answer.split("").some((_, index) =>
                  conflictCells.has(
                    cellKey(
                      entry.direction === "down" ? entry.row + index : entry.row,
                      entry.direction === "across" ? entry.col + index : entry.col
                    )
                  )
                )}
              />
            ))}
          </div>
        </div>
      </DndContext>
      {!validation.ok ? (
        <p className="text-sm text-destructive">{validation.error}</p>
      ) : (
        <p className="text-sm text-muted-foreground">Drag whole words to adjust the generated layout.</p>
      )}
    </div>
  );
}
