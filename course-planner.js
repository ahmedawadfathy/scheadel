(function(){
"use strict";

const courseStorageName = "scheadel-course-selections-v1";
const coursePanel = document.getElementById("coursePanel");
const courseBaseList = document.getElementById("courseBaseList");
const courseAddedList = document.getElementById("courseAddedList");
const courseSourceLevel = document.getElementById("courseSourceLevel");
const courseSourceTrack = document.getElementById("courseSourceTrack");
const courseSourceSubject = document.getElementById("courseSourceSubject");
const courseOffersRoot = document.getElementById("courseOfferings");
const courseFeedback = document.getElementById("courseFeedback");
const courseSaveStatus = document.getElementById("courseSaveStatus");
let courseStorageAvailable = true;
let courseSettingsStore = courseReadSettings();
let courseDisplayedBundles = [];

function courseReadSettings(){
  try{
    const value = localStorage.getItem(courseStorageName);
    const parsed = value ? JSON.parse(value) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  }catch(error){
    courseStorageAvailable = false;
    return {};
  }
}
function coursePersistSettings(){
  try{
    localStorage.setItem(courseStorageName,JSON.stringify(courseSettingsStore));
    courseStorageAvailable = true;
    if(courseSaveStatus)courseSaveStatus.textContent="اختياراتك محفوظة على هذا الجهاز والمتصفح.";
  }catch(error){
    courseStorageAvailable = false;
    if(courseSaveStatus)courseSaveStatus.textContent="الحفظ غير متاح في المعاينة الحالية؛ اختياراتك مؤقتة لحد ما تقفل الصفحة.";
  }
}
function courseProfileKey(){
  return [levelSelect.value,catSelect.value,sectionSelect.value].join("|");
}
function courseBaseEvents(){
  const level=levelSelect.value,category=catSelect.value,section=sectionSelect.value;
  return DATA.events.filter(function(event){
    return event.level===level && catId(event)===category && event.section===section;
  });
}
function courseCurrentSettings(){
  const defaults=[...new Set(courseBaseEvents().map(courseId))];
  const stored=courseSettingsStore[courseProfileKey()];
  if(!stored || typeof stored!=="object"){
    return {selectedCourseIds:defaults,addedCourses:[]};
  }
  return {
    selectedCourseIds:Array.isArray(stored.selectedCourseIds)?stored.selectedCourseIds:defaults,
    addedCourses:Array.isArray(stored.addedCourses)?stored.addedCourses.filter(function(item){
      return item && typeof item==="object" && Array.isArray(item.eventKeys);
    }):[]
  };
}
function courseSaveCurrentSettings(settings){
  courseSettingsStore[courseProfileKey()]={
    selectedCourseIds:[...new Set(settings.selectedCourseIds)],
    addedCourses:settings.addedCourses
  };
  coursePersistSettings();
}
function courseEventKey(event){
  return [
    event.day,event.level,event.group||"",event.track||"",event.section,
    event.start,event.end,normalizeArabic(event.text),event.page||""
  ].join("¦");
}
const courseEventByKey=new Map(DATA.events.map(function(event){
  return [courseEventKey(event),event];
}));

const courseDisplayAliases=new Map([
  [normalizeArabic("قواعد بيانات"),"قواعد البيانات"],
  [normalizeArabic("قواعد بيانات 2"),"قواعد البيانات 2"],
  [normalizeArabic("قواعد بيانات2"),"قواعد البيانات 2"],
  [normalizeArabic("هندسة برمجيات"),"هندسة البرمجيات"],
  [normalizeArabic("نظم تشغيل"),"نظم التشغيل"],
  [normalizeArabic("بحوثعمليات"),"بحوث عمليات"],
  [normalizeArabic("الرؤيةبالحاسب"),"الرؤية بالحاسب"],
  [normalizeArabic("الوكلاء الذكي"),"الوكلاء الأذكياء"],
  [normalizeArabic("أساسيات علوم الحاسب"),"أساسيات علوم الحاسب"]
]);
function courseActivityTitle(event){
  return details(event).title.trim();
}
function courseCanonicalTitle(title){
  let clean=String(title||"").normalize("NFKC").trim();
  clean=clean.replace(/\s+(?:عملي|عملى|تمارين|تمرين)$/u,"");
  clean=clean.replace(/^(?:عملي|عملى)\s+/u,"");
  clean=clean.replace(/\s+/g," ").trim();
  return courseDisplayAliases.get(normalizeArabic(clean))||clean;
}
function courseId(event){
  return normalizeArabic(courseCanonicalTitle(courseActivityTitle(event)));
}
function courseScopeTitle(event){
  if(event.group)return "المجموعة "+AR(event.group);
  if(event.track)return "التخصص "+event.track;
  return "المجموعة غير محددة";
}
function courseSourceEvents(level,track){
  return DATA.events.filter(function(event){
    return event.level===level && (!track || event.track===track);
  });
}
function courseCatalog(level,track){
  const items=new Map();
  for(const event of courseSourceEvents(level,track)){
    const id=courseId(event);
    if(!items.has(id))items.set(id,{id:id,title:courseCanonicalTitle(courseActivityTitle(event)),count:0});
    items.get(id).count++;
  }
  return [...items.values()].sort(function(a,b){return a.title.localeCompare(b.title,"ar");});
}
function courseBundles(courseKey,level,track){
  const sections=new Map();
  const rows=DATA.events.filter(function(event){
    return event.level===level && courseId(event)===courseKey && (!track || event.track===track);
  });
  for(const event of rows){
    const key=[event.level,catId(event),event.section].join("¦");
    if(!sections.has(key))sections.set(key,{scopeId:catId(event),section:event.section,events:[]});
    sections.get(key).events.push(event);
  }
  const bundles=new Map();
  for(const entry of sections.values()){
    const unique=new Map();
    for(const event of entry.events)unique.set(courseEventKey(event),event);
    const meetings=[...unique.values()].sort(function(a,b){
      return ORDER.indexOf(a.day)-ORDER.indexOf(b.day)||mins(a.start)-mins(b.start)||mins(a.end)-mins(b.end)||courseActivityTitle(a).localeCompare(courseActivityTitle(b),"ar");
    });
    if(!meetings.length)continue;
    const scheduleSignature=meetings.map(function(event){
      const teacher=staffInfo(event);
      return [
        event.day,event.start,event.end,normalizeArabic(courseActivityTitle(event)),
        teacher?teacher.role+":"+normalizeArabic(teacher.name):"",
        normalizeArabic(roomOf(event))
      ].join("¦");
    }).join("§");
    const bundleKey=entry.scopeId+"§"+scheduleSignature;
    if(!bundles.has(bundleKey)){
      bundles.set(bundleKey,{scopeId:entry.scopeId,scope:meetings[0],sections:[],meetings:meetings});
    }
    bundles.get(bundleKey).sections.push(entry.section);
  }
  return [...bundles.values()].map(function(bundle){
    bundle.sections=[...new Set(bundle.sections)].sort(function(a,b){return Number(a)-Number(b);});
    return bundle;
  }).sort(function(a,b){
    const scopeA=courseScopeTitle(a.scope),scopeB=courseScopeTitle(b.scope);
    return scopeA.localeCompare(scopeB,"ar")||Number(a.sections[0])-Number(b.sections[0]);
  });
}
function courseEventsForSection(courseKey,level,scopeId,section){
  return DATA.events.filter(function(event){
    return event.level===level && catId(event)===scopeId && event.section===section && courseId(event)===courseKey;
  });
}
function courseScheduleId(courseKey,level,scopeId,section){
  return JSON.stringify([courseKey,level,scopeId,section]);
}
function courseFormatTeacher(event){
  const teacher=staffInfo(event);
  if(!teacher)return "اسم المدرّس غير مذكور";
  return (teacher.role==="د"?"د/ ":"م/ ")+teacher.name;
}
function courseHtml(value){
  return String(value).replace(/[&<>"']/g,function(character){
    return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[character];
  });
}
function courseRefreshSourceSelectors(preferred){
  const oldLevel=preferred&&preferred.level||courseSourceLevel.value||levelSelect.value;
  const oldTrack=preferred&&preferred.track||courseSourceTrack.value;
  const oldSubject=preferred&&preferred.subject||courseSourceSubject.value;
  const levels=[...new Set(DATA.students.map(function(student){return student.level;}))].sort(function(a,b){return Number(a)-Number(b);});
  courseSourceLevel.innerHTML="";
  addOption(courseSourceLevel,"","اختار المستوى");
  for(const level of levels)addOption(courseSourceLevel,level,"المستوى "+(levelNames[level]||level));
  courseSourceLevel.value=levels.includes(oldLevel)?oldLevel:(levels.includes(levelSelect.value)?levelSelect.value:levels[0]||"");

  const level=courseSourceLevel.value;
  const tracks=[...new Set(DATA.students.filter(function(student){return student.level===level&&student.track;}).map(function(student){return student.track;}))].sort(function(a,b){return a.localeCompare(b,"ar");});
  courseSourceTrack.innerHTML="";
  if(!tracks.length){
    addOption(courseSourceTrack,"","مشترك بين مجموعات المستوى");
    courseSourceTrack.disabled=true;
  }else{
    addOption(courseSourceTrack,"","اختار التخصص");
    for(const track of tracks)addOption(courseSourceTrack,track,track==="حسابات علمية"?track:track);
    const currentBaseTrack=level===levelSelect.value&&catSelect.value.indexOf("t:")===0?catSelect.value.slice(2):"";
    courseSourceTrack.value=tracks.includes(oldTrack)?oldTrack:(tracks.includes(currentBaseTrack)?currentBaseTrack:tracks[0]);
    courseSourceTrack.disabled=false;
  }

  const track=courseSourceTrack.disabled?"":courseSourceTrack.value;
  const courses=courseCatalog(level,track);
  courseSourceSubject.innerHTML="";
  const needsTrack=tracks.length>0&&!track;
  addOption(courseSourceSubject,"",needsTrack?"اختار التخصص الأول":"اختار المادة");
  for(const course of courses)addOption(courseSourceSubject,course.id,course.title);
  courseSourceSubject.disabled=needsTrack||!courses.length;
  courseSourceSubject.value=courses.some(function(course){return course.id===oldSubject;})?oldSubject:"";
  courseRenderOfferings();
}
function courseRenderBaseList(settings){
  const events=courseBaseEvents();
  const courses=new Map();
  for(const event of events){
    const id=courseId(event);
    if(!courses.has(id))courses.set(id,{id:id,title:courseCanonicalTitle(courseActivityTitle(event)),count:0});
    courses.get(id).count++;
  }
  const list=[...courses.values()].sort(function(a,b){return a.title.localeCompare(b.title,"ar");});
  if(!list.length){
    courseBaseList.innerHTML='<div class="course-empty">مفيش مواد ظاهرة في الجدول الأساسي للاختيار.</div>';
    return;
  }
  const selected=new Set(settings.selectedCourseIds);
  courseBaseList.innerHTML=list.map(function(course){
    return '<label class="course-choice"><input type="checkbox" data-base-course-id="'+courseHtml(course.id)+'" '+(selected.has(course.id)?"checked":"")+'><span><strong>'+courseHtml(course.title)+'</strong><small>'+AR(course.count)+' مواعيد في الجدول الأساسي</small></span></label>';
  }).join("");
  courseBaseList.querySelectorAll("[data-base-course-id]").forEach(function(input){
    input.addEventListener("change",function(){
      const current=courseCurrentSettings();
      const id=input.dataset.baseCourseId;
      if(input.checked&&!current.selectedCourseIds.includes(id))current.selectedCourseIds.push(id);
      if(!input.checked)current.selectedCourseIds=current.selectedCourseIds.filter(function(value){return value!==id;});
      courseSaveCurrentSettings(current);
      render();
    });
  });
}
function courseRenderSavedAdditions(settings){
  const eventDescriptions=[];
  settings.addedCourses.forEach(function(added,index){
    const events=added.eventKeys.map(function(key){return courseEventByKey.get(key);}).filter(Boolean);
    if(!events.length)return;
    const first=events[0];
    const schedule=events.map(function(event){
      const teacher=courseFormatTeacher(event),room=roomOf(event);
      return event.day+" "+clock(event.start)+"–"+clock(event.end)+" · "+teacher+" · "+room;
    }).join("؛ ");
    const scope=courseScopeTitle(first)+" · سكشن "+AR(first.section);
    eventDescriptions.push('<article class="course-added-item"><div><strong>'+courseHtml(added.title||courseCanonicalTitle(courseActivityTitle(first)))+'</strong><small>من المستوى '+courseHtml(levelNames[first.level]||first.level)+' · '+courseHtml(scope)+'<br>'+courseHtml(schedule)+'</small></div><button class="course-remove" type="button" data-remove-added="'+index+'">إزالة من جدولي</button></article>');
  });
  courseAddedList.innerHTML=eventDescriptions.length?eventDescriptions.join(""):'<div class="course-empty">لسه مفيش مواد مضافة من مستوى أو تخصص آخر.</div>';
  courseAddedList.querySelectorAll("[data-remove-added]").forEach(function(button){
    button.addEventListener("click",function(){
      const current=courseCurrentSettings();
      current.addedCourses.splice(Number(button.dataset.removeAdded),1);
      courseSaveCurrentSettings(current);
      render();
    });
  });
}
function courseRenderOfferings(){
  courseFeedback.textContent="";
  courseFeedback.classList.remove("error");
  const level=courseSourceLevel.value;
  const track=courseSourceTrack.disabled?"":courseSourceTrack.value;
  const subject=courseSourceSubject.value;
  if(!level||!subject){
    courseDisplayedBundles=[];
    courseOffersRoot.innerHTML='<div class="course-empty">اختار المستوى والتخصص والمادة عشان تشوف مواعيدها المتاحة.</div>';
    return;
  }
  const bundles=courseBundles(subject,level,track);
  courseDisplayedBundles=bundles;
  if(!bundles.length){
    courseOffersRoot.innerHTML='<div class="course-empty">المادة دي مش ظاهرة في جدول الترم الحالي، فمش هقدر أعرض لها مواعيد مؤكدة.</div>';
    return;
  }
  const settings=courseCurrentSettings();
  const savedById=new Map(settings.addedCourses.map(function(item){return [item.id,item];}));
  courseOffersRoot.innerHTML='<div class="course-offer-list">'+bundles.map(function(bundle,index){
    const matchingSaved=settings.addedCourses.find(function(item){
      return item.courseId===subject&&item.level===level&&item.scopeId===bundle.scopeId&&bundle.sections.includes(item.section);
    });
    const defaultSection=matchingSaved?matchingSaved.section:(bundle.sections.length===1?bundle.sections[0]:"");
    const selected=!!matchingSaved||bundles.length===1;
    const sectionOptions=['<option value="">اختار السكشن</option>'].concat(bundle.sections.map(function(section){
      return '<option value="'+courseHtml(section)+'" '+(String(section)===String(defaultSection)?"selected":"")+'>سكشن '+AR(section)+'</option>';
    })).join("");
    const meetings=bundle.meetings.map(function(event){
      return '<div class="course-meeting"><div class="course-meeting-time">'+clock(event.start)+' – '+clock(event.end)+'</div><div class="course-meeting-info"><strong>'+courseHtml(event.day)+' · '+courseHtml(courseActivityTitle(event))+'</strong><small>'+courseHtml(courseFormatTeacher(event))+' · '+courseHtml(roomOf(event))+'</small></div></div>';
    }).join("");
    return '<article class="course-offer '+(selected?"is-selected":"")+'" data-course-offer-card="'+index+'"><div class="course-offer-head"><input type="radio" name="courseOfferChoice" value="'+index+'" '+(selected?"checked":"")+'><strong>اختيار الشعبة دي</strong></div><div class="course-offer-scope"><span class="course-scope-pill">'+courseHtml(courseScopeTitle(bundle.scope))+'</span><span class="course-scope-pill">السكاشن المتاحة: '+courseHtml(sectionList(bundle.sections))+'</span></div><label class="course-offer-section">السكشن اللي هتحضره<select data-course-offer-section="'+index+'">'+sectionOptions+'</select></label><div class="course-offer-meetings">'+meetings+'</div></article>';
  }).join("")+'</div>';
  courseOffersRoot.querySelectorAll('input[name="courseOfferChoice"]').forEach(function(radio){
    radio.addEventListener("change",function(){
      courseOffersRoot.querySelectorAll("[data-course-offer-card]").forEach(function(card){card.classList.toggle("is-selected",card.dataset.courseOfferCard===radio.value);});
    });
  });
  courseOffersRoot.querySelectorAll("[data-course-offer-section]").forEach(function(select){
    select.addEventListener("change",function(){
      const card=select.closest("[data-course-offer-card]");
      const radio=card.querySelector('input[name="courseOfferChoice"]');
      if(select.value)radio.checked=true;
      courseOffersRoot.querySelectorAll("[data-course-offer-card]").forEach(function(item){item.classList.toggle("is-selected",item===card&&radio.checked);});
    });
  });
}
function courseRenderPanel(){
  const settings=courseCurrentSettings();
  courseRenderBaseList(settings);
  courseRenderSavedAdditions(settings);
  courseRefreshSourceSelectors();
  if(!courseStorageAvailable&&courseSaveStatus)courseSaveStatus.textContent="الحفظ على الجهاز غير متاح هنا؛ الاختيارات ستفضل لحد ما تقفل الصفحة.";
}
function courseAddChosenSchedule(){
  courseFeedback.classList.remove("error");
  const checked=courseOffersRoot.querySelector('input[name="courseOfferChoice"]:checked');
  if(!checked){
    courseFeedback.textContent="اختار مجموعة أو شعبة من المواعيد المعروضة الأول.";
    courseFeedback.classList.add("error");
    return;
  }
  const index=Number(checked.value);
  const bundle=courseDisplayedBundles[index];
  const sectionSelect=courseOffersRoot.querySelector('[data-course-offer-section="'+index+'"]');
  const section=sectionSelect&&sectionSelect.value;
  if(!bundle||!section){
    courseFeedback.textContent="اختار السكشن اللي هتحضره للمجموعة دي.";
    courseFeedback.classList.add("error");
    return;
  }
  const level=courseSourceLevel.value;
  const subject=courseSourceSubject.value;
  const events=courseEventsForSection(subject,level,bundle.scopeId,section);
  if(!events.length){
    courseFeedback.textContent="ملقتش مواعيد مسجلة للسكشن المختار في جدول الترم الحالي.";
    courseFeedback.classList.add("error");
    return;
  }
  const added={
    id:courseScheduleId(subject,level,bundle.scopeId,section),
    courseId:subject,
    title:courseCanonicalTitle(courseActivityTitle(events[0])),
    level:level,
    scopeId:bundle.scopeId,
    section:String(section),
    eventKeys:events.map(courseEventKey)
  };
  const settings=courseCurrentSettings();
  settings.addedCourses=settings.addedCourses.filter(function(item){return item.id!==added.id;});
  settings.addedCourses.push(added);
  courseSaveCurrentSettings(settings);
  courseFeedback.textContent="اتضافت مواعيد المادة لجدولك الشخصي.";
  render();
}
document.getElementById("addCourseOffering").addEventListener("click",courseAddChosenSchedule);
document.getElementById("resetCourseSettings").addEventListener("click",function(){
  delete courseSettingsStore[courseProfileKey()];
  coursePersistSettings();
  courseFeedback.textContent="رجعنا مواد الجدول الأساسي وحذفنا المواد المضافة لهذا الاختيار.";
  render();
});
courseSourceLevel.addEventListener("change",function(){courseRenderPanel();});
courseSourceTrack.addEventListener("change",function(){courseRenderPanel();});
courseSourceSubject.addEventListener("change",function(){courseRenderPanel();});

const courseOriginalSelectedEvents=selectedEvents;
selectedEvents=function(day){
  const settings=courseCurrentSettings();
  const selected=new Set(settings.selectedCourseIds);
  const base=courseBaseEvents().filter(function(event){return selected.has(courseId(event));});
  const extras=[];
  for(const added of settings.addedCourses){
    for(const key of added.eventKeys){
      const event=courseEventByKey.get(key);
      if(event)extras.push(Object.assign({},event,{_courseAdded:true}));
    }
  }
  const seen=new Set();
  return base.concat(extras).filter(function(event){
    const key=courseEventKey(event);
    if(seen.has(key))return false;
    seen.add(key);
    return !day||event.day===day;
  }).sort(function(a,b){
    return ORDER.indexOf(a.day)-ORDER.indexOf(b.day)||mins(a.start)-mins(b.start)||mins(a.end)-mins(b.end);
  });
};
const courseOriginalRenderEvent=renderEvent;
renderEvent=function(event,compact){
  const html=courseOriginalRenderEvent(event,compact);
  if(!event._courseAdded)return html;
  const scope=courseScopeTitle(event)+" · سكشن "+AR(event.section);
  const note='<div class="'+(compact?"mini-detail":"details")+' course-origin">مادة مضافة من المستوى '+courseHtml(levelNames[event.level]||event.level)+' · '+courseHtml(scope)+'</div>';
  const ending=compact?"</div></div>":"</div></article>";
  const index=html.lastIndexOf(ending);
  return index<0?html:html.slice(0,index)+note+html.slice(index);
};
const courseOriginalRender=render;
render=function(){
  courseOriginalRender();
  courseRenderPanel();
};
render();
})();