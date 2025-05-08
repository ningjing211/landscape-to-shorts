const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// 目标尺寸配置
const TARGET_SIZES = {
    PORTRAIT: {
        width: 1024,
        height: 1536
    },
    LANDSCAPE: {
        width: 1792,
        height: 1024
    }
};

// 输入和输出文件夹
const INPUT_DIR = 'original-landscape-thumbnails';
const OUTPUT_DIR = 'portrait-thumbnails';

// 确保输出文件夹存在
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR);
}

// 目標 portrait 尺寸
const PORTRAIT_WIDTH = 1080;
const PORTRAIT_HEIGHT = 1920;

// 動態決定目標尺寸的函數
function getTargetSize(metadata) {
    const { width, height } = metadata;
    const ratio = width / height;
    // 這裡可以根據實際需求擴充更多尺寸規則
    if (ratio > 2) {
        // 超寬
        return { width: 2048, height: 1024 };
    } else if (ratio > 1.5) {
        // 橫向
        return { width: 1792, height: 1024 };
    } else if (ratio > 1) {
        // 近方形
        return { width: 1280, height: 1280 };
    } else {
        // 直向
        return { width: 1024, height: 1536 };
    }
}

async function processImage(inputPath) {
    try {
        // 获取文件名（不含扩展名）
        const fileName = path.basename(inputPath, path.extname(inputPath));
        const outputPath = path.join(OUTPUT_DIR, `${fileName}_portrait.jpg`);

        // 读取图片信息
        const metadata = await sharp(inputPath).metadata();
        console.log(`处理图片: ${fileName}`);
        console.log(`原始尺寸: ${metadata.width}x${metadata.height}`);
        console.log(`原始比例: ${(metadata.width / metadata.height).toFixed(2)}`);

        // 一律轉為 1080x1920
        const targetSize = { width: PORTRAIT_WIDTH, height: PORTRAIT_HEIGHT };

        // 主圖等比例縮放，寬度為 1080
        let scaledWidth = PORTRAIT_WIDTH;
        let scaledHeight = Math.round(metadata.height * (PORTRAIT_WIDTH / metadata.width));
        // 如果縮放後高度超過 1920，則以高度為基準縮放
        if (scaledHeight > PORTRAIT_HEIGHT) {
            scaledHeight = PORTRAIT_HEIGHT;
            scaledWidth = Math.round(metadata.width * (PORTRAIT_HEIGHT / metadata.height));
        }
        console.log(`縮放後尺寸: ${scaledWidth}x${scaledHeight}`);
        console.log(`縮放後比例: ${(scaledWidth / scaledHeight).toFixed(2)}`);

        // 计算居中位置
        const left = Math.max(0, Math.floor((targetSize.width - scaledWidth) / 2));
        const top = Math.max(0, Math.floor((targetSize.height - scaledHeight) / 2));

        // 处理主图片
        const mainImage = await sharp(inputPath)
            .resize(scaledWidth, scaledHeight, {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .toBuffer();

        // 创建模糊背景
        const background = await sharp(inputPath)
            .resize(targetSize.width, targetSize.height, {
                fit: 'cover',
                position: 'center'
            })
            .blur(20)
            .modulate({
                brightness: 0.7  // 降低亮度
            })
            .toBuffer();

        // 创建最终图片
        await sharp({
            create: {
                width: targetSize.width,
                height: targetSize.height,
                channels: 4,
                background: { r: 0, g: 0, b: 0, alpha: 1 }
            }
        })
        .composite([
            {
                input: background,
                top: 0,
                left: 0
            },
            {
                input: mainImage,
                top: top,
                left: left
            }
        ])
        .jpeg({ quality: 90 })
        .toFile(outputPath);

        console.log(`处理完成: ${outputPath}\n`);
    } catch (error) {
        console.error('处理图片时出错:', error);
    }
}

// 处理指定文件夹下的所有 jpg 文件
fs.readdir(INPUT_DIR, (err, files) => {
    if (err) {
        console.error('读取目录失败:', err);
        return;
    }

    files.forEach(file => {
        if (file.toLowerCase().endsWith('.jpg')) {
            const inputPath = path.join(INPUT_DIR, file);
            processImage(inputPath);
        }
    });
});

// === 新增：統計所有原始圖片尺寸種類 ===
async function listAllImageSizes() {
    const dir = INPUT_DIR;
    const files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.jpg'));
    const sizeMap = new Map();
    for (const file of files) {
        const filePath = path.join(dir, file);
        try {
            const metadata = await sharp(filePath).metadata();
            const key = `${metadata.width}x${metadata.height}`;
            sizeMap.set(key, (sizeMap.get(key) || 0) + 1);
        } catch (e) {
            console.error(`讀取 ${file} 失敗`, e);
        }
    }
    console.log('\n=== 所有原始圖片尺寸種類 ===');
    for (const [size, count] of sizeMap.entries()) {
        console.log(`${size}：${count} 張`);
    }
    console.log('========================\n');
}

// 執行統計
listAllImageSizes(); 