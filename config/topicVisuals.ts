export interface TopicVisual {
  src: string;
  fallback: string;
  alt: string;
  width: number;
  height: number;
}

const topicVisualAlt: Record<string, string> = {
  kaogong: "公务员考试资料与备考笔记整理场景",
  kaoyan: "考研书桌上的教材、笔记与复习计划",
  "teacher-cert": "教师资格证备考资料与教学笔记",
  python: "Python 编程学习与代码练习场景",
  "programming-course": "编程课程学习与开发工作台",
  java: "Java 开发课程与代码学习场景",
  frontend: "前端开发课程与网页界面练习",
  office: "Office 办公软件教程学习场景",
  excel: "Excel 数据表格与学习笔记",
  "design-assets": "设计素材整理与创意工作台",
  "ppt-template": "PPT 模板排版与演示设计场景",
  "kids-animation": "明亮童趣的儿童动画观看场景",
  anime: "日漫收藏与动画观看空间",
  "short-drama": "竖屏短剧拍摄与分镜场景",
  "korean-drama": "韩剧观影与剧集收藏场景",
  "documentary-series": "纪录片拍摄与自然观察场景",
  "classic-movie": "经典电影胶片与老影院放映场景",
  "lossless-music": "无损音乐聆听与唱片收藏空间",
  audiobook: "有声书收听与安静阅读场景",
  "4k-movie": "4K 电影家庭影院与高清放映画面",
  ebooks: "电子书阅读器与数字书库场景",
  "magnet-search": "磁力资源检索与文件信息整理场景",
  "video-material": "视频素材剪辑与素材管理工作台",
  "sound-effects": "音效素材录制与波形编辑场景",
  "font-assets": "字体样本与排版设计工作台",
  "icon-assets": "图标素材网格与界面设计场景",
  "figma-ui-kit": "Figma UI 组件与界面设计工作台",
  "psd-mockup": "PSD 样机展示与平面设计场景",
  "ae-template": "AE 动效模板与时间轴编辑场景",
  "premiere-template": "Premiere 视频模板剪辑工作台",
  "lut-presets": "LUT 调色前后画面对比场景",
  "lightroom-presets": "Lightroom 照片预设与调色工作台",
  "cad-drawings": "CAD 建筑图纸与工程制图桌面",
  "3d-models": "3D 模型制作与材质预览场景",
  "resume-template": "简历模板排版与求职资料整理场景",
  "excel-template": "Excel 表格模板与业务数据整理场景",
  "contract-template": "合同模板与商务文件整理桌面",
  "lesson-plan": "教案课件与课堂内容准备场景",
  "ecommerce-assets": "电商设计素材与商品视觉工作台",
  "presentation-assets": "演示图表与信息可视化设计场景",
  comic: "漫画书页、分镜与阅读空间",
  concert: "演唱会舞台灯光与现场观演场景",
  "movie-subtitles": "电影字幕时间轴与文本校对场景",
  "radio-drama": "广播剧录音与声音表演工作室",
  "texture-assets": "纸张、织物与自然纹理素材样本",
  "background-assets": "多种背景素材与版式设计场景",
  "photoshop-brushes": "Photoshop 笔刷笔触与数字绘画场景",
  "procreate-brushes": "Procreate 笔刷与平板绘画工作台",
  "music-production-assets": "音乐制作素材与编曲控制台",
  "notion-template": "Notion 模板与个人信息管理界面",
  "word-template": "Word 文档模板与文字排版场景",
  "mindmap-template": "思维导图模板与知识梳理场景",
  "thesis-template": "论文模板、参考资料与写作桌面",
  "industry-report": "行业报告、数据图表与研究桌面",
  "standards-manuals": "标准规范、技术手册与工程资料",
  ielts: "雅思听说读写学习资料与备考桌面",
  toefl: "托福学习资料与英语备考场景",
  cet: "大学英语四六级资料与复习笔记",
  "accounting-exam": "会计考试教材、计算器与复习资料",
  "legal-exam": "法律职业资格考试资料与法典",
  "construction-exam": "建造师考试图纸、教材与备考资料",
  "medical-exam": "医学考试教材、笔记与学习模型",
  "data-analysis": "数据分析课程与图表工作台",
  "ai-course": "人工智能课程与模型学习场景",
  "primary-school": "小学课本、文具与学习资料",
  "middle-school": "初中教材、习题与学习书桌",
  "high-school": "高中教材、试卷与备考学习场景",
};

export const topicVisualSlugs = Object.freeze(Object.keys(topicVisualAlt));

export function getTopicVisual(slug: string): TopicVisual | undefined {
  const alt = topicVisualAlt[slug];
  if (!alt) return undefined;

  return {
    src: `/topic-images/${slug}.webp`,
    fallback: `/topic-images/${slug}.jpg`,
    alt,
    width: 1200,
    height: 800,
  };
}
