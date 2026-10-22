// 原型用的 Mock 数据（全部离线生成，不含任何网络图片）
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export type Kind = 'news' | 'sports' | 'movie' | 'kids' | 'doc' | 'variety' | 'drama' | 'finance' | 'music' | 'opera' | 'law';
export interface Channel {
  id: string; num: number; name: string; short: string; cats: string[]; kind: Kind; hue: number; badge?: string; unstable?: boolean;
}
const CH: [number, string, string, string[], Kind, string?][] = [
  [1, 'CCTV-1 综合', 'CCTV1', ['央视'], 'variety', 'HD'],
  [2, 'CCTV-2 财经', 'CCTV2', ['央视'], 'finance', 'HD'],
  [3, 'CCTV-3 综艺', 'CCTV3', ['央视'], 'variety', 'HD'],
  [4, 'CCTV-4 中文国际', 'CCTV4', ['央视'], 'news', 'HD'],
  [5, 'CCTV-5 体育', 'CCTV5', ['央视', '体育'], 'sports', 'HD'],
  [6, 'CCTV-6 电影', 'CCTV6', ['央视', '电影'], 'movie', 'HD'],
  [7, 'CCTV-7 国防军事', 'CCTV7', ['央视'], 'doc', 'HD'],
  [8, 'CCTV-8 电视剧', 'CCTV8', ['央视'], 'drama', 'HD'],
  [9, 'CCTV-9 纪录', 'CCTV9', ['央视', '纪录'], 'doc', 'HD'],
  [10, 'CCTV-10 科教', 'CCTV10', ['央视', '纪录'], 'doc', 'HD'],
  [11, 'CCTV-11 戏曲', 'CCTV11', ['央视'], 'opera', 'HD'],
  [12, 'CCTV-12 社会与法', 'CCTV12', ['央视'], 'law', 'HD'],
  [13, 'CCTV-13 新闻', 'CCTV13', ['央视', '新闻'], 'news', 'HD'],
  [14, 'CCTV-14 少儿', 'CCTV14', ['央视', '少儿'], 'kids', 'HD'],
  [15, 'CCTV-15 音乐', 'CCTV15', ['央视'], 'music', 'HD'],
  [16, 'CCTV-5+ 体育赛事', 'CCTV5+', ['央视', '体育'], 'sports', 'HD'],
  [17, 'CCTV-4K 超高清', '4K', ['央视', '4K'], 'doc', '4K'],
  [21, '湖南卫视', '湖南', ['卫视'], 'variety', 'HD'],
  [22, '浙江卫视', '浙江', ['卫视'], 'variety', 'HD'],
  [23, '东方卫视', '东方', ['卫视'], 'drama', 'HD'],
  [24, '江苏卫视', '江苏', ['卫视'], 'variety', 'HD'],
  [25, '北京卫视', '北京', ['卫视'], 'drama', 'HD'],
  [26, '深圳卫视', '深圳', ['卫视'], 'drama', 'HD'],
  [27, '广东卫视', '广东', ['卫视'], 'drama', 'HD'],
  [28, '安徽卫视', '安徽', ['卫视'], 'drama', 'HD'],
  [29, '山东卫视', '山东', ['卫视'], 'variety', 'HD'],
  [30, '天津卫视', '天津', ['卫视'], 'variety', 'HD'],
  [31, '重庆卫视', '重庆', ['卫视'], 'drama', 'HD'],
  [32, '东南卫视', '东南', ['卫视'], 'drama', 'SD'],
  [40, '广东体育', '粤体', ['体育'], 'sports', 'HD'],
  [41, '五星体育', '五星', ['体育'], 'sports', 'HD'],
  [42, '咪咕体育 4K', '咪咕', ['体育', '4K'], 'sports', '4K'],
  [50, 'CHC 高清电影', 'CHC', ['电影'], 'movie', 'HD'],
  [51, 'CHC 动作电影', 'CHC动作', ['电影'], 'movie', 'HD'],
  [52, 'CHC 家庭影院', 'CHC家庭', ['电影'], 'movie', 'HD'],
  [60, '金鹰卡通', '金鹰', ['少儿'], 'kids', 'HD'],
  [61, '卡酷少儿', '卡酷', ['少儿'], 'kids', 'HD'],
  [62, '嘉佳卡通', '嘉佳', ['少儿'], 'kids', 'SD'],
  [70, '凤凰资讯', '凤凰', ['新闻'], 'news', 'HD'],
  [71, 'CGTN 新闻', 'CGTN', ['新闻'], 'news', 'HD'],
  [72, '金鹰纪实', '纪实', ['纪录'], 'doc', 'HD'],
  [73, '求索纪录 4K', '求索', ['纪录', '4K'], 'doc', '4K'],
];
export const CHANNELS: Channel[] = CH.map(([num, name, short, cats, kind, badge]) => ({
  id: 'c' + num, num, name, short, cats, kind, badge, hue: (num * 47) % 360, unstable: num === 41,
}));
export const CHANNEL_BY_ID = new Map(CHANNELS.map((c) => [c.id, c]));
export const LIVE_CATS = ['全部', '收藏', '最近观看', '央视', '卫视', '体育', '电影', '少儿', '新闻', '纪录', '4K'];

