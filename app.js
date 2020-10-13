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
const sharp = require('sharp');
const jimp = require('jimp');

let filedata = fs.readFileSync(filename).toString('utf8');
console.log(`Image Length : ${filedata.length}`);
//const numImgParts = filedata.length > 1800 ? 37 : 17;
const numImgParts = filedata.length > 1800 ? 37 : 17;

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
function pickColor(color, newSat = 30) {
    let ret = 0;
    let saturation = newSat;
    let blackLine = 30;
    let grayLine = 70;

    // if(grayCnt / maxCnt > 0.7){
    //     saturation = 10;
    // } else if(grayCnt / maxCnt > 0.3){
    //     saturation = 20;
    // } else {
    //     saturation = 30;
    // }

    let isColored = false;

    //INFO: 유채색
    if(color.s > saturation){
        isColored = true;
    }

    if(isColored){
        //INFO: value 검사를 않하는게 더 정확한 결과가 나타난다.
        if(color.h >= 334 || color.h < 20){
            ret = 1; //red
        } else if(color.h >= 20 && color.h < 60){
            ret = 3; //yellow
        } else if(color.h >= 60 && color.h < 180){
            ret = 4; //green
        } else if(color.h >= 180 && color.h < 280){
            ret = 5; //blue
        } else if(color.h >= 280 && color.h < 334){
            ret = 7; //purple
        } else {
            ret = 0; //none
        }
    } else {
        if(color.v < blackLine){
            ret = 9; //black
        } else if (color.v >= blackLine && color.v <= grayLine){
            ret = 10; //gray
        } else {
            ret = 8; //white
        }
    }

    return ret;
}

function getSaturation(colors){
    let grayCnt = 0;
    let numColors = colors.length;
    for (let color of colors) {
        let rgb = color['_rgb'];
        let hsv = colorConvert.rgb.hsv(rgb[0], rgb[1], rgb[2]);
        let hsvRate = {
            h: hsv[0],
            s: hsv[1],
            v: hsv[2]
        }
        let ret = pickColor(hsvRate, 30);
        if(ret === 10){
            grayCnt++;
        }
    }

    console.log(`grayCnt: ${grayCnt}`);
    if(grayCnt/numColors > 0.5){
        return 30;
    } else if(grayCnt/numColors > 0.3){
        return 30;
    } else {
        return 30;
    }
}

function calcColor2(colors){
    let colorVote = new Map();
    console.log(`colors length: ${colors.length}`);
    
    let newSat = getSaturation(colors);
    console.log(`newSat: ${newSat}`);
    
    for (let color of colors) {
        let rgb = color['_rgb'];
        let hsv = colorConvert.rgb.hsv(rgb[0], rgb[1], rgb[2]);
        let hsvRate = {
            h: hsv[0],
            s: hsv[1],
            v: hsv[2]
        }
        let tempStr = JSON.stringify(hsvRate);
        let ret = pickColor(hsvRate, newSat);
        if (!colorVote.has(ret)) {
            colorVote.set(ret, 1);
        } else {
            let incValue = colorVote.get(ret) + 1;
            colorVote.set(ret, incValue);
        }
        console.log(tempStr + colorMap.get(ret));
    }

    let maxVoteColor = 0;
    let maxVoteValue = -1;
    let numExcludeColor = 0;
    console.log(Array.from(colorVote.keys()).length);
    for (let key of colorVote.keys()) {
        console.log(`key: ${colorMap.get(key)}, value: ${colorVote.get(key)}`);

        if (key === excludeColor) {
            numExcludeColor+= colorVote.get(key);
            continue;
        }
        let value = colorVote.get(key);
        if (maxVoteValue >= value) continue;
        maxVoteValue = value;
        maxVoteColor = key;
    }
    
    let maxValue = Math.round(maxVoteValue/(numImgParts - numExcludeColor) * 100);
    let ret = {
        color: colorMap.get(maxVoteColor),
        value: maxValue,
        numExcludeColor: numExcludeColor
    };
    console.log(ret);
    return ret;
}

function calcColor(colors){
    let colorVote = new Map();
    for (let color of colors) {
        let rgb = color['_rgb'];
        let hsv = colorConvert.rgb.hsv(rgb[0], rgb[1], rgb[2]);
        let hsvRate = {
            h: hsv[0],
            s: hsv[1],
            v: hsv[2]
        }
        let tempStr = JSON.stringify(hsvRate);
        let ret = pickColor(hsvRate);
        if (!colorVote.has(ret)) {
            colorVote.set(ret, 1);
        } else {
            let incValue = colorVote.get(ret) + 1;
            colorVote.set(ret, incValue);
        }
        console.log(tempStr + colorMap.get(ret));
    }

    let numColored = 0;
    let numNotColored = 0;
    let maxVoteColor = 0;
    let maxVoteValue = -1;
    let numExcludeColor = 0;
    let chromColorTopKey = 0;
    let chromColorTopValue = 0;
    let achromColorTopKey = 0;
    let achromColorTopValue = 0;
    console.log(Array.from(colorVote.keys()).length);
    for (let key of colorVote.keys()) {
        console.log(`key: ${colorMap.get(key)}, value: ${colorVote.get(key)}`);
        if(key >= 8 && key <= 10){
            numNotColored+=colorVote.get(key);

            if (key === excludeColor) {
                numExcludeColor+= colorVote.get(key);
                continue;
            }
            let value = colorVote.get(key);
            if (achromColorTopValue >= value) continue;
            achromColorTopValue = value;
            achromColorTopKey = key;
        }else {
            numColored+=colorVote.get(key);

            if (key === excludeColor) {
                numExcludeColor+= colorVote.get(key);
                continue;
            }
            let value = colorVote.get(key);
            if (chromColorTopValue >= value) continue;
            chromColorTopValue = value;
            chromColorTopKey = key;
        }
    }
    console.log(`numColored : ${numColored}, numNotColored : ${numNotColored}`);
    console.log(`colorTopKey: ${chromColorTopKey}, colorTopValue: ${chromColorTopValue}`);
    console.log(`notColorTopKey: ${achromColorTopKey}, notColorTopValue: ${achromColorTopValue}`);
    if(chromColorTopValue >= achromColorTopValue && numNotColored <= Math.round(numColored * 1.3)){
        maxVoteColor = chromColorTopKey;
        maxVoteValue = chromColorTopValue;
    } else {
        maxVoteColor = achromColorTopKey;
        maxVoteValue = achromColorTopValue;
    }
    
    //maxVoteValue = colorTopValue > notColorTopValue ? colorTopValue : notColorTopValue;
    let maxValue = Math.round(maxVoteValue/(numImgParts - numExcludeColor) * 100);
    let ret = {
        color: colorMap.get(maxVoteColor),
        value: maxValue,
        numExcludeColor: numExcludeColor,
        numColored: numColored,
        numNotColored: numNotColored
    };
    console.log(ret);
    return ret;
}

jimp.read(filename, async (err, value, coords) => {
    if(err){
        console.error(err);
        process.exit(0);
    }

    let data = await value.colour([{
        apply:'lighten', params: [10]
    }]).getBase64Async(jimp.MIME_JPEG);

    getColors(data, options).then(colors => {
        let ret = calcColor2(colors);
        console.log(`Color : ${ret.color} (${ret.value}%)`);
    });
})

// getColors(filename, options).then(colors => {
//     let ret = calcColor2(colors);
//     console.log(`Color : ${ret.color} (${ret.value}%)`);
// });