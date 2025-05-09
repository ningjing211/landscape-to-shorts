const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const INPUT_DIR = './'; // 你可以改成你的影片資料夾
const OUTPUT_DIR = './cropped-mov-9-16';

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR);
}

const files = fs.readdirSync(INPUT_DIR).filter(f => f.toLowerCase().endsWith('.mov'));

files.forEach(file => {
    const inputPath = path.join(INPUT_DIR, file);
    const outputPath = path.join(OUTPUT_DIR, `${path.basename(file, '.mov')}_9-16.mov`);

    // 先取得原始影片的寬高
    const ffprobeCmd = `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "${inputPath}"`;
    const size = execSync(ffprobeCmd).toString().trim();
    const [width, height] = size.split('x').map(Number);

    // 以寬為基準，計算9:16的高度
    let cropWidth, cropHeight, x, y;
    if (width / height > 9 / 16) {
        // 原始影片太寬，裁掉左右
        cropHeight = height;
        cropWidth = Math.floor(height * 9 / 16);
        x = Math.floor((width - cropWidth) / 2);
        y = 0;
    } else {
        // 原始影片太高，裁掉上下
        cropWidth = width;
        cropHeight = Math.floor(width * 16 / 9);
        x = 0;
        y = Math.floor((height - cropHeight) / 2);
    }

    // ffmpeg 裁切指令
    const ffmpegCmd = `ffmpeg -i "${inputPath}" -vf "crop=${cropWidth}:${cropHeight}:${x}:${y},scale=1080:1920" -c:a copy "${outputPath}" -y`;
    console.log(`正在處理: ${file} -> ${outputPath}`);
    execSync(ffmpegCmd, { stdio: 'inherit' });
});

console.log('全部裁切完成！'); 