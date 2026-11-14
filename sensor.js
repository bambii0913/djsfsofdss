let port;
let reader;
let connected=false;
let report=()=>{};
export async function disconnectSensor() {
  connected=false;
  if(reader)await reader.cancel();
  report('센서 연결 해제');
}
export async function connectSensor(onReading,onStatus) {
  report=onStatus;
  if(!('serial' in navigator)) {
    report('USB 센서는 데스크톱 Chrome 또는 Edge에서 연결해 주세요.');
    return;
  }
  if(port) {report('이미 연결 중입니다.');return;}
  try {
    port=await navigator.serial.requestPort();
    await port.open({baudRate:9600});
    connected=true;
    report('USB 연결됨 · 센서 데이터 대기 중');
    const decoder=new TextDecoder();
    let buffer='';
    reader=port.readable.getReader();
    while(connected) {
      const {value,done}=await reader.read();
      if(done)break;
      buffer+=decoder.decode(value,{stream:true});
      if(buffer.length>4096)buffer='';
      let newline;
      while((newline=buffer.indexOf('\n'))>=0) {
        const line=buffer.slice(0,newline).trim();
        buffer=buffer.slice(newline+1);
        try {
          const data=JSON.parse(line);
          if(Number.isFinite(data.cm)&&data.cm>=2&&data.cm<=400) {
            report('수신 중 · '+data.cm.toFixed(1)+' cm');
            await onReading(data.cm);
          } else report('측정 범위 밖 · 센서 위치를 확인해 주세요.');
        } catch { /* Arduino startup output and incomplete packets are ignored. */ }
      }
    }
  } catch(error) {
    report(error.name==='NotFoundError'?'연결할 기기를 선택하지 않았어요.':'USB 연결 실패 · 케이블과 시리얼 모니터 상태를 확인해 주세요.');
  } finally {
    connected=false;
    if(reader){reader.releaseLock();reader=undefined;}
    if(port){try{await port.close();}catch{}port=undefined;}
  }
}
