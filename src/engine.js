/* ===== звук ===== */
var AC=null;
function beep(f,d,t){if(!S||!S.sound)return;try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();
  var o=AC.createOscillator(),g=AC.createGain();o.type=t||"sine";o.frequency.value=f;g.gain.value=.08;
  o.connect(g);g.connect(AC.destination);o.start();g.gain.exponentialRampToValueAtTime(.001,AC.currentTime+d);o.stop(AC.currentTime+d)}catch(e){}}
var snd={ok:function(){beep(660,.15);setTimeout(function(){beep(880,.2)},120)},bad:function(){beep(180,.3,"sawtooth")},
  tick:function(){beep(500,.04,"square")},win:function(){[523,659,784,1046].forEach(function(f,i){setTimeout(function(){beep(f,.25)},i*130)})}};

/* ===== состояние ===== */
var KEY="schoolquest_v1";
var S=null;
function newState(){var s={nick:null,cls:"warrior",grade:3,subj:{},coll:{},pages:0,score:0,week:weekKey(),best:0,
  chest:"",streak:0,lastDay:"",limit:true,sound:true,battles:0};
  SUBJ.forEach(function(x){s.subj[x.id]={lvl:1,recent:[],ok:0,tot:0}});return s}
function load(){try{var j=localStorage.getItem(KEY);if(j){S=JSON.parse(j)}}catch(e){}
  if(!S||typeof S!=="object")S=null;
  if(S){var base=newState();Object.keys(base).forEach(function(k){if(!(k in S))S[k]=base[k]});
    SUBJ.forEach(function(x){if(!S.subj[x.id])S.subj[x.id]=base.subj[x.id];
      var cap=maxLevel(S.grade);if(S.subj[x.id].lvl>cap)S.subj[x.id].lvl=cap})}}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}
/* стартовый уровень и потолок по классу: нельзя вырасти до материала старше своего класса
   (уровень 3 — проценты, Present Perfect и т.п., это примерно с 6 класса) */
function startLevel(g){return g<=2?1:(g<=7?2:3)}
function maxLevel(g){return g<=2?1:(g<=5?2:3)}
/* смена класса: уровни выше нового потолка подрезаются, вверх сами не растут */
function setGrade(g){g=Math.floor(+g);if(!(g>=1&&g<=11))return false;S.grade=g;var cap=maxLevel(g);
  SUBJ.forEach(function(x){if(S.subj[x.id].lvl>cap)S.subj[x.id].lvl=cap});save();return true}

/* адаптивная сложность */
function recordAnswer(id,ok){var s=S.subj[id];s.tot++;if(ok)s.ok++;s.recent.push(ok?1:0);if(s.recent.length>5)s.recent.shift();
  var n=s.recent.length,last3=s.recent.slice(-3),right3=last3.reduce(function(a,b){return a+b},0),msg="";
  if(n>=3&&right3===3&&s.lvl<maxLevel(S.grade)){s.lvl++;s.recent=[];msg="Уровень предмета вырос до "+s.lvl+"!"}
  else if(n>=3&&right3<=1&&s.lvl>1){s.lvl--;s.recent=[];msg="Сделаем чуть полегче — уровень "+s.lvl+"."}
  return msg}

function getQuestion(id,used){var l=S.subj[id].lvl;
  if(id==="math")return genMath(l);
  var pool=BANK[id][l-1],idx=[];for(var i=0;i<pool.length;i++)if(used.indexOf(id+l+i)<0)idx.push(i);
  if(!idx.length){idx=pool.map(function(_,i){return i})}
  var i2=pick(idx),p=pool[i2];used.push(id+l+i2);return mk(p[0],p[1],p[2],p[3])}

/* ===== лига и рейтинг (тестовые игроки) ===== */
function league(g){return g<=4?"Лига 1–4 классов":(g<=8?"Лига 5–8 классов":"Лига 9–11 классов")}
var FAKE=["Лунный Кот","Тихий Дракон","Быстрый Енот","Звёздная Сова","Храбрый Ёж","Рыжий Лис","Снежный Волк"];
function leaderboard(){var seed=S.week,list=FAKE.map(function(n,i){var v=((seed*(i+3)*7919)%260)+40;return{n:n+" ✱",v:v}});
  list.push({n:nickStr(),v:S.score,me:true});list.sort(function(a,b){return b.v-a.v});return list}
