// Deterministic fake values for admission rehearsal only. They are not model
// output, real user material or evidence of semantic quality.
export const offlineSampleSceneEvents=Object.freeze([
  Object.freeze([
    '\u5c0f\u8857\u7684\u6c34\u8ff9\u5411\u8def\u8fb9\u9000\u53bb\uff0c\u4e00\u4e2a\u4eba\u53c8\u8f7b\u6572\u676f\u6cbf\u4e24\u4e0b\u3002',
    '\u53e6\u4e00\u4e2a\u4eba\u628a\u6298\u8fc7\u7684\u8f66\u7968\u644a\u5728\u638c\u5fc3\uff0c\u53c8\u6cbf\u539f\u6298\u75d5\u5408\u4e0a\u3002',
    '\u4e24\u4eba\u8d70\u5230\u8857\u53e3\u505c\u4e0b\uff0c\u676f\u6cbf\u7684\u4f59\u97f3\u88ab\u4e00\u8f86\u7ecf\u8fc7\u7684\u8f66\u58f0\u76d6\u4f4f\u3002'
  ]),
  Object.freeze([
    '\u96e8\u505c\u540e\uff0c\u5c0f\u8857\u7684\u62db\u724c\u8fd8\u6ef4\u7740\u6c34\uff0c\u4e00\u4e2a\u4eba\u628a\u676f\u6cbf\u64e6\u5e72\u3002',
    '\u53e6\u4e00\u4e2a\u4eba\u4ece\u8863\u888b\u91cc\u6478\u51fa\u90a3\u5f20\u65e5\u671f\u6a21\u7cca\u7684\u8f66\u7968\uff0c\u770b\u4e86\u770b\u53c8\u653e\u56de\u53bb\u3002',
    '\u4e00\u8f86\u7a7a\u8f66\u5728\u8857\u53e3\u51cf\u901f\uff0c\u4e24\u4eba\u6ca1\u6709\u4e0a\u8f66\uff0c\u7ee7\u7eed\u5411\u524d\u8d70\u3002'
  ]),
  Object.freeze([
    '\u5c0f\u8857\u5c3d\u5934\u7684\u6c34\u6d3c\u6620\u51fa\u4e24\u4e2a\u4eba\u7684\u5f71\u5b50\uff0c\u4e00\u4e2a\u4eba\u7528\u6307\u5c16\u6572\u4e86\u6572\u7a7a\u676f\u3002',
    '\u53e6\u4e00\u4e2a\u4eba\u628a\u8f66\u7968\u5939\u8fdb\u4e00\u672c\u4e66\uff0c\u4e66\u9875\u88ab\u98ce\u5439\u5f97\u7ffb\u8fc7\u53bb\u3002',
    '\u8857\u706f\u4eae\u8d77\u65f6\uff0c\u4e24\u4eba\u505c\u5728\u5173\u4e86\u95e8\u7684\u5e97\u524d\uff0c\u8c01\u4e5f\u6ca1\u6709\u63d0\u8d77\u4e0b\u4e00\u6b21\u3002'
  ])
]);

export const offlineSampleFirstFeelings=Object.freeze([
  Object.freeze({status:'present',text:'\u521a\u9192\u65f6\uff0c\u68a6\u91cc\u7684\u4eba\u5148\u542c\u89c1\u7a97\u5916\u7684\u6c34\u58f0\uff0c\u8fc7\u4e86\u4e00\u4f1a\u513f\u624d\u60f3\u8d77\u624b\u91cc\u50cf\u662f\u7a7a\u7684\u3002'}),
  Object.freeze({status:'absent'}),
  Object.freeze({status:'uncertain'})
]);

export function offlineSampleResponse(request,callIndex){
  const material=JSON.parse(request.body.messages[1].content);
  let data;
  if(material.stage==='scene'){
    const runOrdinal=Math.floor(callIndex/4),index=material.sceneIndex;
    data={event:offlineSampleSceneEvents[runOrdinal]?.[index]??'A fixed fake scene.',
      appraisal:{goalEffect:0,control:.5,uncertainty:.5},
      basis:{goal:null,control:null,uncertainty:null},affect:{kind:'unchanged'}};
  }else{
    const runOrdinal=Math.floor(callIndex/4),scene=material.previousScenes[2];
    data={fragment:scene.event,associations:[],
      residue:[.08,.05,.12][runOrdinal]??.1,firstFeeling:structuredClone(offlineSampleFirstFeelings[runOrdinal]??{status:'uncertain'})};
  }
  return {status:200,body:{model:'deepseek-flash',choices:[{finish_reason:'stop',
    message:{role:'assistant',content:JSON.stringify(data)}}],
    usage:{prompt_tokens:900+callIndex,completion_tokens:80,total_tokens:980+callIndex}}};
}

export function offlineSampleSimulator(capture=[]){
  return request=>{
    const index=capture.length;
    capture.push(structuredClone(request));
    return offlineSampleResponse(request,index);
  };
}
