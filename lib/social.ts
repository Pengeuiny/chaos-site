// Meta Graph API helpers for publishing to the CHS CHAOS Facebook Page and
// its linked Instagram Business account. Server-only — never import into a
// client component (the access token must stay off the browser).

const GRAPH_VERSION = "v21.0";
const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;

export function socialConfigured() {
  const token = process.env.META_PAGE_ACCESS_TOKEN;
  return {
    facebook: Boolean(token && process.env.META_PAGE_ID),
    instagram: Boolean(token && process.env.META_IG_USER_ID),
  };
}

export type PostResult = { ok: true; url?: string } | { ok: false; error: string };

async function graphPost(
  path: string,
  body: Record<string, string>,
): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const res = await fetch(`${GRAPH}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

function graphErrorMessage(data: Record<string, unknown>, fallback: string) {
  const err = data.error as { message?: string } | undefined;
  return err?.message || fallback;
}

/** Post a photo + caption to the Facebook Page timeline. */
export async function postToFacebook(
  imageUrl: string,
  caption: string,
): Promise<PostResult> {
  const token = process.env.META_PAGE_ACCESS_TOKEN;
  const pageId = process.env.META_PAGE_ID;
  if (!token || !pageId) return { ok: false, error: "Facebook isn't configured." };

  const { ok, data } = await graphPost(`${pageId}/photos`, {
    url: imageUrl,
    caption,
    access_token: token,
  });
  if (!ok) return { ok: false, error: graphErrorMessage(data, "Facebook post failed.") };

  const postId = data.post_id as string | undefined;
  return { ok: true, url: postId ? `https://www.facebook.com/${postId}` : undefined };
}

/**
 * Post a photo + caption to Instagram. This is a two-step Graph API dance:
 * create a media container, then publish it.
 */
export async function postToInstagram(
  imageUrl: string,
  caption: string,
): Promise<PostResult> {
  const token = process.env.META_PAGE_ACCESS_TOKEN;
  const igUserId = process.env.META_IG_USER_ID;
  if (!token || !igUserId) return { ok: false, error: "Instagram isn't configured." };

  const created = await graphPost(`${igUserId}/media`, {
    image_url: imageUrl,
    caption,
    access_token: token,
  });
  const creationId = created.data.id as string | undefined;
  if (!created.ok || !creationId) {
    return {
      ok: false,
      error: graphErrorMessage(created.data, "Instagram media creation failed."),
    };
  }

  const published = await graphPost(`${igUserId}/media_publish`, {
    creation_id: creationId,
    access_token: token,
  });
  if (!published.ok) {
    return {
      ok: false,
      error: graphErrorMessage(published.data, "Instagram publish failed."),
    };
  }
  return { ok: true };
}
