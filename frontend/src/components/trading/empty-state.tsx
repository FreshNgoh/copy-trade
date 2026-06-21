export function EmptyState({ text }: { text: string }) {
  return (
    <div className="py-16 text-center text-muted-foreground font-mono text-sm">
      {text}
    </div>
  );
}
