(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.Awareness=factory()})(this,function(){
  'use strict';
  const emotions=[
    ['happy','开心','pleasant','#e0ad67'],['grateful','感激','pleasant','#d4a36e'],['relieved','释然','pleasant','#9ba781'],['hopeful','期待','pleasant','#c1ae74'],['proud','满足','pleasant','#b1a57a'],['calm','平静','neutral','#8baea3'],['flat','平淡','neutral','#a9b8af'],['mixed','复杂','mixed','#aaa0b6'],['unclear','说不清','unknown','#b4b3ad'],['anxious','焦虑','unpleasant','#b5a1b5'],['sad','难过','unpleasant','#8fa7bd'],['angry','生气','unpleasant','#c79485'],['hurt','委屈','unpleasant','#bba0af'],['afraid','害怕','unpleasant','#a1a3ba'],['lonely','孤独','unpleasant','#9aabba'],['tired','疲惫','unpleasant','#aaad9c'],['other','其他','unknown','#b4b3ad']
  ].map(([id,label,valence,color])=>({id,label,valence,color}));
  const options=(xs)=>xs.map(([id,label])=>({id,label}));
  const eventTimes=options([['today','当天发生'],['recent','前几天至一个月内'],['months','一个月到一年内'],['years','一年以前'],['unclear','记不清']]);
  const eventTypes=options([['work','工作与学习'],['relationship','亲密关系'],['family','家庭'],['social','朋友与社交'],['self','自我期待'],['health','身体与健康'],['money','金钱与生活'],['memory','往事与回忆'],['ordinary','普通的一天'],['other','其他']]);
  const bodies=options([['relaxed','身体放松'],['warm','胸口温暖'],['light','轻盈有力'],['chest','胸口紧'],['heart','心跳加快'],['stomach','胃部不适'],['shoulder','肩颈紧绷'],['tear','眼眶湿润'],['tired','身体乏力'],['none','无明显感受'],['other','其他']]);
  const reactions=options([['hold','没有表达，自己忍着'],['leave','暂时离开那个情境'],['ruminate','反复想着这件事'],['support','向别人讲述或寻求支持'],['boundary','表达需要或边界'],['soothe','做了让自己舒服的事'],['share','分享喜悦'],['none','没有明显行动'],['other','其他']]);
  const effects=options([['better','缓和一些'],['same','差不多'],['worse','更难受'],['unclear','暂时不清楚']]);
  const baselineQuestions=['我能给自己的情绪起一个具体的名字','我能分清发生的事情和自己的猜测','我能察觉情绪带来的身体变化','我能注意到自己习惯怎样回应情绪','我知道什么方式能给自己一点支持','情绪出现时，我能少责备自己一点'];
  const weeks=[{title:'情绪觉察与命名',question:'哪种情绪，以前常被我忽略？',hint:'先给感受一个名字，不急着改变它。'},{title:'事件与触发源',question:'哪些情境更容易牵动我？',hint:'发生了什么，与我怎样理解它，可以分开看看。'},{title:'认识反应模式',question:'我的应对方式，哪些时候有帮助？',hint:'看见自己的反应，也看看它怎样保护过你。'},{title:'整合与小改变',question:'下一次，我愿意尝试什么？',hint:'一个很小、愿意去做的改变，就已经足够。'}];
  function today(value){const date=value?new Date(value):new Date();return new Date(date.getTime()+8*3600000).toISOString().slice(0,10)}
  function validDate(s){return typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s}
  function dayDiff(a,b){return Math.round((Date.parse(a)-Date.parse(b))/86400000)}
  function addDays(date,n){return new Date(Date.parse(date)+n*86400000).toISOString().slice(0,10)}
  function clean(v,max=1000){if(v==null)return '';if(typeof v!=='string'||v.length>max)throw Error('文字内容超出长度限制');return v.trim()}
  function one(v,list,name,required=true){if(!v&&!required)return '';if(!list.some(x=>x.id===v))throw Error('请选择'+name);return v}
  function many(v,list,name,required=false){if(!Array.isArray(v)||v.length>30)throw Error('请检查'+name);const a=[...new Set(v)];if(required&&!a.length)throw Error('请选择'+name);a.forEach(x=>one(x,list,name));return a}
  function validateEntry(v,ctx){
    if(!v||!validDate(v.date))throw Error('记录日期无效');
    if(!validDate(ctx.startedOn)||dayDiff(v.date,ctx.startedOn)<0)throw Error('不能记录入营之前的日期');
    if(dayDiff(v.date,ctx.startedOn)>27)throw Error('记录日期需在28天营期内');
    if(dayDiff(ctx.today,v.date)<0)throw Error('不能记录未来的日期');
    if(!ctx.existing&&dayDiff(ctx.today,v.date)>1)throw Error('新记录仅支持今天或补记昨天');
    if(!['full','light'].includes(v.kind))throw Error('记录类型无效');
    const emotionIds=many(v.emotionIds,emotions,'情绪',true);
    if(!emotionIds.includes(v.dominant))throw Error('主导情绪须从已选情绪中选择');
    if(typeof v.intensity!=='number'||!Number.isInteger(v.intensity)||v.intensity<0||v.intensity>10)throw Error('强度应为0到10的整数');
    const x={date:v.date,kind:v.kind,emotionIds,dominant:v.dominant,intensity:v.intensity,otherEmotion:clean(v.otherEmotion,100),otherValence:['pleasant','neutral','unpleasant','mixed','unknown'].includes(v.otherValence)?v.otherValence:'unknown',isBackfill:v.date!==ctx.today,eventTime:'',eventType:'',secondaryType:'',bodyIds:[],reactionIds:[],effect:'',title:'',thought:'',narrative:'',otherBody:'',otherReaction:'',otherEvent:''};
    if(emotionIds.includes('other')&&!x.otherEmotion)throw Error('请补充“其他”情绪的描述');
    if(v.kind==='full'){
      x.eventTime=one(v.eventTime,eventTimes,'事件发生时间');x.eventType=one(v.eventType,eventTypes,'事件类型');x.secondaryType=one(v.secondaryType,eventTypes,'次要事件类型',false);
      if(x.secondaryType===x.eventType)x.secondaryType='';
      x.bodyIds=many(v.bodyIds||[],bodies,'身体感受');x.reactionIds=many(v.reactionIds,reactions,'反应方式',true);x.effect=one(v.effect,effects,'反应之后的感受');
      for(const key of ['title','thought','narrative','otherBody','otherReaction','otherEvent'])x[key]=clean(v[key],key==='narrative'?4000:key==='title'?120:1000);
      if(x.bodyIds.includes('none')&&x.bodyIds.length>1)throw Error('无明显身体感受不能和其他感受同时选择');
      if(x.reactionIds.includes('none')&&x.reactionIds.length>1)throw Error('没有明显行动不能和其他反应同时选择');
      if(x.bodyIds.includes('other')&&!x.otherBody)throw Error('请补充其他身体感受');
      if(x.reactionIds.includes('other')&&!x.otherReaction)throw Error('请补充其他反应方式');
      if((x.eventType==='other'||x.secondaryType==='other')&&!x.otherEvent)throw Error('请补充其他事件类型');
    }
    return x;
  }
  function distribution(values,list,denominator){const counts={};for(const id of values)counts[id]=(counts[id]||0)+1;return Object.entries(counts).map(([id,count])=>({...list.find(x=>x.id===id),id,count,percent:Math.round(count/denominator*100)})).sort((a,b)=>b.count-a.count)}
  function report(entries){
    const full=entries.filter(x=>x.kind==='full');const valence={pleasant:0,neutral:0,unpleasant:0,mixed:0,unknown:0};
    for(const e of entries){const em=emotions.find(x=>x.id===e.dominant);valence[e.dominant==='other'?(e.otherValence||'unknown'):(em?.valence||'unknown')]++}
    const known=full.filter(x=>x.eventTime!=='unclear');const past=known.filter(x=>x.eventTime!=='today').length;
    return {total:entries.length,full:full.length,light:entries.length-full.length,valence,emotions:distribution(entries.map(x=>x.dominant),emotions,entries.length),events:distribution(full.map(x=>x.eventType),eventTypes,full.length),reactions:distribution(full.flatMap(x=>x.reactionIds),reactions,full.length),eventTimes:distribution(full.map(x=>x.eventTime),eventTimes,full.length),pastCount:past,pastDenominator:known.length,pastRate:known.length?Math.round(past/known.length*100):null,averageIntensity:entries.length?Math.round(entries.reduce((a,b)=>a+b.intensity,0)/entries.length*10)/10:null,curve:[...entries].sort((a,b)=>a.date.localeCompare(b.date)).map(x=>({date:x.date,value:x.intensity,dominant:x.dominant})),helpfulCount:full.filter(x=>x.effect==='better').length};
  }
  return {emotions,eventTimes,eventTypes,bodies,reactions,effects,baselineQuestions,weeks,today,addDays,dayDiff,validDate,validateEntry,report,clean};
});
