# NV-DREAM-CLIMATE-OFFLINE-01 · 三场 fake 阅读回执

状态：`READY_FOR_HUMAN_OFFLINE_REVIEW`

声明：所有叙事均为 **fictional fixture / not model output**。它们不是模型作品、真实梦境、现实人物材料或主观体验。

## 批内约束

- climate 权重：{"ordinary":0.65,"uneasy":0.3,"nightmare":0.05}
- protocol / prompt / source：nv-dream-climate-offline-v1 / nv-dream-climate-offline-prompt-v1 / 605d69511cc72c0b0ca60a77be34dafb061e63b57e98db94b778cf7bfce8cbb6
- source inventory identity：f88fccb0349b0004db6c81deb0261f3d620f06480ab24b4a9c3aee2f94cfae28
- run / call：3 / 12
- 请求字节上限：16384

## Case A — ordinary / transformation / cup_tap

- fixture：fictional fixture / not model output
- usedForegroundAnchors：[]
- usedMechanisms：[]

### Fixture 作者声明

- scene/0 建立：杯沿刚被轻敲两下，余音仍在，手仍可继续触摸杯子。
- scene/1 改变：杯沿出现细白纹，动作从听见余音转为伸手触摸。
- scene/2 改变：细纹合拢并留下白屑，杯子被移到另一侧而白屑留在原处。
- 梦内变形：第 2 幕，object_material_boundary — 杯沿随余音裂出白纹，随后向杯底收拢并恢复圆形。
- 实际仍重复的主意象（作者声明）：杯沿/杯子、白屑、轻响/余音

### 三幕原文与同幕证据

#### 幕 1

原文：杯沿刚被轻敲两下，余音还在桌面下面轻轻碰着。梦里的人把杯子放下，手指仍停在杯沿。

appraisal：{"goalEffect":0,"control":0.5,"uncertainty":0.5}
basis/evidence：{"goal":null,"controlExcerpt":null,"uncertaintyExcerpt":null,"affectExcerpt":null}
affect：{"schemaVersion":1,"kind":"unchanged"} / delta {valence:0,arousal:0}
before → after：{"valence":0,"arousal":0.2} → {"valence":0,"arousal":0.2}
normalization：nv-dream-climate-offline-normalization-v1

#### 幕 2

原文：第二下余音没有散，杯沿顺着一圈看不见的力裂出细白纹。梦里的人伸手去摸，不确定纹路会不会碰到杯里的水。

appraisal：{"goalEffect":0,"control":0.5,"uncertainty":0.6}
basis/evidence：{"goal":null,"controlExcerpt":null,"uncertaintyExcerpt":"不确定纹路会不会碰到杯里的水","affectExcerpt":"伸手去摸"}
affect：{"schemaVersion":1,"kind":"estimated"} / delta {"valence":0,"arousal":0.06}
before → after：{"valence":0,"arousal":0.2} → {"valence":0,"arousal":0.26}
normalization：nv-dream-climate-offline-normalization-v1

#### 幕 3

原文：细纹向杯底收拢，杯沿恢复成圆，桌上却留下一小片白屑。梦里的人把杯子挪到桌面另一侧，白屑留在原处。

appraisal：{"goalEffect":0,"control":0.65,"uncertainty":0.4}
basis/evidence：{"goal":null,"controlExcerpt":"把杯子挪到桌面另一侧","uncertaintyExcerpt":"白屑留在原处","affectExcerpt":"白屑留在原处"}
affect：{"schemaVersion":1,"kind":"estimated"} / delta {"valence":0.04,"arousal":-0.04}
before → after：{"valence":0,"arousal":0.26} → {"valence":0.04,"arousal":0.22}
normalization：nv-dream-climate-offline-normalization-v1

### Wake

fragment：桌上却留下一小片白屑
逐字来源：第 3 幕；结构校验通过，但不是语义质量判定。
associations：[]
simulated residue：0.07（独立模拟估计，不是刚醒心情或持久情绪）
firstFeeling：present：醒来时，梦里的人先听见指尖碰到桌面的轻响，随后才发现桌上没有杯子。

### 词面诊断

方法：literal_term_occurrence；semanticJudgment=false
逐组计数：{"cup_tap":{"terms":{"杯":8,"杯沿":4,"敲击":0},"total":12},"rain_street":{"terms":{"雨停":0,"小街":0,"街道":0,"雨":0},"total":0},"ticket_date":{"terms":{"车票":0,"票面":0,"日期":0},"total":0}}
这些计数只可复现词面命中；重叠词分别计数，不能冒充语义重复判定。

### 声明与证明分界

