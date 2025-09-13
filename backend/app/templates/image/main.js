const fingerSvg = `
<svg class="icon" style="width: 1.4140625em;height: 1em;vertical-align: middle;fill: currentColor;overflow: hidden;" viewBox="0 0 1448 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1038"><path d="M954.678313 549.757097l-211.405341-125.742315c-7.740635-4.644381-12.729044-1.032085-11.008903 7.740635l44.895682 243.227953c1.720141 8.944734 7.224593 10.148833 12.385016 2.752225 0 0 28.726356-41.111372 52.29229-66.225432l45.239711 67.257517c4.300353 6.364522 13.073072 8.084663 19.26558 3.784311l15.137242-10.492861c6.364522-4.300353 7.912649-13.245087 3.612296-19.609609l-45.239711-67.257517c30.274483-12.55703 72.933983-23.049891 72.933983-23.049891 8.77272-2.236183 9.63279-7.740635 1.892155-12.385016z m-246.668234 79.642533c-0.860071-0.344028-1.720141-0.516042-2.580212-0.516042-72.933983-17.029397-125.742315-84.1149-124.882244-161.349236 1.032085-90.307408 74.310096-162.897363 163.241391-162.037292 84.286914 1.032085 152.920544 67.601545 159.285066 151.200403v0.172015c0 0.860071 0 1.720141 0.172014 2.408197 0.860071 5.332437 4.644381 9.63279 9.460776 11.180917 0.860071 0.172014 1.720141 0.344028 2.408198 0.516043h2.580212c7.224593-0.516042 12.901058-6.536536 13.073072-13.933143v-0.172014c0-0.688056 0-1.204099-0.172014-1.892156-1.376113-20.297665-6.020494-39.907274-13.589115-58.656811-9.288762-23.049891-22.705863-43.691584-39.907273-61.409038-17.201411-17.889467-37.327062-31.82261-59.688897-41.799429-23.221905-10.320847-47.991937-15.653284-73.450025-15.997312-25.630102-0.344028-50.400134 4.472367-73.794053 14.277171-22.705863 9.460776-43.003528 23.049891-60.548967 40.423316-17.545439 17.373425-31.478582 37.843104-41.283387 60.548967-10.148833 23.565933-15.48127 48.679993-15.653284 74.654124-0.516042 46.959852 15.997312 92.543591 46.271796 127.978498 26.490173 30.790526 61.581052 52.29229 100.45624 61.409038 0.860071 0.344028 1.720141 0.516042 2.580212 0.516042 0.516042 0 1.032085 0.172014 1.548127 0.172014 7.740635 0.172014 14.105157-6.192508 14.105157-13.933143 0-6.536536-3.956325-11.868974-9.63279-13.761129z" fill="#040000" p-id="1039"></path></svg>`

// 添加音频图标SVG
const audioOnSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
</svg>`;

const audioOffSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
</svg>`;

const config = window.PLAYABLE_CONFIG;
const images = window.PLAYABLE_IMAGES;

// 创建背景音乐元素
let bgAudio = null;
let audioPlaying = false;
const audioControls = document.getElementById('audio-controls');
const audioToggle = document.getElementById('audio-toggle');

if (config.audio && config.audio.length > 0) {
    bgAudio = document.createElement('audio');
    bgAudio.src = config.audio[0];
    bgAudio.loop = true;
    bgAudio.preload = 'auto';
    bgAudio.style.display = 'none';
    document.body.appendChild(bgAudio);
    
    // 显示音频控制器
    audioControls.classList.remove('hidden');
    
    // 添加音频控制按钮事件
    audioToggle.addEventListener('click', function() {
        if (audioPlaying) {
            bgAudio.pause();
            audioPlaying = false;
            audioToggle.innerHTML = audioOffSvg;
        } else {
            bgAudio.play().catch(err => {
                console.error('Failed to play audio:', err);
            });
            audioPlaying = true;
            audioToggle.innerHTML = audioOnSvg;
        }
    });
    
    // 初始化音频图标
    audioToggle.innerHTML = audioOffSvg;
}

// 用户交互标志
let userInteracted = false;

// 监听用户交互，开始播放音频
function initAudioPlayback() {
    if (bgAudio && !userInteracted) {
        userInteracted = true;
        
        // 尝试播放音频
        const playPromise = bgAudio.play();
        
        // 处理自动播放策略限制
        if (playPromise !== undefined) {
            playPromise.then(() => {
                audioPlaying = true;
                audioToggle.innerHTML = audioOnSvg;
                console.log('Audio playback started');
            }).catch(error => {
                console.log('Auto-play prevented by browser:', error);
                audioToggle.innerHTML = audioOffSvg;
                
                // 如果自动播放失败，添加点击事件监听器
                document.addEventListener('click', function audioClickHandler() {
                    bgAudio.play().then(() => {
                        audioPlaying = true;
                        audioToggle.innerHTML = audioOnSvg;
                        console.log('Audio started after user interaction');
                        document.removeEventListener('click', audioClickHandler);
                    }).catch(err => {
                        console.error('Failed to play audio after click:', err);
                    });
                }, { once: false });
            });
        }
    }
}

