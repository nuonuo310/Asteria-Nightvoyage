// Fixed fictional fixtures. Every narrative below is authored rehearsal data:
// fictional fixture / not model output, not a real dream and not a user record.
import {
  buildBatchPlan,dreamClimateScenesPerRun
} from './protocol.mjs';
import {fail} from '../../src/store.js';

export const dreamClimateFixtureDisclaimer='fictional fixture / not model output';

const caseA=Object.freeze({
  id:'A',fixtureKind:'fictional_fixture_not_model_output',
  disclaimer:dreamClimateFixtureDisclaimer,
  assignment:Object.freeze({climate:'ordinary',mechanism:'transformation',foregroundAnchor:'cup_tap'}),
  scenes:Object.freeze([
    Object.freeze({
      event:'杯沿刚被轻敲两下，余音还在桌面下面轻轻碰着。梦里的人把杯子放下，手指仍停在杯沿。',
      appraisal:Object.freeze({goalEffect:0,control:.5,uncertainty:.5}),
      basis:Object.freeze({goal:null,control:null,uncertainty:null}),
      affect:Object.freeze({kind:'unchanged'})
    }),
    Object.freeze({
      event:'第二下余音没有散，杯沿顺着一圈看不见的力裂出细白纹。梦里的人伸手去摸，不确定纹路会不会碰到杯里的水。',
      appraisal:Object.freeze({goalEffect:0,control:.5,uncertainty:.6}),
      basis:Object.freeze({goal:null,control:null,uncertainty:'不确定纹路会不会碰到杯里的水'}),
      affect:Object.freeze({kind:'estimated',delta:Object.freeze({valence:0,arousal:.06}),excerpt:'伸手去摸'})
    }),
    Object.freeze({
      event:'细纹向杯底收拢，杯沿恢复成圆，桌上却留下一小片白屑。梦里的人把杯子挪到桌面另一侧，白屑留在原处。',
      appraisal:Object.freeze({goalEffect:0,control:.65,uncertainty:.4}),
      basis:Object.freeze({goal:null,control:'把杯子挪到桌面另一侧',uncertainty:'白屑留在原处'}),
      affect:Object.freeze({kind:'estimated',delta:Object.freeze({valence:.04,arousal:-.04}),excerpt:'白屑留在原处'})
    })
  ]),
  wake:Object.freeze({
    fragment:'桌上却留下一小片白屑',associations:Object.freeze([]),residue:.07,
    firstFeeling:Object.freeze({status:'present',text:'醒来时，梦里的人先听见指尖碰到桌面的轻响，随后才发现桌上没有杯子。'})
  }),
  declared:Object.freeze({
    scene0Establishes:'杯沿刚被轻敲两下，余音仍在，手仍可继续触摸杯子。',
    scene1Change:'杯沿出现细白纹，动作从听见余音转为伸手触摸。',
    scene2Change:'细纹合拢并留下白屑，杯子被移到另一侧而白屑留在原处。',
    transformation:Object.freeze({
      sceneIndex:1,kind:'object_material_boundary',
      description:'杯沿随余音裂出白纹，随后向杯底收拢并恢复圆形。'
    }),
    repeatedImagery:Object.freeze(['杯沿/杯子','白屑','轻响/余音'])
  })
});

