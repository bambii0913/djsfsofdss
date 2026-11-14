// GitHub Pages에서 이 서버를 사용합니다. 직접 배포했다면 주소를 바꾸세요.
// 주소는 공개 설정이며 비밀번호나 데이터베이스 키를 넣지 않습니다.
export const API_BASE = location.hostname.endsWith('github.io')
  ? 'https://routine-mate-world.chriseom.chatgpt.site'
  : '';