function nickStr(){return S.nick?(S.nick.custom?S.nick.custom:S.nick.a+" "+S.nick.n):"Герой"}
/* своё имя: 2-16 символов, буквы/цифры/пробел/дефис. Пока хранится только на устройстве. */
function cleanName(s){s=String(s||"").replace(/\s+/g," ").trim();
  return(s.length>=2&&s.length<=16&&/^[\p{L}\p{N} _-]+$/u.test(s))?s:""}

/* ===== интерфейс ===== */
var $app=document.getElementById("app"),timerStart=Date.now(),timeWarned=false,B=null;
function h(html){$app.innerHTML=html;window.scrollTo(0,0)}
function toast(t){var d=document.createElement("div");d.className="toast";d.textContent=t;document.body.appendChild(d);setTimeout(function(){d.remove()},5000)}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}

function screenStart(){
  var opts=function(a){return a.map(function(x){return"<option>"+x+"</option>"}).join("")};
  var gr="";for(var g=1;g<=11;g++)gr+="<option value='"+g+"'"+(g===3?" selected":"")+">"+g+" класс</option>";
  h("<h1>📖 Школьный Квест</h1><div class='narr'><b>Рассказчик:</b> "+say("intro")+"</div>"+
  "<div class='card'><b>Своё имя героя</b><input id='cn' maxlength='16' placeholder='Напиши своё имя (2–16 букв)' autocomplete='off'>"+
  "<div class='dim'>Не хочешь писать — выбери готовое:</div><select id='na'>"+opts(ADJ)+"</select><select id='nn'>"+opts(NOUN)+"</select>"+
  "<b>Твой класс в школе</b><select id='gr'>"+gr+"</select>"+
  "<b>Выбери героя</b>"+Object.keys(CLS).map(function(k){var c=CLS[k];return"<button class='clsb' data-c='"+k+"'>"+c.ico+" <b>"+c.n+"</b> — "+c.d+(c.lore?"<div class='dim'>"+c.lore+"</div>":"")+"</button>"}).join("")+
  "</div><button class='main' id='go'>В путь!</button><p class='dim' id='nerr' style='color:#fb7185'></p><p class='dim'>Имя видно только тебе на этом устройстве. Настоящее имя и фамилию писать не нужно — придумай прозвище. Прогресс хранится только на этом устройстве.</p>");
  var chosen="warrior";
  function mark(){[].forEach.call(document.querySelectorAll(".clsb"),function(b){b.style.outline=b.dataset.c===chosen?"3px solid #ffcf4a":"none"})}
  [].forEach.call(document.querySelectorAll(".clsb"),function(b){b.onclick=function(){chosen=b.dataset.c;mark()}});mark();
  document.getElementById("go").onclick=function(){
    var raw=document.getElementById("cn").value,cn=cleanName(raw);
    if(raw.trim()&&!cn){document.getElementById("nerr").textContent="Имя: от 2 до 16 букв или цифр, без смайликов и знаков.";return}
    S=newState();S.nick=cn?{custom:cn}:{a:document.getElementById("na").value,n:document.getElementById("nn").value};
    S.cls=chosen;S.grade=+document.getElementById("gr").value;var sl=startLevel(S.grade);
    SUBJ.forEach(function(x){S.subj[x.id].lvl=sl});save();screenHome()}
}

function touchDay(){var t=dayKey();if(S.lastDay!==t){
  var y=new Date(Date.now()-864e5),yk=y.getFullYear()+"-"+(y.getMonth()+1)+"-"+y.getDate();
  S.streak=(S.lastDay===yk)?S.streak+1:1;S.lastDay=t}
  if(S.week!==weekKey()){S.week=weekKey();S.score=0}save()}

