import {spawnSync} from 'node:child_process';
// Credential Manager supplies the existing authorized development credential.
// Never print it or persist it in a file.
const result=spawnSync('git',['credential','fill'],{input:'protocol=https\nhost=github.com\n\n',encoding:'utf8'});
if(result.status!==0)throw Error('GitHub development authentication unavailable.');
const token=result.stdout.split('\n').find(line=>line.startsWith('password='))?.slice(9).trim();
if(!token)throw Error('No GitHub development credential available.');
const repo='chief-teef/baby-teeth';
async function api(path,method='GET',body){const r=await fetch(`https://api.github.com/repos/${repo}${path}`,{method,headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','Content-Type':'application/json','X-GitHub-Api-Version':'2022-11-28'},...(body?{body:JSON.stringify(body)}:{})});if(!r.ok)throw Error(`GitHub ${method} ${path}: HTTP ${r.status}`);return r.status===204?null:r.json();}
if(process.argv[2]==='status'){
  const runs=await api('/actions/workflows/publish.yml/runs?per_page=1');
  console.log(JSON.stringify(runs.workflow_runs.map(r=>({status:r.status,conclusion:r.conclusion,url:r.html_url,sha:r.head_sha}))));
}else{
  const current=await api('/actions/variables/BLOG_PUBLISHING_ENABLED').catch(()=>null);
  await api('/actions/variables'+(current?'/BLOG_PUBLISHING_ENABLED':''),current?'PATCH':'POST',{name:'BLOG_PUBLISHING_ENABLED',value:'true'});
  await api('/pages','PUT',{build_type:'workflow'});
  await api('/actions/workflows/publish.yml/dispatches','POST',{ref:'main'});
  console.log('Public blog workflow enabled and dispatched.');
}
