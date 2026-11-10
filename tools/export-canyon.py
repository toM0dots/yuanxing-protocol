"""Export the actual authored Canyon V2 mesh data and matching navigation grids.

No embedded Blender scripts are executed. Main landforms have no modifiers.
Only the ground is resampled (every second original grid vertex). Small equipment
bevel modifiers are omitted; Cycles-only materials are adapted by the renderer.
"""
import argparse, hashlib, json, math, runpy, struct
from pathlib import Path
import numpy as np
from scipy.ndimage import distance_transform_edt
from scipy.spatial.transform import Rotation

Blend = runpy.run_path(str(Path(__file__).with_name('blend-reader.py')))['Blend']
ap=argparse.ArgumentParser();ap.add_argument('source');ap.add_argument('--out',default='dist/assets/canyon-v2');args=ap.parse_args()
out=Path(args.out);out.mkdir(parents=True,exist_ok=True);b=Blend(args.source)

def layers(mesh, key):
    cd=mesh.get(key);first=cd.ptr('layers');result={}
    for i in range(cd.get('totlayer')):
        item=type(first)(b,first.offset+i*b.layouts[first.type][1],first.type)
        result[item.get('name')]=item.get('data')
    return result

def mesh_data(mesh):
    v=np.array(b.array(layers(mesh,'vdata')['position'],'f',mesh.get('totvert')*3)).reshape(-1,3)
    corners=b.array(layers(mesh,'ldata')['.corner_vert'],'i',mesh.get('totloop'))
    offsets=b.array(mesh.get('poly_offset_indices'),'i',mesh.get('totpoly')+1)
    faces=[]
    for start,end in zip(offsets,offsets[1:]):
        face=corners[start:end]
        faces.extend((face[0],face[i],face[i+1]) for i in range(1,len(face)-1))
    return v,np.array(faces,dtype=np.uint32)

selected=[]
for col in b.objects('GR'):
    if col.name()[:2] not in ('01','02','03','05'):continue
    link=col.get('gobject').get('first')
    while link:
        item=b.object(link);o=item.ptr('ob');link=item.get('next')
        if o.get('type')==1:selected.append(o)

buckets={};originals={};source_counts={};rocks=[];omitted=[]
for o in selected:
    mesh=o.ptr('data');v,f=mesh_data(mesh)
    mat=b.object(b.array(mesh.get('mat'),'Q',mesh.get('totcol'))[0]);matname=mat.name()
    group='floor' if o.name().startswith('01 |') else 'massif' if o.name().startswith('02 |') else 'ridge' if o.name().startswith('03 |') else 'talus' if o.name().startswith('Talus') else matname
    rot=Rotation.from_euler('xyz',o.get('rot')).as_matrix()
    v=(v*np.array(o.get('size')))@rot.T+np.array(o.get('loc'))
    source_counts[group]=source_counts.get(group,0)+len(f)
    if group in ('floor','massif','ridge'):originals[group]=(v.copy(),f.copy())
    if group=='floor':
        grid=v.reshape(251,241,3)[::2,::2];ny,nx=grid.shape[:2];v=grid.reshape(-1,3);f=[]
        for j in range(ny-1):
            for i in range(nx-1):
                a=j*nx+i;f.extend([(a,a+1,a+nx+1),(a,a+nx+1,a+nx)])
        f=np.array(f,dtype=np.uint32)
    if o.get('modifiers').get('first'):omitted.append(o.name())
    if group=='talus' and np.ptp(v[:,2])>1.0:
        center=(v.min(0)+v.max(0))/2;rocks.append([round(float(center[0]),3),round(float(center[1]),3),round(float(max(np.ptp(v[:,0]),np.ptp(v[:,1]))*.5),3)])
    # Preserve faceted small rocks and manufactured edges.
    if group not in ('floor','massif','ridge'):
        v=v[f].reshape(-1,3);f=np.arange(len(v),dtype=np.uint32).reshape(-1,3)
    bucket=buckets.setdefault(group,dict(vertices=[],faces=[],count=0,material=mat))
    bucket['vertices'].append(v);bucket['faces'].append(f+bucket['count']);bucket['count']+=len(v)

doc={'asset':{'version':'2.0','generator':'ECHO9 direct Blender mesh export'},'scene':0,'scenes':[{'nodes':[]}],'nodes':[],'meshes':[],'materials':[],'accessors':[],'bufferViews':[],'buffers':[]}
binary=bytearray();stats={}
def access(data,typ,component,target):
    while len(binary)%4:binary.append(0)
    data=np.ascontiguousarray(data);offset=len(binary);raw=data.tobytes();binary.extend(raw)
    view=len(doc['bufferViews']);doc['bufferViews'].append({'buffer':0,'byteOffset':offset,'byteLength':len(raw),'target':target})
    idx=len(doc['accessors']);a={'bufferView':view,'componentType':component,'count':len(data),'type':typ}
    if typ=='VEC3':a.update(min=data.min(axis=0).astype(float).tolist(),max=data.max(axis=0).astype(float).tolist())
    doc['accessors'].append(a);return idx
