import './Placeholder.css';

export default function Placeholder({ icon, title, desc }) {
  return (
    <div className="placeholder-page">
      <div className="ph-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{desc}</p>
    </div>
  );
}
