
const config = window.PLAYABLE_CONFIG;
const images = window.PLAYABLE_IMAGES;
const videos = window.PLAYABLE_VIDEOS;

window.PLAYABLE_LANG = {
  "zh": {
    "title": "游戏互动广告",
    "click_to_play": "点击屏幕继续",
    "rotate_tip": "屏幕即将旋转",
    "loading_failed": "加载失败",
    "play_failed": "播放失败",
    "resource_not_found": "资源未找到",
    "slider_drag_to_end": "向右拖动到终点",
    "slider_not_enough": "请拖到最右侧",
    "slider_hold_required": "请保持在终点位置"
  },
  "en": {
    "title": "Playable Ads",
    "click_to_play": "Tap to continue",
    "rotate_tip": "Screen will rotate",
    "loading_failed": "Loading failed",
    "play_failed": "Play failed",
    "resource_not_found": "Resource not found",
    "slider_drag_to_end": "Drag to the end",
    "slider_not_enough": "Drag all the way to the end",
    "slider_hold_required": "Hold at the end"
  }
};

const publicLang = window.PLAYABLE_LANG || {}; 
const partnerLang = window.PARTNER_LANG || {}; 

// 合并语言配置，合作伙伴配置优先
const lang = {};
for (const langKey in publicLang) {
  lang[langKey] = { ...publicLang[langKey] };
  // 如果合作伙伴有该语言的配置，则覆盖公共配置
  if (partnerLang[langKey]) {
    lang[langKey] = { ...lang[langKey], ...partnerLang[langKey] };
  }
}
// 添加合作伙伴独有的语言
for (const langKey in partnerLang) {
  if (!lang[langKey]) {
    lang[langKey] = { ...partnerLang[langKey] };
  }
}

// 当前语言，可以根据需要切换
let currentLang = config.lang || 'en';

// 获取视频源
const videoUrl = config.videoUrl;
const videoSource = videos ? videos[videoUrl] : videoUrl;
const videoType = config.type;

// DOM元素
const video = document.getElementById('ad-video');
const clickLayer = document.getElementById('clickLayer');
const clickTip = clickLayer.querySelector('.click-tip');
const rotateHighlight = clickTip.querySelector('.highlight');
const guideLayer = document.getElementById('guideLayer');
const guideContainer = document.getElementById('guideContainer');

// 状态变量
let isPortrait = window.innerHeight > window.innerWidth;
let hasStarted = false;
let currentInteractionPoint = null;
let lastTime = 0; // 记录上一次的时间

let ctaStartButtonVisible = false;
let ctaEndButtonVisible = false;

function isPortraitVideo() {
  return videoType === 'portrait';
}

function isLandscapeVideo() {
  return videoType === 'landscape';
}

function isDisplayStartScreen() {
  return config.start_screen && config.start_screen.enable;
}

// 显示开始屏幕
function showStartScreen() {
  // 清除现有内容
  guideLayer.innerHTML = '';

  // 获取当前屏幕方向的配置
  const orientation = isPortrait ? 'portrait' : 'landscape';
  const startConfig = config.start_screen[orientation];

  // 创建开始屏幕图片
  const startImage = document.createElement('img');
  startImage.src = images ? images[startConfig.image] : startConfig.image;
  startImage.className = 'start-screen-image';
  // 设置图片尺寸和位置
  setButtonSizeAndPosition(startImage, startConfig.size, startConfig.position);

  // 添加到引导层
  guideLayer.appendChild(startImage);

  // 显示点击层
  clickLayer.style.display = 'flex';

  // 如果是竖屏，显示旋转提示
  if (isPortrait && isLandscapeVideo()) {
    rotateHighlight.style.display = 'block';
  } else {
    rotateHighlight.style.display = 'none';
  }
}

// 检查屏幕方向并显示相应提示
function checkOrientation() {
  isPortrait = window.innerHeight > window.innerWidth;

  if (!hasStarted && isDisplayStartScreen() === true) {
    showStartScreen();
  }
}

