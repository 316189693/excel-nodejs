let fs = require('fs');
const csvtojsonV2=require("csvtojson/v2");
let XLSX = require('xlsx');
let XLSX_Writer = require('xlsx-writestream');
let csvStringify = require("csv-stringify");
const path = require('path');
const excelSuffixs = ['.xls', '.csv', '.xlsx'];
const csvParse = require('csv-parse');
const tabDelimilter = "\t";

 class ExcelFileUtil {
    constructor() {
    }


     // 将文件夹下面的所有excel转化为json，子目录的不会， excel需要有共同的列名
     async  transferExcelFilesUnderFolderToJson(folderPath){
         let fileNames = await this.getExcelFileNameArrayUnderFolder(folderPath);
         if (!fileNames) {
             return [];
         }
         let rst = await this.transferExcelFilesIntojson(folderPath,fileNames);
         return rst;
     }

     // 将jsonary写入csv文件, hasHead等于true会输出excel列名
     async writeJsonToCSV(jsonAry, hasHead, absoluteFilePath){
         let headers = [];
         let lines = [];
         if (hasHead) {
             for( let key in jsonAry[0]) {
                 headers.push(key);
             }
             lines = jsonAry.map((line) => {
                 return Object.values(line);
         });
             lines.splice(0, 0, headers);
         } else {
             lines = jsonAry;
         }

         let rst = await this.writeCsv2File(absoluteFilePath, lines);
         if (rst == 0) {
             console.log("write json to csv error!")
             return 0;
         }
         return 1;
     }

   async writeJsonToXLXS(filePath, xlData){
         return await XLSX_Writer.write(filePath, xlData, function (err) {
             if(err){

                 console.log("writeOutput error:", err);
             }else{
                 console.log(filePath+" writeOutput done!");
             }
         });

     }

    // only get first level files Excel name, subfolder will ignored
    getExcelFileNameArrayUnderFolder(folderPath) {
        return new Promise((resolve, reject) => {
            fs.readdir(folderPath, function (errs, files) {
                if (errs) {
                    console.log("getExcelFileNameArrayUnderFolder fail:");
                    console.log(errs);
                  resolve([]);
                }
                if (!files || files.length <= 0) {
                    console.log("getExcelFileNameArrayUnderFolder fail:file no found!");
                    resolve([]);
                }
                let excelFileNameAry = files.filter((f) => {
                    // filter folder
                    if (f.lastIndexOf(".") == -1) {
                        return false;
                    }
                    let fileSuffix = f.substring(f.lastIndexOf("."));
                    let findRst = excelSuffixs.find((excelSuffix) => {return excelSuffix == fileSuffix;});
                    return findRst;
                });
                resolve(excelFileNameAry);
            });
        });
    }

    async transferExcelFilesIntojson(folderPath, fileNames) {
        if (!fileNames || fileNames.length <= 0) {
            return [];
        }
        let rst = [];
        for (let i=0; i < fileNames.length; i++) {
            let json = await this.transferExcelFileIntoJson(path.join(folderPath, fileNames[i]));
            json.forEach((item)=>{rst.push(item);});
        }
        return rst;
    }

     transferExcelFileIntoJson(absoluteFilePath) {
         if(absoluteFilePath.lastIndexOf(".csv") != -1) {
             return  this.readCSVFileIntoJson(absoluteFilePath);
         }
         return  this.readXLSXOrXlsFileIntoJson(absoluteFilePath);
     }

     async readCSVFileIntoJson(absoluteFilePath){
         let delimiter = "";
         let skip = false;
         let ary = await csvtojsonV2({}).fromFile(absoluteFilePath).preRawData((fileline)=>{
             if(!skip) {
             let delimeters=[",", "|", "\t", ";", ":"];
             let count = 0;
             let rtn = ",";
             delimeters.forEach(function (delim) {
                 var delimCount = fileline.split(delim).length;
                 if (delimCount > count) {
                     rtn = delim;
                     count = delimCount;
                 }
             });

             delimiter = rtn;
             skip = true;
             }


             return fileline;

         });
         // 如果是制表符为分隔符的excel文件，默认当成从三星下载下来的， 在做一次处理， 不然生成的json是乱码
         if (delimiter == tabDelimilter){
             ary = await this.readCSVFileIntoJsonSplitByTab(absoluteFilePath);
         }
         return ary;
     }


      isEmptyAry(ary) {
         return !ary || ary.length <= 0;
     }

      myParseInt(val) {
         if (!val) {
             return 0;
         }
         return parseInt((val+"").trim());
     }

    async readCSVFileIntoJsonSplitByTab(absoluteFilePath) {
         let data = fs.readFileSync(absoluteFilePath, 'ucs2');
         let ary = await this.parseCsv(data, tabDelimilter);
         if (ary.length <= 1) {
             return [];
         }
         let headers = ary[0];
         let res = ary.slice(1).map((line) => {
             let result = {};
         for (var i = 0; i < headers.length; i++) {
             result[headers[i]] = line[i];
         }
         return result;
     });
         return res;
     }

     parseCsv(data, delimiter) {
         return new Promise((resolve) => {
         csvParse(data, {delimiter: delimiter,relax:true, relax_column_count:true}, function(err, output) {
                  if (err) {
                      resolve([]);
                  } else {
                       resolve(output);
                  }
                 });
            });
     }

    readXLSXOrXlsFileIntoJson(absoluteFilePath) {
        return new Promise((resolve,reject) => {
            fs.readFile(absoluteFilePath, (errs, rst) => {
            if (errs){
                console.log("readXLSXOrXlsFileIntoJson fail:");
                console.log(errs);
                resolve([]);
            }
            resolve(this.PaseXlsx(rst));
            });
        });
    }

     async  readJosnFileFromLocal(filePath){
         return new Promise((resolve,reject) => {
             fs.readFile(filePath,(err,dada) =>{
             if (err) {
                 if (err.code === 'ENOENT') {
                     console.error(filePath + ' does not exist.');
                     return resolve([]);

                 } else {
                     return reject(err);
                 }
             }
             return resolve(JSON.parse(dada));
         });
       });
     }

     PaseXlsx(data){
         let workbook = XLSX.read(data, {type:'buffer'});
         let sheet_name_list = workbook.SheetNames;
         let xlData = XLSX.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]]);
         return xlData;
     }

     writeCsv2File(absoluteFilePath, csvData){
         return new Promise((resolve) => {
             csvStringify(csvData, function(err, data){
                 if (err) {
                     resolve(0);
                 } else {
                     fs.writeFileSync(absoluteFilePath, data);
                     resolve(1);
                 }
             });
     });
     }

     writeJsonToFile(file_path, jsonStr){
         fs.writeFile(file_path, jsonStr, (err) => {
             if (err) throw err;
         });
     }

     // zip_value: 92331, 92334-92337,915-918
      containsZipTo(zip_value, zip_to) {
         let zip_ary = [];
         if ((zip_value+"").indexOf(",") != -1) {
             zip_ary = zip_value.split(",");
         } else {
             zip_ary.push(zip_value);
         }

         for(let i = 0; i < zip_ary.length; i++){
             let zip_pair = zip_ary[i];
             let zip_begin = 0;
             let zip_end = 0;
             let isTreeZipChars = zip_pair.length == 7;
             if (zip_pair.indexOf("-") != -1){
                 let zip_temp = zip_pair.split("-");
                 zip_begin = parseInt(zip_temp[0]);
                 zip_end = parseInt(zip_temp[1]);
             } else {
                 zip_begin = parseInt(zip_pair);
                 zip_end = parseInt(zip_pair);
             }

             if (isTreeZipChars) {
                 zip_to = parseInt((zip_to+"").substring(0,3));
             }
             if (zip_to>=zip_begin && zip_to <= zip_end) {
                 return true;
             }

         }

         return false;
     }

}

module.exports = ExcelFileUtil;

