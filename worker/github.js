import {HttpError,base64,unbase64} from './security.js';
export const REPO='chief-teef/baby-teeth',REPO_ID=1416133666,OWNER_ID=341668853;
export const postPath=id=>`content/posts/${id}.json`;
export async function github(token,path,{method='GET',body,fetcher=fetch}={}){
  const response=await fetcher(`https://api.github.com${path}`,{method,headers:{Accept:'application/vnd.github+json',Authorization:`Bearer ${token}`,'User-Agent':'Baby-Teeth-Studio','X-GitHub-Api-Version':'2022-11-28',...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  if(!response.ok){if(response.status===401)throw new HttpError(401,'GitHub sign-in expired. Sign in again; your local work is safe.');if(response.status===403||response.status===429)throw new HttpError(503,'GitHub denied or rate-limited this operation. Retry later; local work is safe.');if(response.status===404)throw new HttpError(404,'Repository entry not found.');throw new HttpError(response.status===422||response.status===409?409:502,response.status===422||response.status===409?'The repository changed while saving. Reload the latest entry before retrying.':'GitHub could not complete this operation.');}
  return response.status===204?null:response.json();
}
export async function verifyRepository(token,fetcher){const repo=await github(token,`/repos/${REPO}`,{fetcher});if(repo.id!==REPO_ID||!repo.permissions?.push)throw new HttpError(403,'This account cannot write to the fixed blog repository.');}
export async function snapshot(token,fetcher){
  const ref=await github(token,`/repos/${REPO}/git/ref/heads/main`,{fetcher});const commit=await github(token,`/repos/${REPO}/git/commits/${ref.object.sha}`,{fetcher});const tree=await github(token,`/repos/${REPO}/git/trees/${commit.tree.sha}?recursive=1`,{fetcher});if(tree.truncated)throw new HttpError(503,'Repository is too large for a safe save. Export a backup and contact the maintainer.');return {head:ref.object.sha,tree:commit.tree.sha,entries:tree.tree};
}
export async function readPost(token,id,fetcher){const file=await github(token,`/repos/${REPO}/contents/${postPath(id)}?ref=main`,{fetcher});const doc=JSON.parse(new TextDecoder().decode(unbase64(file.content.replace(/\s/g,''))));return {post:doc,revision:file.sha};}
export async function readIndex(token,state,fetcher){if(!state.entries.some(e=>e.path==='content/index.json'))return {};const file=await github(token,`/repos/${REPO}/contents/content/index.json?ref=${state.head}`,{fetcher});return JSON.parse(new TextDecoder().decode(unbase64(file.content.replace(/\s/g,''))));}
export async function commitPost(token,state,doc,assets,fetcher,index={}){
  const nextIndex={...index,[doc.id]:{title:doc.title,status:doc.status,updatedAt:doc.updatedAt,publishedAt:doc.publishedAt}};
  const tree=await github(token,`/repos/${REPO}/git/trees`,{method:'POST',body:{base_tree:state.tree,tree:[{path:postPath(doc.id),mode:'100644',type:'blob',content:JSON.stringify(doc)},{path:'content/index.json',mode:'100644',type:'blob',content:JSON.stringify(nextIndex)},...assets.map(a=>({path:a.path,mode:'100644',type:'blob',sha:a.sha}))]},fetcher});
  const commit=await github(token,`/repos/${REPO}/git/commits`,{method:'POST',body:{message:`${doc.status==='published'?'Publish':'Save draft'}: ${doc.title||'Untitled entry'}`,tree:tree.sha,parents:[state.head]},fetcher});
  // Never force the ref. A competing save creates a sibling commit and the
  // non-fast-forward update fails instead of overwriting it.
  await github(token,`/repos/${REPO}/git/refs/heads/main`,{method:'PATCH',body:{sha:commit.sha,force:false},fetcher});
  const file=await github(token,`/repos/${REPO}/contents/${postPath(doc.id)}?ref=${commit.sha}`,{fetcher});
  return {revision:file.sha,commit:commit.sha};
}
