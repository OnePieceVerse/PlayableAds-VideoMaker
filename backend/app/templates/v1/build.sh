#!/bin/bash
# set -e
ENV='dev'
# ENV='prod'
# PARTNER_NAME="honor-of-kings"
PARTNER_NAME="abyss-voyage"
# PARTNER_NAME="golden-spatula"
LANG="en"
VERSION="v1"
PLATFORM_NAME='google'
DIRECTION='portrait'

# 生成图片、视频的base64编码
PARTNER_PATH="partners/${PARTNER_NAME}"
CONFIG_FILE="${PARTNER_PATH}/configs/config-${LANG}-${VERSION}.js"
PARTNER_LANG_FILE="${PARTNER_PATH}/lang.js"

# 检测操作系统并选择合适的 sed 命令
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS - 直接替换任何合作伙伴路径
    sed -i '' "s#partners/[^/]*/lang.js#${PARTNER_LANG_FILE}#g" index.html
    sed -i '' "s#partners/[^/]*/configs/config-[^/]*\.js#${CONFIG_FILE}#g" index.html
else
    # Linux - 直接替换任何合作伙伴路径
    sed -i "s#partners/[^/]*/lang.js#${PARTNER_LANG_FILE}#g" index.html
    sed -i "s#partners/[^/]*/configs/config-[^/]*\.js#${CONFIG_FILE}#g" index.html
fi

sh base64_assets.sh $PARTNER_PATH $CONFIG_FILE

if [ "$1" == "prod" ]; then
   ENV='prod'
fi

# 开发环境不生成html文件
if [ "$ENV" == "dev" ]; then
  python -m http.server 8000
  exit 0
fi

# 生成html文件
DIST="${PARTNER_PATH}/platforms/${PLATFORM_NAME}"
FILE_NAME="${PARTNER_NAME}-${PLATFORM_NAME}-${LANG}-${VERSION}.html"
TARGET="${DIST}/${FILE_NAME}"
tmpfile=$(mktemp)
mkdir -p $DIST

awk '
  /<link rel="stylesheet" href="style.css">/ {
    print "  <style>"
    while ((getline line < css_file) > 0) print line
    close(css_file)
    print "  </style>"
    next
  }
  /<script src="images.js"><\/script>/ {
    print "  <script>"
    while ((getline line < images_js_file) > 0) print line
    close(images_js_file)
    print "  </script>"
    next
  }
    /<script src="videos.js"><\/script>/ {
    print "  <script>"
    while ((getline line < videos_js_file) > 0) print line
    close(videos_js_file)
    print "  </script>"
    next
  }
  /<script src="(config-[^"]*\.js|partners\/[^\/]*\/configs\/config-[^"]*\.js)"><\/script>/ {
    print "  <script>"
    while ((getline line < config_js_file) > 0) print line
    close(config_js_file)
    print "  </script>"
    next
  }
    /<script src="lang.js"><\/script>/ {
    print "  <script>"
    while ((getline line < lang_js_file) > 0) print line
    close(lang_js_file)
    print "  </script>"
    next
  }
    /<script src="(partners\/[^\/]*\/lang.js)"><\/script>/ {
    print "  <script>"
    while ((getline line < partner_lang_file) > 0) print line
    close(partner_lang_file)
    print "  </script>"
    next
  }
  /<script src="main.js"><\/script>/ {
    print "  <script>"
    while ((getline line < main_js_file) > 0) print line
    close(main_js_file)
    print "  </script>"
    next
  }
  { print }
' \
  css_file="style.css" \
  images_js_file="images.js" \
  videos_js_file="videos.js" \
  config_js_file="$CONFIG_FILE" \
  lang_js_file="lang.js" \
  partner_lang_file="$PARTNER_LANG_FILE" \
  main_js_file="main.js" \
  index.html > $tmpfile

if [ "$PLATFORM_NAME" == "facebook" ]; then
    sed -i '' "s|window.location.href = config.cta_start_button.url;|FbPlayableAd.onCTAClick();|g" "$tmpfile"
elif [ "$PLATFORM_NAME" == "google" ]; then
    sed -i '' "s|window.location.href = config.cta_start_button.url;|ExitApi.exit();|g" "$tmpfile"
    # 添加Google特定的meta标签和script
    if [[ "$OSTYPE" == "darwin"* ]]; then
      sed -i '' "/<head>/a\\
      <meta name=\"ad.orientation\" content=\"${DIRECTION}\">\\
      <script type=\"text/javascript\" src=\"https://tpc.googlesyndication.com/pagead/gadgets/html5/api/exitapi.js\"> </script>" $tmpfile
    else
      sed -i "/<head>/a\\    <meta name=\"ad.orientation\" content=\"${DIRECTION}\">\\n    <script type=\"text/javascript\" src=\"https://tpc.googlesyndication.com/pagead/gadgets/html5/api/exitapi.js\"> </script>" $tmpfile
    fi
fi

mv $tmpfile $TARGET
if [ "$PLATFORM_NAME" == "google" ]; then
    cd $DIST
    zip -r "${PARTNER_NAME}-${PLATFORM_NAME}-${LANG}-${VERSION}.zip" $FILE_NAME
    rm $FILE_NAME
fi

echo "✅ Applovin单页面已生成：$TARGET, 配置：$CONFIG_FILE"