import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateSettings} from '../shared/settings.js';
const valid={repository:'another-owner/journal',repositoryId:123,ownerId:456,branch:'release/blog',publicUrl:'https://example.org/journal/',title:'Another journal',tagline:''};
test('independent deployments accept custom domains and nested branches',()=>{
  assert.deepEqual(validateSettings(valid),valid);
  assert.equal(validateSettings({...valid,publicUrl:'https://example.org/'}).publicUrl,'https://example.org/');
});
test('unsafe or incomplete deployment identities fail closed',()=>{
  for(const change of [{repository:'../journal'},{repository:'owner/name/extra'},{ownerId:0},{repositoryId:'123'},{publicUrl:'http://example.org/'},{publicUrl:'https://user:secret@example.org/'},{publicUrl:'https://example.org/?token=secret'},{publicUrl:'https://example.org/blog'},{branch:'../main'},{branch:'main.lock'},{branch:'release//main'},{title:''}]){
    assert.throws(()=>validateSettings({...valid,...change}),JSON.stringify(change));
  }
});
