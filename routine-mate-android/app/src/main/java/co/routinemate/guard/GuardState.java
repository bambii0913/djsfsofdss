package co.routinemate.guard;
import android.content.*;
import org.json.JSONObject;
import java.util.*;
final class GuardState {
 static android.content.SharedPreferences prefs(Context c) { return c.getSharedPreferences("guard",0); }
 static boolean active(Context c) { return GuardService.instance!=null && prefs(c).getLong("until",0)>System.currentTimeMillis(); }
 static void stop(Context c) {
  prefs(c).edit().putString("dismissed",prefs(c).getString("id", "")).putLong("until",0).apply();
  if(GuardService.instance!=null) GuardService.instance.hide();
 }
 static void accept(Context c, JSONObject j) {
  String mode=j.optString("mode"), id=j.optString("id");
  if (!mode.equals("sleep") && !mode.equals("focus")) {
   prefs(c).edit().putLong("until",0).apply();
   if(GuardService.instance!=null) GuardService.instance.hide();
   return;
  }
  if(id.isEmpty() || id.equals(prefs(c).getString("dismissed",""))) return;
  if(GuardService.instance==null || prefs(c).getStringSet("apps",Collections.emptySet()).isEmpty()) return;
  long until=j.optLong("until",0), now=System.currentTimeMillis();
  if(until<=now || until>now+86400000L) return;
  prefs(c).edit().putString("id",id).putString("mode",mode).putLong("until",until).apply();
 }
}
