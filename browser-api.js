(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory();
 else root.PreviewApi=async function(mode,action,payload){
  let storage;try{storage=root.localStorage}catch(e){throw Error('浏览器未允许本地保存，请在普通浏览器窗口中打开。')}
  return factory().createBrowserApi(root.Awareness,storage)(mode,action,payload);
 };
})(typeof window!=='undefined'?window:this,function(){
 'use strict';
 const prefix='awareness28-public-v1:';
 function empty(){return {version:1,profile:null,entries:[],assessments:[]}}
 function seed(D,date,at){
  const data=empty(),start=D.addDays(date,-11);
  data.profile={nickname:'小满（虚构示例）',startedOn:start,createdAt:at};
  data.assessments=[{milestone:0,answers:[2,3,2,2,3,2],createdAt:at}];
  const ids=['calm','anxious','happy','hurt','calm','grateful','anxious','relieved','calm'];
  data.entries=ids.map((id,i)=>{const light=i===3||i===7;return {date:D.addDays(start,[0,1,2,3,5,6,7,8,10][i]),kind:light?'light':'full',emotionIds:[id],dominant:id,intensity:[3,6,5,7,2,5,4,3,3][i],eventType:light?'':['work','work','social','self','ordinary','family','work','health','self'][i],eventTime:light?'':i===1?'years':'today',bodyIds:light?[]:['shoulder'],reactionIds:light?[]:[i%2?'support':'soothe'],effect:light?'':'better',title:light?'':'示例：给自己留了一点空间',narrative:'此处为虚构体验数据，没有真实学员信息。',thought:'先听听自己现在的感受。',otherEmotion:'',otherBody:'',otherReaction:'',otherEvent:'',isBackfill:false,createdAt:at,updatedAt:at}});
  return data;
 }
 function answers(a){if(!Array.isArray(a)||a.length!==6||a.some(v=>!Number.isInteger(v)||v<1||v>5))throw Error('请完成6道自我回顾题');return a.slice()}
 function createBrowserApi(D,storage,now=()=>new Date()){
  return async function api(mode,action,p={}){
   if(!['sample','blank'].includes(mode))throw Error('体验入口无效');
   if(action.startsWith('admin')||action==='setReviewConsent')throw Error('此测试站没有管理与人工阅读服务');
   const key=prefix+mode,date=D.today(now()),at=now().toISOString();
   const write=value=>{try{storage.setItem(key,JSON.stringify(value))}catch(e){throw Error('保存失败：浏览器存储不可用或空间不足。请保留当前填写内容后重试。')}};
   let raw;try{raw=storage.getItem(key)}catch(e){throw Error('浏览器未允许读取本地记录，请使用普通浏览器窗口。')}
   let data;
   if(raw===null){data=mode==='sample'?seed(D,date,at):empty();write(data)}
   else {try{data=JSON.parse(raw);if(data.version!==1||!Array.isArray(data.entries)||!Array.isArray(data.assessments)||!(data.profile===null||typeof data.profile==='object'))throw Error()}catch(e){throw Error('本地记录格式损坏。请先备份浏览器数据，再清除此站点存储。')}}
   const state=()=>({profile:data.profile,entries:[...data.entries].sort((a,b)=>b.date.localeCompare(a.date)),assessments:data.assessments,report:D.report(data.entries),today:date,day:data.profile?Math.max(1,Math.min(28,D.dayDiff(date,data.profile.startedOn)+1)):1,isAdmin:false});
   if(action==='state')return state();
   if(action==='enroll'){
    if(data.profile)return state();if(p.consent!==true)throw Error('请先阅读并同意记录保存说明');
    const a=answers(p.answers);data.profile={nickname:D.clean(p.nickname,24)||'我的28天',startedOn:date,consentVersion:'browser-preview-v1',createdAt:at};
    data.assessments=[{milestone:0,answers:a,createdAt:at}];write(data);return state();
   }
   if(!data.profile)throw Error('请先完成入营自我回顾');
   if(action==='saveEntry'){
    const existing=data.entries.find(e=>e.date===p.date),value=D.validateEntry(p,{today:date,startedOn:data.profile.startedOn,existing:!!existing});
    const row={...value,isBackfill:existing?existing.isBackfill:value.isBackfill,createdAt:existing?.createdAt||at,updatedAt:at};
    data.entries=data.entries.filter(e=>e.date!==p.date).concat(row);write(data);return state();
   }
   if(action==='deleteEntry'){if(!D.validDate(p.date))throw Error('日期无效');data.entries=data.entries.filter(e=>e.date!==p.date);write(data);return state()}
   if(action==='assessment'){
    if(![14,28].includes(p.milestone))throw Error('回顾节点无效');if(D.dayDiff(date,data.profile.startedOn)+1<p.milestone)throw Error('尚未到达这次回顾的日期');
    const a=answers(p.answers);data.assessments=data.assessments.filter(x=>x.milestone!==p.milestone).concat({milestone:p.milestone,answers:a,createdAt:at});write(data);return state();
   }
   if(action==='export')return {...state(),exportedAt:at};
   if(action==='deleteAccount'){if(p.confirm!=='删除我的记录')throw Error('请确认删除');data=empty();write(data);return state()}
   throw Error('未知操作');
  };
 }
 return {createBrowserApi};
});
