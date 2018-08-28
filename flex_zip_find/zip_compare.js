let request = require('request-promise');
let ExcelFileUtil = require ("../ExcelFilesDiff/ExcelFileUtil");
let fileUtil = new ExcelFileUtil();
const {argv} = require('yargs');
const fs = require('fs');
const FLEX_TABLE_SHIPPER_ZIP_COLUMN_NAME =  'tms_tariff_flex_table_lines_2';
const FLEX_TABLE_CONSIGNEE_ZIP_COLUMN_NAME =  'tms_tariff_flex_table_lines_3';


let user_id = 9677;
let user_token = null;
let flex_table_id = 498;
let consignee_zips = [942];
let shiper_zips = [91761];
let reload_flex = 0;


if (argv.user_id) {
    console.log("user_id:"+argv.user_id);
    user_id = argv.user_id;
}

if (argv.user_token) {
    console.log("user_token:"+argv.user_token);
    user_token = argv.user_token;
} else {
    throw new Error('illegalParamsException: user_token is null!');
}

if (argv.flex_table_id) {
    console.log("flex_table_id:"+argv.flex_table_id);
    flex_table_id = argv.flex_table_id;
}

if (argv.consignee_zips) {
    console.log("consignee_zips:"+argv.consignee_zips);
    let consignee_zips_tmp = argv.consignee_zips.split(",");
    if (consignee_zips_tmp.length > 0) {
        consignee_zips = [];
        consignee_zips_tmp.forEach((item)=>{consignee_zips.push(myParseInt(item));});
    }
}

if (argv.shiper_zips) {
    console.log("master_id_ary:"+argv.shiper_zips);
    let shiper_zips_tmp = argv.shiper_zips.split(",");
    if (shiper_zips_tmp.length>0) {
        shiper_zips = [];
        shiper_zips_tmp.forEach((item)=>{shiper_zips.push(myParseInt(item))});
    }
}

if (argv.reload_flex) {
    console.log("reload_flex:"+argv.reload_flex);
    reload_flex = argv.reload_flex;
}

let Flex_Table_json_file_path = `./flex_table/flex_table_${flex_table_id}.json`;
let Flex_Table_rst_file_path = `./output/flex_table_${flex_table_id}.xlsx`;



async function getFlexTableJsonAry(){
    let flexTableJsonAry = [];
    if (reload_flex === 0) {
        flexTableJsonAry = await fileUtil.readJosnFileFromLocal(Flex_Table_json_file_path);
    }
    if (reload_flex === 1 || isEmptyAry(flexTableJsonAry)) {
        console.log("get flex table by http request start...");
        flexTableJsonAry = await getFlexTableLine();
        console.log("get flex table by http request end...");
    }
     return flexTableJsonAry;
}

async function getFlexTableLine() {
    let url = "https://com/write_new/get_data_asset.php";
    let data = {
        "UserID": user_id,
        "UserToken": user_token,
        "header": 0,
        "flex_table_id": flex_table_id,
        "pageName": 'dashboardTariffFlex',
        "rejectUnauthorized": false
    };
    try {
        let responseStr =   await request.post(
            {
                url:url,
                form: data ,
                "rejectUnauthorized": false
            });
        let rst = JSON.parse(responseStr);
        if (rst && !isEmptyAry(rst['flex_table_lines'])) {
            fs.writeFile(Flex_Table_json_file_path, responseStr, (err) => {
                if (err) throw err;

            });
            return rst;
        }
        return [];
    } catch(e){
        console.log("get flex http request error:"+e);
        return [];
    }
}

function isEmptyAry(ary) {
    return !ary || ary.length <= 0;
}

function myParseInt(val) {
    if (!val) {
        return 0;
    }
    return parseInt((val+"").trim());
}

async function foundFlexLineByShipperZipAndConsigneeZip(shipper_zip, consignee_zips, flexTableJsonAry){
      return new Promise((resolve, reject) => {
          let result = {shipper_zip:shipper_zip, consignee_zips:shipper_zip, rst:[]};
          let flexTableAry = flexTableJsonAry.filter((flexTableItem) =>{
              let flex_table_consignee = flexTableItem[FLEX_TABLE_CONSIGNEE_ZIP_COLUMN_NAME];
              let consignee_filter = consignee_zips.filter((consignee_zip)=>{
                  return fileUtil.containsZipTo( flex_table_consignee,consignee_zip);
              });
              return !isEmptyAry(consignee_filter);
          });
           result.rst = flexTableAry;
           resolve(result);
      });
}

 function initPromiseAry(flexTableJsonAry){
    let promiseAry = [];
    shiper_zips.forEach((shiper_zip, index)=>{
        let flexTableJsonAryTmp = flexTableJsonAry.filter((item)=>{
                let shiper_zip_tmp = myParseInt(item[FLEX_TABLE_SHIPPER_ZIP_COLUMN_NAME]);
                return shiper_zip === shiper_zip_tmp;
            });
        promiseAry.push(foundFlexLineByShipperZipAndConsigneeZip(shiper_zip, consignee_zips, flexTableJsonAryTmp));
    });
    return promiseAry;
}

async function getFlexTableMatchZipLines(){
    if (isEmptyAry(shiper_zips) || isEmptyAry(consignee_zips)){
       console.log("shiper_zips or consignee_zips is empty!");
       return;
    }

    try {

       let flexTableJsonAry = await getFlexTableJsonAry();
       if (isEmptyAry(flexTableJsonAry) || isEmptyAry(flexTableJsonAry['flex_table_lines'])) {
           console.log("flex table no found!");
           return;
       }

       flexTableJsonAry = flexTableJsonAry['flex_table_lines'];  // flex table lines ary
       let rstJsonAry = [];
       rstJsonAry.push(flexTableJsonAry[0]);
       let promiseAry = initPromiseAry(flexTableJsonAry);
        let result = await Promise.all(promiseAry);


       result.forEach((data)=>{
           if (!isEmptyAry(data['rst'])){
            data['rst'].forEach((item)=>{rstJsonAry.push(item)});
          }

       });

       fileUtil.writeJsonToXLXS(Flex_Table_rst_file_path, rstJsonAry);
    } catch(e) {
        console.log(e);
    }
}

getFlexTableMatchZipLines();