function setButtonSizeAndPosition(btn, sizePercent, posPercent) {
  // 获取视频元素
  const videoElement = document.getElementById('ad-video');
  if (!videoElement || !videoElement.videoWidth || !videoElement.videoHeight) {
    // 如果视频元素不存在或尺寸未知，延迟设置
    requestAnimationFrame(() => setButtonSizeAndPosition(btn, sizePercent, posPercent));
    return;
  }
  
  // 获取视频的实际显示区域
  const videoRect = videoElement.getBoundingClientRect();
  
  // 获取guide-layer的尺寸
  const guideRect = guideLayer.getBoundingClientRect();
  
  // 计算按钮尺寸，基于视频的实际显示区域
  let targetWidth = videoRect.width * sizePercent.width;
  const img = new window.Image();
  img.src = btn.src;
  img.onload = function () {
    const imgRatio = img.width / img.height;
    let targetHeight = targetWidth / imgRatio;
    
    // 判断按钮是否为CTA按钮
    const isCTAButton = btn.classList.contains('cta-button') || 
                        btn.classList.contains('cta-start-button') || 
                        btn.classList.contains('cta-end-button');
    
    // 设置按钮尺寸
    btn.style.width = targetWidth + 'px';
    btn.style.height = targetHeight + 'px';
    
    // 计算按钮位置，基于视频的实际显示区域
    const leftPos = videoRect.width * posPercent.x;
    const topPos = videoRect.height * posPercent.y;
    
    // 使用绝对像素位置
    btn.style.left = leftPos + 'px';
    btn.style.top = topPos + 'px';
    
    // 确保transform样式被正确应用且不被覆盖
    // 使用!important确保优先级
    // btn.style.setProperty('transform', 'translate(-50%, -50%)', 'important');
    
    // 显示按钮
    btn.classList.add('visible');
    
  };
}

// 创建引导元素
function createGuideElements(point) {
  // 获取当前屏幕方向的配置
  const orientation = isPortrait ? "portrait" : "landscape";

  // 清除现有引导元素，但保留CTA按钮
  const existingGuides = guideLayer.querySelectorAll(".button-image, .guide-image");
  existingGuides.forEach(el => el.remove());

  // 创建按钮
  const buttonImage = document.createElement("img");
  buttonImage.src = images ? images[point.buttonImage] : point.buttonImage;
  buttonImage.className = "button-image";

  // 使用对应方向的按钮尺寸和位置
  let buttonSize = point.buttonSize[orientation];
  let buttonPosition = point.buttonPosition[orientation];
  // 为了适配横屏视频，竖屏时，没有首页图片时，CTA按钮的位置
  if (isPortrait && isLandscapeVideo() && !hasStarted && isDisplayStartScreen() === false) {
    buttonSize = point.buttonSize["landscape"];
    buttonPosition = point.buttonPosition["landscape"];
  }
  setButtonSizeAndPosition(buttonImage, buttonSize, buttonPosition);

  // 默认添加缩放动画，除非有特定的效果
  if (point.buttonEffect === "scale" || !point.buttonEffect) {
    buttonImage.classList.add("scale-animation");
  }

  // 添加按钮点击事件
  buttonImage.addEventListener("click", (e) => {
    // 只移除引导元素，保留CTA按钮
    const guides = guideLayer.querySelectorAll(".button-image, .guide-image");
    guides.forEach(el => el.remove());
    if (video.currentTime < point.time + point.duration) {
      video.currentTime = point.time + point.duration;
    }
    playVideo();
  });

  // 创建引导图片
  const guideImage = document.createElement("img");
  guideImage.src = images ? images[point.guideImage] : point.guideImage;
  guideImage.className = "guide-image";

  // 使用对应方向的引导尺寸和位置
  let guideSize = point.guideSize[orientation];
  let guidePosition = point.guidePosition[orientation];
  // 为了适配横屏视频，竖屏时，没有首页图片时，CTA按钮的位置
  if (isPortrait && isLandscapeVideo() && !hasStarted && isDisplayStartScreen() === false) {
    guideSize = point.guideSize["landscape"];
    guidePosition = point.guidePosition["landscape"];
  }
  setButtonSizeAndPosition(guideImage, guideSize, guidePosition);

  // 添加动画 - 默认添加缩放动画
  const swipeConfig = point.swipeDirection;
  if (typeof swipeConfig === "string" && swipeConfig === "scale") {
    guideImage.classList.add("scale-animation");
  } else if (typeof swipeConfig === "string" && swipeConfig === "bounce") {
    guideImage.classList.add("bounce-y");
  } else if (typeof swipeConfig === "string" && swipeConfig === "slide-bounce") {
    guideImage.classList.add("slide-in-right");
    // 动画结束后加上 bounce-y
    guideImage.addEventListener("animationend", function handler(e) {
      if (e.animationName === "slideInRight") {
        guideImage.classList.remove("slide-in-right");
        guideImage.classList.add("bounce-y");
        guideImage.removeEventListener("animationend", handler);
      }
    });
  } else if (typeof swipeConfig === "object" && swipeConfig.type === "angle") {
    guideImage.classList.add("angle-animation");
    const angle = swipeConfig.value * Math.PI / 180;
    const distance = parseInt(swipeConfig.distance);
    const moveX = Math.cos(angle) * distance;
    const moveY = Math.sin(angle) * distance;
    guideImage.style.setProperty("--move-x", moveX + "px");
    guideImage.style.setProperty("--move-y", moveY + "px");
  } else {
    // 默认添加缩放动画
    guideImage.classList.add("scale-animation");
  }

  // 添加到引导容器
  guideLayer.appendChild(buttonImage);
  guideLayer.appendChild(guideImage);

  // 处理竖屏旋转
  if (isPortrait && isLandscapeVideo() && video.classList.contains("rotated")) {
    guideLayer.classList.add("rotated");
  } else {
    guideLayer.classList.remove("rotated");
  }
}
function ctaClick() {
  window.location.href = config.cta_start_button.url;
}

