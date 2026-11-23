/**
 * Two questions before anything is deleted, so a slip of the mouse can't remove data.
 * Returns true only when both are answered "OK".
 */
export function confirmDelete(what: string, detail = ''): boolean {
  if (!window.confirm(`Delete ${what}?${detail ? `\n\n${detail}` : ''}`)) return false;
  return window.confirm(`Are you sure? ${what} will be deleted for good.\n\nThis can't be undone.`);
}
