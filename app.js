if (process.argv.length < 3) {
    console.error('.\\colorExtractor.exe [filename] (.png, .jpg)');
    process.exit(0);
}

const filename = process.argv[2];
const excludeColor = 10;


const fs = require('fs');
const path = require('path');
const getColors = require('get-image-colors');
const colorConvert = require('color-convert');

let filedata = fs.readFileSync(filename).toString('utf8');
console.log(`Image Length : ${filedata.length}`);
const numImgParts = filedata.length > 1800 ? 36 : 16;

const options = {
    count: numImgParts,
    type: `image/${path.extname(filename).toLowerCase().split('.')[1]}`
};

const colorMap = new Map();
colorMap.set(0, 'NONE');
colorMap.set(1, 'RED');
colorMap.set(2, 'ORANGE');
colorMap.set(3, 'YELLOW');
colorMap.set(4, 'GREEN');
colorMap.set(5, 'BLUE');
colorMap.set(6, 'NAVY');
colorMap.set(7, 'PURPLE');
colorMap.set(8, 'WHITE');
colorMap.set(9, 'BLACK');
colorMap.set(10, 'GRAY');

/**
 * INFO: 색상값을 라벨로 분류함
 * @param color 색상정보 (h,s,v,rate)
 */
function pickColor(color) {
    let ret = 0;
    const saturation = 30;
    const blackLine = 30;
    const grayLine = 70;

    //유채색
    if (color.s > saturation /*&& color.v > value*/ ) {
        if (color.h >= 334 || color.h < 20) {
            ret = 1; //red
        } else if (color.h >= 20 && color.h < 60) {
            ret = 3; //yellow
        } else if (color.h >= 60 && color.h < 180) {
            ret = 4; //green
        } else if (color.h >= 180 && color.h < 285) {
            if (color.v > 25)   ret = 5; //blue
            else                ret = 9; //black
        } else if (color.h >= 285 && color.h < 334) {
            if (color.v > 20)   ret = 7; //purple
            else                ret = 9; //black
        } else {
            ret = 0; //none
        }
    } else {
        if (color.v < blackLine) {
            ret = 9; //black
        } else if (color.v >= blackLine && color.v <= grayLine) {
            ret = 10; //gray
        } else {
            ret = 8; //white
        }
    }

    return ret;
}

getColors(filename, options).then(colors => {
    let colorVote = new Map();
    for (let color of colors) {
        let rgb = color['_rgb'];
        let hsv = colorConvert.rgb.hsv(rgb[0], rgb[1], rgb[2]);
        let hsvRate = {
            h: hsv[0],
            s: hsv[1],
            v: hsv[2]
        }
        //console.log(hsvRate);
        let ret = pickColor(hsvRate);
        if (!colorVote.has(ret)) {
            colorVote.set(ret, 1);
        } else {
            let incValue = colorVote.get(ret) + 1;
            colorVote.set(ret, incValue);
        }
        //console.log(colorMap.get(ret));
    }

    let maxVoteColor = 0;
    let maxVoteValue = -1;
    let numExcludeColor = 0;
    for (let key of colorVote.keys()) {
        if (key === excludeColor) {
            numExcludeColor++;
            continue;
        }
        let value = colorVote.get(key);
        if (maxVoteValue >= value) continue;
        maxVoteValue = value;
        maxVoteColor = key;
    }
    //console.log(colorVote);
    console.log(`Color : ${colorMap.get(maxVoteColor)} (${Math.round(maxVoteValue/(numImgParts - numExcludeColor) * 100)}%)`);
});