export type Locale = 'zh' | 'en';

export const locales: Record<Locale, string> = {
  zh: '中文',
  en: 'English',
};

export type TranslationKey =
  | 'appName'
  | 'heroTitle'
  | 'heroDescription'
  | 'startCreatingNow'
  | 'watchDemo'
  | 'whyChoose'
  | 'whyChooseSubtitle'
  | 'feature1Title'
  | 'feature1Description'
  | 'feature2Title'
  | 'feature2Description'
  | 'feature3Title'
  | 'feature3Description'
  | 'feature4Title'
  | 'feature4Description'
  | 'feature5Title'
  | 'feature5Description'
  | 'feature6Title'
  | 'feature6Description'
  | 'ctaTitle'
  | 'ctaDescription'
  | 'getStartedFree'
  | 'features'
  | 'featuresTitle'
  | 'featuresDescription'
  | 'pricing'
  | 'backToHome'
  | 'createPlayableAd'
  | 'uploadVideo'
  | 'addPauseFrames'
  | 'addCTAButtons'
  | 'addBannersOptional'
  | 'addAudio'
  | 'export'
  | 'workflowTitle'
  | 'workflowHeading'
  | 'workflowDescription'
  | 'step1Title'
  | 'step1Description'
  | 'step2Title'
  | 'step2Description'
  | 'step3Title'
  | 'step3Description'
  | 'platformTitle'
  | 'platformHeading'
  | 'platformDescription'
  | 'statsAdsCreated'
  | 'statsPlatformsSupported'
  | 'statsUserSatisfaction'
  | 'selectProjectType'
  | 'uploadImage'
  | 'addHotspots'
  | 'interactiveVideo'
  | 'interactiveImage'
  | 'interactiveVideoDesc'
  | 'interactiveImageDesc'
  | 'chooseProjectType'
  | 'learnMore';

