"""Keep the authored K09 equipment; retire the geological sheet and its floor.
The source GLB remains archival. Repack only buffer views used by retained meshes.
"""
import json,struct,hashlib
from pathlib import Path
base=Path(__file__).resolve().parents[1]
source=base/'dist/assets/canyon-v2/canyon-authored.glb';raw=source.read_bytes();length=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+length]);binary=raw[28+length:]
retired={'floor','massif','ridge','talus'};keep=[i for i,n in enumerate(doc['nodes']) if n.get('name') not in retired];node_map={old:new for new,old in enumerate(keep)}
meshes=sorted({doc['nodes'][i]['mesh'] for i in keep if 'mesh' in doc['nodes'][i]});mesh_map={old:new for new,old in enumerate(meshes)}
accessors=set()
for i in meshes:
 for p in doc['meshes'][i]['primitives']:accessors.update(p['attributes'].values());accessors.add(p['indices'])
accessors=sorted(accessors);access_map={old:new for new,old in enumerate(accessors)}
views=sorted({doc['accessors'][i]['bufferView'] for i in accessors});view_map={old:new for new,old in enumerate(views)};packed=bytearray();new_views=[]
for i in views:
 v=dict(doc['bufferViews'][i]);old=v.get('byteOffset',0);packed+=b'\0'*((-len(packed))%4);v['byteOffset']=len(packed);packed+=binary[old:old+v['byteLength']];new_views.append(v)
doc['nodes']=[doc['nodes'][i] for i in keep]
for n in doc['nodes']:
 if 'mesh' in n:n['mesh']=mesh_map[n['mesh']]
 if 'children' in n:n['children']=[node_map[c] for c in n['children'] if c in node_map]
for scene in doc['scenes']:scene['nodes']=[node_map[i] for i in scene['nodes'] if i in node_map]
doc['meshes']=[doc['meshes'][i] for i in meshes]
for m in doc['meshes']:
 for p in m['primitives']:p['attributes']={k:access_map[i] for k,i in p['attributes'].items()};p['indices']=access_map[p['indices']]
doc['accessors']=[doc['accessors'][i] for i in accessors]
for a in doc['accessors']:a['bufferView']=view_map[a['bufferView']]
doc['bufferViews']=new_views;doc['buffers']=[{'byteLength':len(packed)}];doc['asset']['generator']='ECHO-9 v87 / K09 equipment, shared continuous terrain'
j=json.dumps(doc,separators=(',',':')).encode();j+=b' '*((-len(j))%4);packed+=b'\0'*((-len(packed))%4)
out=base/'dist/assets/canyon-v2/canyon-equipment-v87.glb';out.write_bytes(struct.pack('<III',0x46546c67,2,28+len(j)+len(packed))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(packed),0x004e4942)+packed)
report={'source':source.name,'source_sha256':hashlib.sha256(raw).hexdigest(),'retired':sorted(retired),'retained':[n['name'] for n in doc['nodes']],'source_bytes':len(raw),'runtime_bytes':out.stat().st_size,'collision':'ExoWorld continuous terrain and building proxies; obsolete massif/talus/roof fields disabled'}
out.with_suffix('.json').write_text(json.dumps(report,indent=2));print(json.dumps(report))
