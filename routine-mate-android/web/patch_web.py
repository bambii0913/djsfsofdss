"""python3 patch_web.py /path/to/website (app.js and rules.js must be there)."""
from pathlib import Path
import sys
root=Path(sys.argv[1])
a=root/'app.js';r=root/'rules.js'
app=a.read_text();rules=r.read_text()
if 'routineMateNativePatchV1' in app:
    raise SystemExit('이미 패치한 app.js입니다. 중복 변경하지 않았습니다.')
# Match current supplied versions, including formatted rules.js.
import re
app,n=re.subn(r'(function leaveFocus\(\)\s*\{)',r'\1\n  if (window.RoutineMateNative) return;',app,count=1)
if n!=1: raise SystemExit('leaveFocus 함수를 찾지 못했습니다. 파일을 변경하지 않았습니다.')
app,n=re.subn(r'(action:\s*[\'"]start[\'"],)',r'\1\n        nativeGuard: Boolean(window.RoutineMateNative),',app,count=1)
if n!=1: raise SystemExit('start 요청을 찾지 못했습니다. 파일을 변경하지 않았습니다.')
rules,n=re.subn(r'(running\?\.mode\s*===\s*[\'"]focus[\'"]\s*&&)',r'\1 !running.nativeGuard &&',rules,count=1)
if n!=1: raise SystemExit('focus 연결 종료 조건을 찾지 못했습니다. 파일을 변경하지 않았습니다.')
rules,n=re.subn(r'(id:\s*body\.requestId,)',r'\1 nativeGuard: body.nativeGuard === true,',rules,count=1)
if n!=1: raise SystemExit('session 생성 부분을 찾지 못했습니다. 파일을 변경하지 않았습니다.')
# Native app must not treat screen-off/hidden as failure either.
rules,n=re.subn(r'(if\s*\(body\.hidden\)\s*\{\s*if\s*\(session\.mode\s*===\s*[\'"]focus[\'"])(\))',r'\1 && !session.nativeGuard\2',rules,count=1)
if n!=1: raise SystemExit('hidden 처리 조건을 찾지 못했습니다. 파일을 변경하지 않았습니다.')
link=(Path(__file__).parent/'append-to-app.js').read_text()
app+='\n// routineMateNativePatchV1\n'+link
for f in (a,r):
 backup=f.with_suffix(f.suffix+'.before-native')
 if backup.exists(): raise SystemExit('백업 파일이 이미 있습니다. 덮어쓰지 않았습니다.')
for f,s in ((a,app),(r,rules)):
 f.with_suffix(f.suffix+'.before-native').write_bytes(f.read_bytes())
 f.write_text(s)
print('app.js / rules.js 패치 완료. 웹사이트와 서버 양쪽에 재배포하세요.')
