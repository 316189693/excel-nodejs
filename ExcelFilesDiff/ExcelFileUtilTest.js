let ExcelFileUtil = require ("./ExcelFileUtil");
let u = new ExcelFileUtil();
u.readCSVFileIntoJson("../data/htjy.csv")
    .then((files) => {console.log(files);
});
/*
const csv=require('csvtojson')
testWriteJsonCsv();
async function testWriteJsonCsv(){
    let jsonAry = await u.readCSVFileIntoJson("../data/test.csv");
    console.log(jsonAry.length);
    u.writeJsonToCSV(jsonAry, true, "d:/will02/test0703.csv");
}


async function transferExcelFilesUnderFolderToJson01(folderPath){
   let fileNames = await u.getExcelFileNameArrayUnderFolder(folderPath);
   if (!fileNames) {
       return [];
   }
   let rst = await u.transferExcelFilesIntojson(folderPath,fileNames);
   console.log(rst.length);

}
//test getExcelFileNameArrayUnderFolder
/* u.getExcelFileNameArrayUnderFolder("../data")
    .then((files) => {console.log(files);
});

u.readCSVFileIntoJson("../data/htjy.csv")
    .then((files) => {console.log(files);
});

//test getExcelFileNameArrayUnderFolder
u.readCSVFileIntoJson("../data/htjy.csv")
    .then((files) => {console.log(files);
});

//test readCSVFileIntoJson
/*
u.readCSVFileIntoJson("../data/test.csv")
    .then((data) => {console.log(data);});
*/


//test  readXLSXOrXlsFileIntoJson
/*
u.readXLSXOrXlsFileIntoJson("../data/testxlsx.xlsx")
    .then((data) => {console.log(data);});
    */


//test  readXLSXOrXlsFileIntoJson
/*
u.readXLSXOrXlsFileIntoJson("../data/testxls.xls")
    .then((data) => {console.log(data);});
*/