// 创建CTA开始按钮，在视频开始时显示
function createCTAStartButton() {
  // 如果已经存在CTA按钮，先移除
  hideCTAStartButton();

  // 获取当前屏幕方向的配置
  const orientation = isPortrait ? 'portrait' : 'landscape';
  const ctaConfig = config.cta_start_button;
  if (!ctaConfig) return;

  // 创建按钮
  const ctaButton = document.createElement('img');
  ctaButton.className = 'cta-button cta-start-button';
  ctaButton.src = images ? images[ctaConfig.buttonImage] : ctaConfig.buttonImage;

  // 设置尺寸和位置
  let buttonSize = ctaConfig.buttonSize[orientation];
  let buttonPosition = ctaConfig.buttonPosition[orientation];
  // 为了适配竖屏时，没有首页图片时，CTA按钮的位置
  if (isPortrait && isLandscapeVideo() && !hasStarted && isDisplayStartScreen() === false) {
    buttonSize = ctaConfig.buttonSize['landscape'];
    buttonPosition = ctaConfig.buttonPosition['landscape'];
  }
  setButtonSizeAndPosition(ctaButton, buttonSize, buttonPosition);

  ctaButton.addEventListener('click', (e) => {
    e.preventDefault();
    ctaClick();
  });

  guideLayer.appendChild(ctaButton);
  ctaStartButtonVisible = true;
}

// 隐藏CTA开始按钮
function hideCTAStartButton() {
  const existingCTA = guideLayer.querySelector('.cta-start-button');
  if (existingCTA) {
    existingCTA.remove();
  }
  ctaStartButtonVisible = false;
}

