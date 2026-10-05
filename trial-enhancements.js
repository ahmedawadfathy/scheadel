(function(){
"use strict";

const profileStorageKey="scheadel-student-profile-trial-v1";
const trialSearch=byId("trialSearch");
const trialSearchResults=byId("trialSearchResults");
const profileStatus=byId("trialProfileStatus");
const nextClassRoot=byId("nextClassCard");
const conflictRoot=byId("courseConflictAlert");
const addOfferingButton=byId("addCourseOffering");
const calendarStatus=byId("calendarStatus");
const weekdayNumber={"الأحد":0,"الإثنين":1,"الثلاثاء":2,"الأربعاء":3,"الخميس":4,"الجمعة":5,"السبت":6};
let allowConflictedAdd=false;
let pendingConflict=null;

function html(value){return String(value==null?"":value).replace(/[&<>"']/g,function(character){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[character];});}
function normalized(value){return normalizeArabic(value).replace(/[٠-٩]/g,function(digit){return String("٠١٢٣٤٥٦٧٨٩".indexOf(digit));}).replace(/[۰-۹]/g,function(digit){return String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit));}).replace(/[\sـ._/\\-]/g,"");}
function eventKey(event){return JSON.stringify([event.day,event.level,event.group||"",event.track||"",event.section,event.start,event.end,event.text,event.page||""]);}
const eventIndexByKey=new Map(DATA.events.map(function(event,index){return [eventKey(event),index];}));
function eventIndex(event){return eventIndexByKey.get(eventKey(event));}
function teacherName(event){const teacher=staffInfo(event);return teacher?(teacher.role==="د"?"د/ ":"م/ ")+teacher.name:"";}
function sectionSummary(values){return [...new Set(values.map(String))].sort(function(a,b){return Number(a)-Number(b);}).map(AR).join("، ");}

function readProfile(){
  try{
    const saved=JSON.parse(localStorage.getItem(profileStorageKey)||"null");
    if(!saved||typeof saved!=="object")return false;
    fillLevels(String(saved.level||""));
    fillCategories(String(saved.category||""));
    fillSections(String(saved.section||""));
    return true;
  }catch(error){return false;}
}
function saveProfile(){
  try{
    localStorage.setItem(profileStorageKey,JSON.stringify({level:levelSelect.value,category:catSelect.value,section:sectionSelect.value}));
    profileStatus.textContent="اختيار المستوى والمجموعة والسكشن محفوظ على هذا الجهاز والمتصفح.";
  }catch(error){profileStatus.textContent="الحفظ غير متاح في المعاينة الحالية؛ الاختيار هيفضل لحد ما تقفل الصفحة.";}
}
const profileWasRestored=readProfile();
if(profileWasRestored)profileStatus.textContent="رجّعنا آخر مستوى ومجموعة وسكشن اخترتهم على هذا الجهاز.";
levelSelect.addEventListener("change",saveProfile);
catSelect.addEventListener("change",saveProfile);
sectionSelect.addEventListener("change",saveProfile);
if(!profileWasRestored)saveProfile();

function findVenue(room){
  const text=normalized(room);
  if(!text||text.includes("المكانغيرمحدد"))return null;
  const aliases={
    "hall-1":["قاعة١","room1"],"hall-2":["قاعة٢","room2"],"hall-3":["قاعة٣","room3"],"hall-4":["قاعة٤","room4"],"hall-5":["قاعة٥","room5"],"hall-6":["قاعة٦","room6"],"hall-7":["قاعة٧","room7"],"hall-8":["قاعة٨","room8"],"hall-9":["قاعة٩","room9"],"hall-10":["قاعة١٠","room10"],"hall-11":["قاعة١١","room11"],"hall-12":["قاعة١٢","room12"],
    "auditorium-1":["مدرج١","amphitheater1"],"auditorium-2":["مدرج٢","amphitheater2"],"auditorium-3":["مدرج٣","amphitheater3"],"auditorium-4":["مدرج٤","amphitheater4"],"auditorium-5":["مدرج٥","amphitheater5"],
    "huawei":["هواوي","huawei"],"iot":["iot","انترنتالاشياء"],"microprocessor":["المعالجدقيق","microprocessor"],"physics-1":["فيزياء١","physics1"],"physics-2":["فيزياء٢","physics2"],"multimedia":["الوسائط","multimedia"],"networks":["الشبكات","networks"],"logic-1":["لوجيك١","logic1"],"logic-2":["لوجيك٢","logic2"],"electronics-1":["الكترونيات١","الالكترونيات١","تصميممنطقي١"],"electronics-2":["الكترونيات٢","الالكترونيات٢","تصميممنطقي٢"],"vr":["الواقعالافتراضي","vr"]
  };
  let best=null,bestLength=0;
  Object.keys(VENUES).forEach(function(type){VENUES[type].forEach(function(venue){
    const terms=[normalized(venue.name),normalized(venue.id)].concat((aliases[venue.id]||[]).map(normalized));
    terms.forEach(function(term){if(term&&text.includes(term)&&term.length>bestLength){best={type:type,venue:venue};bestLength=term.length;}});
  });});
  return best;
}
function openVenue(type,venue){
  const panel=byId("venuePanel");
  panel.open=true;
  const typeButton=document.querySelector('[data-venue-type="'+type+'"]');
  if(typeButton)typeButton.click();
  venueSelect.value=venue.id;
  renderVenue();
  const map=venueResult.querySelector(".venue-map");
  if(map)map.open=true;
  panel.scrollIntoView({behavior:"smooth",block:"start"});
}
function addPlaceButton(event,index,compact){
  const match=findVenue(roomOf(event));
  if(!match)return "";
  return '<button class="trial-place-link" type="button" data-open-event-place="'+index+'">افتح دليل المكان</button>';
}
const baseRenderEvent=renderEvent;
renderEvent=function(event,compact){
  let rendered=baseRenderEvent(event,compact);
  const index=eventIndex(event);
  if(index===undefined)return rendered;
  const rootClass=compact?'mini':'event';
  rendered=rendered.replace('class="'+rootClass+'"','class="'+rootClass+' trial-event-ref" data-trial-event-index="'+index+'"');
  const place=addPlaceButton(event,index,compact);
  if(place){const ending=compact?"</div></div>":"</div></article>";const at=rendered.lastIndexOf(ending);if(at>=0)rendered=rendered.slice(0,at)+place+rendered.slice(at);}
  return rendered;
};

const searchRows=(function(){
  const grouped=new Map();
  DATA.events.forEach(function(event){
    const title=details(event).title,room=roomOf(event),category=catId(event);
    const key=[event.day,event.start,event.end,normalized(title),normalized(room),event.level,category].join("|");
    if(!grouped.has(key))grouped.set(key,{event:event,title:title,room:room,day:event.day,start:event.start,end:event.end,level:event.level,category:catLabel(event),sections:[]});
    grouped.get(key).sections.push(event.section);
  });
  return [...grouped.values()].sort(function(a,b){return ORDER.indexOf(a.day)-ORDER.indexOf(b.day)||mins(a.start)-mins(b.start)||a.title.localeCompare(b.title,"ar");});
})();
function renderSearch(){
  const query=normalized(trialSearch.value);
  if(!query){trialSearchResults.innerHTML="";return;}
  if(query.length<2){trialSearchResults.innerHTML='<div class="trial-search-count">اكتب حرفين على الأقل عشان نعرض نتائج مفيدة.</div>';return;}
  const found=searchRows.filter(function(row){
    const event=row.event;
    return [row.title,teacherName(event),row.room,row.day,row.category,row.levelNames,sectionSummary(row.sections)].some(function(value){return normalized(value).includes(query);});
  });
  if(!found.length){trialSearchResults.innerHTML='<div class="empty">ملقتش مادة أو مدرس أو مكان مطابق في الجدول الحالي.</div>';return;}
  const limit=16;
  trialSearchResults.innerHTML='<div class="trial-search-count">'+AR(found.length)+' نتيجة'+(found.length>limit?' · بنعرض أول '+AR(limit):'')+'</div>'+found.slice(0,limit).map(function(row){
    const index=eventIndex(row.event),venue=findVenue(row.room);
    const placeButton=venue?'<button type="button" data-open-search-place="'+index+'">افتح المكان</button>':'';
    return '<article class="trial-search-row"><div class="trial-search-time">'+clock(row.start)+' – '+clock(row.end)+'</div><div><div class="trial-search-title">'+html(row.title)+'</div><div class="trial-search-meta">'+html(row.day)+' · '+html(teacherName(row.event)||"المدرّس غير مذكور")+' · '+html(row.room)+'<br>المستوى '+html(levelNames[row.level]||row.level)+' · '+html(row.category)+' · السكاشن '+html(sectionSummary(row.sections))+'</div></div><div class="trial-row-actions"><button type="button" data-search-profile="'+index+'">اعرض الجدول</button>'+placeButton+'</div></article>';
  }).join("");
}
trialSearch.addEventListener("input",renderSearch);
function showProfileFor(event,index){
  fillLevels(event.level);
  fillCategories(catId(event));
  fillSections(event.section);
  showFullWeek=true;
  saveProfile();
  render();
  const card=document.querySelector('.trial-event-ref[data-trial-event-index="'+index+'"]');
  if(card){card.scrollIntoView({behavior:"smooth",block:"center"});card.classList.add("trial-highlight");window.setTimeout(function(){card.classList.remove("trial-highlight");},2200);}
}

function localDateForEvent(event,now){
  const current=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  let delta=(weekdayNumber[event.day]-now.getDay()+7)%7;
  if(delta===0){const currentMinutes=now.getHours()*60+now.getMinutes();if(currentMinutes>=mins(event.end))delta=7;}
  current.setDate(current.getDate()+delta);
  return current;
}
function formatDay(date){return new Intl.DateTimeFormat("ar-EG",{weekday:"long",day:"numeric",month:"long"}).format(date);}
function renderNextClass(){
  const events=selectedEvents();
  if(!events.length){nextClassRoot.innerHTML="<h2>المحاضرة القادمة</h2><div class=\"empty\">اختياراتك الحالية مفيهاش مواعيد ظاهرة.</div>";return;}
  const now=new Date();
  const choices=events.map(function(event){const date=localDateForEvent(event,now);return {event:event,date:date,stamp:new Date(date.getFullYear(),date.getMonth(),date.getDate(),Number(event.start.split(":")[0]),Number(event.start.split(":")[1])).getTime()};}).sort(function(a,b){return a.stamp-b.stamp;});
  let next=choices[0];
  for(const choice of choices){
    if(choice.date.toDateString()===now.toDateString()&&now.getHours()*60+now.getMinutes()>=mins(choice.event.start)&&now.getHours()*60+now.getMinutes()<mins(choice.event.end)){next=choice;break;}
  }
  const event=next.event,detail=details(event),venue=findVenue(roomOf(event));
  const isNow=next.date.toDateString()===now.toDateString()&&now.getHours()*60+now.getMinutes()>=mins(event.start)&&now.getHours()*60+now.getMinutes()<mins(event.end);
  const place=venue?'<button class="trial-place-link" type="button" data-open-event-place="'+eventIndex(event)+'">افتح دليل المكان</button>':'';
  nextClassRoot.innerHTML='<h2>المحاضرة القادمة</h2><div class="trial-next-content"><div class="trial-next-time">'+clock(event.start)+' – '+clock(event.end)+'</div><div><div class="trial-next-title">'+html(detail.title)+(isNow?' <span class="trial-next-now">جارية الآن</span>':'')+'</div><div class="trial-next-meta">'+(isNow?'النهارده':html(formatDay(next.date)))+' · '+html(teacherName(event)||detail.meta||"")+'<br>'+html(roomOf(event))+' · المستوى '+html(levelNames[event.level]||event.level)+' · '+html(catLabel(event))+' · سكشن '+html(AR(event.section))+'</div>'+place+'</div></div>';
}
const baseRender=render;
render=function(){baseRender();renderNextClass();};
render();

function clearConflict(){pendingConflict=null;conflictRoot.hidden=true;conflictRoot.innerHTML="";}
function overlap(a,b){return a.day===b.day&&mins(a.start)<mins(b.end)&&mins(b.start)<mins(a.end);}
function sameMeeting(a,b){const titleA=a.title||details(a).title,titleB=b.title||details(b).title;const roomA=a.room||roomOf(a),roomB=b.room||roomOf(b);return a.day===b.day&&a.start===b.start&&a.end===b.end&&normalized(titleA)===normalized(titleB)&&normalized(roomA)===normalized(roomB);}
function chosenOfferEvents(){
  const radio=document.querySelector('input[name="courseOfferChoice"]:checked');
  if(!radio)return null;
  const card=byId("courseOfferings").querySelector('[data-course-offer-card="'+radio.value+'"]');
  const sectionSelect=card&&card.querySelector('[data-course-offer-section]');
  if(!card||!sectionSelect||!sectionSelect.value)return null;
  let sectionMeetings;
  try{sectionMeetings=JSON.parse(card.dataset.courseOfferMeetings||"[]");}catch(error){return null;}
  const entry=sectionMeetings.find(function(item){return String(item.section)===String(sectionSelect.value);});
  return entry?{card:card,radio:radio,section:sectionSelect.value,events:entry.events||[]}:null;
}
function findConflicts(candidate){
  const existing=selectedEvents();
  const conflicts=[];
  candidate.events.forEach(function(proposed){
    existing.forEach(function(current){if(overlap(proposed,current)&&!sameMeeting(proposed,current))conflicts.push({proposed:proposed,current:current});});
  });
  candidate.events.forEach(function(proposed,index){candidate.events.slice(index+1).forEach(function(other){if(overlap(proposed,other)&&!sameMeeting(proposed,other))conflicts.push({proposed:proposed,current:other});});});
  return conflicts;
}
addOfferingButton.addEventListener("click",function(event){
  if(allowConflictedAdd){allowConflictedAdd=false;return;}
  clearConflict();
  const candidate=chosenOfferEvents();
  if(!candidate)return;
  const conflicts=findConflicts(candidate);
  if(!conflicts.length)return;
  event.preventDefault();
  event.stopImmediatePropagation();
  pendingConflict={card:candidate.card,section:candidate.section};
  const rows=conflicts.slice(0,8).map(function(conflict){
    const current=conflict.current;
    const currentTitle=current.title||details(current).title;
    return '<li>'+html(conflict.proposed.day)+' '+clock(conflict.proposed.start)+'–'+clock(conflict.proposed.end)+' يتعارض مع <strong>'+html(currentTitle)+'</strong> ('+clock(current.start)+'–'+clock(current.end)+')</li>';
  });
  conflictRoot.innerHTML='<h4>فيه تعارض في المواعيد</h4><div>الشعبة دي فيها موعد بيتداخل مع جدولك الحالي:</div><ul>'+rows.join("")+'</ul><div class="trial-conflict-actions"><button class="allow" type="button" data-trial-conflict-action="allow">أضف رغم التعارض</button><button class="cancel" type="button" data-trial-conflict-action="cancel">رجوع</button></div>';
  conflictRoot.hidden=false;
  conflictRoot.scrollIntoView({behavior:"smooth",block:"center"});
},true);

function dateAtWeekday(event,now){return localDateForEvent(event,now);}
function localDateCode(date){return [date.getFullYear(),String(date.getMonth()+1).padStart(2,"0"),String(date.getDate()).padStart(2,"0")].join("");}
function localTimeCode(time){return time.split(":").map(function(part){return String(Number(part)).padStart(2,"0");}).join("")+"00";}
function icsEscape(value){return String(value||"").replace(/\\/g,"\\\\").replace(/\r?\n/g,"\\n").replace(/,/g,"\\,").replace(/;/g,"\\;");}
function foldIcsLine(line){
  const encoder=new TextEncoder();let result="",current="",bytes=0;
  for(const character of line){const size=encoder.encode(character).length;if(bytes+size>75){result+=current+"\r\n ";current=character;bytes=1+size;}else{current+=character;bytes+=size;}}
  return result+current;
}
function nextEventDate(event,now){return dateAtWeekday(event,now);}
function calendarText(){
  const events=selectedEvents();
  if(!events.length)return {error:"مفيش مواعيد محددة في جدولك عشان نصدرها."};
  const endValue=byId("calendarUntil").value;
  const until=endValue?new Date(endValue+"T00:00:00"):null;
  if(endValue&&(!until||Number.isNaN(until.getTime())))return {error:"تاريخ نهاية الترم مش واضح."};
  const now=new Date(),stamp=now.toISOString().replace(/[-:]/g,"").replace(/\.\d{3}Z$/, "Z");
  const lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Scheadel Trial//Student Schedule//AR","CALSCALE:GREGORIAN","METHOD:PUBLISH"];
  let count=0;
  events.forEach(function(event,index){
    const first=nextEventDate(event,now);
    if(until&&new Date(first.getFullYear(),first.getMonth(),first.getDate())>until)return;
    const title=details(event).title;
    const teacher=teacherName(event);
    const location=roomOf(event);
    const description=[teacher,"المستوى "+(levelNames[event.level]||event.level),catLabel(event),"سكشن "+AR(event.section)].filter(Boolean).join(" · ");
    lines.push("BEGIN:VEVENT","UID:scheadel-trial-"+Date.now()+"-"+index+"@local","DTSTAMP:"+stamp,"DTSTART:"+localDateCode(first)+"T"+localTimeCode(event.start),"DTEND:"+localDateCode(first)+"T"+localTimeCode(event.end),"SUMMARY:"+icsEscape(title),"DESCRIPTION:"+icsEscape(description));
    if(location&&!location.includes("المكان غير محدد"))lines.push("LOCATION:"+icsEscape(location));
    if(until){
      const difference=Math.floor((Date.UTC(until.getFullYear(),until.getMonth(),until.getDate())-Date.UTC(first.getFullYear(),first.getMonth(),first.getDate()))/86400000);
      const recurrenceCount=Math.floor(difference/7)+1;
      lines.push("RRULE:FREQ=WEEKLY;COUNT="+recurrenceCount);
    }
    lines.push("END:VEVENT");count++;
  });
  if(!count)return {error:"تاريخ نهاية الترم أسبق من كل المواعيد القادمة."};
  lines.push("END:VCALENDAR");
  return {text:lines.map(foldIcsLine).join("\r\n")+"\r\n",count:count,recurring:!!until};
}
byId("exportCalendar").addEventListener("click",function(){
  const result=calendarText();
  if(result.error){calendarStatus.textContent=result.error;return;}
  try{
    const blob=new Blob(["\uFEFF"+result.text],{type:"text/calendar;charset=utf-8"});
    const url=URL.createObjectURL(blob),anchor=document.createElement("a");
    anchor.href=url;anchor.download="جدولي.ics";document.body.appendChild(anchor);anchor.click();anchor.remove();window.setTimeout(function(){URL.revokeObjectURL(url);},1000);
    calendarStatus.textContent=result.recurring?"اتصدر "+AR(result.count)+" موعدًا مع تكرار أسبوعي لحد التاريخ المختار.":"اتصدر "+AR(result.count)+" موعد قادم فقط لكل محاضرة.";
  }catch(error){calendarStatus.textContent="المتصفح منع تنزيل الملف؛ جرّب فتح المعاينة في نافذة متصفح كاملة.";}
});

document.addEventListener("click",function(event){
  const profileButton=event.target.closest("[data-search-profile]");
  if(profileButton){const index=Number(profileButton.dataset.searchProfile),row=DATA.events[index];if(row)showProfileFor(row,index);return;}
  const searchPlace=event.target.closest("[data-open-search-place]");
  const eventPlace=event.target.closest("[data-open-event-place]");
  if(searchPlace||eventPlace){const index=Number((searchPlace||eventPlace).dataset.openSearchPlace||(searchPlace||eventPlace).dataset.openEventPlace),row=DATA.events[index];const found=row&&findVenue(roomOf(row));if(found)openVenue(found.type,found.venue);return;}
  const conflictAction=event.target.closest("[data-trial-conflict-action]");
  if(conflictAction){
    const action=conflictAction.dataset.trialConflictAction;
    if(action==="cancel"){clearConflict();return;}
    const current=chosenOfferEvents();
    if(!pendingConflict||!current||current.card!==pendingConflict.card||String(current.section)!==String(pendingConflict.section)){clearConflict();return;}
    const remaining=findConflicts(current);
    if(!remaining.length){clearConflict();return;}
    clearConflict();allowConflictedAdd=true;addOfferingButton.click();return;
  }
  if(event.target.closest("#courseSourceLevel,#courseSourceTrack,#courseSourceSubject")||event.target.closest("[data-course-offer-section]")||event.target.closest('input[name="courseOfferChoice"]'))clearConflict();
});
})();

