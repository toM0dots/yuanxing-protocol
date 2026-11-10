from pathlib import Path
import numpy as np,json,time
from scipy.ndimage import zoom,gaussian_filter,distance_transform_edt,map_coordinates
P=Path(__file__).resolve().parent/'world_v2';N=4097;STEP=250.;HALF=512000.
rng=np.random.default_rng(7091);axis=np.linspace(-512,512,N,dtype=np.float32);X=axis[None,:];Y=axis[:,None]
def smooth(a):a=np.clip(a,0,1);return a*a*(3-2*a)
def vn(cells):
 a=rng.uniform(-1,1,(cells+1,cells+1)).astype('f');return zoom(a,(N/(cells+1),N/(cells+1)),order=3 if cells<64 else 1,prefilter=cells<64).astype('f')[:N,:N]
print('Creating 4097 x 4097 terrain fields',flush=True)
broad=vn(12);medium=vn(48);fine=vn(180);micro=vn(700)
west=np.exp(-((X+245-32*np.sin(Y/90)-14*np.sin(Y/31))/64)**2)*np.exp(-((Y-70)/390)**6)
north=np.exp(-((Y-340-23*np.sin(X/80))/65)**2)
east=np.exp(-((X-330-25*np.sin(Y/76))/60)**2)*np.exp(-((Y+95)/300)**4)
ridges=(1-np.minimum(1,abs(.66*medium+.34*fine)*1.9))**2
H=(320+180*broad+75*medium+30*fine+8*micro+(4600*west+5500*north+3500*east)*(.15+.85*ridges)).astype('f')
# Southwestern dune erg, south grasslands, eastern calderas.
erg=np.exp(-((X+155)/180)**4-((Y+190)/140)**4)
H+=erg*(65*(.5+.5*np.sin(X*.8+Y*.21+medium*3))**3+35*fine)
vol=np.exp(-((X-350)/90)**2-((Y+100)/150)**2)
for cx,cy,r in [(355,-110,30),(320,-215,20),(390,-20,25)]:
 d=np.sqrt((X-cx)**2+(Y-cy)**2);H+=850*np.exp(-((d-r)/8)**2)-350*np.exp(-(d/(r*.65))**4)
# Salt basin and glacial lake, with natural irregular shores.
lake=np.sqrt(((X-190)/64)**2+((Y-132)/43)**2)+.12*medium
lakew=smooth((1.25-lake)/.35);H=H*(1-lakew)+(-65+15*fine)*lakew
salt=np.sqrt(((X+340)/110)**2+((Y+320)/80)**2)+.12*medium
saltw=smooth((1.3-salt)/.4);H=H*(1-saltw)+(30+5*fine)*saltw
# Rivers have decreasing bed profiles and real carved floodplains.
rivers=[('Glacier river',[(-130,335,2000),(-110,275,1300),(-60,210,800),(15,165,400),(90,145,100),(150,135,-30)]),('Western river',[(-280,180,1700),(-325,110,900),(-360,20,500),(-350,-100,200),(-340,-240,20)]),('Eastern meltwater',[(270,340,1800),(295,285,950),(280,220,420),(245,165,80),(220,140,-30)]),('Southern river',[(300,-260,600),(240,-300,390),(160,-340,240),(80,-390,110),(-10,-450,20),(-90,-512,-30)]),('Northwest tributary',[(-210,270,2100),(-160,250,1500),(-110,275,1300)]),('Steppe tributary',[(80,-200,480),(120,-260,350),(160,-340,240)])]
water=np.full((N,N),-10000,dtype='f');river_records=[]
for name,pts in rivers:
 samples=[]
 for a,b in zip(pts[:-1],pts[1:]):
  a=np.array(a);b=np.array(b);length=np.linalg.norm(b[:2]-a[:2]);count=max(2,int(length/.4))
  for t in np.linspace(0,1,count):samples.append((a+(b-a)*t).tolist())
 mask=np.ones((N,N),dtype='bool');bed=np.zeros((N,N),dtype='f')
 for x,y,z in samples:
  i=int(np.clip(round((x+512)*4),0,N-1));j=int(np.clip(round((y+512)*4),0,N-1));mask[j,i]=False;bed[j,i]=z
 dist,indices=distance_transform_edt(mask,return_indices=True);nearest=bed[indices[0],indices[1]];del indices,mask,bed
 flood=smooth((6500-dist*250)/5500).astype('f');target=nearest+np.minimum(500,(dist*250/5000)**1.5*180)
 H=H*(1-flood)+np.minimum(H,target)*flood
 channel=smooth((1000-dist*250)/650).astype('f');H=H*(1-channel)+(nearest-14)*channel
 wet=dist<2.6;water[wet]=np.maximum(water[wet],nearest[wet]-2)
 river_records.append({'name':name,'samples_km_m':samples})
 del dist,nearest,flood,target,channel,wet
 print('Carved',name,flush=True)
