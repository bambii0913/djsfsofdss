# 웹·서버 수동 수정 (자동 스크립트와 둘 중 하나만 사용)

1. app.js의 `action: "start",` 다음에 추가:
```js
nativeGuard: Boolean(window.RoutineMateNative),
```

2. app.js의 `function leaveFocus() {` 바로 다음에 추가:
```js
if (window.RoutineMateNative) return;
```

3. app.js 맨 마지막에 `web/append-to-app.js` 전체를 붙입니다. 별도 script 태그로 로드하면 기존 모듈 내부 변수에 접근할 수 없으므로 반드시 같은 app.js 안에 붙입니다.

4. rules.js의 연결 끊김 조건을 다음처럼 변경합니다:
```js
if (running?.mode === "focus" && !running.nativeGuard && now - user.seen > MAX_FOCUS_GAP) {
```

5. rules.js의 `const session = {` 안에 추가:
```js
nativeGuard: body.nativeGuard === true,
```

6. rules.js의 `if (body.hidden)` 안에서 focus 조건을 다음처럼 변경합니다:
```js
if (session.mode === "focus" && !session.nativeGuard) {
```

7. app.js를 웹사이트에, rules.js를 웹사이트와 API 서버 모두에 반영합니다. 반드시 새 미션으로 테스트합니다.

위 조건은 새 Android 앱에서 시작한 미션만 기존의 '앱 이탈/연결 끊김 = 실패' 처리를 건너뛰게 합니다. 일반 브라우저의 기존 디톡스 규칙은 유지합니다.

캐시 때문에 옛 파일이 로드되면 index.html의 app.js 쿼리 버전과 app.js/local.js의 rules.js 쿼리 버전을 변경하고 앱을 다시 여세요. 기존 코드를 삭제하거나 전체를 과거 버전으로 교체하지 마세요.