// 添加页面交互事件监听器
document.addEventListener('click', initAudioPlayback);
document.addEventListener('touchstart', initAudioPlayback);

if (config.title) {
    document.title = config.title;
}
const app = document.getElementById('app');
// 渲染 app 下的图片和对应热点
(config.appImgs || []).forEach((src, idx) => {
    // 创建图片包裹容器
    const wrapper = document.createElement('div');
    wrapper.className = 'img-wrapper';
    wrapper.style.position = 'relative';
    wrapper.style.width = '100%';
    wrapper.style.overflow = 'hidden';

    // 创建图片
    const img = document.createElement('img');
    img.src = images[src]; // 取 base64 data URIsrc;
    img.className = 'app-img';
    img.style.width = '100%';
    img.style.maxWidth = '100%';
    img.style.height = 'auto';
    img.style.objectFit = 'contain';
    img.style.display = 'block';
    wrapper.appendChild(img);

    // 渲染属于该图片的热点
    (config.hotspots || []).forEach(spot => {
        if (spot.imgIndex === idx) {
            const div = document.createElement('div');
            div.className = 'hotspot-svg-container';
            
            // 确保位置值包含百分号
            const leftPos = typeof spot.left === 'string' && spot.left.includes('%') ? 
                spot.left : `${spot.left}%`;
            const topPos = typeof spot.top === 'string' && spot.top.includes('%') ? 
                spot.top : `${spot.top}%`;
                
            div.style.left = leftPos;
            div.style.top = topPos;
            div.style.position = 'absolute';
            div.style.transform = 'translate(-50%, -50%)';
            div.style.zIndex = 2;
            
            // 获取scale值（百分比），相对于图片宽度
            const scalePercent = spot.scale || 25;
            console.log(`Hotspot ${spot.type} scale: ${scalePercent}%`);
            
            // 设置外层div的宽度为图片容器宽度的百分比
            div.style.width = `${scalePercent}%`;
            div.style.display = 'flex';
            div.style.alignItems = 'center';
            div.style.justifyContent = 'center';
            
            // 如果有热点图片，使用图片；否则使用默认SVG
            if (spot.hotspotImage) {
                const hotspotImg = document.createElement('img');
                hotspotImg.src = images[spot.hotspotImage];
                hotspotImg.className = 'hotspot-img animate-hotspot-image';
                
                // 图片填满外层div
                hotspotImg.style.width = '100%';
                hotspotImg.style.height = 'auto';
                hotspotImg.style.objectFit = 'contain';
                hotspotImg.style.cursor = 'pointer';
                
                hotspotImg.addEventListener('click', () => handleHotspot(spot));
                div.appendChild(hotspotImg);
            } else {
                // 使用默认SVG
                div.innerHTML = fingerSvg;
                const svg = div.querySelector('svg');
                
                // SVG填满外层div
                svg.style.width = '100%';
                svg.style.height = '100%';
                svg.classList.add('hotspot-svg');
                svg.querySelectorAll('path').forEach(path => {
                    path.setAttribute('fill', 'white');
                });
                svg.addEventListener('click', () => handleHotspot(spot));
            }
            
            wrapper.appendChild(div);
        }
    });

    app.appendChild(wrapper);
});
// 插入flex-filler填充底部空白
const filler = document.createElement('div');
filler.className = 'flex-filler';
app.appendChild(filler);

// 渲染CTA按钮
const ctaContainer = document.getElementById('cta-container');
// 清空容器
ctaContainer.innerHTML = '';

// 添加调试信息
console.log('CTA container found:', ctaContainer !== null);
console.log('CTA container:', ctaContainer);

