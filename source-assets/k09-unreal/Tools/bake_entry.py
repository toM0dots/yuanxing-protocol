"""Load only the saved K09 world and build its static lighting."""
import sys, traceback
from pathlib import Path
import unreal as u

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'Tools'))
u.EditorPythonScripting.set_keep_python_script_alive(True)
u.EditorLoadingAndSavingUtils.load_map('/Game/K09/Maps/K09_Demo')
import review_k09
actors=u.get_editor_subsystem(u.EditorActorSubsystem).get_all_level_actors()
for actor in actors:
    if actor.get_actor_label()=='ReferenceApproach':
        eye=u.Vector(4100,13500,2400);target=u.Vector(-2000,-7000,3800)
        rotation=u.MathLibrary.find_look_at_rotation(eye,target)
        actor.set_actor_location_and_rotation(eye,rotation,False,True)
        u.get_editor_subsystem(u.UnrealEditorSubsystem).set_level_viewport_camera_info(eye,rotation)
    if actor.get_actor_label()=='K09_WalkableCollision':
        actor.set_is_temporarily_hidden_in_editor(True)
u.EditorLoadingAndSavingUtils.save_dirty_packages(True,True)
try:
    review_k09.bake()
except Exception:
    u.log_error(traceback.format_exc())
exec(compile((ROOT/'Tools/inspect_scene.py').read_text(),str(ROOT/'Tools/inspect_scene.py'),'exec'))
