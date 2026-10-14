// Shared by the editor, public build, and saving service. Invalid deployment
// identity must fail before serving content or accepting repository writes.
export function validateSettings(settings) {
  if (!settings || typeof settings !== 'object') throw Error('Blog settings are required.');
  if (!/^[A-Za-z0-9][A-Za-z0-9-]*\/[A-Za-z0-9_.-]+$/.test(settings.repository || '') || settings.repository.split('/').some(p => p === '.' || p === '..')) throw Error('repository must be owner/name.');
  for (const key of ['repositoryId', 'ownerId']) {
    if (!Number.isSafeInteger(settings[key]) || settings[key] <= 0) throw Error(`${key} must be a positive GitHub ID.`);
  }
  const branch = settings.branch;
  if (typeof branch !== 'string' || !branch || /[\s~^:?*\[\\]/.test(branch) || branch.includes('..') || branch.includes('@{') || branch.includes('//') || branch.startsWith('/') || branch.endsWith('/') || branch.endsWith('.') || branch.split('/').some(p => p.startsWith('.') || p.endsWith('.lock'))) throw Error('branch must be a valid Git branch name.');
  let url;
  try { url = new URL(settings.publicUrl); } catch { throw Error('publicUrl must be an HTTPS URL.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || !url.pathname.endsWith('/')) throw Error('publicUrl must be HTTPS with a trailing slash and no credentials, query, or fragment.');
  for (const key of ['title', 'tagline']) {
    if (typeof settings[key] !== 'string' || (key === 'title' && !settings[key].trim())) throw Error(`${key} must be text${key === 'title' ? ' with a nonempty title' : ''}.`);
  }
  return Object.freeze({...settings});
}