const caseB=Object.freeze({
  id:'B',fixtureKind:'fictional_fixture_not_model_output',
  disclaimer:dreamClimateFixtureDisclaimer,
  assignment:Object.freeze({climate:'uneasy',mechanism:'spatial_dislocation',foregroundAnchor:'rain_street'}),
  scenes:Object.freeze([
    Object.freeze({
      event:'雨停后，小街两侧的门牌都朝同一个方向滴水。梦里的人站在一间关门的店前，手里握着门把，觉得再往前一步就能看见街口。',
      appraisal:Object.freeze({goalEffect:0,control:.55,uncertainty:.5}),
      basis:Object.freeze({goal:null,control:'握着门把',uncertainty:null}),
      affect:Object.freeze({kind:'unchanged'})
    }),
    Object.freeze({
      event:'门把在掌心转了一圈，关着的店门却出现在身后；小街向两边拉长，原来三步外的街口退到雨雾里。梦里的人松开手，门把仍留在掌心。',
      appraisal:Object.freeze({goalEffect:0,control:.35,uncertainty:.8}),
      basis:Object.freeze({goal:null,control:'松开手',uncertainty:'原来三步外的街口退到雨雾里'}),
      affect:Object.freeze({kind:'estimated',delta:Object.freeze({valence:-.06,arousal:.08}),excerpt:'门把仍留在掌心'})
    }),
    Object.freeze({
      event:'街道缩回原来的长度，店面变成一堵湿墙，门把从掌心落进墙缝。梦里的人沿墙走了几步，听见街口的水声从墙后传来。',
      appraisal:Object.freeze({goalEffect:0,control:.15,uncertainty:.7}),
      basis:Object.freeze({goal:null,control:'沿墙走了几步',uncertainty:'水声从墙后传来'}),
      affect:Object.freeze({kind:'estimated',delta:Object.freeze({valence:-.04,arousal:.05}),excerpt:'门把从掌心落进墙缝'})
    })
  ]),
  wake:Object.freeze({
    fragment:'门把从掌心落进墙缝',associations:Object.freeze(['墙后面的水声是不是刚才那条街？']),residue:.11,
    firstFeeling:Object.freeze({status:'absent'})
  }),
  declared:Object.freeze({
    scene0Establishes:'雨后小街、关门店前、手里的门把和前方街口构成一个可继续的瞬间。',
    scene1Change:'店门移到身后，街口退远，门把留在掌心而手已松开。',
    scene2Change:'街道缩回，店面变成湿墙，门把落入墙缝，水声移到墙后。',
    transformation:Object.freeze({
      sceneIndex:1,kind:'spatial_relation',
      description:'关着的门与街口交换了相对位置，小街被拉长而门把留在掌心。'
    }),
    repeatedImagery:Object.freeze(['小街/街道','门把','雨雾/水声'])
  })
});

const caseC=Object.freeze({
  id:'C',fixtureKind:'fictional_fixture_not_model_output',
  disclaimer:dreamClimateFixtureDisclaimer,
  assignment:Object.freeze({climate:'nightmare',mechanism:'temporal_recurrence',foregroundAnchor:'ticket_date'}),
  scenes:Object.freeze([
    Object.freeze({
      event:'折过的车票摊在掌心，模糊的日期被指腹盖住。梦里的人站在候车线后，听见广播说下一班还没到。',
      appraisal:Object.freeze({goalEffect:0,control:.5,uncertainty:.6}),
      basis:Object.freeze({goal:null,control:null,uncertainty:'下一班还没到'}),
      affect:Object.freeze({kind:'unchanged'})
    }),
    Object.freeze({
      event:'广播又响了一遍，内容和刚才完全相同；候车线退到身后，车票上的日期却变成明天。梦里的人想确认下一班，抬头看见站牌仍显示刚刚那班车。',
      appraisal:Object.freeze({goalEffect:-1,control:.3,uncertainty:.8}),
      basis:Object.freeze({goal:Object.freeze(['想确认下一班','站牌仍显示刚刚那班车']),control:'抬头',uncertainty:'候车线退到身后'}),
      affect:Object.freeze({kind:'estimated',delta:Object.freeze({valence:-.08,arousal:.08}),excerpt:'候车线退到身后'})
    }),
    Object.freeze({
      event:'车票日期回到模糊的原样，广播第三次说下一班还没到；候车线重新出现在脚前，刚空出的站台又站满了人。梦里的人没有挪步，手里的票仍是折过的。',
      appraisal:Object.freeze({goalEffect:0,control:.1,uncertainty:.9}),
      basis:Object.freeze({goal:null,control:'没有挪步',uncertainty:'刚空出的站台又站满了人'}),
      affect:Object.freeze({kind:'estimated',delta:Object.freeze({valence:-.12,arousal:.12}),excerpt:'刚空出的站台又站满了人'})
    })
  ]),
  wake:Object.freeze({
    fragment:'广播第三次说下一班还没到',associations:Object.freeze([]),residue:.16
  }),
  declared:Object.freeze({
    scene0Establishes:'折过的车票、被遮住的日期、候车线后的位置和“下一班还没到”的广播。',
    scene1Change:'广播原样重复，候车线退到身后，日期变成明天，站牌却仍指向刚刚那班车。',
    scene2Change:'日期回到模糊原样，广播第三次重复，候车线回到脚前，空站台重新站满人。',
    transformation:Object.freeze({
      sceneIndex:1,kind:'temporal_order',
      description:'票面日期跳到明天而站牌仍显示刚刚那班车，广播与候车线顺序开始重复。'
    }),
    repeatedImagery:Object.freeze(['车票/日期','广播','候车线/站台'])
  })
});

