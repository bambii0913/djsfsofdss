export const PRICES = { bed:30, desk:40, lamp:20, wall:35, plant:15, skin:50 };
const modes = ['sleep','focus','move'];
export const CHARACTERS = ['🐰','🐻','🐱','🐸','🐶','🦊','🐼','🐨','🐯','🐷','🐵','🐧'];
export const SEATS = [{x:170,y:190},{x:295,y:190},{x:170,y:325},{x:295,y:325}];
const worlds = ['cafe','library','garden','bedroom'];
const names = {sleep:'수면 루틴',focus:'디지털 디톡스',move:'신체 활동'};
export const MAX_FOCUS_GAP = 20000;

export function createWorld() {
  return {
    users: {},
    rooms: [
      {id:'PUBLIC-REST',name:'달빛 수면방',public:true,goal:12},
      {id:'PUBLIC-STUDY',name:'함께 공부하는 카페',public:true,goal:12},
      {id:'PUBLIC-WALK',name:'초록 산책 모임',public:true,goal:12}
    ]
  };
}
function fail(message) { throw new Error(message); }
function number(value,min,max) {
  if (!Number.isFinite(value) || value<min || value>max) fail('입력한 숫자 범위를 확인해 주세요.');
  return value;
}
function text(value,max) {
  if(typeof value!=='string' || !value.trim() || value.trim().length>max) fail('입력한 이름을 확인해 주세요.');
  return value.trim();
}
export function elapsed(session,now) {
  return session.status==='running'
    ? Math.min(86400,Math.max(0,Math.floor((now-session.startedAt)/1000))+session.offset)
    : session.elapsed;
}
export function calculate(session,now) {
  const seconds = elapsed(session,now);
  let parts;
  if(session.mode==='sleep') {
    const minutes=seconds/60;
    const time=Math.max(0,50-5*Math.ceil(Math.max(0,session.targetHours*60-minutes)/30));
    const difference=Math.abs(session.bedtimeDifference ?? 720);
    const regular=difference<30?30:Math.max(0,30-2*Math.floor(difference/30));
    parts=[
      {label:'루틴 시간',value:seconds>=60?time:0,formula:'목표 대비 부족한 30분 단위마다 5점 차감 · 최대 50점'},
      {label:'시작 시각 규칙성',value:seconds>=60?regular:0,formula:'계획 '+(session.plannedBedtime||'기록 없음')+' · 시작 시각 차이 '+difference+'분 · 30분마다 2점 차감'}
    ];
  } else if(session.mode==='focus') {
    parts=[{label:'집중 시간',value:Math.min(40,Math.floor(seconds/3600)*10),formula:'완료한 1시간마다 10점 · 세션당 최대 40점'}];
  } else {
    parts=[{label:'활동 거리',value:Math.min(40,Math.floor(session.km*10)),formula:'1km마다 10점 · 소수점 버림 · 세션당 최대 40점'}];
  }
  return {parts,points:parts.reduce((sum,p)=>sum+p.value,0)};
}
function finish(user,session,now,abandoned,reason='') {
  if(session.status!=='running') return;
  const result=calculate(session,now);
  session.elapsed=elapsed(session,now);
  session.endedAt=now;
  session.status=abandoned?'abandoned':'completed';
  session.reason=reason;
  session.parts=abandoned?[]:result.parts;
  session.points=abandoned?0:result.points;
  session.coins=abandoned||session.demo?0:session.points;
  session.contribution=!abandoned&&!session.demo&&session.elapsed>=60?1:0;
  user.coins+=session.coins;
}
export function applyAction(world,id,body,now,local=false) {
  if(!Object.hasOwn(world.users,id)) {
    world.users[id]={
      user:{nickname:'새로운 주민',character:'🐰',bedtime:'23:00',hours:8},
      onboarded:false,coins:local?100:0,sessions:[],owned:[],applied:[],apps:[],
      roomId:null,x:171,y:208,world:'cafe',seen:now,createdRooms:0
    };
  }
  const user=world.users[id];
  let running=user.sessions.find(s=>s.status==='running');
  if(running?.mode==='focus' && now-user.seen>MAX_FOCUS_GAP) {
    finish(user,running,user.seen,true,'연결이 20초 이상 끊겨 집중 미션이 종료됐어요.');
    running=undefined;
  }
  user.seen=now;
  const action=body.action;
  if(action==='sync') {
    if(body.x!==undefined)user.x=number(body.x,0,390);
    if(body.y!==undefined)user.y=number(body.y,0,390);
    if(worlds.includes(body.world) && user.world!==body.world) {
      user.world=body.world;
      user.seat=null;
    }
    if(user.seat!=null)Object.assign(user,SEATS[user.seat]);
    return;
  }
  if(action==='profile') {
    if(body.user) {
      const profile=body.user;
      if(profile.nickname!==undefined)user.user.nickname=text(profile.nickname,16);
      if(profile.character!==undefined) {
        if(!CHARACTERS.includes(profile.character))fail('캐릭터를 선택해 주세요.');
        user.user.character=profile.character;
      }
      if(profile.bedtime!==undefined) {
        if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(profile.bedtime))fail('취침 시각을 확인해 주세요.');
        user.user.bedtime=profile.bedtime;
      }
      if(profile.hours!==undefined)user.user.hours=number(profile.hours,1,12);
      if(profile.nickname && profile.character) user.onboarded=true;
    }
    if(body.apps!==undefined) {
      if(!Array.isArray(body.apps)||body.apps.length>30||body.apps.some(a=>typeof a!=='string'||a.length>50))fail('앱 설정 오류');
      user.apps=[...new Set(body.apps)].filter(a=>a.startsWith('sleep:')||a.startsWith('focus:'));
    }
    return;
  }
  if(!user.onboarded)fail('닉네임과 캐릭터를 먼저 선택해 주세요.');
  if(action==='leave') {
    if(running)finish(user,running,now,true,'방을 나가 미션이 종료됐어요.');
    user.roomId=null;
    user.seat=null;
    return;
  }
  if(action==='stand') {
    user.seat=null;
    return;
  }
  if(action==='sit') {
    if(!user.roomId || !['cafe','library'].includes(user.world))fail('카페나 도서관 방에 입장해 주세요.');
    if(!Number.isInteger(body.seat) || !SEATS[body.seat])fail('좌석을 확인해 주세요.');
    const occupied=Object.entries(world.users).some(([otherId,p])=>
      otherId!==id && p.roomId===user.roomId && p.world===user.world &&
      p.seat===body.seat && now-p.seen<15000);
    if(occupied)fail('다른 주민이 앉아 있는 자리예요.');
    user.seat=body.seat;
    Object.assign(user,SEATS[body.seat]);
    return;
  }
  if(action==='sensor') {
    if(!running || running.mode!=='sleep' || body.id!==running.id)fail('진행 중인 수면 미션을 확인해 주세요.');
    const cm=number(body.cm,2,400);
    const previous=running.sensor;
    const moving=!!previous && now-previous.at<10000 && Math.abs(previous.cm-cm)>=5;
    running.sensor={cm,at:now,moving};
    running.sensorSamples=(running.sensorSamples||0)+1;
    running.movementEvents=(running.movementEvents||0)+(moving?1:0);
    return;
  }
  if(action==='join') {
    if(running)fail('진행 중인 미션을 종료한 뒤 방을 이동해 주세요.');
    let room;
    if(body.create) {
      if(user.createdRooms>=10)fail('계정당 친구방은 최대 10개 만들 수 있어요.');
      room={id:crypto.randomUUID().replaceAll('-','').slice(0,12).toUpperCase(),name:text(body.name,32),public:body.public===true,goal:12};
      world.rooms.push(room);
      user.createdRooms++;
    } else {
      room=world.rooms.find(r=>body.code?r.id===String(body.code).toUpperCase():r.public&&r.name===body.name);
      if(!room)fail('초대 코드 또는 공개방을 확인해 주세요.');
    }
    user.roomId=room.id;
    user.seat=null;
    return;
  }
  if(action==='start') {
    if(!user.roomId)fail('친구방이나 공개방에 먼저 입장해 주세요.');
    if(running)fail('이미 진행 중인 미션이 있어요.');
    if(!modes.includes(body.mode))fail('미션을 선택해 주세요.');
    if(typeof body.requestId!=='string'||body.requestId.length>80)fail('요청 번호가 필요합니다.');
    if(user.sessions.some(s=>s.id===body.requestId))return;
    const timezone=number(body.tz,-840,840);
    const [hour,minute]=user.user.bedtime.split(':').map(Number);
    const localMinute=((Math.floor(now/60000)+timezone)%1440+1440)%1440;
    const target=number(body.target,1,720);
    const targetKm=number(body.distance,.1,100);
    if(!['걷기','달리기'].includes(body.exercise))fail('운동을 선택해 주세요.');
    const session={
      id:body.requestId,mode:body.mode,startedAt:now,status:'running',offset:0,elapsed:0,
      targetMinutes:target,targetKm,targetHours:user.user.hours,km:0,exercise:body.exercise,
      plannedBedtime:user.user.bedtime,
      bedtimeDifference:(localMinute-hour*60-minute+2160)%1440-720,
      roomId:user.roomId,demo:false,hidden:[],parts:[],points:0,coins:0,contribution:0,
      goal:body.mode==='sleep'?user.user.hours+'시간 루틴':body.mode==='focus'?target+'분 집중':body.exercise+' '+targetKm+'km'
    };
    user.sessions.unshift(session);
    return;
  }
  if(action==='patch'||action==='finish') {
    const session=user.sessions.find(s=>s.id===body.id);
    if(!session)fail('내 미션 기록을 찾을 수 없어요.');
    if(session.status!=='running')return;
    if(action==='finish') {
      finish(user,session,now,body.abandoned===true,body.reason==='leave'?'집중 화면을 떠나 미션이 초기화됐어요.':'');
      return;
    }
    if(body.demo===true)session.demo=true;
    if(body.demoBedtime===true && body.demo===true)session.bedtimeDifference=10;
    if(body.offset!==undefined) {
      if(body.demo!==true)fail('시간 조정은 데모에서만 가능해요.');
      session.offset=number(body.offset,session.offset,86400);
    }
    if(body.km!==undefined) {
      if(session.mode!=='move')fail('거리 기록은 활동 미션에서 사용해요.');
      session.km=number(body.km,session.km,100);
    }
    if(body.hidden) {
      if(session.mode==='focus')finish(user,session,now,true,'집중 화면을 떠나 미션이 초기화됐어요.');
      else session.hidden=[{at:now}];
    }
    return;
  }
  if(action==='buy') {
    if(!Object.hasOwn(PRICES,body.id))fail('상품을 찾을 수 없어요.');
    if(!user.owned.includes(body.id)) {
      if(user.coins<PRICES[body.id])fail('코인이 부족해요.');
      user.coins-=PRICES[body.id];
      user.owned.push(body.id);
      user.applied.push(body.id);
    } else if(body.applied===true) {
      if(!user.applied.includes(body.id))user.applied.push(body.id);
    } else if(body.applied===false) {
      user.applied=user.applied.filter(item=>item!==body.id);
    }
    return;
  }
  fail('지원하지 않는 요청입니다.');
}
export function clientState(world,id,now,local=false) {
  const user=world.users[id];
  const current=world.rooms.find(r=>r.id===user.roomId);
  const users=Object.entries(world.users);
  const room=current?{
    name:current.name,code:current.id,goal:current.goal,
    contribution:users.reduce((total,[,p])=>total+p.sessions.filter(s=>s.roomId===current.id&&s.endedAt>=now-86400000).reduce((sum,s)=>sum+s.contribution,0),0),
    members:users.filter(([,p])=>p.roomId===current.id).map(([memberId,p])=>({
      name:p.user.nickname,character:p.applied.includes('skin')?'🐇':p.user.character,
      me:memberId===id,online:now-p.seen<15000,x:p.x,y:p.y,world:p.world,seat:p.seat??null,
      timer:(()=>{const active=p.sessions.find(s=>s.status==='running');return active?{seconds:elapsed(active,now-p.seen<15000?now:p.seen),sampledAt:now,running:now-p.seen<15000}:null;})(),
      mode:names[p.sessions.find(s=>s.status==='running')?.mode]||'쉬는 중'
    }))
  }:null;
  return {
    pose:{seat:user.seat??null,x:user.x,y:user.y,world:user.world},authenticated:true,onboarded:user.onboarded,user:user.user,coins:user.coins,
    sessions:user.sessions,owned:user.owned,applied:user.applied,apps:user.apps,room,
    rooms:world.rooms.filter(r=>r.public).map(r=>({
      name:r.name,goal:r.goal,count:users.filter(([,p])=>p.roomId===r.id&&now-p.seen<15000).length
    })),now,local
  };
}
