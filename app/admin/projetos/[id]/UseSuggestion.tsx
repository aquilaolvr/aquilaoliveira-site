"use client";
/** Copia a sugestão do Claude para os campos editáveis (não salva nem publica). */
export default function UseSuggestion({ title, description }: { title?: string | null; description?: string | null }) {
  return (
    <button type="button" className="btn ghost" onClick={() => {
      const t = document.querySelector<HTMLInputElement>('input[name="title"]');
      const d = document.querySelector<HTMLTextAreaElement>('textarea[name="description"]');
      if (t && title) t.value = title;
      if (d && description) d.value = description;
    }}>Usar sugestão nos campos</button>
  );
}
