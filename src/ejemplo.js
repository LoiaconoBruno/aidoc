// Página de ejemplo: un artículo con todo el "ruido" típico de la web
// (menú, scripts, estilos, pie) alrededor del contenido.
const EJEMPLO_HTML = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>El efecto Janssen en silos</title>
  <style>body{font-family:sans-serif;margin:0} .menu{display:flex;gap:12px} .banner{background:#f60;color:#fff;padding:20px} footer{font-size:12px;color:#888}</style>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','G-XXXXXXX');</script>
  <script src="https://example.com/analytics.js" async></script>
</head>
<body>
  <nav class="menu"><a href="/">Inicio</a><a href="/blog">Blog</a><a href="/contacto">Contacto</a><a href="/login">Ingresar</a></nav>
  <div class="banner">¡Suscribite al newsletter!</div>
  <article>
    <h1>El efecto Janssen en silos</h1>
    <p>En un tubo lleno de grano, las paredes sostienen parte del peso por <strong>rozamiento</strong>. Por eso la presión en el fondo deja de crecer: es el <em>efecto Janssen</em>, descripto en 1895.</p>
    <h2>Cómo se calcula</h2>
    <p>Para un tubo de diámetro D, la presión en el fondo se acerca a un valor máximo:</p>
    <pre><code>P(z) = ρ·g·λ · (1 − e^(−z/λ)),  λ = D / (4·μ·K)</code></pre>
    <ul>
      <li>μ: rozamiento entre el grano y la pared.</li>
      <li>K: cociente entre la presión horizontal y la vertical.</li>
    </ul>
    <h2>Valores típicos</h2>
    <table>
      <tr><th>Material</th><th>Densidad (kg/m³)</th><th>μ</th></tr>
      <tr><td>Arroz</td><td>800</td><td>0,4</td></tr>
      <tr><td>Trigo</td><td>780</td><td>0,35</td></tr>
    </table>
    <p><img src="silo.jpg" alt="Corte de un silo con las fuerzas sobre las paredes"></p>
    <p>Más detalles en <a href="https://es.wikipedia.org/wiki/Efecto_Janssen">la Wikipedia</a>.</p>
  </article>
  <footer>© 2026 Blog de física · <a href="/privacidad">Privacidad</a> · <a href="/terminos">Términos</a></footer>
  <script>document.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>gtag('event','click')));</script>
</body>
</html>`;

if (typeof module !== "undefined") module.exports = EJEMPLO_HTML;
