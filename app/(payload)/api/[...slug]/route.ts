import config from '@payload-config';
import { REST_DELETE, REST_GET, REST_OPTIONS, REST_PATCH, REST_POST, REST_PUT } from '@payloadcms/next/routes';

const get = REST_GET(config);
export const GET: typeof get = async (...args) => {
  const response = await get(...args);
  // Public-to-private changes must not leave originals or thumbnails in a
  // shared/browser cache. Object-storage delivery must retain this policy.
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
};
export const POST = REST_POST(config);
export const DELETE = REST_DELETE(config);
export const PATCH = REST_PATCH(config);
export const PUT = REST_PUT(config);
export const OPTIONS = REST_OPTIONS(config);
