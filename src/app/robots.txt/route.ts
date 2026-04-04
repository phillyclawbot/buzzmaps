export function GET() {
  return new Response(
    `User-agent: *\nAllow: /\nSitemap: https://buzzmaps.vercel.app/sitemap.xml\n`,
    {
      headers: {
        "Content-Type": "text/plain",
      },
    }
  );
}
