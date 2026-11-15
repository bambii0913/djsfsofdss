
// 아래 전체를 기존 app.js 맨 마지막에 한 번 추가합니다.
// 기존 activeSession(), state, clockOffset을 사용하는 ES module 내부 코드입니다.
(() => {
  if (window.__routineMateGuardLinked) return;
  window.__routineMateGuardLinked = true;
  function syncNativeMission() {
    if (!window.RoutineMateNative || !state.authenticated) return;
    const session = activeSession();
    const guarded = session && ["sleep", "focus"].includes(session.mode);
    let until = 0;
    if (guarded) {
      const duration = session.mode === "sleep"
        ? Number(session.targetHours) * 3600000
        : Number(session.targetMinutes) * 60000;
      // 서버 시각을 기기 시각으로 바꾸고 데모 시간 이동을 반영합니다.
      until = Number(session.startedAt) - clockOffset
        + duration - Number(session.offset || 0) * 1000;
    }
    window.RoutineMateNative.postMessage(JSON.stringify({
      type: "mission",
      id: guarded ? session.id : "",
      mode: guarded ? session.mode : "none",
      until: Number.isFinite(until) ? until : 0
    }));
  }
  setInterval(syncNativeMission, 1000);
  document.addEventListener("visibilitychange", syncNativeMission);
})();
