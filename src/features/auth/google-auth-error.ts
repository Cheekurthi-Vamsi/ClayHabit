/** Why a Google sign-in didn't end in a session; `cancelled` means the person backed out. */
export class GoogleAuthError extends Error {
  constructor(
    message: string,
    readonly cancelled = false,
  ) {
    super(message);
    this.name = 'GoogleAuthError';
  }
}
