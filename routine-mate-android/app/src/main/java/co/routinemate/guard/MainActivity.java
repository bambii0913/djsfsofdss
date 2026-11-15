package co.routinemate.guard;
import android.app.*;
import android.os.*;
import android.content.*;
import android.content.pm.*;
import android.net.Uri;
import android.provider.Settings;
import android.webkit.*;
import android.widget.*;
import androidx.webkit.*;
import java.util.*;
import org.json.JSONObject;

public class MainActivity extends Activity {
 static final String URL="https://bambii0913.github.io/djsfsofdss/";
 WebView web; TextView status; Handler handler=new Handler(Looper.getMainLooper());
 boolean bridgeReady=false;
 final Runnable refresh=new Runnable(){ public void run(){
  status.setText(GuardState.active(MainActivity.this)?"● 앱 제한 중 · 목표 시간까지":"○ 제한 해제 · 권한과 차단 앱을 설정하세요");
  handler.postDelayed(this,1000);
 }};
 static boolean trusted(String url){
  if(url==null)return false;
  Uri u=Uri.parse(url);
  return "https".equals(u.getScheme()) && "bambii0913.github.io".equals(u.getHost()) && (u.getPort()==-1 || u.getPort()==443) && u.getPath()!=null && u.getPath().startsWith("/djsfsofdss/");
 }
 Button button(String text, LinearLayout parent, Runnable action){
  Button b=new Button(this);b.setText(text);parent.addView(b);b.setOnClickListener(v->action.run());return b;
 }
 @Override public void onCreate(Bundle state){
  super.onCreate(state);
  LinearLayout root=new LinearLayout(this);root.setOrientation(1);setContentView(root);
  status=new TextView(this);status.setPadding(12,12,12,8);root.addView(status);
  LinearLayout bar=new LinearLayout(this);root.addView(bar);
  button("권한 설정",bar,()->new AlertDialog.Builder(this).setTitle("앱 제한 권한")
   .setMessage("다른 앱이 열렸는지 확인해 선택한 앱 위에 차단 화면을 표시합니다. 화면 내용·입력 내용은 읽거나 저장하지 않습니다. 다음 설정에서 ‘루틴메이트 집중’을 켜세요. 언제든 해제할 수 있습니다.")
   .setPositiveButton("동의하고 설정",(d,w)->startActivity(new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))).setNegativeButton("취소",null).show());
  button("차단 앱",bar,()->chooseApps());
  button("긴급 해제",bar,()->GuardState.stop(this));
  web=new WebView(this);root.addView(web,new LinearLayout.LayoutParams(-1,0,1));
  web.getSettings().setJavaScriptEnabled(true);web.getSettings().setDomStorageEnabled(true);
  web.getSettings().setAllowFileAccess(false);web.getSettings().setAllowContentAccess(false);
  web.getSettings().setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
  if(WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
   WebViewCompat.addWebMessageListener(web,"RoutineMateNative",Collections.singleton("https://bambii0913.github.io"),(view,message,origin,main,reply)->{
    if(!main || !trusted(view.getUrl()) || !"https://bambii0913.github.io".equals(origin.toString()))return;
    try { JSONObject j=new JSONObject(message.getData());
     if(!"mission".equals(j.optString("type")))return;
     bridgeReady=true; GuardState.accept(this,j);
    }catch(Exception ignored){}
   });
  } else Toast.makeText(this,"Android System WebView를 업데이트해야 자동 제한을 사용할 수 있습니다.",Toast.LENGTH_LONG).show();
  web.setWebViewClient(new WebViewClient(){
   @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest req){
    if(!req.isForMainFrame())return false;
    if(trusted(req.getUrl().toString()))return false;
    Toast.makeText(MainActivity.this,"외부 링크는 이 앱에서 열지 않습니다.",Toast.LENGTH_SHORT).show();return true;
   }
   @Override public void onPageFinished(WebView view,String url){
    if(!trusted(url)){view.loadUrl(URL);return;}
    handler.postDelayed(()->{if(!bridgeReady && !isFinishing())Toast.makeText(MainActivity.this,"웹사이트 app.js에 연결 코드를 추가해야 미션과 연동됩니다.",Toast.LENGTH_LONG).show();},12000);
   }
  });
  web.loadUrl(URL);handler.post(refresh);
 }
 void chooseApps(){
  if(GuardState.active(this)){Toast.makeText(this,"차단 앱 변경은 미션 종료 또는 긴급 해제 후 가능합니다.",Toast.LENGTH_LONG).show();return;}
  PackageManager pm=getPackageManager();
  Intent launcher=new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER);
  Set<String> excluded=new HashSet<>(Arrays.asList(getPackageName(),"com.android.settings","com.android.systemui"));
  for(ResolveInfo r:pm.queryIntentActivities(new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME),0))excluded.add(r.activityInfo.packageName);
  android.telecom.TelecomManager tm=(android.telecom.TelecomManager)getSystemService(TELECOM_SERVICE);
  if(tm!=null && tm.getDefaultDialerPackage()!=null)excluded.add(tm.getDefaultDialerPackage());
  TreeMap<String,String> apps=new TreeMap<>();
  for(ResolveInfo r:pm.queryIntentActivities(launcher,0)) {
   String pkg=r.activityInfo.packageName;
   if(!excluded.contains(pkg))apps.put(pkg,r.loadLabel(pm).toString());
  }
  List<String> packages=new ArrayList<>(apps.keySet());packages.sort(Comparator.comparing(apps::get));
  Set<String> selected=new HashSet<>(GuardState.prefs(this).getStringSet("apps",Collections.emptySet()));
  String[] labels=new String[packages.size()];boolean[] checked=new boolean[labels.length];
  for(int i=0;i<labels.length;i++){labels[i]=apps.get(packages.get(i))+"\n"+packages.get(i);checked[i]=selected.contains(packages.get(i));}
  new AlertDialog.Builder(this).setTitle("제한할 앱 선택")
   .setMultiChoiceItems(labels,checked,(d,i,on)->{if(on)selected.add(packages.get(i));else selected.remove(packages.get(i));})
   .setPositiveButton("저장",(d,w)->GuardState.prefs(this).edit().putStringSet("apps",selected).apply()).setNegativeButton("취소",null).show();
 }
 @Override public void onBackPressed(){if(web.canGoBack())web.goBack();else super.onBackPressed();}
 @Override protected void onDestroy(){handler.removeCallbacksAndMessages(null);web.destroy();super.onDestroy();}
}