water[lake<1.01]=np.maximum(water[lake<1.01],-15)
# 10 conservative thermal weathering iterations relax extreme raster ridges.
for _ in range(10):
 for ax in [0,1]:
  a=[slice(None),slice(None)];b=a.copy();a[ax]=slice(None,-1);b[ax]=slice(1,None);a=tuple(a);b=tuple(b)
  diff=H[a]-H[b];transfer=np.sign(diff)*np.maximum(abs(diff)-200,0)*.14;H[a]-=transfer;H[b]+=transfer
# Keep the origin compatible with the original canyon. Local detailing is added by Blender.
D=np.sqrt(X*X+Y*Y);fade=smooth((D-2)/12);H*=fade
water[D<12]=-10000
# Climate and surface classification with irregular boundaries and slope-dependent stone/snow.
gy,gx=np.gradient(H,250);slope=np.sqrt(gx*gx+gy*gy)
moist=vn(9);snow=smooth((Y+medium*50-250)/100);snow=np.maximum(snow,smooth((H-2500)/1100))
forest=smooth((-Y+medium*50-100)/160)*smooth((X+medium*40+170)/100)
climate=np.zeros_like(H,dtype='uint8');climate[forest>.35]=4;climate[saltw>.3]=5;climate[vol>.16]=3;climate[slope>.40]=1;climate[snow>.45]=2;climate[(water>H)&(water>-999)]=6
# Smooth point colours remove the previous rectangular material boundaries.
colors=np.zeros((N,N,3),dtype='f');colors[:]=[.34,.23,.12]
def mix(target,w):
 global colors
 colors=colors*(1-w[...,None])+np.array(target,dtype='f')*w[...,None]
mix([.17,.24,.12],forest*.85);mix([.59,.55,.44],saltw);mix([.085,.075,.065],vol*.9)
mix([.28,.27,.245],smooth((slope-.18)/.35)*.8);mix([.72,.79,.80],snow)
colors*=np.clip(1+fine[...,None]*.12+micro[...,None]*.035,.7,1.3)
np.savez_compressed(P/'terrain_fields.npz',height=H.astype('f'),water=water,climate=climate,color=(np.clip(colors,0,1)*255).astype('uint8'))
regions=[('Dune Sea',-160000,-90000),('Salt Basin',-330000,-290000),('Western Divide',-300000,80000),('Glacier Gate',-130000,330000),('Ice Shelf',180000,400000),('Lake Shore',260000,140000),('Caldera',360000,-100000),('Southern Steppe',160000,-350000)]
info={'extent_m':1024000,'sampling_m':250,'resolution':N,'seed':7091,'tiles':256,'regions':[{'name':a,'center_m':[x,y]} for a,x,y in regions],'rivers':river_records,'height_min_m':float(H.min()),'height_max_m':float(H.max()),'finite':bool(np.isfinite(H).all()),'water_cells':int((water>-999).sum()),'note':'250m continental geometry plus procedural sub-grid terrain; regional meshes are assembled by build_terrain_v2.py.'}
(P/'terrain_manifest.json').write_text(json.dumps(info,indent=2));print('FIELDS_COMPLETE',H.min(),H.max(),flush=True)