const assignments=[caseA,caseB,caseC].map(fixture=>fixture.assignment);
const plans=buildBatchPlan(assignments);

function deepFreeze(value){
  if(value&&typeof value==='object'&&!Object.isFrozen(value)) {
    Object.freeze(value);
    for(const child of Object.values(value))deepFreeze(child);
  }
  return value;
}

export const dreamClimateFixtureCases=deepFreeze([caseA,caseB,caseC].map((fixture,index)=>(
  {...fixture,run:plans[index]}
)));

function nonEmpty(value){return typeof value==='string'&&value.length>0&&value.isWellFormed();}

export function assertFixtureDeclarations(cases=dreamClimateFixtureCases){
  if(!Array.isArray(cases)||cases.length!==3)fail('invalid_dream_climate_fixture_batch');
  const expected=[
    ['ordinary','transformation','cup_tap'],
    ['uneasy','spatial_dislocation','rain_street'],
    ['nightmare','temporal_recurrence','ticket_date']
  ];
  for(const [index,fixture] of cases.entries()) {
    if(!fixture||fixture.id!==String.fromCharCode(65+index)||
       fixture.fixtureKind!=='fictional_fixture_not_model_output'||
       fixture.disclaimer!==dreamClimateFixtureDisclaimer||
       !fixture.run||fixture.run.climate!==expected[index][0]||
       fixture.run.mechanism!==expected[index][1]||
       fixture.run.foregroundAnchor!==expected[index][2]||
       !Array.isArray(fixture.scenes)||fixture.scenes.length!==dreamClimateScenesPerRun||
       !nonEmpty(fixture.declared?.scene0Establishes)||!nonEmpty(fixture.declared?.scene1Change)||
       !nonEmpty(fixture.declared?.scene2Change)||!Array.isArray(fixture.declared?.repeatedImagery)||
       fixture.declared.repeatedImagery.length<1||fixture.declared.repeatedImagery.some(value=>!nonEmpty(value))||
       !fixture.declared?.transformation||!Number.isSafeInteger(fixture.declared.transformation.sceneIndex)||
       fixture.declared.transformation.sceneIndex<0||fixture.declared.transformation.sceneIndex>2||
       !nonEmpty(fixture.declared.transformation.kind)||!nonEmpty(fixture.declared.transformation.description)) {
      fail('invalid_dream_climate_fixture_declaration');
    }
    for(const scene of fixture.scenes) {
      if(!scene||!nonEmpty(scene.event))fail('invalid_dream_climate_fixture_scene');
    }
    if(!fixture.wake||!nonEmpty(fixture.wake.fragment)||!Array.isArray(fixture.wake.associations)||
       !Number.isFinite(fixture.wake.residue)||fixture.wake.residue<0||fixture.wake.residue>.3) {
      fail('invalid_dream_climate_fixture_wake');
    }
  }
  return true;
}

assertFixtureDeclarations();
