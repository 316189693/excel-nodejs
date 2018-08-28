

1. 
run below command,:

node zip_compare.js --user_id= ? --user_token= ?  --flex_table_id = 498 --consignee_zips=90001,90012 --shiper_zips=91761,90012  --reload_flex=0



reload_flex: 0 if found in flex_table folder no send http request, if 1 then send request.

  
i will calculate 
  91761: 90001,90012
  90012: 90001,90012
  and out put result.