function screenHome(){
  touchDay();var c=CLS[S.cls];
  var chestReady=S.chest!==dayKey();
  h("<div class='top'><span>"+c.ico+" "+esc(nickStr())+"</span><span>🔥 "+S.streak+" дн. · 📜 "+S.pages+"</span></div>"+
  "<h1>Карта</h1><div class='narr'><b>Рассказчик:</b> "+say("home")+"</div>"+
  "<div class='grid'>"+SUBJ.map(function(x){var s=S.subj[x.id];return"<button data-s='"+x.id+"'><span>"+x.ico+"</span>"+x.name+"<div class='dim'>уровень "+s.lvl+"</div></button>"}).join("")+"</div>"+
  "<button class='main' id='chest' "+(chestReady?"":"disabled")+">"+(chestReady?"🎁 Открыть ежедневный сундук":"🎁 Сундук откроется завтра")+"</button>"+
  "<div class='row'><button id='b-col'>🐾 Коллекция</button><button id='b-tal'>🗺️ Таланты</button></div>"+
  "<div class='row'><button id='b-lb'>🏆 Рейтинг</button><button id='b-set'>⚙️ Настройки</button></div>");
  [].forEach.call(document.querySelectorAll("[data-s]"),function(b){b.onclick=function(){startBattle(b.dataset.s)}});
  document.getElementById("chest").onclick=openChest;
  document.getElementById("b-col").onclick=screenColl;document.getElementById("b-tal").onclick=screenTalents;
  document.getElementById("b-lb").onclick=screenLb;document.getElementById("b-set").onclick=screenSettings;
}

function openChest(){S.chest=dayKey();var m=randMonster();S.coll[m.id]=(S.coll[m.id]||0)+1;S.pages++;S.score+=10;save();snd.win();
  h("<h1>🎁 Сундук открыт!</h1><div class='card' style='text-align:center'><div class='mon'>"+m.e+"</div><b>"+m.n+"</b><div class='dim'>"+RAR[m.r]+" — теперь в коллекции</div><p>+1 страница Книги, +10 очков</p></div><button class='main' id='ok'>Отлично</button>");
  document.getElementById("ok").onclick=screenHome}

function screenColl(){
  h("<h1>🐾 Коллекция</h1><div class='coll'>"+MON.map(function(m){var n=S.coll[m.id]||0;
    return"<div class='"+(n?"":"no")+"'><span>"+(n?m.e:"❓")+"</span>"+(n?m.n+(n>1?" ×"+n:""):RAR[m.r])+"</div>"}).join("")+"</div><p class='dim'>Собрано: "+MON.filter(function(m){return S.coll[m.id]}).length+" из "+MON.length+"</p><button id='back'>← Назад</button>");
  document.getElementById("back").onclick=screenHome}

function screenTalents(){
  var rows=SUBJ.map(function(x){var s=S.subj[x.id],p=s.tot?Math.round(100*s.ok/s.tot):0;
    return{x:x,p:p,t:s.tot}}),done=rows.filter(function(r){return r.t>=5}).sort(function(a,b){return b.p-a.p});
  var tip=done.length>=2?"Лучше всего получается: <b>"+done[0].x.name+"</b>. Стоит ещё потренировать: <b>"+done[done.length-1].x.name+"</b>.":"Сыграй хотя бы по 5 вопросов в двух предметах — и я покажу твои таланты.";
  h("<h1>🗺️ Карта талантов</h1><div class='card'>"+rows.map(function(r){return"<div>"+r.x.ico+" "+r.x.name+" — "+(r.t?r.p+"% ("+r.t+" отв.)":"пока нет данных")+"<div class='bar'><i style='width:"+r.p+"%'></i></div></div><br>"}).join("")+"</div><div class='narr'>"+tip+"</div><button id='back'>← Назад</button>");
  document.getElementById("back").onclick=screenHome}

function screenLb(){
  var l=leaderboard();
  h("<h1>🏆 Рейтинг недели</h1><div class='dim'>"+league(S.grade)+" · игроки со значком ✱ — тестовые, выдуманные</div><div class='card lb'>"+
  l.map(function(p,i){return"<div class='"+(p.me?"me":"")+"'><span>"+(i+1)+". "+esc(p.n)+"</span><span>"+p.v+"</span></div>"}).join("")+"</div><p>Твой личный рекорд за бой: <b>"+S.best+"</b> очков</p><button id='back'>← Назад</button>");
  document.getElementById("back").onclick=screenHome}

