const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// 目标尺寸（9:16 比例，适合短视频）
const TARGET_WIDTH = 1080;
const TARGET_HEIGHT = 1920;

async function processImage(inputPath) {
    try {
        // 获取文件名（不含扩展名）
        const fileName = path.basename(inputPath, path.extname(inputPath));
        const outputPath = `${fileName}_portrait.jpg`;

        // 读取图片信息
        const metadata = await sharp(inputPath).metadata();
        
        // 计算缩放后的尺寸，保持原始比例
        let scaledWidth, scaledHeight;
        const aspectRatio = metadata.width / metadata.height;
        
        if (aspectRatio > 9/16) {
            // 如果原图更宽，以宽度为基准
            scaledWidth = TARGET_WIDTH;
            scaledHeight = Math.round(scaledWidth / aspectRatio);
        } else {
            // 如果原图更高，以高度为基准
            scaledHeight = TARGET_HEIGHT;
            scaledWidth = Math.round(scaledHeight * aspectRatio);
        }

        // 计算居中位置
        const left = Math.max(0, Math.floor((TARGET_WIDTH - scaledWidth) / 2));
        const top = Math.max(0, Math.floor((TARGET_HEIGHT - scaledHeight) / 2));

        // 处理主图片
        const mainImage = await sharp(inputPath)
            .resize(scaledWidth, scaledHeight, {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .toBuffer();

        // 创建模糊背景
        const background = await sharp(inputPath)
            .resize(TARGET_WIDTH, TARGET_HEIGHT, {
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
                width: TARGET_WIDTH,
                height: TARGET_HEIGHT,
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

        console.log(`处理完成: ${outputPath}`);
    } catch (error) {
        console.error('处理图片时出错:', error);
    }
}

// 处理当前目录下的所有 jpg 文件
fs.readdir('.', (err, files) => {
    if (err) {
        console.error('读取目录失败:', err);
        return;
    }

    files.forEach(file => {
        if (file.toLowerCase().endsWith('.jpg') && !file.includes('_portrait')) {
            processImage(file);
        }
    });
}); 