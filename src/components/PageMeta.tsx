import { useEffect } from "react";
import { getSiteUrl } from "../lib/siteUrl";

type PageMetaProps = {
  title: string;
  description: string;
  path?: string;
  type?: "website" | "product";
  image?: string;
};

export default function PageMeta({ title, description, path = "", type = "website", image }: PageMetaProps) {
  const site = "Brew & Bean Coffee";
  const fullTitle = title === site ? title : `${title} · ${site}`;
  const url = `${getSiteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const ogImage = image || `${getSiteUrl()}/logo.svg`;

  useEffect(() => {
    document.title = fullTitle;

    const setMeta = (name: string, content: string, prop = false) => {
      const attr = prop ? "property" : "name";
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    setMeta("description", description);
    setMeta("og:title", fullTitle, true);
    setMeta("og:description", description, true);
    setMeta("og:url", url, true);
    setMeta("og:type", type, true);
    setMeta("og:image", ogImage, true);
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", fullTitle);
    setMeta("twitter:description", description);

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = url;
  }, [fullTitle, description, url, type, ogImage]);

  return null;
}
