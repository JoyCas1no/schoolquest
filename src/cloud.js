/* ===== облако: вход по логину и паролю, сохранение прогресса (Supabase, чистый fetch) =====
   anon-ключ публичный по замыслу Supabase; доступ к данным закрыт политиками RLS (supabase/schema.sql).
   Пароль нигде не хранится: в браузере лежат только токены сессии. */
var Cloud=(function(){
  var URL_="https://glxvhzqcjktniwfoqcal.supabase.co";
  var KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdseHZoenFjamt0bml3Zm9xY2FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM4ODU4ODksImV4cCI6MjEwOTQ2MTg4OX0.qCAUKZLQJ7X--0YWJgM78BrhUS7u-JaC1FCXFzlicUs";
  var AUTH="schoolquest_auth",DOMAIN="@schoolquest.game";
  var auth=null,pushTimer=0,lastError="";
  try{auth=JSON.parse(localStorage.getItem(AUTH))}catch(e){}
  if(!auth||!auth.access||!auth.refresh||!auth.id)auth=null;
  var hasNet=function(){return typeof fetch==="function"};
  var saveAuth=function(){try{if(auth)localStorage.setItem(AUTH,JSON.stringify(auth));else localStorage.removeItem(AUTH)}catch(e){}};
  var nameOk=function(u){return /^[a-z0-9_]{3,20}$/.test(u)};
  var mailOk=function(m){return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(m)&&m.length<=120};

  async function raw(path,opts,token){
    if(!hasNet())throw new Error("Нет соединения");
    opts=opts||{};
    var headers=Object.assign({apikey:KEY,"Content-Type":"application/json",Authorization:"Bearer "+(token||KEY)},opts.headers||{});
    var r;
    try{r=await fetch(URL_+path,Object.assign({},opts,{headers:headers}))}catch(e){throw new Error("Нет соединения")}
    var body=null,txt=await r.text();try{body=txt?JSON.parse(txt):null}catch(e){body=txt}
    if(!r.ok){var err=new Error((body&&(body.msg||body.message||body.error_description||body.error))||"Ошибка "+r.status);
      err.status=r.status;err.code=body&&(body.error_code||body.code);throw err}
    return body}
  function setSession(b,username){
    auth={access:b.access_token,refresh:b.refresh_token,exp:Math.floor(Date.now()/1000)+(b.expires_in||3600),id:b.user.id,
      username:username||(b.user.user_metadata&&b.user.user_metadata.username)||(auth&&auth.username)||""};
    saveAuth()}
  async function token(){
    if(!auth)return null;
    if(auth.exp-60<Date.now()/1000){
      try{var b=await raw("/auth/v1/token?grant_type=refresh_token",{method:"POST",body:JSON.stringify({refresh_token:auth.refresh})});setSession(b,auth.username)}
      catch(e){if(e.status===400||e.status===401){auth=null;saveAuth()}throw e}}
    return auth.access}
  var authed=async function(path,opts){return raw(path,opts,await token())};

  function human(e){
    var m=String(e.message||""),c=e.code||"";
    if(/invalid login|invalid_credentials/i.test(m+c))return"Неверный логин или пароль.";
    if(/already|exists|duplicate|username_format|profiles_username|user_already/i.test(m+c))return"Такой логин уже занят.";
    if(/password/i.test(m))return"Пароль слишком простой: нужно минимум 6 символов.";
    if(e.status===429||/rate/i.test(m))return"Слишком много попыток, подожди минуту.";
    if(/соединени/i.test(m))return"Нет соединения с интернетом. Играть можно и так, прогресс сохранится на устройстве.";
    return"Не получилось: "+m}

  return{
    human:human,nameOk:nameOk,mailOk:mailOk,
    get user(){return auth?auth.username:null},
    get online(){return!!auth},
    get lastError(){return lastError},
    async signUp(username,password,parentEmail){
      username=String(username||"").trim().toLowerCase();parentEmail=String(parentEmail||"").trim();
      if(!nameOk(username))throw new Error("Логин: 3–20 символов, латинские буквы, цифры и _.");
      if(parentEmail&&!mailOk(parentEmail))throw new Error("Почта родителя написана неверно (или оставь поле пустым).");
      if(String(password||"").length<6)throw new Error("Пароль: минимум 6 символов.");
      var free=await raw("/rest/v1/rpc/username_free",{method:"POST",body:JSON.stringify({name:username})});
      if(free===false)throw new Error("Такой логин уже занят.");
      var b=await raw("/auth/v1/signup",{method:"POST",body:JSON.stringify({email:username+DOMAIN,password:password,data:{username:username,parent_email:parentEmail}})});
      if(!b||!b.access_token)throw new Error("Регистрация не завершилась, попробуй войти.");
      setSession(b,username)},
    async signIn(username,password){
      username=String(username||"").trim().toLowerCase();
      if(!nameOk(username)||!password)throw new Error("Неверный логин или пароль.");
      var b=await raw("/auth/v1/token?grant_type=password",{method:"POST",body:JSON.stringify({email:username+DOMAIN,password:password})});
      setSession(b,username)},
    signOut:function(){auth=null;saveAuth();clearTimeout(pushTimer)},
    /* облако -> устройство: вернёт {data,updated_at} или null, если в облаке пусто */
    async pull(){var rows=await authed("/rest/v1/saves?select=data,updated_at&limit=1");return rows&&rows[0]?rows[0]:null},
    async push(data){
      if(!auth)return;
      await authed("/rest/v1/saves?on_conflict=user_id",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},
        body:JSON.stringify({user_id:auth.id,data:data,updated_at:new Date().toISOString()})})},
    /* отложенная отправка: getData() вызывается в момент отправки, чтобы уйти самой свежей версией */
    schedulePush:function(getData){
      if(!auth||!hasNet())return;clearTimeout(pushTimer);
      pushTimer=setTimeout(function(){Cloud.push(getData()).then(function(){lastError=""}).catch(function(e){lastError=human(e)})},1500)}
  }})();
