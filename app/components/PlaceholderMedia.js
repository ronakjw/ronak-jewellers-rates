// Styled stand-in for a real photo or video. Swap by replacing this
// component's usage with a real <Image> or <video> tag — the label makes
// it obvious in the browser which spots still need real media.
export default function PlaceholderMedia({ label, tag = "Photo", ratio = "4 / 3" }) {
  return (
    <div className="placeholder-media" style={{ "--pm-ratio": ratio }}>
      <div className="placeholder-media-label">
        <span className="placeholder-media-tag">{tag} needed —</span> {label}
      </div>
    </div>
  );
}
