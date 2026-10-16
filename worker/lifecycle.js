import {HttpError} from './security.js';
import {validatePost} from '../shared/document.js';

// Restoration never republishes: the owner reviews the restored entry first.
export function transitionEntry(previous, action, now, userId) {
  if (!previous) throw new HttpError(404, 'Entry not found.');
  try{validatePost(previous);}catch(error){throw new HttpError(400,error.message);}
  if (action === 'trash') {
    if (previous.status === 'trashed') throw new HttpError(409, 'Entry is already in trash.');
    return {...previous, status:'trashed', trashedAt:now, previousStatus:previous.status, updatedAt:now, updatedBy:userId};
  }
  if (action === 'restore') {
    if (previous.status !== 'trashed') throw new HttpError(409, 'Entry is not in trash.');
    const restored = {...previous, status:'draft', updatedAt:now, updatedBy:userId};
    delete restored.trashedAt;
    delete restored.previousStatus;
    return restored;
  }
  throw new HttpError(400, 'Unknown entry action.');
}
