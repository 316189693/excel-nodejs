let fs = require('fs');
let util = require('util');
let log_t = require('log-timestamp');

let ExcelFileUtil = require ("./ExcelFileUtil");
let fileUtil = new ExcelFileUtil();
let moment = require("moment");
const path = require('path');



// 1. 设置目录
// be compared EXCEl folder, will iterate files under this folder, support csv,xls,xlsx, and the matched row will write into out put file
const inputFolder = "d:/will/input";

// compare Folder, data in this folder just used to compare, no output.
const compareFolder = "d:/will/compare";
const currentTimeStamp = moment(new Date()).format("YYYY-MM-DD-hhmmss");
// result folder
const outputPath = "d:/will/test01-"+currentTimeStamp+".csv";
// 设置promise包含的input folder数据条数, 不超过限定值新增一个Promise, 多了拆分为多个Promise
const maxNumbersPerPromise = 2000;

// 依次比较设置的值 compare_type: //equal(default), greater, less, contains, gt, lt, containsIgnoreCase
const compareConfigs = [
    {
        compare_column : "Load ID",
        input_column : "Load ID",
        compare_type : "equal"
    }
];




let comparedDataSet = null;
// 只将compare config设置的compare column的值复制到comparedDataSet，避免比较数据重复
async function readCompareData() {
   let tempSet = new Set();
   let compareData = await fileUtil.transferExcelFilesUnderFolderToJson(compareFolder);
    compareData.forEach((item)=>{
       let obj = {};
       compareConfigs.forEach((compareConfig)=>{
           obj[compareConfig.compare_column] = item[compareConfig.compare_column];
       });
    tempSet.add(obj);
   });
    return tempSet;
}




function isValidArray(ary) {
    return ary && Object.prototype.toString.call(ary) === '[object Array]' && ary.length > 0;
}

// 用来过滤的函数，
//params:
// line为循环获取的input folder里面的数据，
//return: boolean
async  function accept(line) {
    let accept = false;
    let length =  compareConfigs.length;
    let obj =  Array.from(comparedDataSet)
                   .find((compareData) => {
        let isMatched = true;
        for(let i = 0; (i < length)&&isMatched; i++) {
            let compareConfig = compareConfigs[i];
            let lineValue = line[compareConfig.input_column];
            let compareValue = compareData[compareConfig.compare_column];
            let compareType = compareConfig.compare_type;
            switch (compareType) {
                case "gt":
                    if (lineValue < compareValue) {
                        isMatched = false;
                    }
                    break;
                case "greater":
                    if (lineValue <= compareValue) {
                        isMatched = false;
                    }
                    break;
                case "lt":
                    if (lineValue > compareValue) {
                        isMatched = false;
                    }
                    break;
                case "less":
                    if (lineValue >= compareValue) {
                        isMatched = false;
                    }
                    break;
                case "contains":
                    if ((lineValue + "").indexOf(compareValue) == -1) {
                        isMatched = false;
                    }
                    break;
                case "containsIgnoreCase":
                    if ((lineValue + "").toLowerCase().indexOf((compareValue + "").toLowerCase()) == -1) {
                        isMatched = false;
                    }
                    break;
                default:
                    if ((lineValue+"").trim() != (compareValue+"").trim()) {
                        isMatched = false;
                    }
                    break;
            }
        }

    return isMatched;
});

    if (obj) {
        accept = true;
    }
    return accept;

}

 async function filterDatas(dataAry) {
    let rst = [];
    for (let i=0; i< dataAry.length; i++) {
        let isAccept = await accept(dataAry[i]);
        if (isAccept) {
            rst.push(dataAry[i]);
        }
    }
    return await rst;
}


 function generatePromise(dataAry) {
    let promiseAry = [];
    let length = 0;
    if (isValidArray(dataAry)) {
        length = dataAry.length;
        let promiseSize = length % maxNumbersPerPromise == 0 ? length / maxNumbersPerPromise : (Math.floor(length/maxNumbersPerPromise) + 1);
        for (let i = 0 ; i < promiseSize; i++) {
            let promise = new Promise( async (resolve,reject) => {
                try{
                    let start = i*maxNumbersPerPromise;
                    let end = Math.min(length, (i+1)*maxNumbersPerPromise);
                    let ary = await filterDatas(dataAry.slice(start,end));
                    console.log("promise " + (i+1) + " start from row " + start + " to row " + end + " rst:"+ ary.length);
                    resolve(ary);
                } catch (err) {
                  reject(err);
                }
            });
            promiseAry.push(promise);
        }
    }
    return promiseAry;
}

// 5. 输出结果
async function compareAndOurput(){
    console.log("Input folder: " + inputFolder);
    let files = await fileUtil.getExcelFileNameArrayUnderFolder(inputFolder);
    console.log("input files:");
    console.log(files);
    console.log("Compare folder: " + compareFolder);
    let compareFiles = await fileUtil.getExcelFileNameArrayUnderFolder(compareFolder);
    console.log("compare files:");
    console.log(compareFiles);
    console.log("compare configs: ");
    console.log(compareConfigs);
    comparedDataSet = await readCompareData();
    console.log("compare data rows: " + comparedDataSet.size);
    let inputLines = await fileUtil.transferExcelFilesIntojson(inputFolder, files);
    console.log("input total rows:"+inputLines.length);
    let promiseAll = await generatePromise(inputLines);
    console.log("promise number:"+promiseAll.length);
     let ary = await Promise.all(promiseAll);
    let rst = [];
    for(let i = 0; i < ary.length; i++ ) {
        let promiseAry = ary[i];
        promiseAry.forEach((item)=>{rst.push(item);});
    }
    console.log("Total result number:"+ rst.length);
    fileUtil.writeJsonToCSV(rst,true,outputPath);
    console.log("OutPutFile: " + outputPath);
    console.log("end....")
}

compareAndOurput();