// 创建CTA结束按钮，在视频结束时显示
function createCTAEndButton() {
  // 如果已经存在CTA按钮，先移除
  hideCTAEndButton();
  hideCTAStartButton(); // 出现end按钮时自动隐藏start按钮

  // 获取当前屏幕方向的配置
  const orientation = isPortrait ? 'portrait' : 'landscape';
  const ctaConfig = config.cta_end_button;
  
  if (!ctaConfig) {
    console.error("Missing cta_end_button configuration");
    return;
  }

  // 创建按钮
  const ctaButton = document.createElement('img');
  ctaButton.className = 'cta-button cta-end-button scale-bounce';
  ctaButton.src = images ? images[ctaConfig.buttonImage] : ctaConfig.buttonImage;
  

  // 设置尺寸和位置
  const buttonSize = ctaConfig.buttonSize[orientation];
  const buttonPosition = ctaConfig.buttonPosition[orientation];
  
  
  // 先添加到DOM，确保能获取到尺寸
  guideLayer.appendChild(ctaButton);
  
  // 设置按钮尺寸和位置
  setButtonSizeAndPosition(ctaButton, buttonSize, buttonPosition);

  ctaButton.addEventListener('click', (e) => {
    e.preventDefault();
    ctaClick();
  });

  requestAnimationFrame(() => {
    ctaButton.classList.add('visible');
  });
  ctaEndButtonVisible = true;
}
// 隐藏CTA结束按钮
function hideCTAEndButton() {
  const existingCTA = guideLayer.querySelector('.cta-end-button');
  if (existingCTA) {
    existingCTA.remove();
  }
  ctaEndButtonVisible = false;
}

// 检查交互点
function checkInteractionPoints() {
  // 适配checkDisplayStartScreen() === false 时，CTA 按钮的lastTime < 改为 <= 没有关系, 因为视频开始时，lastTime为0，所以需要<=
  if (video.currentTime >= config.cta_start_button.displayTime && lastTime <= config.cta_start_button.displayTime) {
    createCTAStartButton();
  }
  // 适配checkDisplayStartScreen() === false 时，CTA 按钮的lastTime < 改为 <= 没有关系, 因为视频开始时，lastTime为0，所以需要<=
  if (video.currentTime >= config.cta_end_button.displayTime && lastTime <= config.cta_end_button.displayTime) {
    createCTAEndButton();
  }
  
  if (!config.interactionPoints) return;

  const currentTime = video.currentTime;
  // 遍历所有交互点
  for (const point of config.interactionPoints) {
    // 如果当前时间大于等于交互点时间，并且上一次时间小于交互点时间，说明需要显示引导元素
    // 适配checkDisplayStartScreen() === false 时，lastTime < point.time的条件修改增加不需要首页图片时的判断(checkDisplayStartScreen() === false && currentTime === 0 && lastTime <= point.time))
    if (currentTime >= point.time && (lastTime < point.time || (currentTime === 0 && lastTime <= point.time)) && currentInteractionPoint !== point) {
      currentInteractionPoint = point;
      // video.currentTime = point.time;
      createGuideElements(point);
    }
    // 如果当前时间和上一次时间跨过了交互点时间，说明需要暂停
    if (currentTime >= (point.time + point.duration) && lastTime < (point.time + point.duration) && currentInteractionPoint == point) {
      video.pause();
      break;
    }
  }

  lastTime = currentTime;
}

// 播放控制
function playVideo() {
  lastTime = video.currentTime;
  video.volume = config.volume;
  // 移除开始屏幕图片
  const startImage = guideLayer.querySelector('.start-screen-image');
  if (startImage) {
    startImage.remove();
  }

  video.play().then(() => {
    hasStarted = true;
    clickLayer.style.display = 'none';
    currentInteractionPoint = null;

    if (isPortrait && isLandscapeVideo()) {
      // 先隐藏引导元素
      guideLayer.classList.add('rotating');

      if (config.rotateTime >= 0) {
        setTimeout(() => {
          video.classList.add('rotated');
          guideLayer.classList.add('rotated');

          // 提前显示引导元素
          setTimeout(() => {
            guideLayer.classList.remove('rotating');
          }, 300);
        }, config.rotateTime * 1000);
      }
    }
  }).catch(error => {
    console.error(getText('play_failed'), error);
    video.muted = true;
    video.play().catch(e => {
      console.error(getText('play_failed'), e);
      clickTip.textContent = getText('play_failed');
      rotateHighlight.style.display = 'none';
    });
  });
}

