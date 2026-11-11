import './exo-room-story-data.js?v=20261110-props1';
const data=globalThis.ExoRoomStoryData;
export const ROOM_STORIES=data.stories;
export const STORY_KINDS=data.kinds;
export const ROOM_OBJECTS=data.sizes;
export const ROOM_MOMENTS=data.moments;
export const storyFamily=data.family;
export function storyFor(siteId,index){return ROOM_STORIES[siteId]?.[index]||null;}
export function roomStorySlots(siteId,deck,room){
 const moment=room.moment;if(!moment)return [];
 return [...deck.props,...(deck.dressing||[])].filter(p=>p.room===room.id&&p.kind==='story').map(p=>({p,kind:moment.kind,fragment:p.asset,state:p.state,family:moment.family,index:deck.level*2+(room.id===6?1:0),role:p.role,yaw:p.yaw||0}));
}
