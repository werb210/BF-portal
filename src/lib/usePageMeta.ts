// BF_PORTAL_BRAND_v38
// The portal is a single-page app, so index.html carries one generic title and
// no description for every route. Lighthouse marks that as an SEO failure on
// any page it crawls. External-facing pages set their own.
import { useEffect } from "react";

export function usePageMeta(title: string, description: string) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;

    let tag = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const created = !tag;
    if (!tag) {
      tag = document.createElement("meta");
      tag.name = "description";
      document.head.appendChild(tag);
    }
    const previousDescription = tag.content;
    tag.content = description;

    return () => {
      document.title = previousTitle;
      if (created) {
        tag?.remove();
      } else if (tag) {
        tag.content = previousDescription;
      }
    };
  }, [title, description]);
}
