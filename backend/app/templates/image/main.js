const fingerSvg = `
<svg class="icon" style="width: 1.4140625em;height: 1em;vertical-align: middle;fill: currentColor;overflow: hidden;" viewBox="0 0 1448 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1038"><path d="M954.678313 549.757097l-211.405341-125.742315c-7.740635-4.644381-12.729044-1.032085-11.008903 7.740635l44.895682 243.227953c1.720141 8.944734 7.224593 10.148833 12.385016 2.752225 0 0 28.726356-41.111372 52.29229-66.225432l45.239711 67.257517c4.300353 6.364522 13.073072 8.084663 19.26558 3.784311l15.137242-10.492861c6.364522-4.300353 7.912649-13.245087 3.612296-19.609609l-45.239711-67.257517c30.274483-12.55703 72.933983-23.049891 72.933983-23.049891 8.77272-2.236183 9.63279-7.740635 1.892155-12.385016z m-246.668234 79.642533c-0.860071-0.344028-1.720141-0.516042-2.580212-0.516042-72.933983-17.029397-125.742315-84.1149-124.882244-161.349236 1.032085-90.307408 74.310096-162.897363 163.241391-162.037292 84.286914 1.032085 152.920544 67.601545 159.285066 151.200403v0.172015c0 0.860071 0 1.720141 0.172014 2.408197 0.860071 5.332437 4.644381 9.63279 9.460776 11.180917 0.860071 0.172014 1.720141 0.344028 2.408198 0.516043h2.580212c7.224593-0.516042 12.901058-6.536536 13.073072-13.933143v-0.172014c0-0.688056 0-1.204099-0.172014-1.892156-1.376113-20.297665-6.020494-39.907274-13.589115-58.656811-9.288762-23.049891-22.705863-43.691584-39.907273-61.409038-17.201411-17.889467-37.327062-31.82261-59.688897-41.799429-23.221905-10.320847-47.991937-15.653284-73.450025-15.997312-25.630102-0.344028-50.400134 4.472367-73.794053 14.277171-22.705863 9.460776-43.003528 23.049891-60.548967 40.423316-17.545439 17.373425-31.478582 37.843104-41.283387 60.548967-10.148833 23.565933-15.48127 48.679993-15.653284 74.654124-0.516042 46.959852 15.997312 92.543591 46.271796 127.978498 26.490173 30.790526 61.581052 52.29229 100.45624 61.409038 0.860071 0.344028 1.720141 0.516042 2.580212 0.516042 0.516042 0 1.032085 0.172014 1.548127 0.172014 7.740635 0.172014 14.105157-6.192508 14.105157-13.933143 0-6.536536-3.956325-11.868974-9.63279-13.761129z" fill="#040000" p-id="1039"></path></svg>`

const config = window.PLAYABLE_CONFIG;
const images = window.PLAYABLE_IMAGES;

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
    wrapper.style.width = '100vw';
    wrapper.style.overflow = 'hidden';

    // 创建图片
    const img = document.createElement('img');
    img.src = images[src]; // 取 base64 data URIsrc;
    img.className = 'app-img';
    img.style.width = '100%';
    img.style.display = 'block';
    wrapper.appendChild(img);

    // 渲染属于该图片的热点
    (config.hotspots || []).forEach(spot => {
        if (spot.imgIndex === idx) {
            const div = document.createElement('div');
            div.className = 'hotspot-svg-container';
            div.style.left = spot.left;
            div.style.top = spot.top;
            div.style.position = 'absolute';
            div.style.transform = 'translate(-50%, -50%)';
            div.style.zIndex = 2;
            div.innerHTML = fingerSvg;
            const svg = div.querySelector('svg');
            svg.style.width = '100px';
            svg.style.height = '100px';
            svg.classList.add('hotspot-svg');
            svg.querySelectorAll('path').forEach(path => {
                path.setAttribute('fill', 'white');
            });
            svg.addEventListener('click', () => handleHotspot(spot));
            wrapper.appendChild(div);
        }
    });

    app.appendChild(wrapper);
});
// 插入flex-filler填充底部空白
const filler = document.createElement('div');
filler.className = 'flex-filler';
app.appendChild(filler);

// 动画定时器
setInterval(() => {
    document.querySelectorAll('.hotspot-svg').forEach(svg => {
        svg.classList.add('bounce');
        setTimeout(() => {
            svg.classList.remove('bounce');
        }, 800);
    });
}, 1000);

// 添加底部下载按钮
function addDownloadButton() {
    const btn = document.createElement('button');
    btn.className = 'download-btn';
    btn.innerText = config.download.text;
    btn.onclick = function () {
        if (window.mraid && typeof window.mraid.open === 'function') {
            window.mraid.open(config.download.url);
        } else {
            window.open(config.download.url, '_blank');
        }
    };
    document.body.appendChild(btn);
}
addDownloadButton();

const modal = document.getElementById('modal');
const modalImgs = document.getElementById('modal-imgs');
const modalText = document.getElementById('modal-text');
const closeModal = document.getElementById('close-modal');

function handleHotspot(spot) {
    if (spot.type === 'jump') {
        jump(spot.url);
    } else if (spot.type === 'popup') {
        showModal(spot);
    }
}

function jump(url) {
    window.open(url, '_blank');
}

function showModal(spot) {
    // 清空图片容器
    modalImgs.innerHTML = '';
    // 渲染所有图片
    (spot.modalImgs || []).forEach(src => {
        const img = document.createElement('img');
        img.src = images[src];
        img.className = 'modal-img';
        modalImgs.appendChild(img);
    });
    modalText.innerText = spot.modalText;
    modal.classList.remove('hidden');
}

closeModal.onclick = () => {
    modal.classList.add('hidden');
};

modal.onclick = (e) => {
    if (e.target === modal) modal.classList.add('hidden');
};