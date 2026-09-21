/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    // Ancienne nav « 4 sections » (master) → chaîne 6 étapes.
    return [
      {
        source: "/execution",
        has: [{ type: "query", key: "volet", value: "fournisseurs" }],
        destination: "/fournisseurs",
        permanent: false,
      },
      {
        source: "/execution",
        has: [{ type: "query", key: "volet", value: "dossiers" }],
        destination: "/dossiers",
        permanent: false,
      },
      {
        source: "/execution",
        has: [{ type: "query", key: "volet", value: "importation" }],
        destination: "/importation",
        permanent: false,
      },
      { source: "/execution", destination: "/fournisseurs", permanent: false },
      { source: "/portefeuille", destination: "/produits", permanent: false },
      { source: "/developpement", destination: "/sourcing", permanent: false },
    ];
  },
};

export default nextConfig;
