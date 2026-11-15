package co.routinemate.guard;
import android.accessibilityservice.AccessibilityService;
import android.view.accessibility.AccessibilityEvent;
import android.view.*;
import android.widget.*;
import android.graphics.PixelFormat;
import android.os.*;
import android.content.*;
import java.util.Collections;
public class GuardService extends AccessibilityService {
 static GuardService instance;
 WindowManager wm; LinearLayout overlay; String blockedPackage="";
 Handler handler=new Handler(Looper.getMainLooper());
 Runnable expiry=new Runnable(){public void run(){if(!GuardState.active(GuardService.this))hide();handler.postDelayed(this,1000);}};
 @Override protected void onServiceConnected(){instance=this;wm=(WindowManager)getSystemService(WINDOW_SERVICE);handler.post(expiry);}
 @Override public void onAccessibilityEvent(AccessibilityEvent event){
  if(event.getEventType()!=AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED || event.getPackageName()==null)return;
  String pkg=event.getPackageName().toString();
  if(!GuardState.active(this)){hide();return;}
  if(pkg.equals(getPackageName())) {
   if(event.getClassName()!=null && event.getClassName().toString().equals(MainActivity.class.getName()))hide();
   return;
  }
  if(GuardState.prefs(this).getStringSet("apps",Collections.emptySet()).contains(pkg))show(pkg);else hide();
 }
 void show(String pkg){
  if(overlay!=null)return;
  blockedPackage=pkg; overlay=new LinearLayout(this);overlay.setOrientation(1);overlay.setGravity(Gravity.CENTER);overlay.setPadding(32,32,32,32);overlay.setBackgroundColor(0xFFEEE8F5);
  TextView title=new TextView(this);title.setText("지금은 루틴메이트 미션 중입니다.\n선택한 앱의 사용을 제한하고 있어요.");title.setTextSize(23);title.setTextColor(0xFF30253D);overlay.addView(title);
  Button back=new Button(this);back.setText("루틴메이트로 돌아가기");overlay.addView(back);
  back.setOnClickListener(v->{performGlobalAction(GLOBAL_ACTION_HOME);hide();startActivity(new Intent(this,MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TOP));});
  Button exit=new Button(this);exit.setText("긴급 해제");overlay.addView(exit);exit.setOnClickListener(v->GuardState.stop(this));
  WindowManager.LayoutParams params=new WindowManager.LayoutParams(-1,-1,WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,PixelFormat.TRANSLUCENT);
  try{wm.addView(overlay,params);}catch(RuntimeException e){overlay=null;}
 }
 void hide(){if(overlay!=null){try{wm.removeView(overlay);}catch(RuntimeException ignored){}overlay=null;blockedPackage="";}}
 @Override public void onInterrupt(){hide();}
 @Override public void onDestroy(){hide();handler.removeCallbacksAndMessages(null);instance=null;super.onDestroy();}
}
