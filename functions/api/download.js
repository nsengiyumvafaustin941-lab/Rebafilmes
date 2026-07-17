export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get('url');
  const title = url.searchParams.get('title') || 'video';

  if (!targetUrl) {
    return new Response('Missing url parameter', { status: 400 });
  }

  try {
    // Fetch the target file (Cloudflare Streams/R2/external)
    const response = await fetch(targetUrl);
    
    if (!response.ok) {
      return new Response('Failed to fetch file', { status: response.status });
    }

    // Clone headers from original response
    const newHeaders = new Headers(response.headers);
    
    // Sanitize title for filename
    const safeTitle = title.replace(/[^a-zA-Z0-9-_ ]/g, '').trim().replace(/\s+/g, '_');
    
    // Force the browser to download the file instead of playing it
    newHeaders.set('Content-Disposition', `attachment; filename="${safeTitle}.mp4"`);

    // Stream the body back to the client with the new headers
    return new Response(response.body, {
      status: response.status,
      headers: newHeaders,
    });
  } catch (error) {
    return new Response('Error downloading file: ' + error.message, { status: 500 });
  }
}
