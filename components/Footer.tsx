export default function Footer() {
  return (
    <footer className="cap mute">
      <span>© {new Date().getFullYear()} Áquila Oliveira · Salvador, BA</span>
      <div className="links">
        <a href="https://www.instagram.com/aquilaolvr/" target="_blank" rel="noopener">Instagram</a>
        <a href="https://www.youtube.com/@aquilaolvr" target="_blank" rel="noopener">YouTube</a>
        <a href="http://behance.net/aquilaolvr" target="_blank" rel="noopener">Behance</a>
        <a href="https://www.linkedin.com/in/%C3%A1quila-oliveira-b5578518a/" target="_blank" rel="noopener">LinkedIn</a>
      </div>
    </footer>
  );
}
