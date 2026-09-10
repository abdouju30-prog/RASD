/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: "/veille",
        destination: "/",
        permanent: true,
      },
      {
        source: "/produits",
        destination: "/portefeuille?vue=produits",
        permanent: true,
      },
      {
        source: "/matieres",
        destination: "/portefeuille?vue=molecules",
        permanent: true,
      },
      {
        source: "/sourcing",
        destination: "/developpement?mode=metoo",
        permanent: true,
      },
      {
        source: "/gamme",
        destination: "/developpement?mode=gamme",
        permanent: true,
      },
      {
        source: "/melanges",
        destination: "/developpement?mode=melanges",
        permanent: true,
      },
      {
        source: "/sentinelle",
        destination: "/developpement?mode=sentinelle",
        permanent: true,
      },
      {
        source: "/fournisseurs",
        destination: "/execution?volet=fournisseurs",
        permanent: true,
      },
      {
        source: "/dossiers",
        destination: "/execution?volet=dossiers",
        permanent: true,
      },
      {
        source: "/importation",
        destination: "/execution?volet=importation",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