// 暂停视频
function pauseVideo() {
  if (video && !video.paused) {
    video.pause();
  }
}

// 获取翻译文本
function getText(key) {
  const keys = key.split('.');
  let text = lang[currentLang];
  for (const k of keys) {
    text = text[k];
    if (!text) return key; // 如果找不到翻译，返回key
  }
  return text;
}

// 更新页面文本
function updatePageText() {
  // 更新所有带data-lang属性的元素
  document.querySelectorAll('[data-lang]').forEach(el => {
    const key = el.getAttribute('data-lang');
    el.textContent = getText(key);
  });

  // 更新document title
  document.title = getText('title');
}

// 切换语言
function switchLanguage(newLang) {
  if (lang[newLang]) {
    currentLang = newLang;
    updatePageText();
  }
}

// 初始化语言
updatePageText();

// 初始化视频
video.src = videoSource;
video.load();

// 视频时间更新事件
video.addEventListener('timeupdate', checkInteractionPoints);

// apple设备上需要主动调用一次，否则无法触发timeupdate事件
checkInteractionPoints();

// 视频结束处理
video.addEventListener("ended", () => {
  rotateHighlight.style.display = "none";

  // 清除引导层内容，但保留CTA按钮
  const guides = guideLayer.querySelectorAll(".button-image, .guide-image");
  guides.forEach(el => el.remove());
  currentInteractionPoint = null;
  
  // 强制显示CTA结束按钮，即使配置不存在也创建一个默认的
  if (config.cta_end_button) {
    createCTAEndButton();
    
    // 确保按钮可见并应用动画
    setTimeout(() => {
      const ctaEndButton = guideLayer.querySelector('.cta-end-button');
      if (ctaEndButton) {
        ctaEndButton.classList.add('visible');
        ctaEndButton.style.setProperty('transform', 'translate(-50%, -50%)', 'important');
      }
    }, 100);
  } else {
    createDefaultCTAEndButton();
  }
});
// 在指定时间点显示ctaEndButton
video.addEventListener('timeupdate', () => {
  // 添加调试信息
  if (config.cta_end_time !== undefined && 
      video.currentTime >= config.cta_end_time && 
      Math.abs(video.currentTime - config.cta_end_time) < 0.1) {
  }
  
  if (
    config.cta_end_time !== undefined &&
    video.currentTime >= config.cta_end_time &&
    !guideLayer.querySelector('.cta-end-button')
  ) {
    createCTAEndButton();
  }
});

// 添加直接点击屏幕播放
document.addEventListener('click', () => {
  // 检查配置是否启用第一次点击屏幕事件
  const enableFirstClick = config.enableFirstClick !== false; // 默认为true
  
  if (!hasStarted && enableFirstClick) {
    const guides = guideLayer.querySelectorAll('.button-image, .guide-image');
    guides.forEach(el => el.remove());
    playVideo();
  }
});

// 更新所有元素的位置
function updateAllElementsPositions() {
  // 更新CTA开始按钮
  if (ctaStartButtonVisible) {
    createCTAStartButton();
  }
  
  // 更新CTA结束按钮
  if (ctaEndButtonVisible) {
    createCTAEndButton();
  }
  
  // 更新当前交互点的引导元素
  if (currentInteractionPoint) {
    createGuideElements(currentInteractionPoint);
  }
}

// 更新guide-layer尺寸以匹配视频实际显示区域
function updateGuideLayerSize() {
  const videoElement = document.getElementById('ad-video');
  if (!videoElement || !videoElement.videoWidth || !videoElement.videoHeight) {
    // 如果视频元素不存在或尺寸未知，延迟更新
    return;
  }
  
  const videoRect = videoElement.getBoundingClientRect();
  
  // 设置guide-layer的尺寸与视频实际显示区域一致
  guideLayer.style.width = videoRect.width + 'px';
  guideLayer.style.height = videoRect.height + 'px';
  
  // 确保guide-layer的位置与视频中心对齐
  guideLayer.style.top = '50%';
  guideLayer.style.left = '50%';
  guideLayer.style.transform = 'translate(-50%, -50%)';
}