function screenSettings(){
  h("<h1>⚙️ Настройки</h1><div class='card'><button id='t1'>⏱️ Напоминание об отдыхе (30 мин): "+(S.limit?"включено":"выключено")+"</button><button id='t2'>🔊 Звук: "+(S.sound?"включён":"выключен")+"</button>"+
  "<button id='t4'>✏️ Сменить имя героя</button><button id='t5'>🎓 Сменить класс (сейчас: "+S.grade+")</button><button id='t3'>🔄 Начать заново (стереть прогресс)</button></div><button id='back'>← Назад</button>");
  document.getElementById("t5").onclick=function(){var v=prompt("В каком ты классе? (1–11)",S.grade);
    if(v===null)return;if(!setGrade(v)){alert("Нужно число от 1 до 11.");return}screenSettings()};
  document.getElementById("t4").onclick=function(){var v=prompt("Новое имя героя (2–16 букв или цифр):",S.nick&&S.nick.custom||"");
    if(v===null)return;var cn=cleanName(v);if(!cn){alert("Имя: от 2 до 16 букв или цифр, без смайликов и знаков.");return}S.nick={custom:cn};save();screenSettings()};
  document.getElementById("t1").onclick=function(){S.limit=!S.limit;save();screenSettings()};
  document.getElementById("t2").onclick=function(){S.sound=!S.sound;save();screenSettings()};
  document.getElementById("t3").onclick=function(){if(confirm("Точно стереть весь прогресс?")){try{localStorage.removeItem(KEY)}catch(e){}S=null;screenStart()}};
  document.getElementById("back").onclick=screenHome}

/* ===== бой ===== */
function startBattle(id){
  var m=randMonster(),c=CLS[S.cls],hp=3+m.r;
  B={subj:id,m:m,hp:hp,maxhp:hp,hearts:c.hearts,maxh:c.hearts,hints:c.hints,used:[],n:0,pts:0,done:false,q:null,asked:0};
  nextQuestion(sayc("fight"))}

function pipsHtml(){var s="";for(var i=0;i<B.maxhp;i++)s+=i<B.hp?"❤️‍🔥":"▫️";return s}
function heartsHtml(){var s="";for(var i=0;i<B.maxh;i++)s+=i<B.hearts?"❤️":"🖤";return s}

function nextQuestion(narr){
  B.q=getQuestion(B.subj,B.used);B.asked++;B.locked=false;
  var sj=SUBJ.filter(function(x){return x.id===B.subj})[0];
  h("<div class='top'><span>"+sj.ico+" "+sj.name+" · ур. "+S.subj[B.subj].lvl+"</span><span>"+heartsHtml()+"</span></div>"+
  "<div class='mon' id='mon'>"+B.m.e+"</div><div class='pips'>"+pipsHtml()+"</div><div class='dim' style='text-align:center'>"+B.m.n+" · "+RAR[B.m.r]+"</div>"+
  "<div class='narr'><b>Рассказчик:</b> "+narr+"</div>"+
  "<div class='q'>"+esc(B.q.q)+"</div><div id='opts'>"+B.q.o.map(function(o,i){return"<button class='opt' data-i='"+i+"'>"+esc(o)+"</button>"}).join("")+"</div>"+
  "<div class='dice' id='dice'></div><div class='msg' id='msg'></div><div id='after'></div>"+
  "<button class='sm' id='hint' "+(B.hints>0?"":"disabled")+">💡 Подсказка ("+B.hints+")</button>");
  [].forEach.call(document.querySelectorAll(".opt"),function(b){b.onclick=function(){answer(+b.dataset.i)}});
  document.getElementById("hint").onclick=useHint}

function useHint(){if(B.locked||B.hints<=0)return;B.hints--;
  var wrong=[];B.q.o.forEach(function(_,i){if(i!==B.q.a)wrong.push(i)});shuffle(wrong).slice(0,2).forEach(function(i){var b=document.querySelector(".opt[data-i='"+i+"']");b.disabled=true;b.style.visibility="hidden"});
  var hb=document.getElementById("hint");hb.disabled=true;hb.textContent="💡 Подсказка ("+B.hints+")"}

