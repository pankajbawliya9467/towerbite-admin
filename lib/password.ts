import { api } from './api';

/** Asks for a new password (twice) and sets it with `path`. The person is logged out everywhere. */
export async function newPassword(who: string, path: string) {
  const pw = prompt(`New password for ${who} (at least 8 characters). They will be logged out everywhere.`);
  if (pw == null) return false;
  if (pw.length < 8) return alert('The password needs at least 8 characters.'), false;
  if (prompt('Type the new password again') !== pw) return alert('The two passwords are not the same.'), false;
  try {
    await api.post(path, { password: pw });
    alert(`Done. Share the new password with ${who} privately.`);
    return true;
  } catch (e) {
    alert((e as Error).message);
    return false;
  }
}