const POOL: Record<Kind, string[]> = {
  news: ['新闻直播间', '朝闻天下', '新闻30分', '午夜新闻', '环球视线', '新闻调查', '东方时空', '世界周刊', '新闻联播', '焦点访谈'],
  sports: ['中超联赛：上海 vs 北京', 'CBA 常规赛：广东 vs 辽宁', '体育新闻', 'NBA 精选', '网球大师赛 半决赛', '天下足球', '排球联赛直播', '健身动起来', '赛事集锦', '欧冠精华'],
  movie: ['电影：雾港', '电影：钢铁信使', '电影：北方之北', '电影：猫与灯塔', '光影星播客', '电影：云端之上', '佳片有约', '电影：破晓行动', '电影：月光速递', '首映式'],
  kids: ['熊熊乐园', '小猪佩奇', '智慧树', '动画剧场', '奇妙动物城', '大头儿子', '宝宝巴士', '科学实验室', '小小运动员', '童话故事会'],
  doc: ['人与自然', '地球脉动', '舌尖上的中国', '探索发现', '自然传奇', '跟着书本去旅行', '航拍中国', '科技之光', '我们的星球', '大国工匠'],
  variety: ['快乐大本营', '王牌对王牌', '星光大道', '向往的生活', '综艺盛典', '歌手', '天天向上', '开门大吉', '奔跑吧', '中国好声音'],
  drama: ['电视剧：长安夜行 第12集', '电视剧：小巷人家 第3集', '电视剧：海上灯火 第21集', '电视剧：重启人生 第8集', '电视剧：边境线 第5集', '剧场：医者仁心', '电视剧：江湖夜雨 第17集', '黄金剧场'],
  finance: ['第一时间', '经济半小时', '交易时间', '对话', '经济信息联播', '财经评论', '生财有道', '创业英雄汇'],
  music: ['音乐厅', '精彩音乐汇', '民歌中国', 'CCTV 音乐盛典', '经典回响', '合唱先锋'],
  opera: ['空中剧院', '名段欣赏', '一鸣惊人', '戏曲采风', '京剧：贵妃醉酒', '越剧：梁祝'],
  law: ['今日说法', '方圆剧阵', '天网', '道德观察', '一线', '法律讲堂'],
};
const DURS: Record<Kind, number[]> = {
  news: [30, 30, 60], sports: [60, 90, 120, 30], movie: [100, 120, 90, 30], kids: [30, 15, 30], doc: [45, 60, 30],
  variety: [90, 60, 120], drama: [45, 45, 90], finance: [30, 60], music: [60, 90], opera: [60, 120], law: [30, 45, 60],
};
const DESC: Record<Kind, string> = {
  news: '聚焦国内外重大新闻，实时连线记者现场，带来最新、最权威的资讯解读。',
  sports: '赛事直播，专业解说全程陪伴，精彩瞬间与赛后数据分析同步呈现。',
  movie: '精选佳片放映，高清画质，周末黄金档不间断播出。',
  kids: '寓教于乐的少儿节目，陪伴小朋友快乐成长。',
  doc: '以镜头记录自然与人文，带你领略山川湖海与匠心精神。',
  variety: '人气综艺节目，明星嘉宾齐聚，欢乐不停。',
  drama: '热播电视剧连续播出，跌宕起伏的剧情不容错过。',
  finance: '财经要闻与市场动态，专家解读投资热点。',
  music: '汇聚经典与流行，音乐会现场高品质呈现。',
  opera: '传统戏曲名家名段，品味国粹之美。',
  law: '以案说法，普及法律知识，守护公平正义。',
};
export interface Program { id: string; chId: string; title: string; start: number; end: number; desc: string }
const DAY0 = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); })();
const MIN = 60000;
const progCache = new Map<string, Program[]>();
// EPG 时区偏移（设置 › EPG 时区偏移，±12 小时）
let epgOffset = 0;
export function setEpgOffset(h: number) { epgOffset = h; }
export function programsOf(ch: Channel): Program[] {
  const ck = ch.id + '@' + epgOffset;
  const hit = progCache.get(ck);
  if (hit) return hit;
  const shifted = rawPrograms(ch).map((x) => ({ ...x, start: x.start + epgOffset * 3600000, end: x.end + epgOffset * 3600000 }));
  progCache.set(ck, shifted);
  return shifted;
}
function rawPrograms(ch: Channel): Program[] {
  let p = progCache.get(ch.id);
  if (p) return p;
  const r = rng(hash(ch.id + 'epg'));
  p = [];
  let t = DAY0 - 6 * 60 * MIN;
  let i = 0;
  while (t < DAY0 + 32 * 60 * MIN) {
    const ds = DURS[ch.kind];
    const dur = ds[Math.floor(r() * ds.length)] * MIN;
    const pool = POOL[ch.kind];
    const title = pool[Math.floor(r() * pool.length)];
    p.push({ id: ch.id + ':' + i, chId: ch.id, title, start: t, end: t + dur, desc: DESC[ch.kind] });
    t += dur;
    i++;
  }
  progCache.set(ch.id, p);
  return p;
}
export function nowNext(ch: Channel, at = Date.now()) {
  const ps = programsOf(ch);
  const i = ps.findIndex((p) => p.start <= at && p.end > at);
  return { now: ps[i], next: ps[i + 1] };
}
export const fmtTime = (t: number) => { const d = new Date(t); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
export const fmtDur = (s: number) => {
  s = Math.max(0, Math.floor(s));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
  return (h ? h + ':' + String(m).padStart(2, '0') : String(m)) + ':' + String(ss).padStart(2, '0');
};

// ---------- 点播 ----------
const NAMES = ['林浩然', '苏晴', '陈默', '周雨桐', '王子轩', '赵一鸣', '孙婉', '李建国', '何思远', '高晓', '许诺', '韩冰', '顾北', '沈星', '叶知秋', '唐小米', '宋青', '马骁'];
const ROLES = ['饰 主角', '饰 女主角', '饰 队长', '饰 父亲', '饰 反派', '饰 记者', '饰 医生', '导演'];
const SYN: Record<string, string> = {
  科幻: '在人类第一次跨越银河边缘的远航中，一支科考小队收到了来自未知文明的信号。他们必须在燃料耗尽之前，决定是返航还是继续前进。',
  剧情: '一个普通家庭在时代浪潮中的二十年，几个人的选择与坚持，串起了一座小城的悲欢离合。',
  悬疑: '一场看似意外的失踪案，牵出尘封多年的旧事。警探在层层迷雾中逐渐发现，每个人都在隐瞒什么。',
  爱情: '在一座终年有海风的城市，两个错过了三次的人，终于在第四次相遇时决定不再转身。',
  动作: '退役特工被迫重出江湖，在七十二小时内穿越三座城市，阻止一场针对整座城市的阴谋。',
  动画: '一只不怕黑的小猫和一座孤独的灯塔，展开了一段温暖又奇妙的冒险旅程。',
  喜剧: '一群性格迥异的邻居因为一场乌龙事件被迫联手，笑料百出又温情满满。',
  冒险: '为了寻找传说中的失落之城，探险队深入无人区，与自然和自我展开较量。',
  古装: '盛世长安，暗流涌动。一位年轻的不良人与神秘女子联手，揭开一桩震动朝野的奇案。',
  都市: '在快节奏的大城市里，几位年轻人在事业与生活的岔路口，重新找到属于自己的答案。',
  家庭: '一条老巷，三户人家，几十年的邻里情谊在日常琐碎中闪闪发光。',
  年代: '上世纪的港口城市，一盏灯火照亮了一代人的奋斗与守望。',
  纪录: '走遍大江南北，用镜头记录最地道的人间烟火与舌尖上的故事。',
  综艺: '一支临时组建的乐队，从零开始排练，在舞台上找回最初的热爱。',
};
export interface Vod {
  id: string; type: 'movie' | 'series'; title: string; initials: string; genre: string; year: number; rating: number;
  hue: number; hue2: number; variant: number; duration: number; synopsis: string; cast: { name: string; role: string }[];
  badges: string[]; seasons?: { n: number; episodes: { n: number; title: string; duration: number }[] }[]; added: number;
}
const MV: [string, string, string][] = [
  ['星海迷航', 'XHMH', '科幻'], ['长夜将尽', 'CYJJ', '剧情'], ['雾港', 'WG', '悬疑'], ['北方之北', 'BFZB', '剧情'], ['第七个日落', 'DQGRL', '爱情'],
  ['钢铁信使', 'GTXS', '动作'], ['逆光飞行', 'NGFX', '剧情'], ['深海回声', 'SHHS', '科幻'], ['无声追击', 'WSZJ', '动作'], ['山城往事', 'SCWS', '剧情'],
  ['猫与灯塔', 'MYDT', '动画'], ['夏日奇妙物语', 'XRQMWY', '喜剧'], ['破晓行动', 'PXXD', '动作'], ['云端之上', 'YDZS', '冒险'], ['月光速递', 'YGSD', '喜剧'],
  ['时间的褶皱', 'SJDZZ', '科幻'], ['沙漠玫瑰', 'SMMG', '爱情'], ['最后的守夜人', 'ZHDSYR', '悬疑'], ['疾风少年', 'JFSN', '动作'], ['老街咖啡馆', 'LJKFG', '喜剧'],
  ['极地漂流', 'JDPL', '冒险'], ['镜中人', 'JZR', '悬疑'], ['火种计划', 'HZJH', '科幻'], ['大象旅行团', 'DXLXT', '动画'], ['南方车站之夜', 'NFCZZY', '剧情'],
  ['回声山谷', 'HSSG', '冒险'], ['白鸟', 'BN', '剧情'], ['城市猎人2049', 'CSLR2049', '动作'], ['遥远的星球', 'YYDXQ', '动画'], ['一千零一夜', 'YQLYY', '爱情'],
];
const SR: [string, string, string][] = [
  ['长安夜行', 'CAYX', '古装'], ['重启人生', 'CQRS', '都市'], ['边境线', 'BJX', '悬疑'], ['星际学院', 'XJXY', '科幻'], ['小巷人家', 'XXRJ', '家庭'],
  ['刑侦档案', 'XZDA', '悬疑'], ['海上灯火', 'HSDH', '年代'], ['风味人间', 'FWRJ', '纪录'], ['少年漫游记', 'SNMYJ', '动画'], ['云上的日子', 'YSDRZ', '都市'],
  ['大宋提刑', 'DSTX', '古装'], ['深空救援', 'SKJY', '科幻'], ['我们的乐队', 'WMDYD', '综艺'], ['山海经奇谈', 'SHJQT', '动画'], ['江湖夜雨', 'JHYY', '古装'], ['医者仁心', 'YZRX', '都市'],
];
const EPT = ['初见', '暗流', '夜雨', '转折', '旧信', '迷局', '对峙', '远行', '归来', '真相', '破局', '黎明', '余波', '新生'];
function mk(type: 'movie' | 'series', [title, initials, genre]: [string, string, string], i: number): Vod {
  const r = rng(hash(type + title));
  const hue = Math.floor(r() * 360);
  const cast = Array.from({ length: 6 }, (_, k) => ({ name: NAMES[Math.floor(r() * NAMES.length)], role: k === 5 ? '导演' : ROLES[k % 7] }));
  const v: Vod = {
    id: (type === 'movie' ? 'm' : 's') + i, type, title, initials, genre, year: 2014 + Math.floor(r() * 12), rating: Math.round((6.5 + r() * 3) * 10) / 10,
    hue, hue2: (hue + 40 + Math.floor(r() * 120)) % 360, variant: Math.floor(r() * 5), duration: type === 'movie' ? (88 + Math.floor(r() * 60)) * 60 : 0,
    synopsis: SYN[genre] || SYN['剧情'], cast, badges: [r() > 0.5 ? '4K' : '1080P', r() > 0.6 ? '杜比视界' : 'HDR10', r() > 0.5 ? '杜比全景声' : '5.1'], added: Math.floor(r() * 1000),
  };
  if (type === 'series') {
    const ns = 1 + Math.floor(r() * 3);
    v.seasons = Array.from({ length: ns }, (_, s) => ({
      n: s + 1,
      episodes: Array.from({ length: 8 + Math.floor(r() * 6) }, (_, e) => ({ n: e + 1, title: EPT[(e + s * 3) % EPT.length], duration: (40 + Math.floor(r() * 10)) * 60 })),
    }));
  }
  return v;
}
export const MOVIES = MV.map((m, i) => mk('movie', m, i));
export const SERIES = SR.map((s, i) => mk('series', s, i));
export const VOD_BY_ID = new Map([...MOVIES, ...SERIES].map((v) => [v.id, v]));
export const MOVIE_GENRES = Array.from(new Set(MOVIES.map((m) => m.genre)));
export const SERIES_GENRES = Array.from(new Set(SERIES.map((m) => m.genre)));

// vod key: "m3" 电影；"s0:1:5" 剧集 第1季第5集
export function parseKey(key: string) {
  const [id, s, e] = key.split(':');
  const v = VOD_BY_ID.get(id)!;
  if (v.type === 'movie') return { v, title: v.title, sub: `${v.year} · ${v.genre}`, duration: v.duration, season: 0, ep: 0 };
  const se = v.seasons![+s - 1], ep = se.episodes[+e - 1];
  return { v, title: v.title, sub: `第 ${s} 季 第 ${e} 集 · ${ep.title}`, duration: ep.duration, season: +s, ep: +e };
}
export function nextEpKey(key: string): string | null {
  const [id, s, e] = key.split(':');
  const v = VOD_BY_ID.get(id);
  if (!v || v.type !== 'series') return null;
  const se = v.seasons![+s - 1];
  if (+e < se.episodes.length) return `${id}:${s}:${+e + 1}`;
  if (+s < v.seasons!.length) return `${id}:${+s + 1}:1`;
  return null;
}
export const SOURCES = [
  { type: 'Emby', name: '家庭影院', addr: 'http://192.168.1.20:8096' },
  { type: 'Xtream Codes', name: '示例 IPTV', addr: 'http://iptv.example.com:8080' },
];
