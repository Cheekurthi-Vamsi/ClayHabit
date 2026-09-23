import { createDriveStore } from '../drive-client';

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  } as Response;
}

describe('Drive client', () => {
  it('looks only in the hidden app folder', async () => {
    const fetchMock = jest.fn(async () => jsonResponse(200, { files: [{ id: 'f1', appProperties: { snapshotId: 's' } }] }));
    const store = createDriveStore(async () => 'token', fetchMock as unknown as typeof fetch);

    const file = await store.find("clayhabit-user's.cloud.json");

    expect(file).toEqual({ id: 'f1', modifiedTime: null, size: null, appProperties: { snapshotId: 's' } });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain('spaces=appDataFolder');
    expect(decodeURIComponent(url)).toContain("name = 'clayhabit-user\\'s.cloud.json' and trashed = false");
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer token');
  });

  it('creates new files inside appDataFolder and updates existing ones in place', async () => {
    const fetchMock = jest.fn(async () => jsonResponse(200, { id: 'f9' }));
    const store = createDriveStore(async () => 'token', fetchMock as unknown as typeof fetch);

    await store.save({ id: null, name: 'a.json', content: '{"data":"x"}', appProperties: { k: 'v' } });
    await store.save({ id: 'f9', name: 'a.json', content: '{"data":"y"}', appProperties: { k: 'w' } });

    const [createUrl, create] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(createUrl).toContain('/upload/drive/v3/files?uploadType=multipart');
    expect(create.method).toBe('POST');
    expect(create.body).toContain('"parents":["appDataFolder"]');
    expect(create.body).toContain('{"data":"x"}');

    const [updateUrl, update] = fetchMock.mock.calls[1] as unknown as [string, RequestInit];
    expect(updateUrl).toContain('/files/f9?uploadType=multipart');
    expect(update.method).toBe('PATCH');
    expect(update.body).not.toContain('parents');
  });

  it('retries once with a fresh token after a 401', async () => {
    const tokens = jest.fn(async (options?: { refresh?: boolean }) => (options?.refresh ? 'fresh' : 'stale'));
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, {}))
      .mockResolvedValueOnce(jsonResponse(200, 'envelope'));
    const store = createDriveStore(tokens, fetchMock as unknown as typeof fetch);

    await expect(store.download('f1')).resolves.toBe('envelope');
    expect(tokens).toHaveBeenLastCalledWith({ refresh: true });
    expect((fetchMock.mock.calls[1][1].headers as Record<string, string>).Authorization).toBe('Bearer fresh');
  });

  it('turns failures into Cloud errors people can act on', async () => {
    const quota = createDriveStore(
      async () => 't',
      (async () => jsonResponse(403, { error: { errors: [{ reason: 'storageQuotaExceeded' }] } })) as unknown as typeof fetch,
    );
    await expect(quota.find('x')).rejects.toMatchObject({ code: 'quota' });

    const apiOff = createDriveStore(
      async () => 't',
      (async () =>
        jsonResponse(403, {
          error: {
            message: 'Google Drive API has not been used in project 123 before or it is disabled.',
            errors: [{ reason: 'accessNotConfigured' }],
            details: [{ reason: 'SERVICE_DISABLED' }],
          },
        })) as unknown as typeof fetch,
    );
    await expect(apiOff.find('x')).rejects.toMatchObject({ code: 'api-disabled' });

    const scope = createDriveStore(
      async () => 't',
      (async () => jsonResponse(403, { error: { errors: [{ reason: 'insufficientPermissions' }] } })) as unknown as typeof fetch,
    );
    await expect(scope.find('x')).rejects.toMatchObject({ code: 'permission' });

    const offline = createDriveStore(
      async () => 't',
      (async () => {
        throw new TypeError('Network request failed');
      }) as unknown as typeof fetch,
    );
    await expect(offline.find('x')).rejects.toMatchObject({ code: 'offline' });
  });

  it('treats deleting a file that is already gone as done', async () => {
    const store = createDriveStore(async () => 't', (async () => jsonResponse(404, {})) as unknown as typeof fetch);
    await expect(store.remove('gone')).resolves.toBeUndefined();
  });
});
