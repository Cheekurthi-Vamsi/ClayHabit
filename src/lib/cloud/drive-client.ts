import { CloudError } from './cloud-error';

/**
 * A tiny Google Drive v3 client for the one thing ClayHabbit needs: keeping a
 * single file per account in the Drive's hidden **app data folder**. That
 * folder is private to this app (it doesn't show up in the person's Drive
 * and other apps can't read it), and it only needs the narrow
 * `drive.appdata` scope — ClayHabbit never sees anything else in the Drive.
 */

const API = 'https://www.googleapis.com/drive/v3/files';
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3/files';
const FIELDS = 'id,name,version,modifiedTime,size,appProperties';

export interface RemoteFile {
  id: string;
  modifiedTime: string | null;
  size: number | null;
  /** Small string labels stored beside the file (never the data itself). */
  appProperties: Record<string, string>;
}

/** Where encrypted snapshots live. Drive in the app; an in-memory fake in tests. */
export interface CloudFileStore {
  find(name: string): Promise<RemoteFile | null>;
  download(id: string): Promise<string>;
  /** Creates the file, or replaces its contents when `id` is given. */
  save(input: { id: string | null; name: string; content: string; appProperties: Record<string, string> }): Promise<RemoteFile>;
  remove(id: string): Promise<void>;
}

/** Returns a current access token; `refresh` asks for a new one after a 401. */
export type TokenProvider = (options?: { refresh?: boolean }) => Promise<string>;

interface DriveFileJson {
  id: string;
  modifiedTime?: string;
  size?: string;
  appProperties?: Record<string, string>;
}

function toRemoteFile(json: DriveFileJson): RemoteFile {
  return {
    id: json.id,
    modifiedTime: json.modifiedTime ?? null,
    size: json.size ? Number(json.size) : null,
    appProperties: json.appProperties ?? {},
  };
}

interface DriveErrorJson {
  error?: {
    errors?: { reason?: string }[];
    message?: string;
    details?: { reason?: string }[];
  };
}

async function errorFor(response: Response): Promise<CloudError> {
  let reason = '';
  let message = '';
  let details: string[] = [];
  try {
    const body = (await response.json()) as DriveErrorJson;
    reason = body.error?.errors?.[0]?.reason ?? '';
    message = body.error?.message ?? '';
    details = (body.error?.details ?? []).map((detail) => detail.reason ?? '');
  } catch {
    // Not JSON; the status code is all there is.
  }
  if (response.status === 401) return new CloudError('auth');
  // The Cloud project's Drive API is off: "accessNotConfigured" / "SERVICE_DISABLED".
  if (
    response.status === 403 &&
    (reason === 'accessNotConfigured' || details.includes('SERVICE_DISABLED') || /has not been used|is disabled/i.test(message))
  ) {
    return new CloudError('api-disabled');
  }
  reason ||= message;
  if (response.status === 403 && /quota/i.test(reason)) return new CloudError('quota');
  if (response.status === 403) return new CloudError('permission', reason || undefined);
  if (response.status === 404) return new CloudError('corrupt', 'file not found');
  return new CloudError('unknown', `Drive ${response.status}${reason ? `: ${reason}` : ''}`);
}

export function buildMultipartBody(boundary: string, metadata: object, content: string): string {
  return (
    `--${boundary}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    'Content-Type: application/json\r\n\r\n' +
    `${content}\r\n` +
    `--${boundary}--`
  );
}

export function createDriveStore(getToken: TokenProvider, fetchImpl: typeof fetch = fetch): CloudFileStore {
  /** One request, retried once with a fresh token if Google says the old one expired. */
  async function request(url: string, init: RequestInit = {}, allowMissing = false): Promise<Response> {
    const send = async (token: string) => {
      try {
        return await fetchImpl(url, {
          ...init,
          headers: { ...(init.headers as Record<string, string> | undefined), Authorization: `Bearer ${token}` },
        });
      } catch {
        throw new CloudError('offline');
      }
    };

    let response = await send(await getToken());
    if (response.status === 401) response = await send(await getToken({ refresh: true }));
    if (!response.ok && !(allowMissing && response.status === 404)) throw await errorFor(response);
    return response;
  }

  return {
    async find(name) {
      const query = `name = '${name.replace(/'/g, "\\'")}' and trashed = false`;
      const url =
        `${API}?spaces=appDataFolder&pageSize=10&orderBy=modifiedTime desc` +
        `&q=${encodeURIComponent(query)}&fields=${encodeURIComponent(`files(${FIELDS})`)}`;
      const response = await request(url);
      const body = (await response.json()) as { files?: DriveFileJson[] };
      const first = body.files?.[0];
      return first ? toRemoteFile(first) : null;
    },

    async download(id) {
      const response = await request(`${API}/${encodeURIComponent(id)}?alt=media`);
      return response.text();
    },

    async save({ id, name, content, appProperties }) {
      const boundary = `clayhabit-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
      // `parents` can only be set on create; an update keeps the file where it is.
      const metadata = id
        ? { name, mimeType: 'application/json', appProperties }
        : { name, mimeType: 'application/json', parents: ['appDataFolder'], appProperties };
      const url = id
        ? `${UPLOAD_API}/${encodeURIComponent(id)}?uploadType=multipart&fields=${FIELDS}`
        : `${UPLOAD_API}?uploadType=multipart&fields=${FIELDS}`;
      const response = await request(url, {
        method: id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
        body: buildMultipartBody(boundary, metadata, content),
      });
      return toRemoteFile((await response.json()) as DriveFileJson);
    },

    async remove(id) {
      // Already gone is as good as deleted.
      await request(`${API}/${encodeURIComponent(id)}`, { method: 'DELETE' }, true);
    },
  };
}