- fixture 作者声明：幕间变化、梦内变形、实际重复意象与三幕阅读判断。
- 结构测试证明：三幕形状、同幕逐字 evidence、wake fragment 逐字来源、四态 firstFeeling、批内 mechanism/anchor 唯一、12 个请求与 source 逐字一致。
- 未证明：文本质量、气候是否被模型正确执行、变化是否足够好、appraisal 是否语义成立、真实模型效果。

## Case B — uneasy / spatial_dislocation / rain_street

- fixture：fictional fixture / not model output
- usedForegroundAnchors：["cup_tap"]
- usedMechanisms：["transformation"]

### Fixture 作者声明

- scene/0 建立：雨后小街、关门店前、手里的门把和前方街口构成一个可继续的瞬间。
- scene/1 改变：店门移到身后，街口退远，门把留在掌心而手已松开。
- scene/2 改变：街道缩回，店面变成湿墙，门把落入墙缝，水声移到墙后。
- 梦内变形：第 2 幕，spatial_relation — 关着的门与街口交换了相对位置，小街被拉长而门把留在掌心。
- 实际仍重复的主意象（作者声明）：小街/街道、门把、雨雾/水声

### 三幕原文与同幕证据

#### 幕 1

原文：雨停后，小街两侧的门牌都朝同一个方向滴水。梦里的人站在一间关门的店前，手里握着门把，觉得再往前一步就能看见街口。

appraisal：{"goalEffect":0,"control":0.55,"uncertainty":0.5}
basis/evidence：{"goal":null,"controlExcerpt":"握着门把","uncertaintyExcerpt":null,"affectExcerpt":null}
affect：{"schemaVersion":1,"kind":"unchanged"} / delta {valence:0,arousal:0}
before → after：{"valence":0,"arousal":0.2} → {"valence":0,"arousal":0.2}
normalization：nv-dream-climate-offline-normalization-v1

#### 幕 2

原文：门把在掌心转了一圈，关着的店门却出现在身后；小街向两边拉长，原来三步外的街口退到雨雾里。梦里的人松开手，门把仍留在掌心。

appraisal：{"goalEffect":0,"control":0.35,"uncertainty":0.8}
basis/evidence：{"goal":null,"controlExcerpt":"松开手","uncertaintyExcerpt":"原来三步外的街口退到雨雾里","affectExcerpt":"门把仍留在掌心"}
affect：{"schemaVersion":1,"kind":"estimated"} / delta {"valence":-0.06,"arousal":0.08}
before → after：{"valence":0,"arousal":0.2} → {"valence":-0.06,"arousal":0.28}
normalization：nv-dream-climate-offline-normalization-v1

#### 幕 3

原文：街道缩回原来的长度，店面变成一堵湿墙，门把从掌心落进墙缝。梦里的人沿墙走了几步，听见街口的水声从墙后传来。

appraisal：{"goalEffect":0,"control":0.15,"uncertainty":0.7}
basis/evidence：{"goal":null,"controlExcerpt":"沿墙走了几步","uncertaintyExcerpt":"水声从墙后传来","affectExcerpt":"门把从掌心落进墙缝"}
affect：{"schemaVersion":1,"kind":"estimated"} / delta {"valence":-0.04,"arousal":0.05}
before → after：{"valence":-0.06,"arousal":0.28} → {"valence":-0.1,"arousal":0.33}
normalization：nv-dream-climate-offline-normalization-v1

### Wake

fragment：门把从掌心落进墙缝
逐字来源：第 3 幕；结构校验通过，但不是语义质量判定。
associations：["墙后面的水声是不是刚才那条街？"]
simulated residue：0.11（独立模拟估计，不是刚醒心情或持久情绪）
firstFeeling：absent（明确记为无）

### 词面诊断

方法：literal_term_occurrence；semanticJudgment=false
逐组计数：{"cup_tap":{"terms":{"杯":0,"杯沿":0,"敲击":0},"total":0},"rain_street":{"terms":{"雨停":1,"小街":2,"街道":1,"雨":2},"total":6},"ticket_date":{"terms":{"车票":0,"票面":0,"日期":0},"total":0}}
这些计数只可复现词面命中；重叠词分别计数，不能冒充语义重复判定。

### 声明与证明分界

- fixture 作者声明：幕间变化、梦内变形、实际重复意象与三幕阅读判断。
- 结构测试证明：三幕形状、同幕逐字 evidence、wake fragment 逐字来源、四态 firstFeeling、批内 mechanism/anchor 唯一、12 个请求与 source 逐字一致。
- 未证明：文本质量、气候是否被模型正确执行、变化是否足够好、appraisal 是否语义成立、真实模型效果。

## Case C — nightmare / temporal_recurrence / ticket_date