function answer(i){
  if(B.locked)return;B.locked=true;var ok=i===B.q.a,btns=document.querySelectorAll(".opt");
  [].forEach.call(btns,function(b){b.disabled=true});
  btns[B.q.a].classList.add("right");if(!ok)btns[i].classList.add("wrong");
  var lvlMsg=recordAnswer(B.subj,ok);B.n++;
  if(!ok){B.hearts--;snd.bad();
    document.getElementById("msg").textContent="Промах! −1 сердце. "+sayc("miss");
    document.getElementById("after").innerHTML="<div class='expl'>💬 "+esc(B.q.e)+(lvlMsg?"<br><b>"+lvlMsg+"</b>":"")+"</div>";
    document.querySelector(".top span:last-child").textContent=heartsHtml();
    finishStep(false);return}
  snd.ok();S.score+=10*S.subj[B.subj].lvl;B.pts+=10*S.subj[B.subj].lvl;
  var dice=document.getElementById("dice"),k=0,iv=setInterval(function(){
    dice.textContent="🎲 "+(1+rnd(20));snd.tick();k++;
    if(k>9){clearInterval(iv);var r=1+rnd(20),bonus=CLS[S.cls].bonus,tot=r+bonus,dmg=1;
      if(r===20)dmg=99;else if(tot>=15)dmg=2;
      dice.textContent="🎲 "+r+(bonus?" +"+bonus:"");
      B.hp=Math.max(0,B.hp-dmg);
      var mon=document.getElementById("mon");mon.classList.add("hit");
      var healed="";
      if(CLS[S.cls].heal&&dmg>=2&&B.hearts<B.maxh){B.hearts++;healed=" Укус! +1 сердце.";document.querySelector(".top span:last-child").textContent=heartsHtml()}
      document.getElementById("msg").textContent=(r===20?say("crit"):(dmg===2?"Сильный удар (−2)! ":"Удар (−1). ")+sayc("hit"))+healed;
      document.getElementById("after").innerHTML=lvlMsg?"<div class='expl'><b>"+lvlMsg+"</b></div>":"";
      var pp=document.querySelector(".pips");pp.textContent=pipsHtml();
      finishStep(true)}},70)}

function finishStep(ok){
  var after=document.getElementById("after"),win=B.hp<=0,lose=B.hearts<=0,flee=!win&&!lose&&B.asked>=7;
  if(!(win||lose||flee)){after.insertAdjacentHTML("beforeend","<button class='main' id='nx'>Дальше →</button>");
    document.getElementById("nx").onclick=function(){nextQuestion(ok?say("fight"):"Соберись, ты справишься!")};return}
  after.insertAdjacentHTML("beforeend","<button class='main' id='nx'>Продолжить</button>");
  document.getElementById("nx").onclick=function(){endBattle(win?"win":(lose?"lose":"flee"))}}

function endBattle(res){
  S.battles++;var m=B.m,extra="";
  if(res==="win"){S.coll[m.id]=(S.coll[m.id]||0)+1;S.pages++;S.score+=20;B.pts+=20;snd.win();extra="<div class='mon'>"+m.e+"</div><b>"+m.n+"</b> теперь в твоей коллекции!<br>+1 страница Книги, +20 очков"}
  else extra="<div class='mon'>"+m.e+"</div>"+(res==="lose"?"Сердца закончились, но ты узнал новое.":"Монстр сбежал.");
  if(B.pts>S.best)S.best=B.pts;save();
  var tt=res==="win"?"Победа!":(res==="lose"?"Не получилось":"Монстр сбежал");
  h("<h1>"+(res==="win"?"🎉 ":"")+tt+"</h1><div class='narr'><b>Рассказчик:</b> "+say(res==="win"?"win":res)+"</div><div class='card' style='text-align:center'>"+extra+"<p>Очки за бой: <b>"+B.pts+"</b></p></div>"+
  "<button class='main' id='again'>Ещё бой</button><button id='home'>На карту</button>");
  var sid=B.subj;document.getElementById("again").onclick=function(){startBattle(sid)};document.getElementById("home").onclick=screenHome}

/* напоминание об отдыхе */
setInterval(function(){if(S&&S.limit&&!timeWarned&&Date.now()-timerStart>30*60*1000){timeWarned=true;toast("Ты играешь уже 30 минут. Может, отдохнёшь, разомнёшься? (напоминание можно выключить в настройках)")}},30000);

/* старт */
load();
if(typeof document!=="undefined"&&$app){if(S&&S.nick)screenHome();else screenStart()}
