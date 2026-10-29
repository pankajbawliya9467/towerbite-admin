/** Image when set, otherwise the emoji on the cafe's soft cover color (as in the mockups). */
export function FoodTile({ emoji, imageUrl, color, size = 56 }: {
  emoji: string; imageUrl?: string | null; color: string; size?: number;
}) {
  return (
    <div className="food" style={{ width: size, height: size, background: color, fontSize: size * 0.5, borderRadius: size > 64 ? 18 : 14 }}>
      {imageUrl ? <img src={imageUrl} alt="" /> : emoji}
    </div>
  );
}