- fixture：fictional fixture / not model output
- usedForegroundAnchors：["cup_tap","rain_street"]
- usedMechanisms：["transformation","spatial_dislocation"]

### Fixture 作者声明

- scene/0 建立：折过的车票、被遮住的日期、候车线后的位置和“下一班还没到”的广播。
- scene/1 改变：广播原样重复，候车线退到身后，日期变成明天，站牌却仍指向刚刚那班车。
- scene/2 改变：日期回到模糊原样，广播第三次重复，候车线回到脚前，空站台重新站满人。
- 梦内变形：第 2 幕，temporal_order — 票面日期跳到明天而站牌仍显示刚刚那班车，广播与候车线顺序开始重复。
- 实际仍重复的主意象（作者声明）：车票/日期、广播、候车线/站台

### 三幕原文与同幕证据

#### 幕 1

原文：折过的车票摊在掌心，模糊的日期被指腹盖住。梦里的人站在候车线后，听见广播说下一班还没到。

appraisal：{"goalEffect":0,"control":0.5,"uncertainty":0.6}
basis/evidence：{"goal":null,"controlExcerpt":null,"uncertaintyExcerpt":"下一班还没到","affectExcerpt":null}
affect：{"schemaVersion":1,"kind":"unchanged"} / delta {valence:0,arousal:0}
before → after：{"valence":0,"arousal":0.2} → {"valence":0,"arousal":0.2}
normalization：nv-dream-climate-offline-normalization-v1

#### 幕 2

原文：广播又响了一遍，内容和刚才完全相同；候车线退到身后，车票上的日期却变成明天。梦里的人想确认下一班，抬头看见站牌仍显示刚刚那班车。

appraisal：{"goalEffect":-1,"control":0.3,"uncertainty":0.8}
basis/evidence：{"goal":{"goalExcerpt":"想确认下一班","outcomeExcerpt":"站牌仍显示刚刚那班车"},"controlExcerpt":"抬头","uncertaintyExcerpt":"候车线退到身后","affectExcerpt":"候车线退到身后"}
affect：{"schemaVersion":1,"kind":"estimated"} / delta {"valence":-0.08,"arousal":0.08}
before → after：{"valence":0,"arousal":0.2} → {"valence":-0.08,"arousal":0.28}
normalization：nv-dream-climate-offline-normalization-v1

#### 幕 3

原文：车票日期回到模糊的原样，广播第三次说下一班还没到；候车线重新出现在脚前，刚空出的站台又站满了人。梦里的人没有挪步，手里的票仍是折过的。

appraisal：{"goalEffect":0,"control":0.1,"uncertainty":0.9}
basis/evidence：{"goal":null,"controlExcerpt":"没有挪步","uncertaintyExcerpt":"刚空出的站台又站满了人","affectExcerpt":"刚空出的站台又站满了人"}
affect：{"schemaVersion":1,"kind":"estimated"} / delta {"valence":-0.12,"arousal":0.12}
before → after：{"valence":-0.08,"arousal":0.28} → {"valence":-0.2,"arousal":0.4}
normalization：nv-dream-climate-offline-normalization-v1

### Wake

fragment：广播第三次说下一班还没到
逐字来源：第 3 幕；结构校验通过，但不是语义质量判定。
associations：[]
simulated residue：0.16（独立模拟估计，不是刚醒心情或持久情绪）
firstFeeling：omitted（未记录）

### 词面诊断

方法：literal_term_occurrence；semanticJudgment=false
逐组计数：{"cup_tap":{"terms":{"杯":0,"杯沿":0,"敲击":0},"total":0},"rain_street":{"terms":{"雨停":0,"小街":0,"街道":0,"雨":0},"total":0},"ticket_date":{"terms":{"车票":3,"票面":0,"日期":3},"total":6}}
这些计数只可复现词面命中；重叠词分别计数，不能冒充语义重复判定。

### 声明与证明分界

- fixture 作者声明：幕间变化、梦内变形、实际重复意象与三幕阅读判断。
- 结构测试证明：三幕形状、同幕逐字 evidence、wake fragment 逐字来源、四态 firstFeeling、批内 mechanism/anchor 唯一、12 个请求与 source 逐字一致。
- 未证明：文本质量、气候是否被模型正确执行、变化是否足够好、appraisal 是否语义成立、真实模型效果。

## 边界

- credentialReads=0；networkAttempts=0；realModelRequests=0
- paidCalls=0；costMicroCny=0；ownerLockCreated=false
- realUserStoreAccessed=false；storeOpened=false
- automaticRetries=0；fourthRunStarted=false
- laterRecollectionsEmpty=true；memoryMindIntegration=false
- 不构成真实模型质量、现实主观感受、正式 Memory/Mind、ready、合并或部署的证明。
