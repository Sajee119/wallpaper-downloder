export default function SkeletonCard() {
  return (
    <div className="skeleton aspect-[16/9] rounded-xl border border-line" aria-hidden="true">
      <div className="m-3 h-2 w-16 rounded-full bg-raised" />
      <div className="mx-3 mt-2 h-2 w-28 rounded-full bg-raised" />
    </div>
  );
}