// 检查是否有配置的CTA按钮
if (config.cta_buttons && config.cta_buttons.length > 0) {
    console.log('Rendering CTA buttons:', config.cta_buttons);
    
    config.cta_buttons.forEach((button, index) => {
        // 检查按钮图片是否存在
        if (!images[button.image]) {
            console.error(`CTA button ${index} image not found:`, button.image);
            return; // 跳过这个按钮
        }
        
        // 创建CTA按钮
        const ctaButton = document.createElement('img');
        ctaButton.src = images[button.image];
        ctaButton.className = 'cta-button';
        ctaButton.id = `cta-button-${index}`;
        ctaButton.style.left = button.position.left;
        ctaButton.style.top = button.position.top;
        
        // 不再在transform中应用scale，而是设置按钮的宽度
        ctaButton.style.transform = 'translate(-50%, -50%)';
        
        // 应用scale作为图片的宽度比例
        if (button.scale) {
            // scale值表示百分比，例如25表示25%
            const scalePercent = button.scale;
            console.log(`CTA button ${index} scale: ${scalePercent}%`);
            
            // 设置宽度为容器宽度的百分比
            ctaButton.style.width = `${scalePercent}%`;
            // 高度自动，保持宽高比
            ctaButton.style.height = 'auto';
        }
        
        ctaButton.style.zIndex = '1001'; // 比容器更高的z-index
        
        // 移除调试边框
        // ctaButton.style.border = '2px solid rgba(255, 0, 0, 0.5)';
        
        // 添加点击事件
        ctaButton.addEventListener('click', () => {
            console.log('CTA button clicked');
            if (config.download && config.download.url) {
                window.location.href = config.download.url;
            } else {
                // 如果没有配置下载链接，默认跳转到应用商店
                window.location.href = 'https://apps.apple.com/app';
            }
        });
        
        // 添加加载事件，确认图片已加载
        ctaButton.onload = function() {
            console.log(`CTA button ${index} image loaded successfully`);
        };
        
        ctaButton.onerror = function() {
            console.error(`CTA button ${index} image failed to load`);
            // 添加一个占位符，使其可见
            this.style.backgroundColor = 'red';
            this.style.width = '100px';
            this.style.height = '40px';
        };
        
        // 添加到CTA容器
        ctaContainer.appendChild(ctaButton);
        
        // 添加调试信息
        console.log(`Added CTA button ${index}:`, button);
        console.log(`CTA button ${index} image:`, images[button.image] ? 'loaded' : 'not found');
        console.log(`CTA button ${index} position:`, button.position);
    });
} else {
    // 如果没有配置的CTA按钮，创建一个默认的CTA按钮
    console.log('No CTA buttons configured, creating a default one');
    
    const defaultCtaButton = document.createElement('button');
    defaultCtaButton.className = 'default-cta-button';
    defaultCtaButton.textContent = 'Download Now';
    defaultCtaButton.style.position = 'absolute';
    defaultCtaButton.style.left = '50%';
    defaultCtaButton.style.bottom = '10%';
    defaultCtaButton.style.transform = 'translateX(-50%)';
    defaultCtaButton.style.padding = '10px 20px';
    defaultCtaButton.style.backgroundColor = '#ff5722';
    defaultCtaButton.style.color = 'white';
    defaultCtaButton.style.border = 'none';
    defaultCtaButton.style.borderRadius = '20px';
    defaultCtaButton.style.fontSize = '16px';
    defaultCtaButton.style.fontWeight = 'bold';
    defaultCtaButton.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    defaultCtaButton.style.cursor = 'pointer';
    defaultCtaButton.style.zIndex = '1001';
    defaultCtaButton.style.pointerEvents = 'auto';
    
    // 添加点击事件
    defaultCtaButton.addEventListener('click', () => {
        console.log('Default CTA button clicked');
        window.location.href = 'https://apps.apple.com/app';
    });
    
    // 添加到CTA容器
    ctaContainer.appendChild(defaultCtaButton);
    console.log('Added default CTA button');
}

// 添加一个调试用的彩色边框，帮助识别CTA容器位置
if (ctaContainer) {
    ctaContainer.style.border = '2px dashed rgba(255, 0, 0, 0.3)';
    setTimeout(() => {
        ctaContainer.style.border = 'none';
    }, 5000); // 5秒后移除边框
}

// 动画定时器
setInterval(() => {
    document.querySelectorAll('.hotspot-svg').forEach(svg => {
        svg.classList.add('bounce');
        setTimeout(() => {
            svg.classList.remove('bounce');
        }, 800);
    });
    
    // 为自定义热点图片添加动画
    document.querySelectorAll('.hotspot-img').forEach(img => {
        img.classList.add('bounce');
        setTimeout(() => {
            img.classList.remove('bounce');
        }, 800);
    });
}, 1000);


const modal = document.getElementById('modal');
const modalImgs = document.getElementById('modal-imgs');
const modalText = document.getElementById('modal-text');
const closeModal = document.getElementById('close-modal');

function handleHotspot(spot) {
    console.log("Handling hotspot click:", spot);
    if (spot.type === 'url') {
        window.location.href = spot.url;
    } else if (spot.type === 'popup') {
        showModal(spot);
    }
}

function showModal(spot) {
    // 清空图片容器
    modalImgs.innerHTML = '';
    
    // 设置标题文本
    modalText.innerText = spot.modalText || '';
    
    // 渲染所有图片
    if (spot.modalImgs && spot.modalImgs.length > 0) {
        spot.modalImgs.forEach((imgId, index) => {
            if (images[imgId]) {
                const img = document.createElement('img');
                img.src = images[imgId];
                img.className = 'modal-img';
                img.style.animationDelay = `${index * 0.1}s`; // 添加延迟，使图片依次显示
                
                // 添加点击事件，点击放大/缩小图片
                img.addEventListener('click', function() {
                    if (this.classList.contains('enlarged')) {
                        this.classList.remove('enlarged');
                        this.style.transform = '';
                    } else {
                        this.classList.add('enlarged');
                        this.style.transform = 'scale(1.2)';
                    }
                });
                
                modalImgs.appendChild(img);
            }
        });
    }
    
    modal.classList.remove('hidden');
}

closeModal.onclick = () => {
    modal.classList.add('hidden');
};

modal.onclick = (e) => {
    if (e.target === modal) modal.classList.add('hidden');
};

function ctaClick() {
   window.location.href = config.download.url;
}