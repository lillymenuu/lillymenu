/** Selo roxo "+N pts" dos produtos do Clube de Pontos. Nao renderiza nada com 0 pontos. */
export function PontosBadge({ pontos }: { pontos: number }) {
  if (!pontos || pontos <= 0) return null;
  return (
    <span className="inline-block shrink-0 rounded-full bg-purple-700 px-1.5 py-px text-[.66rem] font-bold whitespace-nowrap text-white">
      +{pontos} pts
    </span>
  );
}
