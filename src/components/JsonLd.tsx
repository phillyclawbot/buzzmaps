// Renders a JSON-LD <script> tag. Kept as a tiny server component so pages can
// drop in any schema.org object without repeating the boilerplate.
export default function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify is safe here because the data is always server-built.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
