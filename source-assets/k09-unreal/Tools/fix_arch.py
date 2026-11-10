"""Ground the arch feet in the preview and record the remaining art limitations."""
import json
from pathlib import Path
import unreal as u
ROOT=Path(__file__).resolve().parents[1]
world=u.EditorLoadingAndSavingUtils.load_map('/Game/K09/Maps/K09_RuntimePreview')
actors=u.get_editor_subsystem(u.EditorActorSubsystem).get_all_level_actors()
data=json.loads((ROOT/'SourceAssets/Prepared/scene-manifest.json').read_text())
for a in actors:
    label=a.get_actor_label()
    h=a.get_component_by_class(u.HierarchicalInstancedStaticMeshComponent)
    if not h:continue
    if label=='K09_ArchCore':
        a.modify();h.modify();t=h.get_instance_transform(0,False)
        p=t.translation;p.z=1400;t.translation=p
        assert h.update_instance_transform(0,t,False,True,True)
    if label=='K09_rock_face_01':
        entries=[x for x in data['instances'] if x['asset']=='rock_face_01']
        for index,entry in enumerate(entries):
            if entry['name'].startswith('HeroArch_'):
                a.modify();h.modify();t=h.get_instance_transform(index,False)
                p=t.translation;p.z=(entry['location_m'][2]-10)*100;t.translation=p
                assert h.update_instance_transform(index,t,False,True,True)
assert u.EditorLoadingAndSavingUtils.save_map(world,'/Game/K09/Maps/K09_RuntimePreview')
(ROOT/'Validation/arch-grounding.json').write_text(json.dumps({'status':'native arch and seven surface scans lowered 10 m to intersect the terrace; packaged visual check pending'},indent=2)+'\n')
