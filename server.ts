// Tiny Bun production server: PDF processing stays entirely in the browser, so uploads never leave the device.
const root = new URL('./dist/', import.meta.url).pathname;
const server = Bun.serve({
  port: Number(process.env.PORT || 3000),
  hostname: '0.0.0.0',
  async fetch(request) {
    const pathname = decodeURIComponent(new URL(request.url).pathname);
    const safePath = pathname
      .split('/')
      .filter((part) => part && part !== '.' && part !== '..')
      .join('/');
    let file = Bun.file(`${root}${safePath || 'index.html'}`);
    if (!(await file.exists())) file = Bun.file(`${root}index.html`);
    return new Response(file, { headers: { 'X-Content-Type-Options': 'nosniff' } });
  },
});
console.log(`PDF Burner listening on ${server.url}`);
