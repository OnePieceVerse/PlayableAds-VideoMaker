#!/bin/bash
# set -e  # 注释掉这行，避免函数返回非零状态码时脚本退出

# PARTNER_NAME="abyss-voyage"
# LANG="en"
# VERSION="v1"
# PARTNER_PATH="partners/${PARTNER_NAME}"
# CONFIG_FILE="${PARTNER_PATH}/configs/config-${LANG}-${VERSION}.js"

PARTNER_PATH=$1
CONFIG_FILE=$2
SRC='assets'
DIST="."
IMAGE_JS_FILE="images.js"
VIDEO_JS_FILE="videos.js"

# 检查图片是否存在于指定目录的函数
check_image_exists() {
    local img_name="$1"
    local assets_path="$SRC/images/$img_name"
    local partner_path="${PARTNER_PATH}/images/$img_name"
    
    if [ -f "$assets_path" ]; then
        echo "$assets_path"
        return 0  # 成功找到文件
    elif [ -f "$partner_path" ]; then
        echo "$partner_path"
        return 0  # 成功找到文件
    else
        echo ""  # 返回空字符串
        return 1  # 文件不存在
    fi
}

# 检查视频文件是否存在的函数
check_video_exists() {
    local video_name="$1"
    local assets_path="$SRC/videos/$video_name"
    local partner_path="${PARTNER_PATH}/videos/$video_name"
    
    if [ -f "$assets_path" ]; then
        echo "$assets_path"
        return 0  # 成功找到文件
    elif [ -f "$partner_path" ]; then
        echo "$partner_path"
        return 0  # 成功找到文件
    else
        echo ""  # 返回空字符串
        return 1  # 文件不存在
    fi
}

# 数组去重函数
deduplicate_array() {
    local array=("$@")
    local result=()
    
    for item in "${array[@]}"; do
        # 检查是否已经在结果数组中
        local found=0
        for existing in "${result[@]}"; do
            if [ "$item" = "$existing" ]; then
                found=1
                break
            fi
        done
        
        if [ $found -eq 0 ]; then
            result+=("$item")
        fi
    done
    
    echo "${result[@]}"
}

if [ ! -f "$CONFIG_FILE" ]; then
    echo "Error: Config file not found: $CONFIG_FILE"
    exit 1
fi

# 提取所有图片文件（.png, .jpg, .jpeg, .webp等）
IMG_LIST=($(grep -Eoi '"*image": *"[^"]+\.(png|jpg|jpeg|webp|gif|bmp)"' "$CONFIG_FILE" | awk -F':' '{print $2}' | tr -d '"')) 

# 提取所有视频文件（.mp4, .mov, .avi等）
VIDEO_LIST=($(grep -Eo '"videoUrl": *"[^"]+\.(mp4|mov|avi|mkv|flv|webm)"' "$CONFIG_FILE" | awk -F':' '{print $2}' | tr -d '"')) 

# 对图片列表进行去重
IMG_LIST=($(deduplicate_array "${IMG_LIST[@]}"))
VIDEO_LIST=($(deduplicate_array "${VIDEO_LIST[@]}"))

echo "IMG_LIST: ${IMG_LIST[@]}"
echo "VIDEO_LIST: ${VIDEO_LIST[@]}"

# 生成 PLAYABLE_IMAGES 变量
echo "window.PLAYABLE_IMAGES = {" > $DIST/$IMAGE_JS_FILE
first=1
for fname in "${IMG_LIST[@]}"; do
  # 检查图片是否存在于指定目录
  img_path=$(check_image_exists "$fname" || true)  # 忽略函数的退出状态码
  exit_code=$?  # 获取函数的退出状态码
  if [ $exit_code -ne 0 ] || [ -z "$img_path" ]; then
    echo "Warning: Image '$fname' not found in $SRC/images/ or ${PARTNER_PATH}/images/"
    continue
  fi
  
  echo "Processing image: $fname from $img_path"
  fname=$(basename "$img_path")
  ext="${img_path##*.}"
  mime="image/$ext"
  [ "$ext" = "png" ] && mime="image/png"
  [ "$ext" = "svg" ] && mime="image/svg+xml"
  b64=$(base64 < "$img_path" | tr -d '\n')
  uri="data:$mime;base64,$b64"
  if [ $first -eq 1 ]; then
    first=0
  else
    echo "," >> $DIST/$IMAGE_JS_FILE
  fi
  echo "  \"$fname\": \"$uri\"" >> $DIST/$IMAGE_JS_FILE
done
echo "};" >> $DIST/$IMAGE_JS_FILE

# 创建临时目录
TEMP_DIR=$(mktemp -d)
trap 'rm -rf "$TEMP_DIR"' EXIT

# 生成 PLAYABLE_VIDEOS 变量
echo "window.PLAYABLE_VIDEOS = {" > $DIST/$VIDEO_JS_FILE
first=1
for fname in "${VIDEO_LIST[@]}"; do
  # 检查视频是否存在于指定目录
  video_path=$(check_video_exists "$fname" || true)  # 忽略函数的退出状态码
  exit_code=$?  # 获取函数的退出状态码
  
  if [ $exit_code -ne 0 ] || [ -z "$video_path" ]; then
    echo "Warning: Video '$fname' not found in $SRC/videos/ or ${PARTNER_PATH}/videos/"
    continue
  fi
  
  echo "Processing video: $fname from $video_path"
  fname=$(basename "$video_path")
  ext="${video_path##*.}"
  
  # 获取输出文件名
  output_fname="${fname%.*}.mp4"
  output_path="$TEMP_DIR/$output_fname"
  
  # 设置正确的MIME类型
  case "$ext" in
    "mp4") mime="video/mp4" ;;
    "webm") mime="video/webm" ;;
    "mov") mime="video/quicktime" ;;
    *) mime="video/$ext" ;;
  esac
  
  b64=$(base64 < "$video_path" | tr -d '\n')
  uri="data:$mime;base64,$b64"
  if [ $first -eq 1 ]; then
    first=0
  else
    echo "," >> $DIST/$VIDEO_JS_FILE
  fi
  echo "  \"$output_fname\": \"$uri\"" >> $DIST/$VIDEO_JS_FILE
done
echo "};" >> $DIST/$VIDEO_JS_FILE