export const translations: Record<Locale, Record<TranslationKey, string>> = {
  zh: {
    appName: '试玩广告制作平台',
    heroTitle: '试玩广告制作平台',
    heroDescription: '通过互动式试玩广告提升您的应用营销效果。创建、自定义和部署能够提高转化率的吸引人广告。',
    startCreatingNow: '立即开始创建',
    watchDemo: '观看演示',
    whyChoose: '为什么选择试玩广告制作平台？',
    whyChooseSubtitle: '为现代应用营销人员设计的专业工具',
    feature1Title: '拖放式简易操作',
    feature1Description: '无需编程。上传您的视频并使用我们直观的界面进行自定义。',
    feature2Title: '多平台支持',
    feature2Description: '导出适用于Google Ads、Facebook、AppLovin、Unity等多个平台的广告。',
    feature3Title: '互动元素',
    feature3Description: '添加暂停帧、号召性用语按钮、横幅和自定义互动。',
    feature4Title: '实时预览',
    feature4Description: '通过我们的实时预览系统即时查看您的更改。',
    feature5Title: '专业模板',
    feature5Description: '从经过验证的模板开始，或从头创建。',
    feature6Title: '分析就绪',
    feature6Description: '内置跟踪和分析功能，用于衡量您的广告效果。',
    ctaTitle: '准备创建您的第一个试玩广告？',
    ctaDescription: '加入已经使用试玩广告制作平台提高转化率的数千名应用营销人员的行列。',
    getStartedFree: '免费开始使用',
    features: '功能特点',
    featuresTitle: '功能特点',
    featuresDescription: '为现代应用营销人员设计的专业工具',
    pricing: '价格方案',
    backToHome: '返回首页',
    createPlayableAd: '创建试玩广告',
    uploadVideo: '上传视频',
    addPauseFrames: '添加暂停帧',
    addCTAButtons: '添加CTA按钮',
    addBannersOptional: '添加横幅（可选）',
    addAudio: '添加音频',
    export: '导出',
    workflowTitle: '工作流程',
    workflowHeading: '简单三步，创建专业广告',
    workflowDescription: '无需编程技能，通过直观的拖拽界面，快速创建高质量的互动广告',
    step1Title: '上传视频',
    step1Description: '上传您的应用视频，支持多种格式和分辨率',
    step2Title: '添加互动元素',
    step2Description: '添加暂停帧、按钮、横幅等互动元素',
    step3Title: '导出广告',
    step3Description: '一键导出到各大广告平台，立即开始投放',
    platformTitle: '平台支持',
    platformHeading: '支持主流广告平台',
    platformDescription: '一次创建，多平台投放，覆盖所有主流广告渠道',
    statsAdsCreated: '广告创建数量',
    statsPlatformsSupported: '支持平台数量',
    statsUserSatisfaction: '用户满意度',
    selectProjectType: '选择项目类型',
    uploadImage: '上传图片',
    addHotspots: '添加热点',
    interactiveVideo: '互动视频',
    interactiveImage: '互动图片',
    interactiveVideoDesc: '创建具有暂停帧、按钮和横幅的互动视频广告',
    interactiveImageDesc: '创建具有可点击热点的互动图片广告',
    chooseProjectType: '选择项目类型',
    learnMore: '了解更多'
  },
  en: {
    appName: 'Playable Ad Maker',
    heroTitle: 'Create Engaging Playable Ads',
    heroDescription: 'Boost your app marketing with interactive playable ads. Create, customize, and deploy compelling ads that drive conversions.',
    startCreatingNow: 'Start Creating Now',
    watchDemo: 'Watch Demo',
    whyChoose: 'Why Choose Playable Ad Maker?',
    whyChooseSubtitle: 'Professional tools designed for modern app marketers',
    feature1Title: 'Drag & Drop Simplicity',
    feature1Description: 'No coding required. Upload your video and customize with our intuitive interface.',
    feature2Title: 'Multi-Platform Support',
    feature2Description: 'Export ads for Google Ads, Facebook, AppLovin, Unity, and more platforms.',
    feature3Title: 'Interactive Elements',
    feature3Description: 'Add pause frames, call-to-action buttons, banners, and custom interactions.',
    feature4Title: 'Real-time Preview',
    feature4Description: 'See your changes instantly with our real-time preview system.',
    feature5Title: 'Professional Templates',
    feature5Description: 'Start with proven templates or create from scratch.',
    feature6Title: 'Analytics Ready',
    feature6Description: 'Built-in tracking and analytics to measure your ad performance.',
    ctaTitle: 'Ready to create your first playable ad?',
    ctaDescription: 'Join thousands of app marketers who are already using Playable Ad Maker to boost their conversion rates.',
    getStartedFree: 'Get Started Free',
    features: 'Features',
    featuresTitle: 'Features',
    featuresDescription: 'Professional tools designed for modern app marketers',
    pricing: 'Pricing',
    backToHome: 'Back to Home',
    createPlayableAd: 'Create Playable Ad',
    uploadVideo: 'Upload Video',
    addPauseFrames: 'Add Pause Frames',
    addCTAButtons: 'Add CTA Buttons',
    addBannersOptional: 'Add Banners (Optional)',
    addAudio: 'Add Audio',
    export: 'Export',
    workflowTitle: 'Workflow',
    workflowHeading: 'Create Professional Ads in 3 Simple Steps',
    workflowDescription: 'No coding skills required. Create high-quality interactive ads quickly with our intuitive drag-and-drop interface',
    step1Title: 'Upload Video',
    step1Description: 'Upload your app video, supporting multiple formats and resolutions',
    step2Title: 'Add Interactive Elements',
    step2Description: 'Add pause frames, buttons, banners and other interactive elements',
    step3Title: 'Export Ad',
    step3Description: 'Export to major ad platforms with one click and start advertising immediately',
    platformTitle: 'Platform Support',
    platformHeading: 'Support for Mainstream Ad Platforms',
    platformDescription: 'Create once, deploy everywhere, covering all major advertising channels',
    statsAdsCreated: 'Ads Created',
    statsPlatformsSupported: 'Platforms Supported',
    statsUserSatisfaction: 'User Satisfaction',
    selectProjectType: 'Select Project Type',
    uploadImage: 'Upload Image',
    addHotspots: 'Add Hotspots',
    interactiveVideo: 'Interactive Video',
    interactiveImage: 'Interactive Image',
    interactiveVideoDesc: 'Create interactive video ads with pause frames, buttons, and banners',
    interactiveImageDesc: 'Create interactive image ads with clickable hotspots',
    chooseProjectType: 'Choose Project Type',
    learnMore: 'Learn More'
  },
};
