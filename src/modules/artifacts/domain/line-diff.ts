export type DiffLine = {
  type: "same" | "added" | "removed";
  oldNumber: number | null;
  newNumber: number | null;
  content: string;
};

export function computeLineDiff(before: string, after: string): DiffLine[] {
  const oldLines = before.replace(/\r\n/g, "\n").split("\n");
  const newLines = after.replace(/\r\n/g, "\n").split("\n");

  if (oldLines.length * newLines.length > 250_000) {
    const length = Math.max(oldLines.length, newLines.length);
    const rows: DiffLine[] = [];
    for (let index = 0; index < length; index += 1) {
      const oldLine = oldLines[index];
      const newLine = newLines[index];
      if (oldLine === newLine && oldLine !== undefined) {
        rows.push({ type: "same", oldNumber: index + 1, newNumber: index + 1, content: oldLine });
      } else {
        if (oldLine !== undefined) rows.push({ type: "removed", oldNumber: index + 1, newNumber: null, content: oldLine });
        if (newLine !== undefined) rows.push({ type: "added", oldNumber: null, newNumber: index + 1, content: newLine });
      }
    }
    return rows;
  }

  const rows = Array.from({ length: oldLines.length + 1 }, () =>
    Array<number>(newLines.length + 1).fill(0),
  );
  for (let oldIndex = oldLines.length - 1; oldIndex >= 0; oldIndex -= 1) {
    for (let newIndex = newLines.length - 1; newIndex >= 0; newIndex -= 1) {
      rows[oldIndex][newIndex] =
        oldLines[oldIndex] === newLines[newIndex]
          ? rows[oldIndex + 1][newIndex + 1] + 1
          : Math.max(rows[oldIndex + 1][newIndex], rows[oldIndex][newIndex + 1]);
    }
  }

  const result: DiffLine[] = [];
  let oldIndex = 0;
  let newIndex = 0;
  while (oldIndex < oldLines.length && newIndex < newLines.length) {
    if (oldLines[oldIndex] === newLines[newIndex]) {
      result.push({ type: "same", oldNumber: oldIndex + 1, newNumber: newIndex + 1, content: oldLines[oldIndex] });
      oldIndex += 1;
      newIndex += 1;
    } else if (rows[oldIndex + 1][newIndex] >= rows[oldIndex][newIndex + 1]) {
      result.push({ type: "removed", oldNumber: oldIndex + 1, newNumber: null, content: oldLines[oldIndex] });
      oldIndex += 1;
    } else {
      result.push({ type: "added", oldNumber: null, newNumber: newIndex + 1, content: newLines[newIndex] });
      newIndex += 1;
    }
  }
  while (oldIndex < oldLines.length) {
    result.push({ type: "removed", oldNumber: oldIndex + 1, newNumber: null, content: oldLines[oldIndex] });
    oldIndex += 1;
  }
  while (newIndex < newLines.length) {
    result.push({ type: "added", oldNumber: null, newNumber: newIndex + 1, content: newLines[newIndex] });
    newIndex += 1;
  }
  return result;
}
