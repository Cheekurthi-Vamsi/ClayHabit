import { Redirect } from 'expo-router';

/**
 * Any path the app doesn't know (a stale deep link, an auth redirect) goes
 * straight home rather than to a dead end.
 */
export default function NotFoundScreen() {
  return <Redirect href="/" />;
}