for name,bucket in buckets.items():
    v=np.concatenate(bucket['vertices']);f=np.concatenate(bucket['faces']);v=v[:,[0,2,1]];v[:,2]*=-1
    normal=np.cross(v[f[:,1]]-v[f[:,0]],v[f[:,2]]-v[f[:,0]]);n=np.zeros_like(v)
    for i in range(3):np.add.at(n,f[:,i],normal)
    n/=np.maximum(np.linalg.norm(n,axis=1)[:,None],1e-12)
    mat=bucket['material'];material={'name':name,'pbrMetallicRoughness':{'baseColorFactor':[mat.get(k) for k in ['r','g','b']]+[1],'roughnessFactor':mat.get('roughness'),'metallicFactor':mat.get('metallic')},'doubleSided':True}
    if 'guidance' in name:material['emissiveFactor']=[.08,.65,.75]
    doc['materials'].append(material);ix=len(doc['meshes']);doc['meshes'].append({'name':name,'primitives':[{'attributes':{'POSITION':access(v.astype('<f4'),'VEC3',5126,34962),'NORMAL':access(n.astype('<f4'),'VEC3',5126,34962)},'indices':access(f.flatten().astype('<u4'),'SCALAR',5125,34963),'material':ix}]});doc['nodes'].append({'mesh':ix,'name':name});doc['scenes'][0]['nodes'].append(ix);stats[name]={'vertices':len(v),'triangles':len(f)}
doc['buffers']=[{'byteLength':len(binary)}];j=json.dumps(doc,separators=(',',':')).encode();j+=b' '*((-len(j))%4);binary+=b'\0'*((-len(binary))%4)
glb=struct.pack('<III',0x46546c67,2,28+len(j)+len(binary))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(binary),0x004e4942)+binary
(out/'canyon-authored.glb').write_bytes(glb)

# Collision field is sliced from the original solid cliff and ridge meshes at
# two mech body heights. Distance and ceiling values are in Blender metres.
xmin,ymin,step=-61.,-46.,.5
xs=np.arange(xmin,66.01,step);ys=np.arange(ymin,63.01,step);xx,yy=np.meshgrid(xs,ys);blocked=np.zeros_like(xx,dtype=bool);ceiling=np.full_like(xx,999.)
for key in ('massif','ridge'):
    v,f=originals[key];tris=v[f]
    for height in (2.,6.):
        subset=tris[(tris[:,:,2].min(1)<height)&(tris[:,:,2].max(1)>height)];segments=[]
        for tri in subset:
            pts=[]
            for a,c in zip(tri,np.roll(tri,-1,axis=0)):
                if (a[2]<height)!=(c[2]<height):pts.append((a+(c-a)*((height-a[2])/(c[2]-a[2])))[:2])
            if len(pts)==2:segments.append(pts)
        seg=np.array(segments)
        for row,y in enumerate(ys):
            a,c=seg[:,0],seg[:,1];mask=(a[:,1]>y)!=(c[:,1]>y)
            aa,cc=a[mask],c[mask];hits=np.sort(aa[:,0]+(y-aa[:,1])*(cc[:,0]-aa[:,0])/(cc[:,1]-aa[:,1]))
            blocked[row]|=np.searchsorted(hits,xs,side='right')%2==1
    # Top-down triangle rasterization finds the first rock surface over head.
    for tri in tris:
        if tri[:,2].max()<6:continue
        x0=max(0,int(math.ceil((tri[:,0].min()-xmin)/step)));x1=min(len(xs)-1,int(math.floor((tri[:,0].max()-xmin)/step)))
        y0=max(0,int(math.ceil((tri[:,1].min()-ymin)/step)));y1=min(len(ys)-1,int(math.floor((tri[:,1].max()-ymin)/step)))
        if x1<x0 or y1<y0:continue
        a,c,d=tri;den=(c[1]-d[1])*(a[0]-d[0])+(d[0]-c[0])*(a[1]-d[1])
        if abs(den)<1e-10:continue
        px=xx[y0:y1+1,x0:x1+1];py=yy[y0:y1+1,x0:x1+1]
        u=((c[1]-d[1])*(px-d[0])+(d[0]-c[0])*(py-d[1]))/den;w=((d[1]-a[1])*(px-d[0])+(a[0]-d[0])*(py-d[1]))/den;t=1-u-w
        z=u*a[2]+w*c[2]+t*d[2];ok=(u>=-1e-6)&(w>=-1e-6)&(t>=-1e-6)&(z>6)
        area=ceiling[y0:y1+1,x0:x1+1];area[ok]=np.minimum(area[ok],z[ok])
field=(distance_transform_edt(~blocked)-distance_transform_edt(blocked))*step
def rle(a):
    result=[];last=None;count=0
    for v in a.flatten().tolist():
        if v==last:count+=1
        else:
            if count:result.extend([last,count])
            last=v;count=1
    result.extend([last,count]);return result
data={'floor':{'nx':nx,'ny':ny,'xmin':-70,'ymin':-60,'dx':140/(nx-1),'dy':140/(ny-1),'heights':np.round(grid[:,:,2]*1000).astype(int).flatten().tolist()},'nav':{'nx':len(xs),'ny':len(ys),'xmin':xmin,'ymin':ymin,'step':step,'clearance':rle(np.round(field*100).astype(int)),'ceiling':rle(np.minimum(ceiling*100,32767).astype(int))},'rocks':rocks}
(out/'canyon-nav.js').write_text('/* Extracted from ECHO9_Canyon_V2.blend; metres, millimetre ground, centimetre clearance. */\nconst ExoCanyonData='+json.dumps(data,separators=(',',':'))+';\nif(typeof module!=="undefined")module.exports=ExoCanyonData;\n')
report={'source':'ECHO9_Canyon_V2.blend','sha256':hashlib.sha256(Path(args.source).read_bytes()).hexdigest(),'export':'direct mesh datablocks; y-up glTF','objects':len(selected),'source_triangles':sum(source_counts.values()),'render_triangles':sum(s['triangles'] for s in stats.values()),'glb_bytes':len(glb),'meshes':stats,'omitted_equipment_bevels':len(omitted),'floor_samples':[nx,ny],'navigation_samples':[len(xs),len(ys)],'texture_source':'Packed Poly Haven CC0 scans supplied with the Blender scene'}
(out/'canyon-manifest.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