// 屏幕旋转处理
window.addEventListener('resize', () => {
  const wasPortrait = isPortrait;
  isPortrait = window.innerHeight > window.innerWidth;
  
  // 更新guide-layer尺寸
  updateGuideLayerSize();
  
  // 如果方向确实发生了变化
  if (wasPortrait !== isPortrait) {
    // 如果还没开始播放，更新开始屏幕
    if (!hasStarted && isDisplayStartScreen() === true) {
      showStartScreen();
      return;
    }

    // 先隐藏引导元素
    guideLayer.classList.add('rotating');

    if (!hasStarted && isDisplayStartScreen() === false && currentInteractionPoint) {
      createGuideElements(currentInteractionPoint);
    }
    if (isPortrait && isLandscapeVideo() && hasStarted) {
      // 竖屏：添加旋转
      video.classList.add('rotated');
      guideLayer.classList.add('rotated');
    } else {
      // 横屏：移除旋转
      video.classList.remove('rotated');
      guideLayer.classList.remove('rotated');
    }

    // 等待旋转动画完成后再显示引导元素
    setTimeout(() => {
      // 如果视频已结束，显示CTA按钮
      if (video.ended) {
        createCTAEndButton();
      }
      // 如果视频正在播放且有交互点，显示引导元素
      else if (hasStarted && currentInteractionPoint) {
        createGuideElements(currentInteractionPoint);
      }
      // 移除旋转中状态
      guideLayer.classList.remove('rotating');
    }, 300);
  } else {
    // 即使方向没有变化，也更新所有元素位置以适应屏幕大小变化
    updateAllElementsPositions();
  }
});

// 视频元数据加载完成后，更新所有元素位置
video.addEventListener('loadedmetadata', () => {
  // 视频尺寸信息已可用，更新guide-layer尺寸和所有元素位置
  setTimeout(() => {
    updateGuideLayerSize();
    updateAllElementsPositions();
  }, 100); // 稍微延迟以确保视频元素尺寸已更新
});

// 视频可以播放时，再次更新guide-layer尺寸和元素位置
video.addEventListener('canplay', () => {
  setTimeout(() => {
    updateGuideLayerSize();
    updateAllElementsPositions();
  }, 100);
});

// 视频错误处理
video.addEventListener('error', (e) => {
  console.error(getText('loading_failed'), e.target.error);
  clickLayer.style.display = 'flex';
  clickTip.textContent = getText('loading_failed');
  rotateHighlight.style.display = 'none';
});

// 初始化
checkOrientation();

// 创建默认的CTA结束按钮
function createDefaultCTAEndButton() {
  // 如果已经存在CTA按钮，先移除
  hideCTAEndButton();
  hideCTAStartButton();

  // 创建按钮
  const ctaButton = document.createElement('div');
  ctaButton.className = 'cta-button cta-end-button scale-bounce';
  ctaButton.style.cssText = `
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: #ff6b35;
    color: white;
    padding: 15px 30px;
    border-radius: 25px;
    font-size: 18px;
    font-weight: bold;
    cursor: pointer;
    z-index: 100;
    box-shadow: 0 4px 15px rgba(255, 107, 53, 0.4);
    border: none;
    min-width: 120px;
    text-align: center;
  `;
  ctaButton.textContent = 'INSTALL';
  
  // 添加到guide-layer
  guideLayer.appendChild(ctaButton);
  
  ctaButton.addEventListener('click', (e) => {
    e.preventDefault();
    // 可以在这里添加默认的跳转逻辑
    window.open('https://example.com', '_blank');
  });

  requestAnimationFrame(() => {
    ctaButton.classList.add('visible');
  });
  ctaEndButtonVisible = true;
}
